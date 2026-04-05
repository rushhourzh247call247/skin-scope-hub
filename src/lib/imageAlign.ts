import { loadOpenCV } from "./opencvLoader";

export interface AlignmentResult {
  rotation: number;   // degrees for CSS rotate()
  scale: number;      // percentage for CSS scale() (100 = no change)
  offset_x: number;   // percentage of comparison viewport width
  offset_y: number;   // percentage of comparison viewport height
}

interface Point {
  x: number;
  y: number;
}

interface PointMatch {
  source: Point;
  target: Point;
}

interface SimilarityTransform {
  rotationRad: number;
  scale: number;
  tx: number;
  ty: number;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
    img.src = src;
  });
}

function imageToMat(img: HTMLImageElement, maxDim = 512): { gray: any; w: number; h: number } {
  const cv = window.cv;
  const canvas = document.createElement("canvas");

  let w = img.naturalWidth;
  let h = img.naturalHeight;
  if (Math.max(w, h) > maxDim) {
    const ratio = maxDim / Math.max(w, h);
    w = Math.round(w * ratio);
    h = Math.round(h * ratio);
  }

  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(img, 0, 0, w, h);

  const imageData = ctx.getImageData(0, 0, w, h);
  const mat = cv.matFromImageData(imageData);
  const gray = new cv.Mat();
  cv.cvtColor(mat, gray, cv.COLOR_RGBA2GRAY);
  mat.delete();
  return { gray, w, h };
}

function identityAlignment(): AlignmentResult {
  return { rotation: 0, scale: 100, offset_x: 0, offset_y: 0 };
}

function applySimilarityTransform(point: Point, transform: SimilarityTransform): Point {
  const cos = Math.cos(transform.rotationRad);
  const sin = Math.sin(transform.rotationRad);

  return {
    x: transform.scale * (cos * point.x - sin * point.y) + transform.tx,
    y: transform.scale * (sin * point.x + cos * point.y) + transform.ty,
  };
}

function estimateSimilarityFromPair(first: PointMatch, second: PointMatch): SimilarityTransform | null {
  const srcDx = second.source.x - first.source.x;
  const srcDy = second.source.y - first.source.y;
  const dstDx = second.target.x - first.target.x;
  const dstDy = second.target.y - first.target.y;

  const srcDist = Math.hypot(srcDx, srcDy);
  const dstDist = Math.hypot(dstDx, dstDy);
  if (srcDist < 1e-3 || dstDist < 1e-3) return null;

  const rotationRad = Math.atan2(dstDy, dstDx) - Math.atan2(srcDy, srcDx);
  const scale = dstDist / srcDist;
  if (!Number.isFinite(scale) || scale <= 0) return null;

  const cos = Math.cos(rotationRad);
  const sin = Math.sin(rotationRad);

  const tx1 = first.target.x - scale * (cos * first.source.x - sin * first.source.y);
  const ty1 = first.target.y - scale * (sin * first.source.x + cos * first.source.y);
  const tx2 = second.target.x - scale * (cos * second.source.x - sin * second.source.y);
  const ty2 = second.target.y - scale * (sin * second.source.x + cos * second.source.y);

  return {
    rotationRad,
    scale,
    tx: (tx1 + tx2) / 2,
    ty: (ty1 + ty2) / 2,
  };
}

function estimateSimilarityLeastSquares(matches: PointMatch[]): SimilarityTransform | null {
  if (matches.length < 2) return null;

  let sourceMeanX = 0;
  let sourceMeanY = 0;
  let targetMeanX = 0;
  let targetMeanY = 0;

  for (const match of matches) {
    sourceMeanX += match.source.x;
    sourceMeanY += match.source.y;
    targetMeanX += match.target.x;
    targetMeanY += match.target.y;
  }

  sourceMeanX /= matches.length;
  sourceMeanY /= matches.length;
  targetMeanX /= matches.length;
  targetMeanY /= matches.length;

  let dot = 0;
  let cross = 0;
  let sourceNorm = 0;

  for (const match of matches) {
    const sx = match.source.x - sourceMeanX;
    const sy = match.source.y - sourceMeanY;
    const tx = match.target.x - targetMeanX;
    const ty = match.target.y - targetMeanY;

    dot += sx * tx + sy * ty;
    cross += sx * ty - sy * tx;
    sourceNorm += sx * sx + sy * sy;
  }

  if (sourceNorm < 1e-6) return null;

  const rotationRad = Math.atan2(cross, dot);
  const scale = Math.hypot(dot, cross) / sourceNorm;
  if (!Number.isFinite(scale) || scale <= 0) return null;

  const cos = Math.cos(rotationRad);
  const sin = Math.sin(rotationRad);

  return {
    rotationRad,
    scale,
    tx: targetMeanX - scale * (cos * sourceMeanX - sin * sourceMeanY),
    ty: targetMeanY - scale * (sin * sourceMeanX + cos * sourceMeanY),
  };
}

