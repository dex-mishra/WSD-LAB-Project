import * as THREE from "three";
import { makeTextTexture } from "../app/builders";
import type { ScenarioEngine, EngineSnapshot } from "../simulation/ScenarioEngine";

/**
 * World-space dashboard kiosk. Mirrors the scenario state as a readable panel:
 * scenario name + status, key metrics with units, usable yield, and a
 * before/after comparison against the baseline. Subscribes to engine state.
 */
export class Dashboard {
  readonly group = new THREE.Group();
  private material: THREE.MeshBasicMaterial;
  private latest: EngineSnapshot | null = null;
  private dirty = true;

  constructor(private engine: ScenarioEngine) {
    // Kiosk stand
    const stand = new THREE.Mesh(
      new THREE.BoxGeometry(0.15, 1.4, 0.15),
      new THREE.MeshStandardMaterial({ color: 0x17324d })
    );
    stand.position.y = -0.7;
    this.group.add(stand);

    this.material = new THREE.MeshBasicMaterial({
      transparent: true,
      depthWrite: false,
    });
    const panel = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 1.5), this.material);
    panel.renderOrder = 4;
    this.group.add(panel);

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

    const lines: string[] = [];
    lines.push(`DASHBOARD  ·  ${snap.scenarioName}`);
    lines.push(`status: ${snap.scenarioStatus}`);
    lines.push("");
    lines.push(`Good units:  ${snap.state.quantityGood} crates`);
    lines.push(`Spoiled:     ${snap.state.quantitySpoiled} crates`);
    lines.push(`Queue:       ${snap.state.queueLength} crates`);
    lines.push(`Temp exc.:   ${snap.state.temperatureExposure} degC·h`);
    lines.push(`Capacity:    ${snap.state.capacityUsed}/${snap.state.capacityAvailable}`);
    lines.push(`Est. loss:   ₹${snap.state.estimatedLossValue.toLocaleString("en-IN")}`);
    lines.push("");
    lines.push(`Usable yield: ${(yieldN * 100).toFixed(0)}%  (base ${(yield0 * 100).toFixed(0)}%)`);
    lines.push(
      lossDelta >= 0
        ? `Loss avoided vs base: ₹${lossDelta.toLocaleString("en-IN")}`
        : `Loss increase vs base: ₹${(-lossDelta).toLocaleString("en-IN")}`
    );

    const tex = makeTextTexture(lines.join("\n"), {
      bg: "rgba(23,50,77,0.96)",
      fg: "#F7F5EE",
      fontSize: 30,
      width: 720,
      height: 570,
      align: "left",
      padding: 34,
    });
    const old = this.material.map;
    this.material.map = tex;
    this.material.needsUpdate = true;
    old?.dispose();
  }
}
