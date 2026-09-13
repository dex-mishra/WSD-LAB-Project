import * as THREE from "three";
import { PALETTE } from "./palette";

/**
 * Reusable geometry/material builders for greybox environments and labels.
 * These keep scene files terse and enforce metre-based scale and the palette.
 */

const _sharedGeo = {
  box: new THREE.BoxGeometry(1, 1, 1, 2, 2, 2),
};

export function box(
  w: number,
  h: number,
  d: number,
  color: number,
  opts: { rough?: number; metal?: number; emissive?: number } = {}
): THREE.Mesh {
  const mat = new THREE.MeshStandardMaterial({
    color,
    roughness: opts.rough ?? 0.72,
    metalness: opts.metal ?? 0.05,
    emissive: opts.emissive ?? 0x000000,
    emissiveIntensity: opts.emissive ? 0.6 : 0,
    envMapIntensity: 0.4,
  });
  const mesh = new THREE.Mesh(_sharedGeo.box, mat);
  mesh.scale.set(w, h, d);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

export function ground(
  w: number,
  d: number,
  color: number
): THREE.Group {
  const group = new THREE.Group();

  // Main ground plane
  const mat = new THREE.MeshStandardMaterial({
    color,
    roughness: 0.88,
    metalness: 0.02,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, d), mat);
  mesh.rotation.x = -Math.PI / 2;
  mesh.receiveShadow = true;
  group.add(mesh);

  // Subtle grid overlay for spatial reference
  const gridTex = makeGridTexture(w, d);
  const gridMat = new THREE.MeshBasicMaterial({
    map: gridTex,
    transparent: true,
    depthWrite: false,
    opacity: 0.12,
  });
  const gridMesh = new THREE.Mesh(new THREE.PlaneGeometry(w, d), gridMat);
  gridMesh.rotation.x = -Math.PI / 2;
  gridMesh.position.y = 0.005;
  gridMesh.renderOrder = 1;
  group.add(gridMesh);

  return group;
}

/** Generate a subtle grid texture for the ground plane. */
function makeGridTexture(w: number, d: number): THREE.CanvasTexture {
  const res = 1024;
  const canvas = document.createElement("canvas");
  canvas.width = res;
  canvas.height = res;
  const ctx = canvas.getContext("2d")!;

  ctx.clearRect(0, 0, res, res);
  ctx.strokeStyle = "rgba(255,255,255,0.35)";
  ctx.lineWidth = 1;

  const cellsX = Math.max(4, Math.round(w / 2));
  const cellsZ = Math.max(4, Math.round(d / 2));
  const cells = Math.max(cellsX, cellsZ);

  for (let i = 0; i <= cells; i++) {
    const t = (i / cells) * res;
    ctx.beginPath();
    ctx.moveTo(t, 0);
    ctx.lineTo(t, res);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, t);
    ctx.lineTo(res, t);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.needsUpdate = true;
  return tex;
}

/**
 * A crop-based canvas texture label used as an in-world sign or floor decal.
 * Text is kept short and high contrast per the UI guidelines.
 * Uses 2x canvas resolution for crisp text at distance.
 */
export function makeTextTexture(
  text: string,
  opts: {
    bg?: string;
    fg?: string;
    fontSize?: number;
    padding?: number;
    width?: number;
    height?: number;
    align?: CanvasTextAlign;
    border?: boolean;
  } = {}
): THREE.CanvasTexture {
  // Use 2x resolution for crisp rendering
  const logicalW = opts.width ?? 512;
  const logicalH = opts.height ?? 256;
  const scale = 2;
  const width = logicalW * scale;
  const height = logicalH * scale;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;

  const r = 24 * scale;

  // Background fill
  ctx.fillStyle = opts.bg ?? "rgba(23,50,77,0.92)";
  roundRect(ctx, 0, 0, width, height, r);
  ctx.fill();

  // Border frame for readability
  if (opts.border !== false) {
    ctx.strokeStyle = "rgba(255,255,255,0.18)";
    ctx.lineWidth = 2 * scale;
    roundRect(ctx, 2 * scale, 2 * scale, width - 4 * scale, height - 4 * scale, r - 2 * scale);
    ctx.stroke();
  }

  // Text auto-fit calculation to ensure all text fits with safe margins
  const lines = text.split("\n");
  const pad = (opts.padding ?? 32) * scale;
  const maxAllowedW = width - pad * 2;
  const maxAllowedH = height - pad * 1.6;

  let fontSize = (opts.fontSize ?? 64) * scale;
  ctx.font = `700 ${fontSize}px "Segoe UI", system-ui, sans-serif`;

  // Measure widest line and scale down if needed
  let maxW = 0;
  for (const line of lines) {
    const w = ctx.measureText(line).width;
    if (w > maxW) maxW = w;
  }

  if (maxW > maxAllowedW && maxW > 0) {
    const scaleFactor = maxAllowedW / maxW;
    fontSize = Math.floor(fontSize * scaleFactor);
    ctx.font = `700 ${fontSize}px "Segoe UI", system-ui, sans-serif`;
  }

  // Measure total height and scale down if needed
  let lineH = fontSize * 1.25;
  let totalH = lines.length * lineH;
  if (totalH > maxAllowedH && totalH > 0) {
    const vScaleFactor = maxAllowedH / totalH;
    fontSize = Math.floor(fontSize * vScaleFactor);
    lineH = fontSize * 1.25;
    ctx.font = `700 ${fontSize}px "Segoe UI", system-ui, sans-serif`;
  }

  ctx.textBaseline = "middle";
  ctx.textAlign = opts.align ?? "center";

  const startY = height / 2 - ((lines.length - 1) * lineH) / 2;
  const x = ctx.textAlign === "left" ? pad : width / 2;

  // Draw text shadow first for crisp contrast
  ctx.fillStyle = "rgba(0,0,0,0.6)";
  lines.forEach((line, i) => ctx.fillText(line, x + 2 * scale, startY + i * lineH + 2 * scale));

  // Draw main text
  ctx.fillStyle = opts.fg ?? "#F7F5EE";
  lines.forEach((line, i) => ctx.fillText(line, x, startY + i * lineH));

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 16;
  tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.needsUpdate = true;
  return tex;
}

/** A world-space label plane (used as signage or zone markers). */
export function label(
  text: string,
  widthMeters: number,
  opts: Parameters<typeof makeTextTexture>[1] & { depthWrite?: boolean } = {}
): THREE.Mesh {
  const tex = makeTextTexture(text, opts);
  const aspect = (opts.height ?? 256) / (opts.width ?? 512);
  const isTransparent = opts.bg === "rgba(0,0,0,0)" || !opts.bg;
  const mat = new THREE.MeshBasicMaterial({
    map: tex,
    transparent: isTransparent,
    depthWrite: opts.depthWrite ?? !isTransparent,
    depthTest: true,
    alphaTest: isTransparent ? 0.05 : 0,
  });
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(widthMeters, widthMeters * aspect),
    mat
  );
  mesh.renderOrder = 2;
  return mesh;
}

