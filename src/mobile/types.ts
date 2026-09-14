/**
 * Domain types for the Small-Scale Food Manufacturing Mobile Operations App.
 * Covers Role-Based Access Control (5 Ranks), Machine Hub, Process Tests,
 * Pipeline Stages, Notifications, Worker Grievances, Supply Chain, Cash Flow,
 * and AI Audio Assistant.
 */

export type SourceProvenance = "SOURCE" | "INFERENCE" | "PROPOSED";

export type EmployeeRank = 1 | 2 | 3 | 4 | 5;

export interface EmployeeProfile {
  id: string;
  name: string;
  role: string;
  rank: EmployeeRank;
  department: string;
  shift: string;
  avatarUrl?: string;
  badgeColor: string;
  permissions: {
    canViewSOPs: boolean;
    canOperateMachines: boolean;
    canRunQualityTests: boolean;
    canSignOffCompliance: boolean;
    canViewMaintenanceLogs: boolean;
    canEditMaintenanceSchedules: boolean;
    canViewSupplyChain: boolean;
    canApproveProcurement: boolean;
    canViewCashFlow: boolean;
    canAccessBankFinancing: boolean;
    canViewExecutiveReports: boolean;
  };
}

export type AppTab = "home" | "supply" | "inventory" | "machines" | "quality" | "finance";

export interface PlantAlert {
  id: string;
  severity: "critical" | "warn" | "info";
  title: string;
  detail: string;
  time: string;
  machineId?: string;
  actionTab?: AppTab;
  actionLabel?: string;
}

export type PlantNotification = PlantAlert;

export interface PipelineStage {
  id: string;
  label: string;
  short: string;
  count: number;
  loss?: string;
  sub: string;
  unit: string;
  icon: string;
  tone: "leaf" | "teal" | "gold" | "terra" | "ink";
  targetTab: AppTab;
}

export interface WorkerGrievance {
  id: string;
  workerName: string;
  rank: EmployeeRank;
  category: "Safety Hazard" | "Cold Exposure / PPE" | "Machine Breakdown" | "Shift & Wage" | "Hygiene & Washroom";
  transcript: string;
  timestamp: string;
  status: "Submitted" | "Under Review" | "Action Taken" | "Resolved";
  audioRecorded: boolean;
  priority: "High" | "Medium" | "Urgent";
}

export interface MachineTelemetry {
  id: string;
  name: string;
  category: "Cooling" | "Cleansing" | "Packaging" | "Drying" | "Grading";
  status: "running" | "idle" | "maintenance" | "alert";
  healthScore: number; // 0-100%
  oee: number; // Overall Equipment Effectiveness %
  powerKw: number;
  runtimeHours: number;
  lastServiceDate: string;
  nextServiceHours: number;
  faultCode?: string;
  faultDescription?: string;
  metrics: {
    label: string;
    value: string;
    nominal: string;
    unit: string;
    status: "ok" | "warn" | "crit";
  }[];
  pokaYokeGuides: string[];
  sopSteps: {
    step: number;
    title: string;
    instruction: string;
    safetyCheck: string;
  }[];
  sceneNodeId?: string; // Links to 3D scene mesh
  energySavingVsBaseline?: string;
  provenance: SourceProvenance;
}

export interface ProcessTest {
  id: string;
  name: string;
  processStep: string; // e.g., "Step 2: Cleansing", "Step 5: Packaging"
  category: "Chemical" | "Microbial" | "Physical" | "Thermal" | "Sensory";
  requiredRank: EmployeeRank;
  nominalRange: string;
  unit: string;
  lastTestedAt: string;
  testedBy: string;
  currentValue: number;
  status: "pass" | "warn" | "fail";
  cpk: number; // Process capability index
  procedure: string;
  correctiveAction: string;
  provenance: SourceProvenance;
}

export type MiniSceneKey = "farmReceiving" | "processingPackaging" | "inventoryColdChain" | "dispatchMarket";

export interface InventoryChamber {
  id: string;
  name: string;
  type:
    | "Pre-Cooling Intake"
    | "High-Bay FEFO Cold Storage"
    | "Finished Goods & Blast Chilling"
    | "CoolBot Walk-in"
    | "Zero Energy Cool Chamber (ZECC)"
    | "Solar Conduction Dry Store"
    | "Ambient Buffer";
  tempC: number;
  targetTempC: string;
  humidityPct: number;
  targetHumidityPct: string;
  capacityCrates: number;
  occupiedCrates: number;
  excursionsToday: number;
  assetTier: "Zero Cost" | "Low Investment" | "Asset Light";
  provenance: SourceProvenance;
}

export interface FefoCrateItem {
  id: string;
  commodity: string;
  batchLot: string;
  receivedDate: string;
  expiryDate: string;
  remainingShelfLifeDays: number;
  initialShelfLifeDays: number;
  chamberId: string;
  status: "fresh" | "expiring_soon" | "critical" | "spoiled";
  abcCategory: "A" | "B" | "C"; // A: high-value perishable, B: moderate, C: non-perishable
  crateQuantity: number;
  estimatedValueRupees: number;
}

export interface SupplyBatch {
  id: string;
  farmerOrFpo: string;
  district: string;
  commodity: string;
  quantityCrates: number;
  scheduledArrival: string;
  staggerSlot: "08:00 - 10:00" | "10:30 - 12:30" | "14:00 - 16:00";
  farmGateTempC: number;
  demandMatched: boolean;
  scorecardRating: number; // 1-5 stars
  rejectionHistoryPct: number;
}

export interface CashFlowMetrics {
  workingCapitalBalance: number;
  dailyRevenue: number;
  dailyOperatingCosts: number;
  inventoryHoldingValue: number;
  baselineSpoilageLossRupees: number; // ~Rs 33,600/batch
  optimizedSpoilageLossRupees: number; // ~Rs 8,640/batch
  netDailySavingsRupees: number;
  eNwrLoanAvailable: number; // WDRA warehouse receipt financing
  eNwrInterestRatePct: number; // 7.0% p.a.
  distressSaleDiscountAvoidedRupees: number;
  pmfmeSubsidyClaimedRupees: number; // 35% up to Rs 10 Lakhs
  pmfmeMaxEligibleRupees: number;
  spoilageInsuranceCoveredRupees: number;
  provenance: SourceProvenance;
}
