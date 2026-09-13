import * as THREE from "three";
import { SceneModule } from "../SceneModule";
import type { SceneKey } from "../../app/palette";
import { PALETTE } from "../../app/palette";
import {
  box,
  ground,
  label,
  floorDecal,
  crateField,
  CRATE_STATE_COLOR,
} from "../../app/builders";
import { makeInteractable } from "../../interaction/Interactable";
import type { EngineSnapshot } from "../../simulation/ScenarioEngine";

/**
 * Environment 1: Farm and receiving dock.
 * Shows field heat, supply variability, and receiving delay.
 */
export class FarmReceivingScene extends SceneModule {
  readonly key: SceneKey = "farmReceiving";

  private crates!: { mesh: THREE.InstancedMesh; setColor: (i: number, hex: number) => void };
  private crateCount = 24;
  private tempPanel!: THREE.Mesh;
  private queueLabel!: THREE.Mesh;
  private shadeGroup = new THREE.Group();
  private dummy = new THREE.Object3D();

  protected build(): void {
    // Ground: soil + road strip
    const g = ground(60, 60, 0x8a6f4a);
    this.group.add(g);
    const road = box(4, 0.02, 60, 0x565b60);
    road.position.set(10, 0.02, 0);
    this.group.add(road);

    // Farm plots (crop rows via instanced small boxes)
    this.buildCropRows(-14, -6, PALETTE.green);

    // Shade net (toggled by intervention)
    const posts = [
      [-16, 0, 6],
      [-10, 0, 6],
      [-16, 0, 12],
      [-10, 0, 12],
    ];
    for (const [x, , z] of posts) {
      const post = box(0.1, 2.4, 0.1, 0xdddddd);
      post.position.set(x, 1.2, z);
      this.shadeGroup.add(post);
    }
    const netMat = new THREE.MeshStandardMaterial({
      color: 0x2e7d32,
      transparent: true,
      opacity: 0.35,
      side: THREE.DoubleSide,
    });
    const net = new THREE.Mesh(new THREE.PlaneGeometry(6, 6), netMat);
    net.rotation.x = -Math.PI / 2;
    net.position.set(-13, 2.4, 9);
    this.shadeGroup.add(net);
    this.shadeGroup.visible = false;
    this.group.add(this.shadeGroup);

    // Tractor (simple massing)
    const tractor = new THREE.Group();
    const body = box(1.4, 0.8, 2.2, PALETTE.red);
    body.position.y = 0.8;
    tractor.add(body);
    const cab = box(1.0, 0.8, 0.9, 0x37485a);
    cab.position.set(0, 1.5, -0.4);
    tractor.add(cab);
    for (const [x, z, r] of [
      [0.8, 0.8, 0.6],
      [-0.8, 0.8, 0.6],
      [0.8, -0.8, 0.4],
      [-0.8, -0.8, 0.4],
    ]) {
      const wheel = new THREE.Mesh(
        new THREE.CylinderGeometry(r, r, 0.3, 16),
        new THREE.MeshStandardMaterial({ color: 0x1c1c1c, roughness: 0.9 })
      );
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(x, r, z);
      wheel.castShadow = true;
      tractor.add(wheel);
    }
    tractor.position.set(-6, 0, 3);
    tractor.rotation.y = Math.PI / 4;
    this.group.add(makeInteractable(tractor, {
      id: "tractor",
      title: "Utility Tractor",
      info: ["Moves harvest from field to dock", "assetType: vehicle"],
      assetType: "vehicle",
      zone: "farm",
      sourceStatus: "PROPOSED",
    }));

    // Receiving dock building
    const dock = box(8, 4, 6, PALETTE.cream);
    dock.position.set(8, 2, -10);
    this.group.add(dock);
    const dockLabel = label("RECEIVING DOCK", 4, { fontSize: 56 });
    dockLabel.position.set(8, 4.6, -7);
    this.group.add(dockLabel);

    // Weighing scale
    const scaleBase = box(1.4, 0.15, 1.4, 0x37485a);
    scaleBase.position.set(6, 0.08, -5);
    this.group.add(makeInteractable(scaleBase, {
      id: "scale",
      title: "Weighing Point",
      info: ["Batch weighed on arrival", "Records lot ID + quantity"],
      assetType: "scale",
      zone: "receiving",
      sourceStatus: "PROPOSED",
    }));

    // Inspection table + reject area
    const table = box(2, 0.9, 1, 0x9a8a6b);
    table.position.set(9, 0.45, -5);
    this.group.add(makeInteractable(table, {
      id: "inspection",
      title: "Inspection Table",
      info: ["First visual quality check", "assetType: table"],
      assetType: "table",
      zone: "receiving",
      sourceStatus: "PROPOSED",
    }));
    this.group.add(floorDecalAt("RAW", 3, "#F4C542", 6, -8));
    this.group.add(floorDecalAt("REJECT", 2.4, "#B23A2B", 12, -5));

    // Crate field near dock: shows fresh/waiting/rejected states
    this.crates = crateField(this.crateCount, 0.6);
    this.layoutCrates();
    this.group.add(makeInteractable(this.crates.mesh, {
      id: "receivingCrates",
      title: "Incoming Crates",
      info: ["State reflects current scenario", "Green fresh, yellow waiting, red rejected"],
      assetType: "crate",
      zone: "receiving",
      sourceStatus: "PROPOSED",
    }));

    // Temperature + time panel
    this.tempPanel = label("FIELD HEAT\n--", 3.2, {
      bg: "rgba(42,120,168,0.92)",
      fontSize: 52,
      width: 512,
      height: 300,
    });
    this.tempPanel.position.set(2.5, 2.0, -3);
    this.group.add(this.tempPanel);

    this.queueLabel = label("QUEUE: --", 2.4, {
      bg: "rgba(178,58,43,0.9)",
      fontSize: 60,
      width: 512,
      height: 180,
    });
    this.queueLabel.position.set(6, 1.4, -2.5);
    this.group.add(this.queueLabel);
  }

