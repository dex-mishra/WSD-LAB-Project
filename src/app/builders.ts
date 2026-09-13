import * as THREE from "three";
import { PALETTE } from "./palette";

/**
 * Reusable geometry/material builders for greybox environments and labels.
 * These keep scene files terse and enforce metre-based scale and the palette.
 */

const _sharedGeo = {
  box: new THREE.BoxGeometry(1, 1, 1),
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
    roughness: opts.rough ?? 0.85,
    metalness: opts.metal ?? 0.0,
    emissive: opts.emissive ?? 0x000000,
    emissiveIntensity: opts.emissive ? 0.6 : 0,
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
): THREE.Mesh {
  const mat = new THREE.MeshStandardMaterial({
    color,
    roughness: 0.95,
    metalness: 0,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, d), mat);
  mesh.rotation.x = -Math.PI / 2;
  mesh.receiveShadow = true;
  return mesh;
}

/**
 * A crop-based canvas texture label used as an in-world sign or floor decal.
 * Text is kept short and high contrast per the UI guidelines.
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
  } = {}
): THREE.CanvasTexture {
  const width = opts.width ?? 512;
  const height = opts.height ?? 256;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;

  ctx.fillStyle = opts.bg ?? "rgba(23,50,77,0.92)";
  roundRect(ctx, 0, 0, width, height, 24);
  ctx.fill();

  ctx.fillStyle = opts.fg ?? "#F7F5EE";
  const fontSize = opts.fontSize ?? 64;
  ctx.font = `700 ${fontSize}px "Segoe UI", system-ui, sans-serif`;
  ctx.textBaseline = "middle";
  ctx.textAlign = opts.align ?? "center";

  const lines = text.split("\n");
  const lineH = fontSize * 1.2;
  const startY = height / 2 - ((lines.length - 1) * lineH) / 2;
  const x = ctx.textAlign === "left" ? (opts.padding ?? 32) : width / 2;
  lines.forEach((line, i) => ctx.fillText(line, x, startY + i * lineH));

  const tex = new THREE.CanvasTexture(canvas);
  tex.anisotropy = 4;
  tex.needsUpdate = true;
  return tex;
}

/** A world-space label plane (used as signage or zone markers). */
export function label(
  text: string,
  widthMeters: number,
  opts: Parameters<typeof makeTextTexture>[1] = {}
): THREE.Mesh {
  const tex = makeTextTexture(text, opts);
  const aspect = (opts.height ?? 256) / (opts.width ?? 512);
  const mat = new THREE.MeshBasicMaterial({
    map: tex,
    transparent: true,
    depthWrite: false,
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
    roughness: 0.8,
    metalness: 0.05,
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
