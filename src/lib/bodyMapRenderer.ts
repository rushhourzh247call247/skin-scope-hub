/**
 * Offscreen Three.js renderer for body map thumbnails in PDF export.
 * Renders the actual 3D GLB body model with a spot marker to a base64 image.
 * Camera zooms to the spot from the surface normal direction, matching the app behavior.
 */
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

const FEMALE_MODEL_URL = "/models/body.glb";
const MALE_MODEL_URL = "/models/male_body.glb";

let cachedModels: Record<string, THREE.Group> = {};

async function loadModel(url: string): Promise<THREE.Group> {
  if (cachedModels[url]) return cachedModels[url].clone(true);

  return new Promise((resolve, reject) => {
    const loader = new GLTFLoader();
    loader.load(
      url,
      (gltf) => {
        cachedModels[url] = gltf.scene;
        resolve(gltf.scene.clone(true));
      },
      undefined,
      reject,
    );
  });
}

export interface BodyMapRenderOptions {
  xPct: number;
  yPct: number;
  view: "front" | "back";
  x3d?: number;
  y3d?: number;
  z3d?: number;
  nx?: number;
  ny?: number;
  nz?: number;
  gender?: "male" | "female";
  accentColor?: string;
  width?: number;
  height?: number;
}

function toFinite(v: unknown): number | null {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

export async function renderBodyMap3DThumbnail(opts: BodyMapRenderOptions): Promise<string | null> {
  const {
    view,
    x3d: rawX3d,
    y3d: rawY3d,
    z3d: rawZ3d,
    nx: rawNx,
    ny: rawNy,
    nz: rawNz,
    gender = "male",
    accentColor = "#00a699",
    width = 300,
    height = 500,
  } = opts;

  try {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      preserveDrawingBuffer: true,
    });
    renderer.setSize(width, height);
    renderer.setClearColor(0xf8fafc, 1);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf8fafc);

    // Lighting
    scene.add(new THREE.AmbientLight(0xffffff, 0.6));
    const frontLight = new THREE.DirectionalLight(0xffffff, 0.8);
    frontLight.position.set(0, 2, 4);
    scene.add(frontLight);
    const fillLight = new THREE.DirectionalLight(0xfff5ee, 0.3);
    fillLight.position.set(-3, 1, -2);
    scene.add(fillLight);
    const rimLight = new THREE.DirectionalLight(0xe8e0ff, 0.4);
    rimLight.position.set(2, 0.5, -3);
    scene.add(rimLight);

    // Load model
    const modelUrl = gender === "male" ? MALE_MODEL_URL : FEMALE_MODEL_URL;
    const modelScene = await loadModel(modelUrl);

    // Apply skin material
    const skinMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color("hsl(25, 50%, 70%)"),
      roughness: 0.5,
      metalness: 0.0,
      emissive: new THREE.Color("hsl(15, 25%, 22%)"),
      emissiveIntensity: 0.06,
    });
    modelScene.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        (child as THREE.Mesh).material = skinMat;
      }
    });

    // Normalize scale and center (same world transform as BodyMap3D)
    const box = new THREE.Box3().setFromObject(modelScene);
    const modelHeight = box.getSize(new THREE.Vector3()).y || 1;
    const scale = 2.5 / modelHeight;
    const centerOffset = box.getCenter(new THREE.Vector3()).clone().multiplyScalar(scale);
    modelScene.scale.setScalar(scale);
    modelScene.position.sub(centerOffset);
    scene.add(modelScene);

    // Determine spot 3D position and camera
    const x3d = toFinite(rawX3d);
    const y3d = toFinite(rawY3d);
    const z3d = toFinite(rawZ3d);

    const camera = new THREE.PerspectiveCamera(30, width / height, 0.1, 100);

    let markerScreenPos: { x: number; y: number } | null = null;

    if (x3d != null && y3d != null && z3d != null) {
      // Stored 3D coordinates are already captured from the normalized body scene.
      // Applying scale/centering again shifts the marker to the wrong body region.
      const spotPos = new THREE.Vector3(x3d, y3d, z3d);

      // Surface normal for camera direction (same logic as BodyMap3D auto-focus)
      const zDir = view === "back" ? -1 : 1;
      const rawNormal = new THREE.Vector3(
        toFinite(rawNx) ?? 0,
        toFinite(rawNy) ?? 0,
        toFinite(rawNz) ?? 0,
      );
      const normal = rawNormal.lengthSq() > 0.0001
        ? rawNormal.normalize()
        : new THREE.Vector3(0, 0, zDir);

      // Camera at 1.2 units along normal from spot (matches app zoom)
      camera.position.set(
        spotPos.x + normal.x * 1.2,
        spotPos.y + normal.y * 1.2,
        spotPos.z + normal.z * 1.2,
      );
      camera.up.set(0, 1, 0);
      camera.lookAt(spotPos);

      // Render first, then overlay marker
      renderer.render(scene, camera);

      // Project spot to screen for marker overlay
      const projected = spotPos.clone().project(camera);
      markerScreenPos = {
        x: ((projected.x + 1) / 2) * width,
        y: ((-projected.y + 1) / 2) * height,
      };
    } else {
      // Fallback: full body view
      if (view === "back") {
        camera.position.set(0, 0, -3.8);
      } else {
        camera.position.set(0, 0, 3.8);
      }
      camera.up.set(0, 1, 0);
      camera.lookAt(0, 0, 0);
      renderer.render(scene, camera);
    }

    // Draw marker overlay on the 2D canvas
    const ctx = canvas.getContext("2d");
    if (ctx && markerScreenPos) {
      const mx = markerScreenPos.x;
      const my = markerScreenPos.y;

      const r = parseInt(accentColor.slice(1, 3), 16);
      const g = parseInt(accentColor.slice(3, 5), 16);
      const b = parseInt(accentColor.slice(5, 7), 16);

      // Outer glow
      const gradient = ctx.createRadialGradient(mx, my, 0, mx, my, 28);
      gradient.addColorStop(0, `rgba(${r},${g},${b},0.45)`);
      gradient.addColorStop(1, `rgba(${r},${g},${b},0)`);
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(mx, my, 28, 0, Math.PI * 2);
      ctx.fill();

      // Outer ring
      ctx.strokeStyle = accentColor;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(mx, my, 14, 0, Math.PI * 2);
      ctx.stroke();

      // White inner ring
      ctx.strokeStyle = "rgba(255,255,255,0.8)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(mx, my, 11, 0, Math.PI * 2);
      ctx.stroke();

      // Inner dot
      ctx.fillStyle = accentColor;
      ctx.beginPath();
      ctx.arc(mx, my, 5, 0, Math.PI * 2);
      ctx.fill();

      // Crosshair
      ctx.strokeStyle = accentColor;
      ctx.lineWidth = 2;
      const cs = 22;
      const gap = 16;
      ctx.beginPath();
      ctx.moveTo(mx, my - cs); ctx.lineTo(mx, my - gap);
      ctx.moveTo(mx, my + gap); ctx.lineTo(mx, my + cs);
      ctx.moveTo(mx - cs, my); ctx.lineTo(mx - gap, my);
      ctx.moveTo(mx + gap, my); ctx.lineTo(mx + cs, my);
      ctx.stroke();
    }

    // View label
    if (ctx) {
      ctx.fillStyle = "#94a3b8";
      ctx.font = "bold 14px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(view === "front" ? "Vorne" : "Hinten", width / 2, height - 6);
    }

    const dataUrl = canvas.toDataURL("image/png");

    renderer.dispose();
    skinMat.dispose();

    return dataUrl;
  } catch (err) {
    console.warn("Body map 3D thumbnail render failed:", err);
    return null;
  }
}
