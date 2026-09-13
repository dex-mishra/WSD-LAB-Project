import { SCENE_ORDER, SCENE_LABELS, type SceneKey } from "../app/palette";
import type { ScenarioEngine, EngineSnapshot } from "../simulation/ScenarioEngine";
import type { ScenarioId } from "../simulation/types";

interface HudOptions {
  engine: ScenarioEngine;
  onSelectScene: (key: SceneKey) => void;
  onReset: () => void;
  getActiveScene: () => SceneKey;
}

/**
 * DOM HUD for desktop (non-XR) use: scene selector, scenario controls, a
 * metric panel mirroring the in-world dashboard, reset, and a contextual hint.
 * Guidelines: show one decision at a time, pair colour with words, show units.
 */
export class Hud {
  private root: HTMLDivElement;
  private sceneBtns = new Map<SceneKey, HTMLButtonElement>();
  private scenarioBtns = new Map<ScenarioId, HTMLButtonElement>();
  private dashEl!: HTMLDivElement;
  private hintEl!: HTMLDivElement;
  private engine: ScenarioEngine;

  constructor(private opts: HudOptions) {
    this.engine = opts.engine;
    this.root = document.createElement("div");
    this.root.id = "hud";
    document.body.appendChild(this.root);
    this.build();
    this.engine.subscribe((snap) => this.onSnapshot(snap));
  }

  private build(): void {
    // Top bar: scene selector + reset
    const top = document.createElement("div");
    top.className = "hud-topbar";

    const sceneWrap = document.createElement("div");
    sceneWrap.className = "hud-scene-btns";
    for (const key of SCENE_ORDER) {
      const b = document.createElement("button");
      b.className = "chip";
      b.textContent = SCENE_LABELS[key];
      b.addEventListener("click", () => this.opts.onSelectScene(key));
      sceneWrap.appendChild(b);
      this.sceneBtns.set(key, b);
    }
    top.appendChild(sceneWrap);

    const reset = document.createElement("button");
    reset.className = "chip";
    reset.textContent = "Reset position";
    reset.addEventListener("click", () => this.opts.onReset());
    top.appendChild(reset);

    const resetScenario = document.createElement("button");
    resetScenario.className = "chip";
    resetScenario.textContent = "Reset scenario";
    resetScenario.addEventListener("click", () => this.engine.reset());
    top.appendChild(resetScenario);

    this.root.appendChild(top);

    // Dashboard mirror (right)
    this.dashEl = document.createElement("div");
    this.dashEl.className = "hud-dash";
    this.root.appendChild(this.dashEl);

    // Scenario controls (bottom)
    const bottom = document.createElement("div");
    bottom.className = "hud-bottom";
    for (const id of this.engine.scenarioIds) {
      const def = this.engine.getScenarioDef(id);
      const b = document.createElement("button");
      b.className = "scenario-btn";
      b.innerHTML = `<span>${def.name}</span><small>${def.status}</small>`;
      b.addEventListener("click", () => this.engine.setScenario(id));
      bottom.appendChild(b);
      this.scenarioBtns.set(id, b);
    }
    this.root.appendChild(bottom);

    // Hint
    this.hintEl = document.createElement("div");
    this.hintEl.className = "hud-hint";
    this.hintEl.textContent =
      "Drag to look · WASD to move · click objects to inspect · pick a scenario below to compare baseline vs improved.";
    this.root.appendChild(this.hintEl);
  }

  setActiveScene(key: SceneKey): void {
    for (const [k, btn] of this.sceneBtns) {
      btn.classList.toggle("active", k === key);
    }
  }

  flashInfo(text: string): void {
    this.hintEl.textContent = text;
  }

  private onSnapshot(snap: EngineSnapshot): void {
    // Highlight active scenario
    for (const [id, btn] of this.scenarioBtns) {
      btn.classList.toggle("active", id === snap.scenarioId);
    }

    const yieldN = this.engine.usableYield(snap.state) * 100;
    const yield0 = this.engine.usableYield(snap.baseline) * 100;
    const lossDelta =
      snap.baseline.estimatedLossValue - snap.state.estimatedLossValue;

    const rows: string[] = [];
    const metric = (label: string, value: string, cls = "") =>
      `<div class="metric"><span class="m-label">${label}</span><span class="m-value ${cls}">${value}</span></div>`;

    rows.push(metric("Good units", `${snap.state.quantityGood} crates`, "good"));
    rows.push(metric("Spoiled", `${snap.state.quantitySpoiled} crates`, "bad"));
    rows.push(metric("Rejected", `${snap.state.quantityRejected} crates`, "bad"));
    rows.push(metric("Queue", `${snap.state.queueLength} crates`, snap.state.queueLength > 20 ? "bad" : ""));
    rows.push(metric("Temp excursion", `${snap.state.temperatureExposure} °C·h`, "bad"));
    rows.push(metric("Capacity", `${snap.state.capacityUsed}/${snap.state.capacityAvailable}`));
    rows.push(metric("Orders due", `${snap.state.ordersDue} crates`));
    rows.push(metric("Inventory", `${snap.state.inventoryDays} days`));
    rows.push(metric("Est. loss", `₹${snap.state.estimatedLossValue.toLocaleString("en-IN")}`, "bad"));
    rows.push(
      metric(
        "Usable yield",
        `${yieldN.toFixed(0)}% (base ${yield0.toFixed(0)}%)`,
        yieldN >= yield0 ? "good" : "bad"
      )
    );
    rows.push(
      metric(
        "Loss vs base",
        lossDelta >= 0
          ? `−₹${lossDelta.toLocaleString("en-IN")}`
          : `+₹${(-lossDelta).toLocaleString("en-IN")}`,
        lossDelta >= 0 ? "good" : "bad"
      )
    );

    this.dashEl.innerHTML =
      `<h3>Dashboard</h3>` +
      `<div class="dash-scenario">${snap.scenarioName} · [${snap.scenarioStatus}]</div>` +
      rows.join("");
  }
}