function scoreTransform(matches: PointMatch[], transform: SimilarityTransform, maxErrorPx: number) {
  const inliers: PointMatch[] = [];
  let totalError = 0;

  for (const match of matches) {
    const projected = applySimilarityTransform(match.source, transform);
    const error = Math.hypot(projected.x - match.target.x, projected.y - match.target.y);

    if (error <= maxErrorPx) {
      inliers.push(match);
      totalError += error;
    }
  }

  return {
    inliers,
    meanError: inliers.length > 0 ? totalError / inliers.length : Number.POSITIVE_INFINITY,
  };
}

function estimateSimilarityTransform(matches: PointMatch[], maxErrorPx: number): SimilarityTransform | null {
  if (matches.length < 2) return null;

  let best:
    | {
        transform: SimilarityTransform;
        inliers: PointMatch[];
        meanError: number;
      }
    | null = null;

  for (let i = 0; i < matches.length - 1; i++) {
    for (let j = i + 1; j < matches.length; j++) {
      const candidate = estimateSimilarityFromPair(matches[i], matches[j]);
      if (!candidate || candidate.scale < 0.25 || candidate.scale > 4) continue;

      const scored = scoreTransform(matches, candidate, maxErrorPx);
      if (scored.inliers.length < 2) continue;

      if (
        !best ||
        scored.inliers.length > best.inliers.length ||
        (scored.inliers.length === best.inliers.length && scored.meanError < best.meanError)
      ) {
        best = {
          transform: candidate,
          inliers: scored.inliers,
          meanError: scored.meanError,
        };
      }
    }
  }

  if (!best) return null;

  const refined = estimateSimilarityLeastSquares(best.inliers) ?? best.transform;
  const rescored = scoreTransform(matches, refined, maxErrorPx);
  const finalMatches = rescored.inliers.length >= best.inliers.length ? rescored.inliers : best.inliers;
  const finalTransform = estimateSimilarityLeastSquares(finalMatches) ?? refined;

  return finalMatches.length >= 3 ? finalTransform : null;
}

function toViewportAlignment(
  base: { w: number; h: number },
  overlay: { w: number; h: number },
  transform: SimilarityTransform,
): AlignmentResult {
  const viewportSize = 100;
  const viewportCenter = { x: viewportSize / 2, y: viewportSize / 2 };

  const baseFitScale = viewportSize / Math.max(base.w, base.h);
  const overlayFitScale = viewportSize / Math.max(overlay.w, overlay.h);

  const baseOffset = {
    x: (viewportSize - base.w * baseFitScale) / 2,
    y: (viewportSize - base.h * baseFitScale) / 2,
  };
  const overlayOffset = {
    x: (viewportSize - overlay.w * overlayFitScale) / 2,
    y: (viewportSize - overlay.h * overlayFitScale) / 2,
  };

  const cssScale = transform.scale * (baseFitScale / overlayFitScale);
  const cos = Math.cos(transform.rotationRad);
  const sin = Math.sin(transform.rotationRad);

  const overlayOffsetFromCenter = {
    x: overlayOffset.x - viewportCenter.x,
    y: overlayOffset.y - viewportCenter.y,
  };

  const rotatedOverlayOffset = {
    x: cssScale * (cos * overlayOffsetFromCenter.x - sin * overlayOffsetFromCenter.y),
    y: cssScale * (sin * overlayOffsetFromCenter.x + cos * overlayOffsetFromCenter.y),
  };

  const translate = {
    x: baseOffset.x + baseFitScale * transform.tx - viewportCenter.x - rotatedOverlayOffset.x,
    y: baseOffset.y + baseFitScale * transform.ty - viewportCenter.y - rotatedOverlayOffset.y,
  };

  return {
    rotation: Math.round((transform.rotationRad * 180 / Math.PI) * 10) / 10,
    scale: Math.round(cssScale * 1000) / 10,
    offset_x: Math.round(translate.x * 10) / 10,
    offset_y: Math.round(translate.y * 10) / 10,
  };
}

