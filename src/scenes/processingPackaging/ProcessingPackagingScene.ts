import * as THREE from "three";
import { SceneModule } from "../SceneModule";
import type { SceneKey } from "../../app/palette";
import { PALETTE } from "../../app/palette";
import { box, ground, label, floorDecal, makeTextTexture } from "../../app/builders";
import { makeInteractable } from "../../interaction/Interactable";
import type { EngineSnapshot } from "../../simulation/ScenarioEngine";

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

    // Flow arrows: clean U-flow (green) vs crossed baseline (red)
    this.buildFlowArrows();
    this.group.add(this.flowArrows);
    this.group.add(this.crossedArrows);

    const title = label("PROCESSING & PACKAGING", 6, { fontSize: 52 });
    title.position.set(0, 5, -13.7);
    this.group.add(title);

    this.bottleneckLabel = label("BOTTLENECK: --", 3, {
      bg: "rgba(178,58,43,0.9)",
      fontSize: 56,
      width: 512,
      height: 180,
    });
    this.bottleneckLabel.position.set(0, 2.6, 2);
    this.group.add(this.bottleneckLabel);
  }

  private buildFlowArrows(): void {
    // Green U-flow arrows along the ideal path.
    const mkArrow = (from: THREE.Vector3, to: THREE.Vector3, color: number) => {
      const dir = new THREE.Vector3().subVectors(to, from);
      const len = dir.length();
      dir.normalize();
      const arrow = new THREE.ArrowHelper(dir, from, len, color, 0.6, 0.35);
      return arrow;
    };
    const y = 0.08;
    const uflow = [
      [new THREE.Vector3(-14, y, 0), new THREE.Vector3(-6, y, 0)],
      [new THREE.Vector3(-6, y, 0), new THREE.Vector3(0, y, 2)],
      [new THREE.Vector3(0, y, 2), new THREE.Vector3(6, y, 0)],
      [new THREE.Vector3(6, y, 0), new THREE.Vector3(14, y, 0)],
    ];
    for (const [a, b] of uflow) this.flowArrows.add(mkArrow(a, b, PALETTE.green));

    const crossed = [
      [new THREE.Vector3(-14, y, 0), new THREE.Vector3(6, y, 0)],
      [new THREE.Vector3(6, y, 0), new THREE.Vector3(-6, y, 2)],
      [new THREE.Vector3(-6, y, 2), new THREE.Vector3(14, y, -1)],
    ];
    for (const [a, b] of crossed) this.crossedArrows.add(mkArrow(a, b, PALETTE.red));
  }

  protected onSnapshot(snap: EngineSnapshot): void {
    const { flags, state } = snap;
    // Toggle layout visualisation.
    this.flowArrows.visible = flags.uFlowLayout;
    this.crossedArrows.visible = !flags.uFlowLayout;

    // Belt speed slows when queue is high (bottleneck).
    this.beltSpeed = state.queueLength > 20 ? 0.2 : 0.7;

    const text =
      state.queueLength > 20
        ? `BOTTLENECK\nqueue ${state.queueLength} · flow slow`
        : `FLOW OK\nqueue ${state.queueLength}`;
    const bg = state.queueLength > 20 ? "rgba(178,58,43,0.9)" : "rgba(46,125,50,0.9)";
    const mat = this.bottleneckLabel.material as THREE.MeshBasicMaterial;
    const old = mat.map;
    mat.map = makeTextTexture(text, { bg, fontSize: 56, width: 512, height: 180 });
    mat.needsUpdate = true;
    old?.dispose();
  }

  update(dt: number): void {
    for (const item of this.beltItems) {
      item.position.x += this.beltSpeed * dt;
      if (item.position.x > 5.2) item.position.x = -5.2;
    }
  }
}

function decal(text: string, w: number, color: string, x: number, z: number): THREE.Mesh {
  const m = floorDecal(text, w, color);
  m.position.set(x, 0.03, z);
  return m;
}
