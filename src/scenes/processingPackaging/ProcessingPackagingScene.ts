import * as THREE from "three";
import { SceneModule } from "../SceneModule";
import type { SceneKey } from "../../app/palette";
import { PALETTE } from "../../app/palette";
import { box, ground, label, floorDecal, makeTextTexture, createWorkerFigure, createForklift } from "../../app/builders";
import { makeInteractable } from "../../interaction/Interactable";
import type { EngineSnapshot, ScenarioEngine } from "../../simulation/ScenarioEngine";

/**
 * Environment 2: Processing and packaging unit.
 * Shows flow, layout, quality checks, packaging fit, and bottlenecks.
 * A crossed baseline layout vs a clean U-flow is shown via the uFlowLayout flag.
 */
export class ProcessingPackagingScene extends SceneModule {
  readonly key: SceneKey = "processingPackaging";

  private conveyor!: THREE.Group;
  private beltItems: THREE.Mesh[] = [];
  private bottleneckLabel!: THREE.Mesh;
  private flowArrows = new THREE.Group();
  private crossedArrows = new THREE.Group();
  private beltSpeed = 0.6;
  private workers: THREE.Group[] = [];
  private airArrows: THREE.Mesh[] = [];
  private workerTime = 0;

  constructor(engine: ScenarioEngine) {
    super(engine);
    this.init();
  }

