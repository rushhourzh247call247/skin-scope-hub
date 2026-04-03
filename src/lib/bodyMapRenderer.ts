/**
 * Offscreen Three.js renderer for body map thumbnails in PDF export.
 * Renders the actual 3D GLB body model with a spot marker to a base64 image.
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
  /** Spot x coordinate (0-100 percentage) */
  xPct: number;
  /** Spot y coordinate (0-100 percentage) */
  yPct: number;
  /** Which side the spot is on */
  view: "front" | "back";
  /** 3D anchor if available */
  x3d?: number;
  y3d?: number;
  z3d?: number;
  /** Gender for model selection */
  gender?: "male" | "female";
  /** Accent color for the marker */
  accentColor?: string;
  /** Canvas width in pixels */
  width?: number;
  /** Canvas height in pixels */
  height?: number;
}

/**
 * Renders the 3D body model offscreen with a marker and returns a base64 PNG.
 */
export async function renderBodyMap3DThumbnail(opts: BodyMapRenderOptions): Promise<string | null> {
  const {
    view,
    x3d,
    y3d,
    z3d,
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

    // Lighting - match the app's setup
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

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
        const mesh = child as THREE.Mesh;
        mesh.material = skinMat;
      }
    });

    // Normalize scale and center
    const box = new THREE.Box3().setFromObject(modelScene);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const modelHeight = size.y || 1;
    const scale = 2.5 / modelHeight;

    // Save original center before mutating
    const centerOffset = center.clone().multiplyScalar(scale);
    modelScene.scale.setScalar(scale);
    modelScene.position.sub(centerOffset);

    scene.add(modelScene);

    // Camera
    const camera = new THREE.PerspectiveCamera(30, width / height, 0.1, 100);
    if (view === "back") {
      camera.position.set(0, 0, -3.8);
    } else {
      camera.position.set(0, 0, 3.8);
    }
    camera.up.set(0, 1, 0);
    camera.lookAt(0, 0, 0);

    // Render
    renderer.render(scene, camera);

    // Draw marker on the canvas using 2D context overlay
    const ctx = canvas.getContext("2d");
    if (ctx && x3d != null && y3d != null && z3d != null) {
      // Transform 3D point the same way as the model
      const markerPos = new THREE.Vector3(
        Number(x3d) * scale - centerOffset.x,
        Number(y3d) * scale - centerOffset.y,
        Number(z3d) * scale - centerOffset.z,
      );

      markerPos.project(camera);

      const mx = ((markerPos.x + 1) / 2) * width;
      const my = ((-markerPos.y + 1) / 2) * height;

      // Parse accent color
      const r = parseInt(accentColor.slice(1, 3), 16);
      const g = parseInt(accentColor.slice(3, 5), 16);
      const b = parseInt(accentColor.slice(5, 7), 16);

      // Outer glow
      const gradient = ctx.createRadialGradient(mx, my, 0, mx, my, 22);
      gradient.addColorStop(0, `rgba(${r},${g},${b},0.4)`);
      gradient.addColorStop(1, `rgba(${r},${g},${b},0)`);
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(mx, my, 22, 0, Math.PI * 2);
      ctx.fill();

      // Ring
      ctx.strokeStyle = accentColor;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(mx, my, 12, 0, Math.PI * 2);
      ctx.stroke();

      // Inner dot
      ctx.fillStyle = accentColor;
      ctx.beginPath();
      ctx.arc(mx, my, 5, 0, Math.PI * 2);
      ctx.fill();

      // Crosshair
      ctx.strokeStyle = accentColor;
      ctx.lineWidth = 2;
      const cs = 18;
      ctx.beginPath();
      ctx.moveTo(mx, my - cs); ctx.lineTo(mx, my - 14);
      ctx.moveTo(mx, my + 14); ctx.lineTo(mx, my + cs);
      ctx.moveTo(mx - cs, my); ctx.lineTo(mx - 14, my);
      ctx.moveTo(mx + 14, my); ctx.lineTo(mx + cs, my);
      ctx.stroke();
    }

    // View label
    if (ctx) {
      ctx.fillStyle = "#94a3b8";
      ctx.font = "bold 16px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(view === "front" ? "Vorne" : "Hinten", width / 2, height - 8);
    }

    const dataUrl = canvas.toDataURL("image/png");

    // Cleanup
    renderer.dispose();
    skinMat.dispose();

    return dataUrl;
  } catch (err) {
    console.warn("Body map 3D thumbnail render failed:", err);
    return null;
  }
}
