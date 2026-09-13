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
  gloveColor?: number;
  armAngle?: number;
}

/**
 * Creates a stylized industrial food factory worker figure with PPE (hairnet/cap, mask, apron, gloves, boots).
 */
export function createWorkerFigure(opts: WorkerFigureOptions = {}): THREE.Group {
  const group = new THREE.Group();

  const shirtCol = opts.shirtColor ?? 0x2a78a8;
  const pantsCol = opts.pantsColor ?? 0x1f2e3d;
  const apronCol = opts.apronColor ?? 0xf5f7fa;
  const capCol = opts.capColor ?? 0xf4c542;
  const skinCol = opts.skinColor ?? 0xdca880;
  const gloveCol = opts.gloveColor ?? 0x4aa3df;

  // 1. Safety Boots (ground level)
  const bootL = box(0.14, 0.12, 0.22, 0x181e24);
  bootL.position.set(-0.11, 0.06, 0.02);
  group.add(bootL);

  const bootR = box(0.14, 0.12, 0.22, 0x181e24);
  bootR.position.set(0.11, 0.06, 0.02);
  group.add(bootR);

  // 2. Legs / Trousers
  const legL = box(0.13, 0.62, 0.15, pantsCol);
  legL.position.set(-0.11, 0.42, 0);
  group.add(legL);

  const legR = box(0.13, 0.62, 0.15, pantsCol);
  legR.position.set(0.11, 0.42, 0);
  group.add(legR);

  // 3. Torso / Work Shirt
  const torso = box(0.38, 0.48, 0.22, shirtCol);
  torso.position.set(0, 0.96, 0);
  group.add(torso);

  // 4. Food-Grade Hygiene Apron
  const apron = box(0.32, 0.44, 0.23, apronCol);
  apron.position.set(0, 0.94, 0.01);
  group.add(apron);

  // 5. Neck
  const neck = box(0.1, 0.08, 0.1, skinCol);
  neck.position.set(0, 1.23, 0);
  group.add(neck);

  // 6. Head
  const head = box(0.2, 0.22, 0.2, skinCol);
  head.position.set(0, 1.38, 0);
  group.add(head);

  // 7. Face Mask (hygiene standard)
  const mask = box(0.21, 0.09, 0.12, 0xe2eaf0);
  mask.position.set(0, 1.34, 0.06);
  group.add(mask);

  // 8. Safety Cap / Hairnet
  const cap = box(0.22, 0.12, 0.22, capCol);
  cap.position.set(0, 1.5, 0);
  group.add(cap);

  // 9. Left Arm
  const armL = new THREE.Group();
  armL.position.set(-0.24, 1.15, 0);
  const upperArmL = box(0.1, 0.36, 0.1, shirtCol);
  upperArmL.position.set(0, -0.16, 0.08);
  upperArmL.rotation.x = opts.armAngle ?? 0.45;
  const glL = box(0.11, 0.12, 0.11, gloveCol);
  glL.position.set(0, -0.32, 0.16);
  glL.rotation.x = opts.armAngle ?? 0.45;
  armL.add(upperArmL);
  armL.add(glL);
  armL.name = "armL";
  group.add(armL);

  // 10. Right Arm
  const armR = new THREE.Group();
  armR.position.set(0.24, 1.15, 0);
  const upperArmR = box(0.1, 0.36, 0.1, shirtCol);
  upperArmR.position.set(0, -0.16, 0.08);
  upperArmR.rotation.x = opts.armAngle ?? 0.45;
  const glR = box(0.11, 0.12, 0.11, gloveCol);
  glR.position.set(0, -0.32, 0.16);
  glR.rotation.x = opts.armAngle ?? 0.45;
  armR.add(upperArmR);
  armR.add(glR);
  armR.name = "armR";
  group.add(armR);

  return group;
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



