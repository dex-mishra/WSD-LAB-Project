import * as THREE from "three";
import { box } from "../app/builders";
import type { ScenarioEngine, EngineSnapshot } from "../simulation/ScenarioEngine";

/**
 * World-space dashboard kiosk.
 * Built with a realistic back chassis, rear support pillars, and an opaque,
 * ultra-high-resolution digital twin terminal display that never clips or bleeds.
 */
export class Dashboard {
  readonly group = new THREE.Group();
  private screenMesh: THREE.Mesh;
  private material: THREE.MeshBasicMaterial;
  private latest: EngineSnapshot | null = null;
  private dirty = true;

  constructor(private engine: ScenarioEngine) {
    // 1. Heavy floor base plate (sits on the ground)
    const base = box(1.5, 0.06, 0.8, 0x112233);
    base.position.set(0, -1.35, -0.08);
    this.group.add(base);

    // 2. Dual support pillars BEHIND the display (no clipping through screen)
    const pillarL = box(0.08, 1.35, 0.08, 0x1e354d);
    pillarL.position.set(-0.6, -0.68, -0.08);
    this.group.add(pillarL);

    const pillarR = box(0.08, 1.35, 0.08, 0x1e354d);
    pillarR.position.set(0.6, -0.68, -0.08);
    this.group.add(pillarR);

    // 3. Monitor casing / chassis behind the screen
    const casing = box(2.26, 1.66, 0.08, 0x0a1622);
    casing.position.set(0, 0, -0.04);
    this.group.add(casing);

    // Subtle golden trim around the display frame
    const frame = box(2.2, 1.6, 0.02, 0x243e5c);
    frame.position.set(0, 0, -0.005);
    this.group.add(frame);

    // 4. Crystal-clear front display screen (100% opaque, depthWrite enabled)
    this.material = new THREE.MeshBasicMaterial({
      transparent: false,
      depthWrite: true,
      depthTest: true,
    });
    this.screenMesh = new THREE.Mesh(new THREE.PlaneGeometry(2.14, 1.54), this.material);
    this.screenMesh.position.set(0, 0, 0.008);
    this.screenMesh.renderOrder = 3;
    this.group.add(this.screenMesh);

    engine.subscribe((snap) => {
      this.latest = snap;
      this.dirty = true;
    });
  }

  update(): void {
    if (!this.dirty || !this.latest) return;
    this.dirty = false;
    this.render(this.latest);
  }

