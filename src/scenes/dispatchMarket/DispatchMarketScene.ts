import * as THREE from "three";
import { SceneModule } from "../SceneModule";
import type { SceneKey } from "../../app/palette";
import { PALETTE } from "../../app/palette";
import { box, ground, label, floorDecal, makeTextTexture } from "../../app/builders";
import { makeInteractable } from "../../interaction/Interactable";
import type { EngineSnapshot } from "../../simulation/ScenarioEngine";

/**
 * Environment 4: Dispatch and market feedback.
 * Closes the loop from inventory to demand and shows that producing more than
 * can be sold or stored creates avoidable loss.
 */
export class DispatchMarketScene extends SceneModule {
  readonly key: SceneKey = "dispatchMarket";

  private truck!: THREE.Group;
  private demandBars = new THREE.Group();
  private supplyBar!: THREE.Mesh;
  private demandBar!: THREE.Mesh;
  private matchLabel!: THREE.Mesh;
  private orderCards: THREE.Mesh[] = [];

  protected build(): void {
    const floor = ground(44, 32, 0xbcc9b8);
    this.group.add(floor);

    // Dispatch staging area
    this.group.add(decal("DISPATCH", 4, "#17324D", -8, -4));
    const staging = box(8, 0.1, 6, 0x9aa79a);
    staging.position.set(-8, 0.05, -4);
    this.group.add(staging);

    // Finished-goods crates on staging
    for (let i = 0; i < 6; i++) {
      const c = box(0.6, 0.5, 0.6, PALETTE.green);
      c.position.set(-10 + (i % 3) * 0.8, 0.3 + Math.floor(i / 3) * 0.55, -5 + Math.floor(i / 3) * 0.1);
      this.group.add(c);
    }

    // Route board
    const board = box(0.2, 2.4, 3, PALETTE.navy);
    board.position.set(-4, 1.4, -6);
    this.group.add(makeInteractable(board, {
      id: "routeBoard",
      title: "Route Board",
      info: ["Delivery routes + time slots", "Feeds procurement decisions"],
      assetType: "board",
      zone: "dispatch",
      sourceStatus: "PROPOSED",
    }));

    // Small delivery truck
    this.truck = new THREE.Group();
    const cab = box(1.6, 1.6, 1.8, PALETTE.coolBlue);
    cab.position.set(0, 0.9, 1.2);
    this.truck.add(cab);
    const cargo = box(1.8, 2.0, 3.4, PALETTE.cream);
    cargo.position.set(0, 1.1, -1.4);
    this.truck.add(cargo);
    for (const [x, z] of [
      [0.8, 1.4],
      [-0.8, 1.4],
      [0.8, -1.6],
      [-0.8, -1.6],
    ]) {
      const wheel = new THREE.Mesh(
        new THREE.CylinderGeometry(0.45, 0.45, 0.3, 16),
        new THREE.MeshStandardMaterial({ color: 0x1c1c1c })
      );
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(x, 0.45, z);
      wheel.castShadow = true;
      this.truck.add(wheel);
    }
    this.truck.position.set(-2, 0, 2);
    this.group.add(makeInteractable(this.truck, {
      id: "truck",
      title: "Delivery Truck",
      info: ["Carries finished goods to market", "assetType: vehicle"],
      assetType: "vehicle",
      zone: "dispatch",
      sourceStatus: "PROPOSED",
    }));

    // Market / shop endpoint
    const shop = box(6, 4, 5, PALETTE.yellow);
    shop.position.set(12, 2, -6);
    this.group.add(makeInteractable(shop, {
      id: "market",
      title: "Local Market / Shop",
      info: ["Demand endpoint", "Orders + cancellations originate here"],
      assetType: "building",
      zone: "market",
      sourceStatus: "PROPOSED",
    }));
    const shopLabel = label("LOCAL MARKET", 4, { bg: "rgba(23,50,77,0.9)", fontSize: 52 });
    shopLabel.position.set(12, 4.6, -3.4);
    this.group.add(shopLabel);

    // Order cards
    for (let i = 0; i < 4; i++) {
      const card = box(0.6, 0.02, 0.9, PALETTE.cream);
      card.position.set(10 + i * 0.4, 1.0, -4 + i * 0.2);
      this.orderCards.push(card);
      this.group.add(card);
    }

    // Demand-vs-supply bar chart (floating dashboard)
    this.buildDemandChart();
    this.demandBars.position.set(3, 0, -8);
    this.group.add(this.demandBars);

    this.matchLabel = label("PROCUREMENT: --", 3.2, {
      bg: "rgba(178,58,43,0.9)",
      fontSize: 50,
      width: 512,
      height: 180,
    });
    this.matchLabel.position.set(3, 3.4, -6);
    this.group.add(this.matchLabel);

    const title = label("DISPATCH & MARKET", 6, { fontSize: 52 });
    title.position.set(0, 5.4, -11);
    this.group.add(title);
  }

  private buildDemandChart(): void {
    const base = box(3, 0.1, 1, PALETTE.navy);
    base.position.set(0.5, 0.05, 0);
    this.demandBars.add(base);

    this.supplyBar = box(0.6, 1, 0.6, PALETTE.coolBlue);
    this.supplyBar.position.set(0, 0.5, 0);
    this.demandBars.add(this.supplyBar);

    this.demandBar = box(0.6, 1, 0.6, PALETTE.green);
    this.demandBar.position.set(1.2, 0.5, 0);
    this.demandBars.add(this.demandBar);

    const s = floorDecal("SUPPLY", 1, "#2A78A8");
    s.rotation.x = 0;
    s.position.set(0, 0.05, 0.9);
    this.demandBars.add(s);
    const d = floorDecal("DEMAND", 1, "#2E7D32");
    d.position.set(1.2, 0.05, 0.9);
    this.demandBars.add(d);
  }

  protected onSnapshot(snap: EngineSnapshot): void {
    const { state, flags } = snap;
    // Scale bars: supply from good units, demand from orders due.
    const supplyH = Math.max(0.2, (state.quantityGood / 100) * 3);
    const demandH = Math.max(0.2, (state.ordersDue / 120) * 3);
    this.supplyBar.scale.y = supplyH / 1;
    this.supplyBar.position.y = supplyH / 2;
    this.demandBar.scale.y = demandH / 1;
    this.demandBar.position.y = demandH / 2;

    // Colour demand bar red if mismatch is large.
    const mat = this.demandBar.material as THREE.MeshStandardMaterial;
    const mismatch = Math.abs(state.ordersDue - state.quantityGood);
    mat.color.setHex(mismatch > 25 ? PALETTE.red : PALETTE.green);

    const text = flags.demandMatched
      ? "PROCUREMENT: DEMAND-MATCHED"
      : "PROCUREMENT: FIXED HABITUAL";
    const bg = flags.demandMatched ? "rgba(46,125,50,0.9)" : "rgba(178,58,43,0.9)";
    const lmat = this.matchLabel.material as THREE.MeshBasicMaterial;
    const old = lmat.map;
    lmat.map = makeTextTexture(text, { bg, fontSize: 46, width: 512, height: 180 });
    lmat.needsUpdate = true;
    old?.dispose();
  }
}

function decal(text: string, w: number, color: string, x: number, z: number): THREE.Mesh {
  const m = floorDecal(text, w, color);
  m.position.set(x, 0.03, z);
  return m;
}
