import * as THREE from "three";
import { box } from "../app/builders";
import type { InteractableMeta } from "../interaction/Interactable";

/**
 * World-space high-contrast inspection callout.
 * Features an opaque backing chassis, an AR anchor stem connecting to the
 * inspected object, and an ultra-crisp vector canvas card that never overlaps or bleeds.
 */
export class InfoPanel {
  readonly group = new THREE.Group();
  private screenMesh: THREE.Mesh;
  private material: THREE.MeshBasicMaterial;
  private stemLine: THREE.Line;
  private anchorRing: THREE.Mesh;

  constructor() {
    // 1. Sleek backing chassis (prevents 3D geometry from bleeding into the text)
    const casing = box(2.26, 1.46, 0.05, 0x091420);
    casing.position.set(0, 0, -0.03);
    this.group.add(casing);

    // Subtle accent frame
    const frame = box(2.22, 1.42, 0.02, 0x1e3a59);
    frame.position.set(0, 0, -0.005);
    this.group.add(frame);

    // 2. Front display screen (100% opaque, depthWrite enabled)
    this.material = new THREE.MeshBasicMaterial({
      transparent: false,
      depthWrite: true,
      depthTest: true,
    });
    this.screenMesh = new THREE.Mesh(new THREE.PlaneGeometry(2.18, 1.38), this.material);
    this.screenMesh.position.set(0, 0, 0.008);
    this.screenMesh.renderOrder = 4;
    this.group.add(this.screenMesh);

    // 3. AR Anchor Stem (line from bottom of panel down to object top)
    const stemGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, -0.7, 0),
      new THREE.Vector3(0, -1.05, 0),
    ]);
    const stemMat = new THREE.LineBasicMaterial({
      color: 0xf4c542,
      linewidth: 2,
    });
    this.stemLine = new THREE.Line(stemGeo, stemMat);
    this.group.add(this.stemLine);

    // 4. Target dot / ring at the anchor point on the object
    const ringGeo = new THREE.RingGeometry(0.04, 0.08, 24);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xf4c542,
      side: THREE.DoubleSide,
    });
    this.anchorRing = new THREE.Mesh(ringGeo, ringMat);
    this.anchorRing.rotation.x = -Math.PI / 2;
    this.anchorRing.position.set(0, -1.05, 0);
    this.group.add(this.anchorRing);

    this.group.visible = false;
  }

  showFor(meta: InteractableMeta, worldPos: THREE.Vector3): void {
    const width = 1100;
    const height = 700;
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d")!;

    // 1. Dark high-tech card background
    ctx.fillStyle = "#0c1b2a";
    ctx.fillRect(0, 0, width, height);

    // Outer subtle border
    ctx.strokeStyle = "rgba(42, 120, 168, 0.5)";
    ctx.lineWidth = 4;
    ctx.strokeRect(2, 2, width - 4, height - 4);

    // 2. Header Bar
    ctx.fillStyle = "#11263c";
    ctx.fillRect(0, 0, width, 125);

    // Category Kicker
    ctx.font = "700 20px 'Segoe UI', system-ui, sans-serif";
    ctx.fillStyle = "#f4c542";
    ctx.letterSpacing = "1.5px";
    ctx.fillText(`ASSET INSPECTOR  ·  ZONE: ${meta.zone.toUpperCase()}`, 36, 42);

    // Title
    ctx.font = "800 38px 'Segoe UI', system-ui, sans-serif";
    ctx.fillStyle = "#ffffff";
    ctx.fillText(meta.title, 36, 92);

    // Close prompt on top right
    ctx.font = "600 18px 'Segoe UI', system-ui, sans-serif";
    ctx.fillStyle = "#8ea5bc";
    ctx.textAlign = "right";
    ctx.fillText("✕ Click anywhere to close", width - 36, 50);
    ctx.textAlign = "left";

    // Gold divider
    ctx.fillStyle = "#f4c542";
    ctx.fillRect(0, 122, width, 3);

    // 3. Metadata Badges Row (Y = 145)
    let badgeX = 36;
    badgeX = drawTagBadge(ctx, badgeX, 145, `TYPE: ${meta.assetType.toUpperCase()}`, "#1e3d5c", "#7fd6a0");

    const isSource = meta.sourceStatus === "SOURCE";
    const isInference = meta.sourceStatus === "INFERENCE";
    const statusText = isSource
      ? "✓ SOURCE DATA (NABCONS / MoFPI)"
      : isInference
      ? "ℹ ENGINEERING INFERENCE"
      : "★ PROPOSED INTERVENTION MODEL";
    const statusBg = isSource ? "#2e7d32" : isInference ? "#2a78a8" : "#f4c542";
    const statusFg = meta.sourceStatus === "PROPOSED" ? "#0e1c2b" : "#ffffff";
    drawTagBadge(ctx, badgeX, 145, statusText, statusBg, statusFg);

    // 4. Description & Key Attributes (Y = 220)
    ctx.font = "700 18px 'Segoe UI', system-ui, sans-serif";
    ctx.fillStyle = "#8ea5bc";
    ctx.letterSpacing = "1.5px";
    ctx.fillText("OPERATIONAL SPECIFICATIONS & DETAILS", 36, 230);

    ctx.strokeStyle = "rgba(255,255,255,0.1)";
    ctx.beginPath();
    ctx.moveTo(36, 242);
    ctx.lineTo(width - 36, 242);
    ctx.stroke();

    // Filter out duplicate metadata already shown in badges
    const cleanInfo = meta.info.filter((line) => {
      const lower = line.toLowerCase();
      return !lower.startsWith("assettype:") && !lower.startsWith("zone:");
    });

    // Draw clean bullet items
    let curY = 285;
    for (const infoLine of cleanInfo) {
      // Bullet icon
      ctx.fillStyle = "#f4c542";
      ctx.beginPath();
      ctx.arc(48, curY - 7, 5, 0, Math.PI * 2);
      ctx.fill();

      // Text line
      ctx.font = "600 24px 'Segoe UI', system-ui, sans-serif";
      ctx.fillStyle = "#e6f0fa";
      ctx.fillText(infoLine, 68, curY);
      curY += 52;
    }

    // 5. Bottom Advice Banner
    ctx.fillStyle = "#09131d";
    ctx.fillRect(0, height - 70, width, 70);
    ctx.strokeStyle = "rgba(255,255,255,0.08)";
    ctx.beginPath();
    ctx.moveTo(0, height - 70);
    ctx.lineTo(width, height - 70);
    ctx.stroke();

    ctx.font = "600 18px 'Segoe UI', system-ui, sans-serif";
    ctx.fillStyle = "#8ea5bc";
    ctx.fillText("💡 Click on any equipment or station in the twin to inspect operations and metrics.", 36, height - 28);

    // Upload texture to material
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 16;
    tex.minFilter = THREE.LinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.needsUpdate = true;

    const old = this.material.map;
    this.material.map = tex;
    this.material.needsUpdate = true;
    old?.dispose();

    this.group.position.copy(worldPos);
    this.group.visible = true;
  }

  private tmpQuat = new THREE.Quaternion();

  faceCamera(camera: THREE.Camera): void {
    if (!this.group.visible) return;
    camera.getWorldQuaternion(this.tmpQuat);
    this.group.quaternion.copy(this.tmpQuat);
  }

  hide(): void {
    this.group.visible = false;
  }
}

function drawTagBadge(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  text: string,
  bg: string,
  fg: string
): number {
  ctx.font = "700 16px 'Segoe UI', system-ui, sans-serif";
  const textWidth = ctx.measureText(text).width;
  const padH = 14;
  const h = 34;
  const w = textWidth + padH * 2;

  ctx.fillStyle = bg;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 6);
  ctx.fill();

  ctx.fillStyle = fg;
  ctx.fillText(text, x + padH, y + 23);

  return x + w + 12;
}

