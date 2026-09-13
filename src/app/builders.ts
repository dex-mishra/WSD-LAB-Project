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

export interface WorkerFigureOptions {
  shirtColor?: number;
  pantsColor?: number;
  apronColor?: number;
  capColor?: number;
  skinColor?: number;
  hairColor?: number;
  shoeColor?: number;
  gloveColor?: number;
  hasApron?: boolean;
  hasMask?: boolean;
  hasCap?: boolean;
  hasGloves?: boolean;
  isShorts?: boolean;
  shirtGraphic?: boolean;
  hairStyle?: "swept" | "short" | "cap";
  armAngle?: number;
  role?: "worker" | "shopper" | "farmer" | "vendor" | "inspector";
}

/**
 * Generates a realistic high-resolution face canvas texture with eyes, irises, pupils,
 * highlights, eyelashes, eyebrows, nose bridge, lips, and subtle skin shading.
 */
function makeRealisticFaceTexture(skinHex: number, eyeColor: string = "#2c1c14"): THREE.CanvasTexture {
  const w = 512;
  const h = 512;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;

  const skinStr = "#" + skinHex.toString(16).padStart(6, "0");

  // Smooth skin base
  ctx.fillStyle = skinStr;
  ctx.fillRect(0, 0, w, h);

  // Subtle natural cheek warmth
  const cheekGrad = ctx.createRadialGradient(256, 270, 40, 256, 270, 200);
  cheekGrad.addColorStop(0, "rgba(225, 115, 105, 0.18)");
  cheekGrad.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = cheekGrad;
  ctx.fillRect(0, 0, w, h);

  // Eyes (Left & Right)
  const eyeY = 220;
  for (const eyeX of [176, 336]) {
    // Sclera (Eye White) with smooth shading
    ctx.beginPath();
    ctx.ellipse(eyeX, eyeY, 32, 17, 0, 0, Math.PI * 2);
    ctx.fillStyle = "#fafbfc";
    ctx.fill();
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = "rgba(45,25,20,0.45)";
    ctx.stroke();

    // Iris
    ctx.beginPath();
    ctx.arc(eyeX, eyeY, 13.5, 0, Math.PI * 2);
    ctx.fillStyle = eyeColor;
    ctx.fill();

    // Iris inner detail
    ctx.beginPath();
    ctx.arc(eyeX, eyeY, 13.5, 0, Math.PI * 2);
    ctx.lineWidth = 2;
    ctx.strokeStyle = "rgba(10,5,5,0.7)";
    ctx.stroke();

    // Pupil
    ctx.beginPath();
    ctx.arc(eyeX, eyeY, 6.5, 0, Math.PI * 2);
    ctx.fillStyle = "#0c0d0e";
    ctx.fill();

    // Light reflection highlight spark
    ctx.beginPath();
    ctx.arc(eyeX - 4, eyeY - 4, 3.5, 0, Math.PI * 2);
    ctx.fillStyle = "#ffffff";
    ctx.fill();

    // Upper Eyelid & Eyelash rim
    ctx.beginPath();
    ctx.ellipse(eyeX, eyeY - 2, 34, 17, 0, Math.PI, Math.PI * 2);
    ctx.lineWidth = 4.5;
    ctx.strokeStyle = "#24130c";
    ctx.stroke();

    // Eyebrows (Natural arch)
    ctx.beginPath();
    ctx.moveTo(eyeX - 36, eyeY - 30);
    ctx.quadraticCurveTo(eyeX, eyeY - 46, eyeX + 36, eyeY - 32);
    ctx.lineWidth = 7;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#381a10";
    ctx.stroke();
  }

  // Nose bridge & subtle shading
  ctx.beginPath();
  ctx.moveTo(256, 226);
  ctx.lineTo(252, 292);
  ctx.lineTo(242, 302);
  ctx.lineWidth = 3;
  ctx.strokeStyle = "rgba(110, 55, 35, 0.22)";
  ctx.stroke();

  // Nostril shadows
  for (const nx of [244, 268]) {
    ctx.beginPath();
    ctx.ellipse(nx, 304, 5, 3, 0, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(80, 35, 25, 0.35)";
    ctx.fill();
  }

  // Natural Mouth & Lips
  ctx.beginPath();
  ctx.moveTo(218, 358);
  ctx.quadraticCurveTo(256, 370, 294, 358);
  ctx.lineWidth = 4;
  ctx.strokeStyle = "rgba(150, 50, 50, 0.55)";
  ctx.stroke();

  // Upper lip
  ctx.beginPath();
  ctx.ellipse(256, 354, 30, 6.5, 0, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(185, 75, 75, 0.22)";
  ctx.fill();

  // Lower lip
  ctx.beginPath();
  ctx.ellipse(256, 364, 26, 7.5, 0, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(205, 85, 85, 0.26)";
  ctx.fill();

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

/**
 * Generates a graphic print texture for casual T-shirts (like the reference image's crest).
 */
function makeShirtGraphicTexture(shirtHex: number): THREE.CanvasTexture {
  const w = 512;
  const h = 512;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;

  const shirtStr = "#" + shirtHex.toString(16).padStart(6, "0");
  ctx.fillStyle = shirtStr;
  ctx.fillRect(0, 0, w, h);

  // Center stylized crest logo
  const grad = ctx.createLinearGradient(180, 180, 330, 330);
  grad.addColorStop(0, "#00c6ff");
  grad.addColorStop(0.5, "#0072ff");
  grad.addColorStop(1, "#f4c542");

  ctx.beginPath();
  ctx.arc(256, 250, 68, 0, Math.PI * 2);
  ctx.fillStyle = grad;
  ctx.fill();

  ctx.beginPath();
  ctx.arc(256, 250, 52, 0, Math.PI * 2);
  ctx.fillStyle = shirtStr;
  ctx.fill();

  ctx.beginPath();
  ctx.arc(256, 250, 32, 0, Math.PI * 2);
  ctx.fillStyle = grad;
  ctx.fill();

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * Creates a realistic 3D humanoid character figure with realistic anatomy,
 * expressive face textures, 3D volumetric hair, crewneck/polo shirt, shorts or pants,
 * articulated multi-segment arms with detailed hands, and athletic sneakers or work boots.
 */
export function createWorkerFigure(opts: WorkerFigureOptions = {}): THREE.Group {
  const group = new THREE.Group();

  const shirtCol = opts.shirtColor ?? 0x2a78a8;
  const pantsCol = opts.pantsColor ?? 0x232e3b;
  const apronCol = opts.apronColor ?? 0xf5f7fa;
  const capCol = opts.capColor ?? 0xf4c542;
  const skinCol = opts.skinColor ?? 0xe0ac86; // Natural warm skin tone
  const hairCol = opts.hairColor ?? 0x8d3b24; // Auburn / chestnut brown hair
  const shoeCol = opts.shoeColor ?? 0x1f2429;
  const gloveCol = opts.gloveColor ?? 0x4aa3df;

  const hasApron = opts.hasApron ?? (opts.role !== "shopper" && opts.apronColor !== undefined);
  const hasMask = opts.hasMask ?? (opts.role === "worker");
  const hasCap = opts.hasCap ?? (opts.capColor !== undefined && opts.role !== "shopper");
  const hasGloves = opts.hasGloves ?? (opts.role === "worker" || opts.gloveColor !== undefined);
  const isShorts = opts.isShorts ?? (opts.role === "shopper");
  const shirtGraphic = opts.shirtGraphic ?? (opts.role === "shopper");

  const skinMat = new THREE.MeshStandardMaterial({
    color: skinCol,
    roughness: 0.7,
    metalness: 0.05,
  });

  const shirtMat = shirtGraphic
    ? new THREE.MeshStandardMaterial({
        map: makeShirtGraphicTexture(shirtCol),
        roughness: 0.75,
        metalness: 0.05,
      })
    : new THREE.MeshStandardMaterial({
        color: shirtCol,
        roughness: 0.75,
        metalness: 0.05,
      });

  const pantsMat = new THREE.MeshStandardMaterial({
    color: pantsCol,
    roughness: 0.82,
    metalness: 0.05,
  });

  // ==================== 1. HEAD & FACE ====================
  const headGroup = new THREE.Group();
  headGroup.position.set(0, 1.48, 0);

  // Realistic Face Texture applied to front
  const faceTex = makeRealisticFaceTexture(skinCol);
  const faceMat = new THREE.MeshStandardMaterial({
    map: faceTex,
    roughness: 0.65,
    metalness: 0.04,
  });

  // Anatomical Head Mesh (Rounded sphere base)
  const headMesh = new THREE.Mesh(
    new THREE.SphereGeometry(0.115, 18, 16),
    faceMat
  );
  headMesh.scale.set(0.92, 1.05, 0.96);
  headGroup.add(headMesh);

  // 3D Sculpted Nose Bridge
  const nose = new THREE.Mesh(
    new THREE.ConeGeometry(0.02, 0.05, 8),
    skinMat
  );
  nose.rotation.x = -Math.PI / 2;
  nose.position.set(0, -0.01, 0.115);
  headGroup.add(nose);

  // Ears (Left and Right)
  for (const ex of [-0.11, 0.11]) {
    const ear = new THREE.Mesh(
      new THREE.SphereGeometry(0.025, 8, 8),
      skinMat
    );
    ear.scale.set(0.5, 1.2, 0.8);
    ear.position.set(ex, 0, 0);
    headGroup.add(ear);
  }

  // Volumetric Stylized 3D Hair (like in the reference photo)
  const hairMat = new THREE.MeshStandardMaterial({
    color: hairCol,
    roughness: 0.85,
    metalness: 0.05,
  });

  const hairGroup = new THREE.Group();

  // Top/Back Volume
  const hairTop = new THREE.Mesh(
    new THREE.SphereGeometry(0.12, 14, 12),
    hairMat
  );
  hairTop.scale.set(0.96, 0.85, 1.02);
  hairTop.position.set(0, 0.04, -0.015);
  hairGroup.add(hairTop);

  // Front Swept Bangs / Strands
  const bangL = new THREE.Mesh(
    new THREE.ConeGeometry(0.045, 0.12, 8),
    hairMat
  );
  bangL.rotation.z = -0.45;
  bangL.rotation.x = 0.2;
  bangL.position.set(-0.045, 0.075, 0.088);
  hairGroup.add(bangL);

  const bangR = new THREE.Mesh(
    new THREE.ConeGeometry(0.04, 0.11, 8),
    hairMat
  );
  bangR.rotation.z = 0.55;
  bangR.rotation.x = 0.2;
  bangR.position.set(0.045, 0.07, 0.09);
  hairGroup.add(bangR);

  // Sideburns
  for (const sx of [-0.108, 0.108]) {
    const sideburn = box(0.02, 0.06, 0.04, hairCol, { rough: 0.85 });
    sideburn.position.set(sx, -0.01, 0.01);
    hairGroup.add(sideburn);
  }

  headGroup.add(hairGroup);

  // Optional Safety Cap / Hygiene Bouffant Cap
  if (hasCap) {
    const capMat = new THREE.MeshStandardMaterial({ color: capCol, roughness: 0.6 });
    const cap = new THREE.Mesh(
      new THREE.SphereGeometry(0.128, 14, 12),
      capMat
    );
    cap.scale.set(1.0, 0.7, 1.05);
    cap.position.set(0, 0.06, 0);
    headGroup.add(cap);

    // Cap brim
    const brim = box(0.18, 0.02, 0.1, capCol, { rough: 0.6 });
    brim.position.set(0, 0.04, 0.12);
    headGroup.add(brim);
  }

  // Optional Hygiene Mask
  if (hasMask) {
    const mask = box(0.19, 0.08, 0.1, 0xdce8f0, { rough: 0.7 });
    mask.position.set(0, -0.035, 0.065);
    headGroup.add(mask);
  }

  group.add(headGroup);

  // ==================== 2. NECK & COLLAR ====================
  const neck = new THREE.Mesh(
    new THREE.CylinderGeometry(0.045, 0.055, 0.1, 12),
    skinMat
  );
  neck.position.set(0, 1.33, 0);
  group.add(neck);

  // Crewneck T-shirt Collar Ring
  const collar = new THREE.Mesh(
    new THREE.TorusGeometry(0.065, 0.015, 8, 16),
    shirtMat
  );
  collar.rotation.x = Math.PI / 2;
  collar.position.set(0, 1.28, 0);
  group.add(collar);

  // ==================== 3. TORSO & WORK SHIRT ====================
  const torsoGroup = new THREE.Group();

  // Upper Chest / Shoulders
  const chest = new THREE.Mesh(
    new THREE.CylinderGeometry(0.18, 0.16, 0.28, 14),
    shirtMat
  );
  chest.scale.set(1.15, 1.0, 0.75);
  chest.position.set(0, 1.14, 0);
  torsoGroup.add(chest);

  // Lower Abdomen / Waist
  const waist = new THREE.Mesh(
    new THREE.CylinderGeometry(0.16, 0.15, 0.22, 14),
    shirtMat
  );
  waist.scale.set(1.08, 1.0, 0.72);
  waist.position.set(0, 0.92, 0);
  torsoGroup.add(waist);

  // Optional Food Safety Apron
  if (hasApron) {
    const apron = box(0.32, 0.48, 0.04, apronCol, { rough: 0.65 });
    apron.position.set(0, 1.0, 0.095);
    torsoGroup.add(apron);

    // Apron neck strap
    const strapL = box(0.02, 0.22, 0.02, apronCol);
    strapL.position.set(-0.08, 1.22, 0.06);
    strapL.rotation.z = -0.3;
    torsoGroup.add(strapL);

    const strapR = box(0.02, 0.22, 0.02, apronCol);
    strapR.position.set(0.08, 1.22, 0.06);
    strapR.rotation.z = 0.3;
    torsoGroup.add(strapR);
  }

  group.add(torsoGroup);

  // ==================== 4. ARTICULATED ARMS & HANDS ====================
  const armAngle = opts.armAngle ?? 0.25;

  // Left Arm
  const armL = buildRealisticArm({
    side: "left",
    shirtMat,
    skinMat,
    gloveCol,
    hasGloves,
    armAngle,
  });
  armL.position.set(-0.21, 1.24, 0);
  armL.name = "armL";
  group.add(armL);

  // Right Arm
  const armR = buildRealisticArm({
    side: "right",
    shirtMat,
    skinMat,
    gloveCol,
    hasGloves,
    armAngle,
  });
  armR.position.set(0.21, 1.24, 0);
  armR.name = "armR";
  group.add(armR);

  // ==================== 5. PELVIS, LEGS & SNEAKERS ====================
  // Pelvis / Waistband (Shorts or Trousers)
  const pelvis = new THREE.Mesh(
    new THREE.CylinderGeometry(0.155, 0.145, 0.16, 12),
    pantsMat
  );
  pelvis.scale.set(1.08, 1.0, 0.72);
  pelvis.position.set(0, 0.75, 0);
  group.add(pelvis);

  // Left Leg
  const legL = buildRealisticLeg({
    side: "left",
    pantsMat,
    skinMat,
    shoeCol,
    isShorts,
  });
  legL.position.set(-0.10, 0.68, 0);
  legL.name = "legL";
  group.add(legL);

  // Right Leg
  const legR = buildRealisticLeg({
    side: "right",
    pantsMat,
    skinMat,
    shoeCol,
    isShorts,
  });
  legR.position.set(0.10, 0.68, 0);
  legR.name = "legR";
  group.add(legR);

  return group;
}

/**
 * Builds a realistic multi-segment arm with deltoid sleeve cap, bicep,
 * elbow joint, forearm, wrist, and 4-finger sculpted hand with thumb.
 */
function buildRealisticArm(opts: {
  side: "left" | "right";
  shirtMat: THREE.Material;
  skinMat: THREE.Material;
  gloveCol: number;
  hasGloves: boolean;
  armAngle: number;
}): THREE.Group {
  const arm = new THREE.Group();
  const sign = opts.side === "left" ? -1 : 1;

  // 1. Deltoid Shoulder Sleeve Cap
  const sleeve = new THREE.Mesh(
    new THREE.SphereGeometry(0.062, 10, 10),
    opts.shirtMat
  );
  sleeve.position.set(0, 0, 0);
  arm.add(sleeve);

  // Sleeve cuff
  const cuff = new THREE.Mesh(
    new THREE.CylinderGeometry(0.052, 0.05, 0.08, 10),
    opts.shirtMat
  );
  cuff.position.set(0, -0.06, 0);
  arm.add(cuff);

  // 2. Upper Arm Bicep (Skin tone)
  const bicep = new THREE.Mesh(
    new THREE.CylinderGeometry(0.044, 0.038, 0.18, 10),
    opts.skinMat
  );
  bicep.position.set(0, -0.16, 0.02);
  bicep.rotation.x = opts.armAngle;
  arm.add(bicep);

  // 3. Elbow Joint Sphere
  const elbow = new THREE.Mesh(
    new THREE.SphereGeometry(0.038, 8, 8),
    opts.skinMat
  );
  elbow.position.set(0, -0.24, 0.04);
  arm.add(elbow);

  // 4. Forearm
  const forearm = new THREE.Mesh(
    new THREE.CylinderGeometry(0.038, 0.032, 0.18, 10),
    opts.skinMat
  );
  forearm.position.set(0, -0.32, 0.08);
  forearm.rotation.x = opts.armAngle * 1.3;
  arm.add(forearm);

  // 5. Hand (Palm, Thumb & 4 Sculpted Fingers)
  const handMat = opts.hasGloves
    ? new THREE.MeshStandardMaterial({ color: opts.gloveCol, roughness: 0.5 })
    : opts.skinMat;

  const handGroup = new THREE.Group();
  handGroup.position.set(0, -0.42, 0.12);
  handGroup.rotation.x = opts.armAngle * 1.3;

  // Palm
  const palm = box(0.055, 0.06, 0.025, 0x0, { rough: 0.7 });
  palm.material = handMat;
  handGroup.add(palm);

  // Thumb
  const thumb = box(0.016, 0.035, 0.016, 0x0);
  thumb.material = handMat;
  thumb.position.set(sign * 0.032, 0.01, 0.01);
  thumb.rotation.z = sign * -0.5;
  handGroup.add(thumb);

  // 4 Fingers
  for (let f = 0; f < 4; f++) {
    const finger = box(0.011, 0.038, 0.012, 0x0);
    finger.material = handMat;
    finger.position.set(-0.02 + f * 0.013, -0.042, 0.005);
    finger.rotation.x = 0.2; // Slight natural relaxed curl
    handGroup.add(finger);
  }

  arm.add(handGroup);
  return arm;
}

/**
 * Builds a realistic multi-segment leg with thigh (shorts or pants),
 * knee joint, calf, ankle, and detailed athletic sneaker or work boot.
 */
function buildRealisticLeg(opts: {
  side: "left" | "right";
  pantsMat: THREE.Material;
  skinMat: THREE.Material;
  shoeCol: number;
  isShorts: boolean;
}): THREE.Group {
  const leg = new THREE.Group();

  // 1. Thigh (Upper Leg)
  const thighMat = opts.isShorts ? opts.pantsMat : opts.pantsMat;
  const thigh = new THREE.Mesh(
    new THREE.CylinderGeometry(0.068, 0.056, 0.28, 12),
    thighMat
  );
  thigh.position.set(0, -0.14, 0);
  leg.add(thigh);

  // Shorts hem cuff if shorts
  if (opts.isShorts) {
    const shortsHem = box(0.14, 0.02, 0.14, 0x1f2429);
    shortsHem.position.set(0, -0.26, 0);
    leg.add(shortsHem);

    // Bare lower thigh in skin tone
    const bareThigh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.054, 0.048, 0.08, 10),
      opts.skinMat
    );
    bareThigh.position.set(0, -0.30, 0);
    leg.add(bareThigh);
  }

  // 2. Knee Joint Sphere
  const kneeMat = opts.isShorts ? opts.skinMat : opts.pantsMat;
  const knee = new THREE.Mesh(
    new THREE.SphereGeometry(0.05, 8, 8),
    kneeMat
  );
  knee.position.set(0, -0.35, 0.01);
  leg.add(knee);

  // 3. Lower Leg (Calf & Shin)
  const calfMat = opts.isShorts ? opts.skinMat : opts.pantsMat;
  const calf = new THREE.Mesh(
    new THREE.CylinderGeometry(0.048, 0.038, 0.26, 10),
    calfMat
  );
  calf.position.set(0, -0.48, 0);
  leg.add(calf);

  // 4. White Athletic Sock
  const sock = box(0.08, 0.05, 0.08, 0xf0f4f8);
  sock.position.set(0, -0.59, 0);
  leg.add(sock);

  // 5. Realistic Athletic Sneaker / Work Boot (Ground Level)
  const shoeGroup = new THREE.Group();
  shoeGroup.position.set(0, -0.64, 0.03);

  // Rubber Outsole (Black/Dark)
  const outsole = box(0.10, 0.02, 0.22, 0x111315, { rough: 0.9 });
  outsole.position.set(0, 0.01, 0);
  shoeGroup.add(outsole);

  // White EVA Midsole
  const midsole = box(0.096, 0.025, 0.21, 0xffffff, { rough: 0.5 });
  midsole.position.set(0, 0.03, 0);
  shoeGroup.add(midsole);

  // Upper Sneaker Body (Shoe color)
  const upper = box(0.092, 0.065, 0.20, opts.shoeCol, { rough: 0.65 });
  upper.position.set(0, 0.07, -0.005);
  shoeGroup.add(upper);

  // Rounded Toe Cap
  const toeCap = new THREE.Mesh(
    new THREE.CylinderGeometry(0.044, 0.046, 0.04, 8),
    new THREE.MeshStandardMaterial({ color: 0xd0dfea, roughness: 0.5 })
  );
  toeCap.position.set(0, 0.05, 0.08);
  shoeGroup.add(toeCap);

  // Shoe Laces (White criss-cross)
  for (const lz of [0.01, 0.04]) {
    const lace = box(0.06, 0.008, 0.015, 0xffffff);
    lace.position.set(0, 0.105, lz);
    shoeGroup.add(lace);
  }

  leg.add(shoeGroup);
  return leg;
}

/**
 * Creates an industrial electric/diesel forklift with mast, carriage, forks, roll cage, seat, wheels, and beacon.
 */
export function createForklift(opts: { color?: number } = {}): THREE.Group {
  const group = new THREE.Group();
  const bodyColor = opts.color ?? 0xf4a100; // Industrial safety yellow/orange
  const metalColor = 0x242d36; // Dark chassis & mast steel

  // 1. Lower chassis / body
  const body = box(1.2, 0.65, 1.5, bodyColor);
  body.position.set(0, 0.55, -0.15);
  group.add(body);

  // Counterweight rear block
  const counterweight = box(1.22, 0.55, 0.45, 0x1a2128);
  counterweight.position.set(0, 0.55, -0.85);
  group.add(counterweight);

  // 2. Wheels (4 industrial solid rubber tires)
  const wheelMat = new THREE.MeshStandardMaterial({ color: 0x15181b, roughness: 0.85 });
  const hubMat = new THREE.MeshStandardMaterial({ color: 0x5a6570, metalness: 0.5 });
  const wheelGeo = new THREE.CylinderGeometry(0.3, 0.3, 0.22, 16);
  const hubGeo = new THREE.CylinderGeometry(0.14, 0.14, 0.23, 12);

  const wheelPositions = [
    [0.58, 0.3, 0.45],  // Front right
    [-0.58, 0.3, 0.45], // Front left
    [0.54, 0.26, -0.7], // Rear right
    [-0.54, 0.26, -0.7] // Rear left
  ];

  for (const [x, y, z] of wheelPositions) {
    const tire = new THREE.Mesh(wheelGeo, wheelMat);
    tire.rotation.z = Math.PI / 2;
    tire.position.set(x, y, z);
    tire.castShadow = true;
    const hub = new THREE.Mesh(hubGeo, hubMat);
    tire.add(hub);
    group.add(tire);
  }

  // 3. Roll Cage / Overhead Guard (ROPS)
  const cagePosts = [
    [0.52, 1.4, 0.35],
    [-0.52, 1.4, 0.35],
    [0.52, 1.4, -0.65],
    [-0.52, 1.4, -0.65]
  ];
  for (const [x, y, z] of cagePosts) {
    const post = box(0.06, 1.25, 0.06, metalColor);
    post.position.set(x, y, z);
    group.add(post);
  }

  // Roof guard
  const roof = box(1.14, 0.05, 1.1, metalColor);
  roof.position.set(0, 2.02, -0.15);
  group.add(roof);

  // Amber warning beacon on roof
  const beaconBase = box(0.14, 0.04, 0.14, 0x111111);
  beaconBase.position.set(0, 2.06, -0.15);
  group.add(beaconBase);
  const beaconLight = new THREE.Mesh(
    new THREE.CylinderGeometry(0.06, 0.06, 0.1, 12),
    new THREE.MeshStandardMaterial({
      color: 0xffaa00,
      emissive: 0xff8800,
      emissiveIntensity: 0.8,
      roughness: 0.2
    })
  );
  beaconLight.position.set(0, 2.12, -0.15);
  group.add(beaconLight);

  // 4. Operator Seat & Steering Console
  const seat = box(0.46, 0.38, 0.44, 0x181a1d);
  seat.position.set(0, 0.95, -0.2);
  group.add(seat);
  const seatBack = box(0.44, 0.44, 0.1, 0x181a1d);
  seatBack.position.set(0, 1.25, -0.38);
  group.add(seatBack);

  const dashConsole = box(0.38, 0.55, 0.22, metalColor);
  dashConsole.position.set(0, 1.05, 0.22);
  group.add(dashConsole);

  const steeringWheel = new THREE.Mesh(
    new THREE.TorusGeometry(0.1, 0.02, 8, 16),
    new THREE.MeshStandardMaterial({ color: 0x111111 })
  );
  steeringWheel.rotation.x = Math.PI / 3;
  steeringWheel.position.set(0, 1.35, 0.18);
  group.add(steeringWheel);

  // 5. Front Vertical Mast & Rails
  const mastL = box(0.08, 1.9, 0.1, metalColor);
  mastL.position.set(-0.36, 1.05, 0.68);
  group.add(mastL);

  const mastR = box(0.08, 1.9, 0.1, metalColor);
  mastR.position.set(0.36, 1.05, 0.68);
  group.add(mastR);

  const mastCrossTop = box(0.8, 0.08, 0.08, metalColor);
  mastCrossTop.position.set(0, 1.95, 0.68);
  group.add(mastCrossTop);

  const mastCrossMid = box(0.8, 0.08, 0.08, metalColor);
  mastCrossMid.position.set(0, 1.15, 0.68);
  group.add(mastCrossMid);

  // Hydraulic lift cylinder
  const hydCylinder = new THREE.Mesh(
    new THREE.CylinderGeometry(0.04, 0.04, 1.5, 12),
    new THREE.MeshStandardMaterial({ color: 0xb0bec5, metalness: 0.85, roughness: 0.2 })
  );
  hydCylinder.position.set(0, 0.95, 0.66);
  group.add(hydCylinder);

  // 6. Fork Carriage Backrest
  const carriage = box(0.86, 0.45, 0.05, 0x37474f);
  carriage.position.set(0, 0.38, 0.76);
  group.add(carriage);

  // 7. Steel Fork Tines (Prongs)
  for (const fx of [-0.25, 0.25]) {
    const shank = box(0.08, 0.42, 0.04, 0x37474f);
    shank.position.set(fx, 0.38, 0.79);
    group.add(shank);

    const blade = box(0.08, 0.035, 1.05, 0x37474f);
    blade.position.set(fx, 0.16, 1.32);
    group.add(blade);
  }

  return group;
}

/**
 * Creates an industrial refrigerated box truck with insulated reefer body,
 * over-cab cooling unit, headlights, chrome grille, and pallet cargo in rear.
 */
export function createRefrigeratedTruck(opts: { cabColor?: number; cargoColor?: number } = {}): THREE.Group {
  const group = new THREE.Group();
  const cabCol = opts.cabColor ?? 0x184c7a;
  const cargoCol = opts.cargoColor ?? 0xf0f5fa;

  // 1. Heavy Chassis Frame
  const chassis = box(1.8, 0.22, 6.2, 0x1f262e);
  chassis.position.set(0, 0.45, 0);
  group.add(chassis);

  // 2. Front Driver Cab
  const cab = box(1.9, 1.75, 1.8, cabCol);
  cab.position.set(0, 1.4, 2.2);
  group.add(cab);

  // Windshield (dark glass)
  const windshield = box(1.7, 0.75, 0.05, 0x112233, { rough: 0.1, metal: 0.8 });
  windshield.position.set(0, 1.7, 3.11);
  windshield.rotation.x = 0.12;
  group.add(windshield);

  // Front Grille & Bumper
  const bumper = box(2.0, 0.35, 0.25, 0xd0dfea, { metal: 0.8 });
  bumper.position.set(0, 0.48, 3.15);
  group.add(bumper);

  const grille = box(1.4, 0.5, 0.05, 0x111111);
  grille.position.set(0, 0.95, 3.12);
  group.add(grille);

  // Headlights (glowing)
  for (const hx of [-0.75, 0.75]) {
    const light = new THREE.Mesh(
      new THREE.CircleGeometry(0.12, 12),
      new THREE.MeshStandardMaterial({
        color: 0xfffae8,
        emissive: 0xfffae8,
        emissiveIntensity: 0.9,
      })
    );
    light.position.set(hx, 0.75, 3.28);
    group.add(light);
  }

  // Side mirrors
  for (const mx of [-1.08, 1.08]) {
    const mirror = box(0.08, 0.3, 0.15, 0x222222);
    mirror.position.set(mx, 1.6, 2.7);
    group.add(mirror);
  }

  // 3. Insulated Refrigerated Cargo Box (Reefer Body)
  const cargoBox = box(2.3, 2.35, 4.4, cargoCol, { rough: 0.3 });
  cargoBox.position.set(0, 1.75, -0.9);
  group.add(cargoBox);

  // Over-Cab Refrigeration Chiller Unit (Thermo King style reefer)
  const reefer = box(1.5, 0.75, 0.9, 0xdfeaf2, { rough: 0.35, metal: 0.3 });
  reefer.position.set(0, 2.45, 1.7);
  group.add(reefer);

  const reeferGrille = box(1.3, 0.55, 0.05, 0x223344);
  reeferGrille.position.set(0, 2.45, 2.16);
  group.add(reeferGrille);

  // Green Reefer Power Status LED
  const reeferLed = new THREE.Mesh(
    new THREE.SphereGeometry(0.05, 8, 8),
    new THREE.MeshStandardMaterial({ color: 0x00ff88, emissive: 0x00ff88, emissiveIntensity: 1.2 })
  );
  reeferLed.position.set(0.65, 2.7, 2.16);
  group.add(reeferLed);

  // 4. Rear Loading Roll-up Door & Pallet Cargo visible inside
  const rearDoorFrame = box(2.1, 2.15, 0.05, 0x334455);
  rearDoorFrame.position.set(0, 1.75, -3.11);
  group.add(rearDoorFrame);

  // Pallet with green produce crates visible in loading bay
  const dockPallet = box(1.1, 0.1, 0.9, 0xbe8d52);
  dockPallet.position.set(0, 0.65, -2.5);
  group.add(dockPallet);

  for (let ci = 0; ci < 4; ci++) {
    const crate = box(0.48, 0.42, 0.4, PALETTE.green);
    crate.position.set(
      ci % 2 === 0 ? -0.26 : 0.26,
      0.92 + Math.floor(ci / 2) * 0.44,
      -2.5
    );
    group.add(crate);
  }

  // 5. Heavy-Duty Commercial Wheels (6 wheels: 2 front, 4 rear)
  const wheelMat = new THREE.MeshStandardMaterial({ color: 0x16191c, roughness: 0.85 });
  const wheelGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.28, 16);

  const wheelSpots = [
    [0.95, 0.42, 2.1],   // Front Right
    [-0.95, 0.42, 2.1],  // Front Left
    [0.95, 0.42, -1.3],  // Mid Rear Right
    [-0.95, 0.42, -1.3], // Mid Rear Left
    [0.95, 0.42, -2.3],  // Back Rear Right
    [-0.95, 0.42, -2.3], // Back Rear Left
  ];

  for (const [wx, wy, wz] of wheelSpots) {
    const tire = new THREE.Mesh(wheelGeo, wheelMat);
    tire.rotation.z = Math.PI / 2;
    tire.position.set(wx, wy, wz);
    tire.castShadow = true;

    // Steel Hubcap
    const hub = new THREE.Mesh(
      new THREE.CylinderGeometry(0.2, 0.2, 0.29, 12),
      new THREE.MeshStandardMaterial({ color: 0x8a99a8, metalness: 0.7 })
    );
    tire.add(hub);
    group.add(tire);
  }

  return group;
}

export interface AirArrowOptions {
  step: string;
  purpose: string;
  colorHex?: number;
  widthM?: number;
}

/**
 * Creates a floating 3D air arrow mesh with embossed text and purpose description
 * rendered onto a crisp canvas texture.
 */
export function makeAirArrowMesh(opts: AirArrowOptions): THREE.Mesh {
  const widthM = opts.widthM ?? 3.2;
  const colorHex = opts.colorHex ?? 0x2a78a8;
  const colorStr = "#" + colorHex.toString(16).padStart(6, "0");

  const w = 1024;
  const h = 420;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;

  ctx.clearRect(0, 0, w, h);

  const topY = 70;
  const arrowH = 260;
  const bodyEnd = 760;
  const headTip = 980;
  const headTop = 20;
  const headBottom = 380;

  // Arrow outline / background fill
  ctx.beginPath();
  ctx.moveTo(30, topY);
  ctx.lineTo(bodyEnd, topY);
  ctx.lineTo(bodyEnd, headTop);
  ctx.lineTo(headTip, topY + arrowH / 2);
  ctx.lineTo(bodyEnd, headBottom);
  ctx.lineTo(bodyEnd, topY + arrowH);
  ctx.lineTo(30, topY + arrowH);
  ctx.closePath();

  ctx.fillStyle = "rgba(10, 24, 38, 0.94)";
  ctx.fill();

  ctx.lineWidth = 14;
  ctx.strokeStyle = colorStr;
  ctx.stroke();

  // Left accent bar
  ctx.fillStyle = colorStr;
  ctx.fillRect(30, topY, 18, arrowH);

  // Chevron marker
  ctx.beginPath();
  ctx.moveTo(bodyEnd - 40, topY + 40);
  ctx.lineTo(bodyEnd + 50, topY + arrowH / 2);
  ctx.lineTo(bodyEnd - 40, topY + arrowH - 40);
  ctx.lineWidth = 16;
  ctx.strokeStyle = colorStr;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.stroke();

  // Step title (Bold accent)
  ctx.font = "800 46px 'Segoe UI', system-ui, sans-serif";
  ctx.fillStyle = colorStr;
  ctx.fillText(opts.step, 65, topY + 68);

  // Purpose description (Crisp white)
  ctx.font = "600 30px 'Segoe UI', system-ui, sans-serif";
  ctx.fillStyle = "#ffffff";
  ctx.fillText(`PURPOSE: ${opts.purpose}`, 65, topY + 145);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 16;
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.needsUpdate = true;

  const aspect = h / w;
  const mat = new THREE.MeshBasicMaterial({
    map: tex,
    transparent: true,
    side: THREE.DoubleSide,
    depthWrite: false,
    depthTest: true,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(widthM, widthM * aspect), mat);
  mesh.renderOrder = 3;
  return mesh;
}