  protected build(): void {
    // Factory floor
    const floor = ground(40, 30, PALETTE.cream);
    this.group.add(floor);

    // Walls (open front)
    const backWall = box(40, 6, 0.3, 0xdfe4e8);
    backWall.position.set(0, 3, -14);
    this.group.add(backWall);

    // Zone floor markings
    this.group.add(decal("RAW", 3, "#F4C542", -14, -6));
    this.group.add(decal("WIP", 3, "#2A78A8", -2, -6));
    this.group.add(decal("QUALITY CHECK", 4, "#17324D", 6, -6));
    this.group.add(decal("FINISHED", 3, "#2E7D32", 14, -6));

    // Washing / cleaning station
    const wash = box(2.5, 1.0, 2, PALETTE.coolBlue);
    wash.position.set(-14, 0.5, -2);
    this.group.add(makeInteractable(wash, {
      id: "wash",
      title: "Washing Station",
      info: ["Cleans raw material", "Reduces surface contamination"],
      assetType: "machine",
      zone: "processing",
      sourceStatus: "PROPOSED",
    }));

    // Processing machine module (cut/sort/cook)
    const proc = box(3, 1.6, 2.2, 0x8895a1);
    proc.position.set(-6, 0.8, -2);
    this.group.add(makeInteractable(proc, {
      id: "processor",
      title: "Processing Module",
      info: ["Cutting / sorting / preparation", "assetType: machine"],
      assetType: "machine",
      zone: "processing",
      sourceStatus: "PROPOSED",
    }));

    // Conveyor / packaging line with moving items
    this.conveyor = new THREE.Group();
    const belt = box(10, 0.2, 0.9, 0x3a4550);
    belt.position.set(0, 0.9, 2);
    this.conveyor.add(belt);
    for (const x of [-5, 0, 5]) {
      const leg = box(0.2, 0.9, 0.2, 0x2a323b);
      leg.position.set(x, 0.45, 2);
      this.conveyor.add(leg);
    }
    for (let i = 0; i < 8; i++) {
      const item = box(0.4, 0.4, 0.4, PALETTE.yellow);
      item.position.set(-5 + i * 1.3, 1.2, 2);
      this.beltItems.push(item);
      this.conveyor.add(item);
    }
    this.group.add(makeInteractable(this.conveyor, {
      id: "packaging",
      title: "Packaging Line",
      info: ["Primary + secondary packaging", "Seal / fit check at end"],
      assetType: "conveyor",
      zone: "packaging",
      sourceStatus: "PROPOSED",
    }));

    // --- Industrial Workers ---
    // 1. Worker at Washing Block
    const workerWash = createWorkerFigure({
      shirtColor: 0x2a78a8,
      apronColor: 0xffffff,
      capColor: 0xf4c542,
    });
    workerWash.position.set(-14, 0, -0.65);
    workerWash.rotation.y = Math.PI * 0.88;
    this.workers.push(workerWash);
    this.group.add(makeInteractable(workerWash, {
      id: "worker-wash",
      title: "Washing Operator",
      info: ["Washes and inspects raw produce", "Removes field dirt & excess heat"],
      assetType: "operator",
      zone: "processing",
      sourceStatus: "PROPOSED",
    }));

    // 2. Worker at Chopping / Prep Block
    const workerChop = createWorkerFigure({
      shirtColor: 0x375e47,
      apronColor: 0xffffff,
      capColor: 0xffffff,
    });
    workerChop.position.set(-6, 0, -0.65);
    workerChop.rotation.y = Math.PI * 0.88;
    this.workers.push(workerChop);
    this.group.add(makeInteractable(workerChop, {
      id: "worker-chop",
      title: "Prep & Chopping Operator",
      info: ["Trims, cuts, and grades raw produce", "Prepares batches for packaging"],
      assetType: "operator",
      zone: "processing",
      sourceStatus: "PROPOSED",
    }));

    // 3. Worker at Starting of Assembly Line
    const workerLine = createWorkerFigure({
      shirtColor: 0xb85623,
      apronColor: 0xf0f4f8,
      capColor: 0xf4c542,
    });
    workerLine.position.set(-5.7, 0, 2.0);
    workerLine.rotation.y = Math.PI * 0.5;
    this.workers.push(workerLine);
    this.group.add(makeInteractable(workerLine, {
      id: "worker-assembly",
      title: "Assembly Line Feeder",
      info: ["Loads prepared crates onto conveyor", "Ensures continuous flow into packaging"],
      assetType: "operator",
      zone: "packaging",
      sourceStatus: "PROPOSED",
    }));

    // 4. Worker at Middle of Reject Bin & End of Assembly Line
    const workerReject = createWorkerFigure({
      shirtColor: 0x8a3838,
      apronColor: 0xf7fafc,
      capColor: 0xf0958a,
    });
    workerReject.position.set(5.2, 0, 1.3);
    workerReject.rotation.y = -Math.PI * 0.35;
    this.workers.push(workerReject);
    this.group.add(makeInteractable(workerReject, {
      id: "worker-reject-sorter",
      title: "Line Offloader & Reject Sorter",
      info: ["Offloads packed crates from belt", "Diverts failed packs to reject bin"],
      assetType: "operator",
      zone: "quality",
      sourceStatus: "PROPOSED",
    }));

    // 5. Worker at Quality Check Table
    const workerQC = createWorkerFigure({
      shirtColor: 0x1d4e89,
      apronColor: 0xffffff,
      capColor: 0x4aa3df,
    });
    workerQC.position.set(6.0, 0, -0.7);
    workerQC.rotation.y = Math.PI * 0.9;
    this.workers.push(workerQC);
    this.group.add(makeInteractable(workerQC, {
      id: "worker-qc",
      title: "Quality Assurance Inspector",
      info: ["Performs seal integrity and weight checks", "Logs batch QA metrics before final storage"],
      assetType: "operator",
      zone: "quality",
      sourceStatus: "PROPOSED",
    }));

    // 6. Worker at Finished Goods Table / Pallet
    const workerFinished = createWorkerFigure({
      shirtColor: 0x2e6f40,
      apronColor: 0xf0f4f8,
      capColor: 0x7fd6a0,
    });
    workerFinished.position.set(14.0, 0, -0.65);
    workerFinished.rotation.y = Math.PI * 0.9;
    this.workers.push(workerFinished);
    this.group.add(makeInteractable(workerFinished, {
      id: "worker-finished",
      title: "Finished Goods Handler",
      info: ["Stacks and wraps approved finished pallets", "Coordinates transfer to cold room / dispatch"],
      assetType: "operator",
      zone: "finished",
      sourceStatus: "PROPOSED",
    }));

    // Quality-check table + reject bin
    const qc = box(2, 0.9, 1.2, PALETTE.navy);
    qc.position.set(6, 0.45, -2);
    this.group.add(makeInteractable(qc, {
      id: "qc",
      title: "Quality-Check Table",
      info: ["Sample, then accept / hold / reject", "Pair colour with words"],
      assetType: "table",
      zone: "quality",
      sourceStatus: "PROPOSED",
    }));
    const bin = box(0.8, 1.0, 0.8, PALETTE.red);
    bin.position.set(6, 0.5, 0.6);
    this.group.add(makeInteractable(bin, {
      id: "rejectBin",
      title: "Reject Bin",
      info: ["Holds rejected units", "Feeds spoilage/loss metrics"],
      assetType: "bin",
      zone: "quality",
      sourceStatus: "PROPOSED",
    }));

    // Finished-goods pallet
    const pallet = box(2, 1.2, 2, PALETTE.green);
    pallet.position.set(14, 0.6, -2);
    this.group.add(makeInteractable(pallet, {
      id: "finished",
      title: "Finished Goods",
      info: ["Ready for storage / dispatch", "assetType: pallet"],
      assetType: "pallet",
      zone: "finished",
      sourceStatus: "PROPOSED",
    }));

    // Forklift at Finished Goods table / pallet
    const forklift = createForklift({ color: 0xf4a100 });
    forklift.position.set(16.8, 0, -2);
    forklift.rotation.y = -Math.PI / 2;
    this.group.add(makeInteractable(forklift, {
      id: "forklift-finished",
      title: "Electric Warehouse Forklift",
      info: ["Lifts and moves finished pallets to cold store", "Equipped with safety ROPS & amber beacon"],
      assetType: "vehicle",
      zone: "finished",
      sourceStatus: "PROPOSED",
    }));

    // Flow arrows: clean U-flow (green) vs crossed baseline (red)
    this.buildFlowArrows();
    this.group.add(this.flowArrows);
    this.group.add(this.crossedArrows);

    const title = label("PROCESSING & PACKAGING", 6.5, {
      fontSize: 48,
      width: 1024,
      height: 220,
    });
    title.position.set(0, 5.4, -13.8);
    this.group.add(title);

    // Overhead gantry above processing / bottleneck station (x = -2.5, left side)
    const gantryL = box(0.08, 3.2, 0.08, 0x37485a);
    gantryL.position.set(-4.2, 1.6, 2);
    this.group.add(gantryL);
    const gantryR = box(0.08, 3.2, 0.08, 0x37485a);
    gantryR.position.set(-0.8, 1.6, 2);
    this.group.add(gantryR);
    const gantryTop = box(3.48, 0.08, 0.08, 0x37485a);
    gantryTop.position.set(-2.5, 3.2, 2);
    this.group.add(gantryTop);

    this.bottleneckLabel = label("BOTTLENECK: --", 2.8, {
      bg: "#b23a2b",
      fontSize: 52,
      width: 512,
      height: 180,
    });
    this.bottleneckLabel.position.set(-2.5, 2.7, 2);
    this.group.add(this.bottleneckLabel);
  }