  private render(snap: EngineSnapshot): void {
    const yield0 = this.engine.usableYield(snap.baseline);
    const yieldN = this.engine.usableYield(snap.state);
    const lossDelta = snap.baseline.estimatedLossValue - snap.state.estimatedLossValue;

    const width = 1440;
    const height = 1040;
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d")!;

    // Base background
    ctx.fillStyle = "#0c1b2a";
    ctx.fillRect(0, 0, width, height);

    // Header container
    ctx.fillStyle = "#13273c";
    ctx.fillRect(0, 0, width, 140);

    // Gold accent separator bar
    ctx.fillStyle = "#f4c542";
    ctx.fillRect(0, 136, width, 4);

    // Header Kicker
    ctx.font = "700 22px 'Segoe UI', system-ui, sans-serif";
    ctx.fillStyle = "#f4c542";
    ctx.letterSpacing = "2px";
    ctx.fillText("FACILITY OPERATIONS DIGITAL TWIN  ·  IE LAB CASE STUDY", 40, 42);

    // Header Scenario Title
    ctx.font = "800 42px 'Segoe UI', system-ui, sans-serif";
    ctx.fillStyle = "#ffffff";
    ctx.fillText(snap.scenarioName.toUpperCase(), 40, 96);

    // Scenario Status Badge Pill (Right side of header)
    const isSource = snap.scenarioStatus === "SOURCE";
    const badgeText = isSource ? "SOURCE VERIFIED" : "PROPOSED MODEL";
    const badgeBg = isSource ? "#2e7d32" : "#2a78a8";
    drawPill(ctx, width - 260, 58, 220, 44, badgeBg, "#ffffff", badgeText, 18);

    // Left Column: Physical Operations (width = 650, left = 40)
    const colW = 660;
    const col1X = 40;
    const col2X = 740;
    const startY = 175;

    // Column 1 Header
    drawSectionHeader(ctx, col1X, startY, colW, "PHYSICAL FLOW & INVENTORY STATUS");

    // Row 1: Good vs Spoiled Units
    drawKpiCard(ctx, col1X, startY + 45, (colW - 20) / 2, 115, "GOOD OUTPUT", `${snap.state.quantityGood} crates`, "#7fd6a0", "Dispatched ready");
    drawKpiCard(ctx, col1X + (colW - 20) / 2 + 20, startY + 45, (colW - 20) / 2, 115, "SPOILED / LOSS", `${snap.state.quantitySpoiled} crates`, "#f0958a", "Quality rejected");

    // Row 2: Queue Length & Temp Excursion
    const queueBad = snap.state.queueLength > 20;
    drawKpiCard(ctx, col1X, startY + 180, (colW - 20) / 2, 115, "QUEUE BACKLOG", `${snap.state.queueLength} crates`, queueBad ? "#f4c542" : "#ffffff", queueBad ? "Bottleneck delay" : "Flow normal");
    const tempExcursionC = (snap.state.temperatureExposure / 4).toFixed(1);
    drawKpiCard(ctx, col1X + (colW - 20) / 2 + 20, startY + 180, (colW - 20) / 2, 115, "TEMP EXCURSION", `+${tempExcursionC} °C (${snap.state.temperatureExposure} °C·h)`, snap.state.temperatureExposure > 5 ? "#f0958a" : "#7fd6a0", "Thermal exposure");

    // Row 3: Cold Storage Capacity utilization bar
    const capPct = Math.round((snap.state.capacityUsed / Math.max(1, snap.state.capacityAvailable)) * 100);
    drawProgressBarCard(ctx, col1X, startY + 315, colW, 120, "COLD STORAGE CAPACITY", `${snap.state.capacityUsed} / ${snap.state.capacityAvailable} crates (${capPct}%)`, capPct);

    // Row 4: Operational Summary Box
    drawTextBox(ctx, col1X, startY + 455, colW, 110, "SCENARIO SUMMARY", snap.scenarioSummary);

    // Column 2 Header: Economic & Yield Analysis (left = 740)
    drawSectionHeader(ctx, col2X, startY, colW, "ECONOMIC & YIELD PERFORMANCE");

    // Row 1: Usable Yield Big KPI Card
    const yieldGood = yieldN >= yield0;
    drawBigKpiCard(
      ctx,
      col2X,
      startY + 45,
      colW,
      135,
      "USABLE PRODUCT YIELD",
      `${(yieldN * 100).toFixed(1)}%`,
      `Baseline Yield: ${(yield0 * 100).toFixed(1)}%  (${yieldN >= yield0 ? "+" : ""}${((yieldN - yield0) * 100).toFixed(1)}% delta)`,
      yieldGood ? "#7fd6a0" : "#f0958a"
    );

    // Row 2: Financial Loss and Loss Avoided
    drawKpiCard(
      ctx,
      col2X,
      startY + 200,
      (colW - 20) / 2,
      125,
      "ESTIMATED LOSS",
      `₹${snap.state.estimatedLossValue.toLocaleString("en-IN")}`,
      "#f0958a",
      "Total financial waste"
    );

    const isSavings = lossDelta >= 0;
    drawKpiCard(
      ctx,
      col2X + (colW - 20) / 2 + 20,
      startY + 200,
      (colW - 20) / 2,
      125,
      isSavings ? "LOSS AVOIDED" : "LOSS INCREASE",
      isSavings ? `₹${lossDelta.toLocaleString("en-IN")}` : `+₹${(-lossDelta).toLocaleString("en-IN")}`,
      isSavings ? "#7fd6a0" : "#f0958a",
      isSavings ? "Savings vs baseline" : "Additional cost"
    );

    // Row 3: Market Orders & Inventory Days
    drawKpiCard(ctx, col2X, startY + 345, (colW - 20) / 2, 110, "MARKET ORDERS DUE", `${snap.state.ordersDue} crates`, "#ffffff", "Contracted demand");
    drawKpiCard(ctx, col2X + (colW - 20) / 2 + 20, startY + 345, (colW - 20) / 2, 110, "INVENTORY DAYS", `${snap.state.inventoryDays} days`, "#f4c542", "Average turnover");

    // Row 4: Teaching Insight Callout
    drawTextBox(
      ctx,
      col2X,
      startY + 475,
      colW,
      90,
      "KEY TAKEAWAY",
      lossDelta > 0
        ? `Pre-cooling & FEFO recovery avoids ₹${lossDelta.toLocaleString("en-IN")} in losses by preserving shelf-life before dispatch.`
        : "Uncontrolled field heat and FIFO dispatch cause compounding spoilage before market arrival."
    );

    // Footer Status Bar
    ctx.fillStyle = "#09131d";
    ctx.fillRect(0, height - 50, width, 50);
    ctx.strokeStyle = "rgba(255,255,255,0.08)";
    ctx.beginPath();
    ctx.moveTo(0, height - 50);
    ctx.lineTo(width, height - 50);
    ctx.stroke();

    ctx.font = "600 18px 'Segoe UI', system-ui, sans-serif";
    ctx.fillStyle = "#8ea5bc";
    ctx.fillText("● SIMULATION ENGINE: ONLINE  ·  SELECT SCENARIO BUTTONS ON SCREEN TO COMPARE INTERVENTIONS", 40, height - 20);

    // Texture generation
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
  }
}

// -----------------------------------------------------------------------------
// Canvas Drawing Helpers
// -----------------------------------------------------------------------------