  private buildCropRows(x0: number, z0: number, color: number): void {
    const rows = 6;
    const cols = 10;
    const geo = new THREE.BoxGeometry(0.3, 0.5, 0.3);
    const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.9 });
    const inst = new THREE.InstancedMesh(geo, mat, rows * cols);
    inst.castShadow = true;
    let i = 0;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        this.dummy.position.set(x0 + c * 0.8, 0.25, z0 + r * 1.0);
        this.dummy.updateMatrix();
        inst.setMatrixAt(i++, this.dummy.matrix);
      }
    }
    this.group.add(inst);
  }

  private layoutCrates(): void {
    let i = 0;
    for (let z = 0; z < 4; z++) {
      for (let x = 0; x < 6; x++) {
        if (i >= this.crateCount) break;
        this.dummy.position.set(3 + x * 0.7, 0.25, -1 + z * 0.7);
        this.dummy.rotation.set(0, 0, 0);
        this.dummy.updateMatrix();
        this.crates.mesh.setMatrixAt(i, this.dummy.matrix);
        i++;
      }
    }
    this.crates.mesh.instanceMatrix.needsUpdate = true;
  }

  protected onSnapshot(snap: EngineSnapshot): void {
    const { state, flags } = snap;
    // Distribute crate tints by proportion of good/waiting/rejected/spoiled.
    const total = this.crateCount;
    const good = Math.round((state.quantityGood / state.quantityReceived) * total);
    const spoiled = Math.round((state.quantitySpoiled / state.quantityReceived) * total);
    const rejected = Math.round((state.quantityRejected / state.quantityReceived) * total);
    for (let i = 0; i < total; i++) {
      let hex: number = CRATE_STATE_COLOR.fresh;
      if (i >= total - spoiled) hex = CRATE_STATE_COLOR.spoiled;
      else if (i >= total - spoiled - rejected) hex = CRATE_STATE_COLOR.rejected;
      else if (i >= good) hex = CRATE_STATE_COLOR.waiting;
      this.crates.setColor(i, hex);
    }

    // Temperature panel text reacts to shade/pre-cooling flag + exposure.
    const shaded = flags.shadePrecooling;
    this.shadeGroup.visible = shaded;
    const tempText = shaded
      ? `PRE-COOLED\n~14\u00b0C · excursion ${state.temperatureExposure}`
      : `FIELD HEAT\n~32\u00b0C · excursion ${state.temperatureExposure}`;
    this.updateLabel(this.tempPanel, tempText, shaded ? "rgba(42,120,168,0.92)" : "rgba(178,58,43,0.85)");

    this.updateLabel(
      this.queueLabel,
      `QUEUE: ${state.queueLength}`,
      state.queueLength > 20 ? "rgba(178,58,43,0.92)" : "rgba(46,125,50,0.9)"
    );
  }

  private updateLabel(mesh: THREE.Mesh, text: string, bg: string): void {
    const mat = mesh.material as THREE.MeshBasicMaterial;
    const old = mat.map;
    mat.map = makeTextTextureFor(text, bg);
    mat.needsUpdate = true;
    old?.dispose();
  }
}

// Local helpers ---------------------------------------------------------------

function floorDecalAt(
  text: string,
  w: number,
  color: string,
  x: number,
  z: number
): THREE.Mesh {
  const m = floorDecal(text, w, color);
  m.position.set(x, 0.03, z);
  return m;
}

import { makeTextTexture } from "../../app/builders";
function makeTextTextureFor(text: string, bg: string) {
  return makeTextTexture(text, { bg, fontSize: 52, width: 512, height: 300 });
}