  private buildFlowArrows(): void {
    // Helper to create an arrow shape floating in the air with text and purpose on the body
    const makeAirArrowMesh = (opts: {
      step: string;
      purpose: string;
      colorHex: number;
      widthM?: number;
      bg?: string;
    }): THREE.Mesh => {
      const widthM = opts.widthM ?? 3.3;
      const w = 1280;
      const h = 280;
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d")!;

      const colorStr = "#" + opts.colorHex.toString(16).padStart(6, "0");
      const headW = 160;
      const bodyW = w - headW - 30;
      const topY = 24;
      const bodyH = h - 48;

      // Draw Arrow silhouette pointing right
      ctx.beginPath();
      ctx.moveTo(25, topY);
      ctx.lineTo(25 + bodyW, topY);
      ctx.lineTo(25 + bodyW, 8);
      ctx.lineTo(w - 15, h / 2);
      ctx.lineTo(25 + bodyW, h - 8);
      ctx.lineTo(25 + bodyW, topY + bodyH);
      ctx.lineTo(25, topY + bodyH);
      ctx.closePath();

      // Semi-translucent dark frosted background fill
      const grad = ctx.createLinearGradient(0, 0, w, 0);
      grad.addColorStop(0, "rgba(8, 20, 36, 0.94)");
      grad.addColorStop(0.75, "rgba(14, 32, 54, 0.94)");
      grad.addColorStop(1, "rgba(20, 44, 72, 0.96)");
      ctx.fillStyle = grad;
      ctx.fill();

      // Glowing border stroke
      ctx.strokeStyle = colorStr;
      ctx.lineWidth = 6;
      ctx.stroke();

      // Inner Arrowhead Chevron Indicator
      ctx.fillStyle = colorStr;
      ctx.beginPath();
      ctx.moveTo(25 + bodyW - 10, topY + 22);
      ctx.lineTo(w - 45, h / 2);
      ctx.lineTo(25 + bodyW - 10, topY + bodyH - 22);
      ctx.lineTo(25 + bodyW - 45, topY + bodyH - 22);
      ctx.lineTo(w - 80, h / 2);
      ctx.lineTo(25 + bodyW - 45, topY + 22);
      ctx.closePath();
      ctx.fill();

      // Text written directly on the body of the arrow
      ctx.textBaseline = "middle";
      ctx.textAlign = "left";

      // Step title (Bold accent)
      ctx.font = "800 46px 'Segoe UI', system-ui, sans-serif";
      ctx.fillStyle = colorStr;
      ctx.fillText(opts.step, 55, topY + 54);

      // Purpose description (Crisp white)
      ctx.font = "600 31px 'Segoe UI', system-ui, sans-serif";
      ctx.fillStyle = "#ffffff";
      ctx.fillText(`PURPOSE: ${opts.purpose}`, 55, topY + 126);

      // Texture
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
    };

    // --- Production Flow Air Arrows (Matching Physical Stations) ---
    // 1. Raw produce intake -> Washing station (Far left pointing into washing)
    const arrowRaw = makeAirArrowMesh({
      step: "RAW INTAKE ➔ WASHING",
      purpose: "Clean & remove field heat / debris",
      colorHex: 0xf4a100,
      widthM: 3.2,
    });
    arrowRaw.position.set(-16.6, 1.45, -1.0);
    arrowRaw.userData.baseY = 1.45;
    this.airArrows.push(arrowRaw);
    this.flowArrows.add(arrowRaw);

    // 2. Washing station -> Chopping & Prep module
    const arrowWashToChop = makeAirArrowMesh({
      step: "WASHING ➔ CHOPPING & PREP",
      purpose: "Trim, cut & sort batch produce",
      colorHex: 0x2a78a8,
      widthM: 3.3,
    });
    arrowWashToChop.position.set(-10.2, 1.45, -1.0);
    arrowWashToChop.userData.baseY = 1.45;
    this.airArrows.push(arrowWashToChop);
    this.flowArrows.add(arrowWashToChop);

    // 3. Chopping module -> Packaging line (Looping from prep table to conveyor start)
    const arrowChopToPack = makeAirArrowMesh({
      step: "CHOPPING ➔ PACKAGING LINE",
      purpose: "Feed sorted batch onto packaging line",
      colorHex: 0xe07a38,
      widthM: 3.3,
    });
    arrowChopToPack.position.set(-7.0, 1.35, 0.4);
    arrowChopToPack.userData.baseY = 1.35;
    this.airArrows.push(arrowChopToPack);
    this.flowArrows.add(arrowChopToPack);

    // 4. Packaging line end -> Quality Check table
    const arrowPackToQC = makeAirArrowMesh({
      step: "PACKAGING ➔ QUALITY CHECK",
      purpose: "Inspect seal integrity, weight & grade crates",
      colorHex: 0x2a78a8,
      widthM: 3.4,
    });
    arrowPackToQC.position.set(5.8, 1.35, 0.4);
    arrowPackToQC.userData.baseY = 1.35;
    this.airArrows.push(arrowPackToQC);
    this.flowArrows.add(arrowPackToQC);

    // 5. Quality Check table -> Finished Goods pallet & forklift
    const arrowQCToFinished = makeAirArrowMesh({
      step: "QUALITY ➔ FINISHED GOODS",
      purpose: "Palletize & forklift to cold storage / dispatch",
      colorHex: 0x2e7d32,
      widthM: 3.4,
    });
    arrowQCToFinished.position.set(10.0, 1.45, -1.0);
    arrowQCToFinished.userData.baseY = 1.45;
    this.airArrows.push(arrowQCToFinished);
    this.flowArrows.add(arrowQCToFinished);

    // 6. Defect purge -> Reject Bin
    const arrowReject = makeAirArrowMesh({
      step: "DEFECT PURGE ➔ REJECT BIN",
      purpose: "Isolate spoiled packs to prevent loss spread",
      colorHex: 0xb23a2b,
      widthM: 2.7,
    });
    arrowReject.position.set(5.6, 1.15, 1.1);
    arrowReject.userData.baseY = 1.15;
    this.airArrows.push(arrowReject);
    this.flowArrows.add(arrowReject);
  }