function drawSectionHeader(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, title: string): void {
  ctx.font = "700 18px 'Segoe UI', system-ui, sans-serif";
  ctx.fillStyle = "#8ea5bc";
  ctx.letterSpacing = "1.5px";
  ctx.fillText(title, x, y + 20);
  ctx.strokeStyle = "rgba(255,255,255,0.12)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x, y + 30);
  ctx.lineTo(x + w, y + 30);
  ctx.stroke();
}

function drawKpiCard(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  title: string,
  val: string,
  valColor: string,
  sub: string
): void {
  ctx.fillStyle = "#132537";
  roundedRect(ctx, x, y, w, h, 10);
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.1)";
  ctx.lineWidth = 1;
  ctx.stroke();

  // Label
  ctx.font = "600 16px 'Segoe UI', system-ui, sans-serif";
  ctx.fillStyle = "#9db4c8";
  ctx.fillText(title, x + 16, y + 28);

  // Value
  ctx.font = "800 32px 'Segoe UI', system-ui, sans-serif";
  ctx.fillStyle = valColor;
  ctx.fillText(val, x + 16, y + 70);

  // Subtitle
  ctx.font = "500 14px 'Segoe UI', system-ui, sans-serif";
  ctx.fillStyle = "#6d869e";
  ctx.fillText(sub, x + 16, y + 96);
}

function drawBigKpiCard(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  title: string,
  val: string,
  sub: string,
  valColor: string
): void {
  ctx.fillStyle = "#122a42";
  roundedRect(ctx, x, y, w, h, 12);
  ctx.fill();
  ctx.strokeStyle = "rgba(244, 197, 66, 0.4)";
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.font = "700 18px 'Segoe UI', system-ui, sans-serif";
  ctx.fillStyle = "#f4c542";
  ctx.fillText(title, x + 24, y + 32);

  ctx.font = "900 52px 'Segoe UI', system-ui, sans-serif";
  ctx.fillStyle = valColor;
  ctx.fillText(val, x + 24, y + 88);

  ctx.font = "600 16px 'Segoe UI', system-ui, sans-serif";
  ctx.fillStyle = "#c5d7e8";
  ctx.fillText(sub, x + 24, y + 118);
}

function drawProgressBarCard(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  title: string,
  valText: string,
  pct: number
): void {
  ctx.fillStyle = "#132537";
  roundedRect(ctx, x, y, w, h, 10);
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.1)";
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.font = "600 16px 'Segoe UI', system-ui, sans-serif";
  ctx.fillStyle = "#9db4c8";
  ctx.fillText(title, x + 16, y + 28);

  ctx.font = "700 20px 'Segoe UI', system-ui, sans-serif";
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "right";
  ctx.fillText(valText, x + w - 16, y + 28);
  ctx.textAlign = "left";

  // Progress bar background
  const barX = x + 16;
  const barY = y + 50;
  const barW = w - 32;
  const barH = 20;
  ctx.fillStyle = "#091420";
  roundedRect(ctx, barX, barY, barW, barH, 6);
  ctx.fill();

  // Fill
  const fillW = Math.min(barW, Math.max(0, (pct / 100) * barW));
  ctx.fillStyle = pct > 95 ? "#f0958a" : pct > 80 ? "#f4c542" : "#2a78a8";
  roundedRect(ctx, barX, barY, fillW, barH, 6);
  ctx.fill();

  // Note
  ctx.font = "500 14px 'Segoe UI', system-ui, sans-serif";
  ctx.fillStyle = "#6d869e";
  ctx.fillText(pct > 95 ? "Warning: Approaching max warehouse ceiling" : "Capacity within safe operational range", x + 16, y + 98);
}

function drawTextBox(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  header: string,
  text: string
): void {
  ctx.fillStyle = "#0f1f2e";
  roundedRect(ctx, x, y, w, h, 10);
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.08)";
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.font = "700 15px 'Segoe UI', system-ui, sans-serif";
  ctx.fillStyle = "#f4c542";
  ctx.fillText(header, x + 16, y + 26);

  ctx.font = "500 16px 'Segoe UI', system-ui, sans-serif";
  ctx.fillStyle = "#c5d7e8";
  wrapText(ctx, text, x + 16, y + 54, w - 32, 24);
}

function drawPill(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  bg: string,
  fg: string,
  text: string,
  fontSize: number
): void {
  ctx.fillStyle = bg;
  roundedRect(ctx, x, y, w, h, h / 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.25)";
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.font = `700 ${fontSize}px 'Segoe UI', system-ui, sans-serif`;
  ctx.fillStyle = fg;
  ctx.textAlign = "center";
  ctx.fillText(text, x + w / 2, y + h / 2 + fontSize * 0.35);
  ctx.textAlign = "left";
}

function roundedRect(
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

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number
): void {
  const words = text.split(" ");
  let line = "";
  let curY = y;
  for (let n = 0; n < words.length; n++) {
    const testLine = line + words[n] + " ";
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth && n > 0) {
      ctx.fillText(line, x, curY);
      line = words[n] + " ";
      curY += lineHeight;
    } else {
      line = testLine;
    }
  }
  ctx.fillText(line, x, curY);
}