/** A flat floor decal (RAW, WIP, FEFO, etc.) laid on the ground. */
export function floorDecal(
  text: string,
  widthMeters: number,
  color: string
): THREE.Mesh {
  const m = label(text, widthMeters, {
    bg: "rgba(0,0,0,0)",
    fg: color,
    fontSize: 92,
    width: 512,
    height: 160,
    border: false,
  });
  m.rotation.x = -Math.PI / 2;
  return m;
}

/** Rounded rect helper for canvas drawing. */
function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/**
 * InstancedMesh of crates for a zone. Returns the mesh plus a helper to tint a
 * single instance (fresh/waiting/rejected/spoiled) via instanceColor.
 */
export function crateField(
  count: number,
  crateSize = 0.5
): { mesh: THREE.InstancedMesh; setColor: (i: number, hex: number) => void } {
  const geo = new THREE.BoxGeometry(crateSize, crateSize * 0.7, crateSize);
  const mat = new THREE.MeshStandardMaterial({
    roughness: 0.7,
    metalness: 0.08,
  });
  const mesh = new THREE.InstancedMesh(geo, mat, count);
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  const color = new THREE.Color();
  const setColor = (i: number, hex: number) => {
    mesh.setColorAt(i, color.setHex(hex));
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  };
  // default fresh tint
  for (let i = 0; i < count; i++) setColor(i, PALETTE.green);
  return { mesh, setColor };
}

export const CRATE_STATE_COLOR = {
  fresh: PALETTE.green,
  waiting: PALETTE.yellow,
  rejected: PALETTE.red,
  spoiled: 0x5a3a2b,
  available: PALETTE.coolBlue,
} as const;
