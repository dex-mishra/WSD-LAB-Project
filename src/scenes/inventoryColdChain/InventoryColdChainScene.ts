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
  makeTextTexture,
} from "../../app/builders";
import { makeInteractable } from "../../interaction/Interactable";
import type { EngineSnapshot } from "../../simulation/ScenarioEngine";

/**
 * Environment 3: Inventory and cold-chain focus area.
 * Makes the main problem tangible: ambient store, cold room, FEFO shelves,
 * ABC markers, stock states, and a dock-to-chamber path.
 */
export class InventoryColdChainScene extends SceneModule {
  readonly key: SceneKey = "inventoryColdChain";

  private coldRoom = new THREE.Group();
  private coldRoomB = new THREE.Group(); // second room, disabled on capacity cut
  private shelfCrates!: { mesh: THREE.InstancedMesh; setColor: (i: number, hex: number) => void };
  private shelfCount = 30;
  private thermometer!: THREE.Mesh;
  private capacityLabel!: THREE.Mesh;
  private fefoLabel!: THREE.Mesh;
  private pathShort = new THREE.Group();
  private pathLong = new THREE.Group();
  private dummy = new THREE.Object3D();

  protected build(): void {
    const floor = ground(44, 32, 0xcfd6dc);
    this.group.add(floor);

    // Ambient raw-material storage (left)
    const ambient = box(6, 3, 8, PALETTE.cream);
    ambient.position.set(-14, 1.5, -4);
    this.group.add(ambient);
    this.group.add(decal("AMBIENT RAW", 4, "#F4C542", -14, 2));

    // Cold room A shell with door
    this.buildColdRoom(this.coldRoom, 2, "COLD STORAGE A");
    this.coldRoom.position.set(2, 0, -4);
    this.group.add(this.coldRoom);

    // Cold room B (shared / secondary) - hidden when capacity reduced
    this.buildColdRoom(this.coldRoomB, 2, "COLD STORAGE B");
    this.coldRoomB.position.set(12, 0, -4);
    this.group.add(this.coldRoomB);

    // FEFO shelves inside cold room A with lot/expiry crates
    this.shelfCrates = crateField(this.shelfCount, 0.55);
    this.layoutShelves();
    const shelfHolder = new THREE.Group();
    shelfHolder.add(this.shelfCrates.mesh);
    shelfHolder.position.set(2, 0, -4);
    this.group.add(makeInteractable(shelfHolder, {
      id: "fefoShelves",
      title: "FEFO Shelves",
      info: ["Lot/expiry ordered stock", "Blue available · red spoiled"],
      assetType: "rack",
      zone: "coldchain",
      sourceStatus: "PROPOSED",
    }));

    // ABC priority markers
    for (const [x, color, tag] of [
      [0.4, "#F4C542", "A"],
      [1.6, "#2A78A8", "B"],
      [2.8, "#8895a1", "C"],
    ] as [number, string, string][]) {
      const marker = floorDecal(tag, 0.8, color);
      marker.position.set(x, 0.05, -1.6);
      this.group.add(marker);
    }
    this.group.add(decal("FEFO", 2, "#F4C542", 2, -0.5));
    this.group.add(decal("ABC PRIORITY", 3, "#17324D", 1.6, 0.6));

    // Thermometer / hygrometer panel
    this.thermometer = label("COLD ROOM\n--", 2.6, {
      bg: "rgba(42,120,168,0.92)",
      fontSize: 52,
      width: 512,
      height: 280,
    });
    this.thermometer.position.set(2, 3.6, -0.2);
    this.group.add(this.thermometer);

    this.capacityLabel = label("CAPACITY --", 2.6, {
      bg: "rgba(23,50,77,0.9)",
      fontSize: 52,
      width: 512,
      height: 200,
    });
    this.capacityLabel.position.set(-6, 2.2, 1);
    this.group.add(this.capacityLabel);

    this.fefoLabel = label("STOCK ORDER: --", 3, {
      bg: "rgba(46,125,50,0.9)",
      fontSize: 50,
      width: 512,
      height: 180,
    });
    this.fefoLabel.position.set(8, 2.2, 1);
    this.group.add(this.fefoLabel);

    // Dock-to-chamber paths: long (baseline) vs short shaded (improved)
    this.buildPaths();
    this.group.add(this.pathLong);
    this.group.add(this.pathShort);

    const title = label("INVENTORY & COLD CHAIN", 6, { fontSize: 52 });
    title.position.set(0, 5, -9.5);
    this.group.add(title);
  }

  private buildColdRoom(target: THREE.Group, w: number, name: string): void {
    const shellMat = new THREE.MeshStandardMaterial({
      color: 0xdfe9f2,
      roughness: 0.4,
      metalness: 0.2,
      transparent: true,
      opacity: 0.55,
      side: THREE.DoubleSide,
    });
    const shell = new THREE.Mesh(new THREE.BoxGeometry(6, 4, 6), shellMat);
    shell.position.set(w, 2, 0);
    target.add(shell);
    // Door
    const door = box(1.4, 2.6, 0.15, PALETTE.coolBlue);
    door.position.set(w, 1.3, 3);
    target.add(door);
    const nameLabel = label(name, 3, { bg: "rgba(42,120,168,0.92)", fontSize: 46 });
    nameLabel.position.set(w, 4.4, 0);
    target.add(nameLabel);
  }