export async function alignImages(
  baseSrc: string,
  overlaySrc: string
): Promise<AlignmentResult> {
  await loadOpenCV();
  const cv = window.cv;

  const [baseImg, overlayImg] = await Promise.all([
    loadImage(baseSrc),
    loadImage(overlaySrc),
  ]);

  const base = imageToMat(baseImg);
  const overlay = imageToMat(overlayImg);
  const mat1 = base.gray;
  const mat2 = overlay.gray;

  const orb = new cv.ORB(500);
  const mask1 = new cv.Mat();
  const mask2 = new cv.Mat();
  const kp1 = new cv.KeyPointVector();
  const kp2 = new cv.KeyPointVector();
  const desc1 = new cv.Mat();
  const desc2 = new cv.Mat();

  const cleanup = () => {
    [mat1, mat2, mask1, mask2, desc1, desc2].forEach(m => m.delete());
    [kp1, kp2].forEach(v => v.delete());
    orb.delete();
  };

  try {
    orb.detectAndCompute(mat1, mask1, kp1, desc1);
    orb.detectAndCompute(mat2, mask2, kp2, desc2);

    if (desc1.rows < 4 || desc2.rows < 4) {
      throw new Error("Not enough features found");
    }

    const bf = new cv.BFMatcher(cv.NORM_HAMMING, true);
    const matches = new cv.DMatchVector();

    try {
      bf.match(desc1, desc2, matches);

      const matchArray: { queryIdx: number; trainIdx: number; distance: number }[] = [];
      for (let i = 0; i < matches.size(); i++) {
        const match = matches.get(i);
        matchArray.push({
          queryIdx: match.queryIdx,
          trainIdx: match.trainIdx,
          distance: match.distance,
        });
      }

      matchArray.sort((a, b) => a.distance - b.distance);
      const topMatches = matchArray.slice(0, Math.min(50, matchArray.length));

      if (topMatches.length < 4) {
        throw new Error("Not enough good matches");
      }

      const pointMatches: PointMatch[] = topMatches.map((match) => {
        const target = kp1.get(match.queryIdx).pt;
        const source = kp2.get(match.trainIdx).pt;
        return {
          source: { x: source.x, y: source.y },
          target: { x: target.x, y: target.y },
        };
      });

      let totalDist = 0;
      for (const match of pointMatches) {
        totalDist += Math.hypot(match.target.x - match.source.x, match.target.y - match.source.y);
      }

      const avgDist = totalDist / pointMatches.length;
      if (avgDist < 2.0) {
        if (import.meta.env.DEV) console.log("[ImageAlign] Images are nearly identical, skipping alignment");
        return identityAlignment();
      }

      const maxErrorPx = Math.max(6, Math.max(base.w, base.h) * 0.025);
      const transform = estimateSimilarityTransform(pointMatches, maxErrorPx);

      if (!transform) {
        throw new Error("Could not estimate transformation");
      }

      const rawResult = toViewportAlignment(base, overlay, transform);

      const isSafe =
        Math.abs(rawResult.rotation) <= 45 &&
        rawResult.scale >= 50 &&
        rawResult.scale <= 200 &&
        Math.abs(rawResult.offset_x) <= 50 &&
        Math.abs(rawResult.offset_y) <= 50;

      if (!isSafe) {
        throw new Error(`Result outside safety bounds: ${JSON.stringify(rawResult)}`);
      }

      if (import.meta.env.DEV) console.log("[ImageAlign] Result:", rawResult);
      return rawResult;
    } finally {
      matches.delete();
      bf.delete();
    }
  } catch (error) {
    console.warn("[ImageAlign] Alignment failed:", error);
    throw error instanceof Error ? error : new Error("Auto alignment failed");
  } finally {
    cleanup();
  }
}