  protected onSnapshot(snap: EngineSnapshot): void {
    const { state } = snap;
    // Keep production flow arrows always visible
    this.flowArrows.visible = true;
    this.crossedArrows.visible = false;

    // Belt speed slows when queue is high (bottleneck).
    this.beltSpeed = state.queueLength > 20 ? 0.2 : 0.7;

    const text =
      state.queueLength > 20
        ? `BOTTLENECK\nqueue ${state.queueLength} · flow slow`
        : `FLOW OK\nqueue ${state.queueLength}`;
    const bg = state.queueLength > 20 ? "#b23a2b" : "#2e7d32";
    const mat = this.bottleneckLabel.material as THREE.MeshBasicMaterial;
    const old = mat.map;
    mat.map = makeTextTexture(text, { bg, fontSize: 56, width: 512, height: 180 });
    mat.needsUpdate = true;
    old?.dispose();
  }

  update(dt: number): void {
    this.workerTime += dt;
    for (const item of this.beltItems) {
      item.position.x += this.beltSpeed * dt;
      if (item.position.x > 5.2) item.position.x = -5.2;
    }

    // Dynamic working animation for workers
    for (let i = 0; i < this.workers.length; i++) {
      const w = this.workers[i];
      const armL = w.getObjectByName("armL");
      const armR = w.getObjectByName("armR");
      const offset = i * 2.1;
      if (armL) armL.rotation.x = 0.45 + Math.sin(this.workerTime * 3.5 + offset) * 0.14;
      if (armR) armR.rotation.x = 0.45 + Math.cos(this.workerTime * 3.5 + offset) * 0.14;
    }

    // Floating bobbing motion for air arrows
    for (let i = 0; i < this.airArrows.length; i++) {
      const arrow = this.airArrows[i];
      const base = arrow.userData.baseY ?? arrow.position.y;
      arrow.position.y = base + Math.sin(this.workerTime * 2.5 + i * 1.2) * 0.05;
    }
  }
}

function decal(text: string, w: number, color: string, x: number, z: number): THREE.Mesh {
  const m = floorDecal(text, w, color);
  m.position.set(x, 0.03, z);
  return m;
}
