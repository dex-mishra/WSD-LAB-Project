/**
 * Simulation domain types. Kept completely independent of Three.js so the
 * simulation is the single source of truth. Scene meshes and UI subscribe to
 * this state; they never own it.
 */

export type SourceStatus = "SOURCE" | "INFERENCE" | "PROPOSED";

export type ScenarioId =
  | "baseline"
  | "demandIncrease"
  | "coldCapacityDecrease"
  | "improved";

/** The shared state variables required by AGENT.md. Every scenario updates these. */
export interface SimState {
  quantityReceived: number;
  quantityGood: number;
  quantityRejected: number;
  quantitySpoiled: number;
  arrivalTime: number;
  timeInStorage: number;
  temperatureExposure: number;
  humidityExposure: number;
  capacityUsed: number;
  capacityAvailable: number;
  queueLength: number;
  ordersDue: number;
  inventoryDays: number;
  estimatedLossValue: number;
}

export interface ScenarioFlags {
  fefo: boolean;
  shadePrecooling: boolean;
  demandMatched: boolean;
  uFlowLayout: boolean;
  sharedCooling: boolean;
  coldCapacityReduced: boolean;
  demandIncrease: boolean;
}

export interface ScenarioDef {
  id: ScenarioId;
  name: string;
  status: SourceStatus;
  summary: string;
  flags: ScenarioFlags;
  state: SimState;
}

export interface ScenarioData {
  status: SourceStatus;
  note: string;
  units: Record<keyof SimState, string>;
  assumptions: {
    cratePriceRupees: number;
    baselineLossRate: number;
    targetLossRate: number;
    coldRoomBaselineCapacity: number;
    batchSize: number;
  };
  scenarios: Record<ScenarioId, ScenarioDef>;
}

/** A metric ready for display, with unit + provenance. */
export interface DisplayMetric {
  key: keyof SimState;
  label: string;
  value: number;
  unit: string;
  status: SourceStatus;
  /** "bad" = higher is worse, "good" = higher is better, "neutral" otherwise. */
  polarity: "bad" | "good" | "neutral";
}
