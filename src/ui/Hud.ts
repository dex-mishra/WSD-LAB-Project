import { SCENE_ORDER, SCENE_LABELS, type SceneKey } from "../app/palette";
import type { ScenarioEngine, EngineSnapshot } from "../simulation/ScenarioEngine";
import type { ScenarioId } from "../simulation/types";
import type { InteractableMeta } from "../interaction/Interactable";

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
  private inspectorEl!: HTMLDivElement;
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

    const actWrap = document.createElement("div");
    actWrap.className = "hud-actions";

    const reset = document.createElement("button");
    reset.className = "chip chip-action";
    reset.textContent = "↺ Reset view";
    reset.addEventListener("click", () => this.opts.onReset());
    actWrap.appendChild(reset);

    const resetScenario = document.createElement("button");
    resetScenario.className = "chip chip-action";
    resetScenario.textContent = "↺ Reset scenario";
    resetScenario.addEventListener("click", () => this.engine.reset());
    actWrap.appendChild(resetScenario);

    top.appendChild(actWrap);
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
      "Drag mouse or press Q / E to rotate · WASD to walk · Scroll to zoom · Click objects to inspect";
    this.root.appendChild(this.hintEl);

    // 2D Desktop Inspector Card (Top-Left)
    this.inspectorEl = document.createElement("div");
    this.inspectorEl.className = "hud-inspector hidden";
    this.root.appendChild(this.inspectorEl);
  }

  showInspector(meta: InteractableMeta, onClose?: () => void): void {
    const isSource = meta.sourceStatus === "SOURCE";
    const isInference = meta.sourceStatus === "INFERENCE";
    const statusClass = isSource ? "tag-source" : isInference ? "tag-inference" : "tag-proposed";
    const statusText = isSource ? "Source Data" : isInference ? "Inference" : "Proposed Model";

    const cleanInfo = meta.info.filter((line) => {
      const lower = line.toLowerCase();
      return !lower.startsWith("assettype:") && !lower.startsWith("zone:");
    });

    this.inspectorEl.innerHTML = `
      <div class="inspector-header">
        <div class="inspector-title-wrap">
          <span class="inspector-zone">${meta.zone.toUpperCase()}</span>
          <h4>${meta.title}</h4>
        </div>
        <button class="inspector-close" title="Close inspector">✕</button>
      </div>
      <div class="inspector-meta-row">
        <span class="tag tag-type">${meta.assetType}</span>
        <span class="tag ${statusClass}">${statusText}</span>
      </div>
      <ul class="inspector-bullets">
        ${cleanInfo.map((item) => `<li>${item}</li>`).join("")}
      </ul>
      ${meta.onSelect ? `<div class="inspector-action-hint">⚡ Interaction available: click again to toggle</div>` : ""}
    `;

    this.inspectorEl.querySelector(".inspector-close")?.addEventListener("click", () => {
      this.hideInspector();
      onClose?.();
    });

    this.inspectorEl.classList.remove("hidden");
  }

  hideInspector(): void {
    this.inspectorEl.classList.add("hidden");
  }

  setActiveScene(key: SceneKey): void {
    for (const [k, btn] of this.sceneBtns) {
      btn.classList.toggle("active", k === key);
    }
    this.hideInspector();
  }

  flashInfo(text: string): void {
    this.hintEl.textContent = text;
  }

  private dashCollapsed = false;
  private lastSnap: EngineSnapshot | null = null;

  private onSnapshot(snap: EngineSnapshot): void {
    this.lastSnap = snap;

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
      `<div class="dash-header-row">` +
      `  <h3>📊 Operations KPIs</h3>` +
      `  <button class="dash-toggle-btn" title="${this.dashCollapsed ? "Expand" : "Collapse"}">${this.dashCollapsed ? "+" : "−"}</button>` +
      `</div>` +
      (this.dashCollapsed
        ? `<div class="dash-scenario" style="margin:0">${snap.scenarioName} · ${(yieldN).toFixed(0)}% Yield</div>`
        : `<div class="dash-scenario">${snap.scenarioName} · [${snap.scenarioStatus}]</div>` + rows.join(""));

    this.dashEl.querySelector(".dash-toggle-btn")?.addEventListener("click", (e) => {
      e.stopPropagation();
      this.dashCollapsed = !this.dashCollapsed;
      this.dashEl.classList.toggle("collapsed", this.dashCollapsed);
      if (this.lastSnap) this.onSnapshot(this.lastSnap);
    });
  }
}
