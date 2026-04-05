import { loadOpenCV } from "./opencvLoader";

export interface AlignmentResult {
  rotation: number;   // degrees
  scale: number;      // percentage (100 = no change)
  offset_x: number;   // percentage of image width
  offset_y: number;   // percentage of image height
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
  const kp1 = new cv.KeyPointVector();
  const kp2 = new cv.KeyPointVector();
  const desc1 = new cv.Mat();
  const desc2 = new cv.Mat();

  orb.detectAndCompute(mat1, new cv.Mat(), kp1, desc1);
  orb.detectAndCompute(mat2, new cv.Mat(), kp2, desc2);

  const cleanup = () => {
    [mat1, mat2, desc1, desc2].forEach(m => m.delete());
    [kp1, kp2].forEach(v => v.delete());
    orb.delete();
  };

  if (desc1.rows < 4 || desc2.rows < 4) {
    cleanup();
    console.warn("[ImageAlign] Not enough features found");
    return { rotation: 0, scale: 100, offset_x: 0, offset_y: 0 };
  }

  const bf = new cv.BFMatcher(cv.NORM_HAMMING, true);
  const matches = new cv.DMatchVector();
  bf.match(desc1, desc2, matches);

  const matchArray: { queryIdx: number; trainIdx: number; distance: number }[] = [];
  for (let i = 0; i < matches.size(); i++) {
    const m = matches.get(i);
    matchArray.push({ queryIdx: m.queryIdx, trainIdx: m.trainIdx, distance: m.distance });
  }
  matchArray.sort((a, b) => a.distance - b.distance);
  const topMatches = matchArray.slice(0, Math.min(50, matchArray.length));

  matches.delete();
  bf.delete();

  if (topMatches.length < 4) {
    cleanup();
    console.warn("[ImageAlign] Not enough good matches");
    return { rotation: 0, scale: 100, offset_x: 0, offset_y: 0 };
  }

  // pts1 = base keypoints, pts2 = overlay keypoints
  const pts1: number[] = [];
  const pts2: number[] = [];
  for (const m of topMatches) {
    const p1 = kp1.get(m.queryIdx).pt;
    const p2 = kp2.get(m.trainIdx).pt;
    pts1.push(p1.x, p1.y);
    pts2.push(p2.x, p2.y);
  }

  const srcPts = cv.matFromArray(topMatches.length, 1, cv.CV_32FC2, pts1);
  const dstPts = cv.matFromArray(topMatches.length, 1, cv.CV_32FC2, pts2);

  // Check if points are nearly identical (same image)
  let totalDist = 0;
  for (let i = 0; i < topMatches.length; i++) {
    const dx = pts1[i * 2] - pts2[i * 2];
    const dy = pts1[i * 2 + 1] - pts2[i * 2 + 1];
    totalDist += Math.sqrt(dx * dx + dy * dy);
  }
  const avgDist = totalDist / topMatches.length;
  if (avgDist < 2.0) {
    srcPts.delete();
    dstPts.delete();
    cleanup();
    if (import.meta.env.DEV) console.log("[ImageAlign] Images are nearly identical, skipping alignment");
    return { rotation: 0, scale: 100, offset_x: 0, offset_y: 0 };
  }

  // Estimate affine: maps overlay points → base points
  let affine: any;
  try {
    affine = cv.estimateAffinePartial2D(dstPts, srcPts);
  } catch (e) {
    srcPts.delete();
    dstPts.delete();
    cleanup();
    console.warn("[ImageAlign] estimateAffinePartial2D failed:", e);
    return { rotation: 0, scale: 100, offset_x: 0, offset_y: 0 };
  }

  srcPts.delete();
  dstPts.delete();

  if (!affine || affine.rows === 0) {
    cleanup();
    console.warn("[ImageAlign] Could not estimate transformation");
    return { rotation: 0, scale: 100, offset_x: 0, offset_y: 0 };
  }

  // Extract rotation, scale, translation from 2x3 affine matrix
  // [cos*s, -sin*s, tx]
  // [sin*s,  cos*s, ty]
  const a = affine.doubleAt(0, 0);
  const b = affine.doubleAt(0, 1);
  const tx = affine.doubleAt(0, 2);
  const ty = affine.doubleAt(1, 2);

  affine.delete();
  cleanup();

  const scale = Math.sqrt(a * a + b * b);
  const rotation = Math.atan2(b, a) * (180 / Math.PI);

  // Convert tx/ty from base-image analysis pixels to percentage of base dimensions
  // This makes offsets display-size-independent
  const offsetXPct = (tx / base.w) * 100;
  const offsetYPct = (ty / base.h) * 100;

  const rawResult: AlignmentResult = {
    rotation: Math.round(rotation * 10) / 10,
    scale: Math.round(scale * 100),
    offset_x: Math.round(offsetXPct * 10) / 10,
    offset_y: Math.round(offsetYPct * 10) / 10,
  };

  // Safety bounds
  const isSafe =
    Math.abs(rawResult.rotation) <= 45 &&
    rawResult.scale >= 50 &&
    rawResult.scale <= 200 &&
    Math.abs(rawResult.offset_x) <= 50 &&
    Math.abs(rawResult.offset_y) <= 50;

  if (!isSafe) {
    console.warn("[ImageAlign] Result outside safety bounds, ignoring:", rawResult);
    return { rotation: 0, scale: 100, offset_x: 0, offset_y: 0 };
  }

  if (import.meta.env.DEV) console.log("[ImageAlign] Result:", rawResult);
  return rawResult;
}