  private layoutShelves(): void {
    let i = 0;
    for (let level = 0; level < 3; level++) {
      for (let x = 0; x < 5; x++) {
        for (let z = 0; z < 2; z++) {
          if (i >= this.shelfCount) break;
          this.dummy.position.set(0.4 + x * 0.7, 0.6 + level * 1.0, -1.2 + z * 0.7);
          this.dummy.rotation.set(0, 0, 0);
          this.dummy.updateMatrix();
          this.shelfCrates.mesh.setMatrixAt(i, this.dummy.matrix);
          i++;
        }
      }
    }
    this.shelfCrates.mesh.instanceMatrix.needsUpdate = true;
  }

  private buildPaths(): void {
    const longMat = new THREE.MeshStandardMaterial({ color: PALETTE.red });
    const longPath = new THREE.Mesh(new THREE.PlaneGeometry(1, 16), longMat);
    longPath.rotation.x = -Math.PI / 2;
    longPath.position.set(-4, 0.02, 4);
    longPath.rotation.z = Math.PI / 5;
    this.pathLong.add(longPath);
    const longLbl = floorDecal("LONG UNSHADED PATH", 5, "#B23A2B");
    longLbl.position.set(-4, 0.04, 6);
    this.pathLong.add(longLbl);

    const shortMat = new THREE.MeshStandardMaterial({ color: PALETTE.green });
    const shortPath = new THREE.Mesh(new THREE.PlaneGeometry(1, 6), shortMat);
    shortPath.rotation.x = -Math.PI / 2;
    shortPath.position.set(2, 0.02, 4);
    this.pathShort.add(shortPath);
    const shortLbl = floorDecal("SHORT SHADED PATH", 4, "#2E7D32");
    shortLbl.position.set(2, 0.04, 6.5);
    this.pathShort.add(shortLbl);
    this.pathShort.visible = false;
  }

  protected onSnapshot(snap: EngineSnapshot): void {
    const { state, flags } = snap;

    // Cold room B availability reflects capacity reduction / shared cooling.
    this.coldRoomB.visible = !flags.coldCapacityReduced;

    // Stock states across shelves, ordered by FEFO when the flag is set.
    const total = this.shelfCount;
    const spoiled = Math.round((state.quantitySpoiled / state.quantityReceived) * total);
    const available = total - spoiled;
    for (let i = 0; i < total; i++) {
      // With FEFO, spoiled/near-expiry cluster at the front for clear rotation;
      // without FEFO, spoilage is scattered (mixed expiry).
      let isSpoiled: boolean;
      if (flags.fefo) {
        isSpoiled = i < spoiled;
      } else {
        isSpoiled = (i * 7) % total < spoiled; // scattered
      }
      this.shelfCrates.setColor(
        i,
        isSpoiled ? CRATE_STATE_COLOR.spoiled : CRATE_STATE_COLOR.available
      );
    }

    // Paths reflect improved layout.
    this.pathShort.visible = flags.shadePrecooling || flags.uFlowLayout;
    this.pathLong.visible = !(flags.shadePrecooling || flags.uFlowLayout);

    // Panels
    const coolText = flags.shadePrecooling
      ? `COLD ROOM\n~4\u00b0C · excursion ${state.temperatureExposure}`
      : `COLD ROOM\n~9\u00b0C · excursion ${state.temperatureExposure}`;
    this.retexture(this.thermometer, coolText, "rgba(42,120,168,0.92)", 280);

    const capPct = Math.round((state.capacityUsed / Math.max(1, state.capacityAvailable)) * 100);
    this.retexture(
      this.capacityLabel,
      `CAPACITY\n${state.capacityUsed}/${state.capacityAvailable} (${capPct}%)`,
      capPct > 95 ? "rgba(178,58,43,0.9)" : "rgba(23,50,77,0.9)",
      200
    );

    this.retexture(
      this.fefoLabel,
      flags.fefo ? "STOCK ORDER: FEFO" : "STOCK ORDER: MIXED",
      flags.fefo ? "rgba(46,125,50,0.9)" : "rgba(178,58,43,0.9)",
      180
    );
    void available;
  }

  private retexture(mesh: THREE.Mesh, text: string, bg: string, h: number): void {
    const mat = mesh.material as THREE.MeshBasicMaterial;
    const old = mat.map;
    mat.map = makeTextTexture(text, { bg, fontSize: 50, width: 512, height: h });
    mat.needsUpdate = true;
    old?.dispose();
  }
}

function decal(text: string, w: number, color: string, x: number, z: number): THREE.Mesh {
  const m = floorDecal(text, w, color);
  m.position.set(x, 0.03, z);
  return m;
}
