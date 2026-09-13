import scenarioData from "../data/scenarios.json";
import type {
  DisplayMetric,
  ScenarioData,
  ScenarioDef,
  ScenarioFlags,
  ScenarioId,
  SimState,
  SourceStatus,
} from "./types";

const DATA = scenarioData as unknown as ScenarioData;

export type EngineListener = (snapshot: EngineSnapshot) => void;

export interface EngineSnapshot {
  scenarioId: ScenarioId;
  scenarioName: string;
  scenarioStatus: SourceStatus;
  scenarioSummary: string;
  flags: ScenarioFlags;
  state: SimState;
  /** The always-available reference used for before/after comparison. */
  baseline: SimState;
  metrics: DisplayMetric[];
}

/** Human-readable labels + polarity for each metric. */
const METRIC_META: Record<
  keyof SimState,
  { label: string; polarity: DisplayMetric["polarity"] }
> = {
  quantityReceived: { label: "Received", polarity: "neutral" },
  quantityGood: { label: "Good units", polarity: "good" },
  quantityRejected: { label: "Rejected", polarity: "bad" },
  quantitySpoiled: { label: "Spoiled", polarity: "bad" },
  arrivalTime: { label: "Arrival time", polarity: "neutral" },
  timeInStorage: { label: "Time in storage", polarity: "bad" },
  temperatureExposure: { label: "Temp. excursion", polarity: "bad" },
  humidityExposure: { label: "Humidity dev.", polarity: "bad" },
  capacityUsed: { label: "Capacity used", polarity: "neutral" },
  capacityAvailable: { label: "Capacity avail.", polarity: "good" },
  queueLength: { label: "Queue length", polarity: "bad" },
  ordersDue: { label: "Orders due", polarity: "neutral" },
  inventoryDays: { label: "Inventory days", polarity: "neutral" },
  estimatedLossValue: { label: "Est. loss value", polarity: "bad" },
};

/** Order metrics appear in the dashboard. */
const METRIC_ORDER: (keyof SimState)[] = [
  "quantityReceived",
  "quantityGood",
  "quantitySpoiled",
  "quantityRejected",
  "queueLength",
  "temperatureExposure",
  "timeInStorage",
  "capacityUsed",
  "capacityAvailable",
  "ordersDue",
  "inventoryDays",
  "estimatedLossValue",
];

/**
 * ScenarioEngine holds the single source of truth for simulation state and
 * notifies subscribers on change. It is deliberately simple and inspectable.
 */
export class ScenarioEngine {
  private current: ScenarioId = "baseline";
  private listeners = new Set<EngineListener>();

  get data(): ScenarioData {
    return DATA;
  }

  get scenarioIds(): ScenarioId[] {
    return Object.keys(DATA.scenarios) as ScenarioId[];
  }

  getScenarioDef(id: ScenarioId): ScenarioDef {
    return DATA.scenarios[id];
  }

  getCurrentId(): ScenarioId {
    return this.current;
  }

  /** Illustrative teaching metric: usable yield = good dispatched / received. */
  usableYield(state: SimState = this.getState()): number {
    if (state.quantityReceived <= 0) return 0;
    return state.quantityGood / state.quantityReceived;
  }

  /**
   * Illustrative recovered quantity for a scenario relative to baseline loss,
   * using PROPOSED assumption values only.
   */
  recoveredQuantity(): number {
    const { batchSize, baselineLossRate, targetLossRate } = DATA.assumptions;
    return Math.max(0, batchSize * (baselineLossRate - targetLossRate));
  }

  setScenario(id: ScenarioId): void {
    if (!DATA.scenarios[id]) return;
    this.current = id;
    this.emit();
  }

  reset(): void {
    this.setScenario("baseline");
  }

  getState(): SimState {
    return { ...DATA.scenarios[this.current].state };
  }

  getBaseline(): SimState {
    return { ...DATA.scenarios.baseline.state };
  }

  getSnapshot(): EngineSnapshot {
    const def = DATA.scenarios[this.current];
    return {
      scenarioId: def.id,
      scenarioName: def.name,
      scenarioStatus: def.status,
      scenarioSummary: def.summary,
      flags: { ...def.flags },
      state: { ...def.state },
      baseline: this.getBaseline(),
      metrics: this.buildMetrics(def.state),
    };
  }

  private buildMetrics(state: SimState): DisplayMetric[] {
    return METRIC_ORDER.map((key) => ({
      key,
      label: METRIC_META[key].label,
      value: state[key],
      unit: DATA.units[key],
      status: DATA.scenarios[this.current].status,
      polarity: METRIC_META[key].polarity,
    }));
  }

  subscribe(fn: EngineListener): () => void {
    this.listeners.add(fn);
    // Emit current state immediately so subscribers initialise correctly.
    fn(this.getSnapshot());
    return () => this.listeners.delete(fn);
  }

  private emit(): void {
    const snap = this.getSnapshot();
    for (const fn of this.listeners) fn(snap);
  }
}
