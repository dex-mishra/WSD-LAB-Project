/**
 * Central colour palette from AGENT.md visual direction.
 * Colour meanings are semantic and must be paired with words/icons in UI.
 */
export const PALETTE = {
  navy: 0x17324d, // structure, dashboards, headers, authority
  green: 0x2e7d32, // healthy flow, interventions, improvement
  yellow: 0xf4c542, // focus, priority, FEFO/ABC markers, scenario controls
  cream: 0xf7f5ee, // warm surfaces, UI backgrounds
  red: 0xb23a2b, // loss, spoilage, rejected batches, critical alerts
  coolBlue: 0x2a78a8, // temperature, water, cold-chain indicators
} as const;

/** CSS hex strings for HTML UI reuse. */
export const CSS_PALETTE = {
  navy: "#17324d",
  green: "#2e7d32",
  yellow: "#f4c542",
  cream: "#f7f5ee",
  red: "#b23a2b",
  coolBlue: "#2a78a8",
} as const;

export type SceneKey =
  | "farmReceiving"
  | "processingPackaging"
  | "inventoryColdChain"
  | "dispatchMarket";

export const SCENE_ORDER: SceneKey[] = [
  "farmReceiving",
  "processingPackaging",
  "inventoryColdChain",
  "dispatchMarket",
];

export const SCENE_LABELS: Record<SceneKey, string> = {
  farmReceiving: "Farm & Receiving",
  processingPackaging: "Processing & Packaging",
  inventoryColdChain: "Inventory & Cold Chain",
  dispatchMarket: "Dispatch & Market",
};
