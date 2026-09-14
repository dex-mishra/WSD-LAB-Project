import { AudioVoiceEngine } from "./AudioVoiceEngine";
import type { AppTab, EmployeeRank } from "./types";
import { MACHINES_DATA, PROCESS_TESTS_DATA } from "./mobileData";

export interface ContextExplanation {
  title: string;
  summary: string;
  bulletPoints: string[];
  recommendedAction: string;
  provenance: "SOURCE" | "INFERENCE" | "PROPOSED";
}

export class AiAssistant {
  private voiceEngine: AudioVoiceEngine;

  constructor(voiceEngine: AudioVoiceEngine) {
    this.voiceEngine = voiceEngine;
  }

  /**
   * Generates a context-aware explanation for the active screen/tab, tailored by employee rank.
   */
  public explainTabContext(tab: AppTab, rank: EmployeeRank): ContextExplanation {
    switch (tab) {
      case "home":
        return {
          title: "Plant at a glance",
          summary:
            "100 crates came in today across 3 FPO slots. 94 cleared wash and QC, 88 are safe in cold store, 88 packed and 84 ready to dispatch — an 88% usable yield against a 62% baseline.",
          bulletPoints: [
            "Tap any pipeline stage to jump to its station.",
            "1 machine needs attention: sorting table belt jam (MCH-05).",
            "Baby spinach lot expires in 1 day — dispatch first.",
            rank >= 4
              ? "Net gain vs baseline today: plus ₹24,960."
              : "Your next check: confirm shade staging for the 14:30 batch.",
          ],
          recommendedAction: "Clear the MCH-05 belt jam, then dispatch spinach lot B-2026-0913-E.",
          provenance: "SOURCE",
        };
      case "supply":
        return {
          title: "AI Analysis: Demand & Supply Chain Synchronization",
          summary:
            "India's food processing sector has 86% small or marginal farmers who capture only 30-35% of crop value. To eliminate gluts without capital expenditure, this plant uses staggered delivery slots coordinated via direct FPO contracts.",
          bulletPoints: [
            "Zero-Cost Fix: Demand-matched procurement aligns procurement quantities with real-time order tallies instead of habitual buying.",
            "Staggered Intake: 3 distinct delivery slots (08:00, 10:30, 14:00) eliminate bottlenecks at the receiving dock.",
            "Farm-Gate Pre-Cooling: Shade net staging reduces field heat by 4°C before cold room intake, lowering compressor load.",
            rank >= 4
              ? "SCM Insight: Nashik FPO batch rejection history is at an optimal 1.8%."
              : "Operator Action: Direct incoming crates to shade bay 2 upon weigh-in.",
          ],
          recommendedAction:
            "Maintain shade net staging for upcoming 14:30 batch; do not leave crates exposed to direct solar heat on the open ramp.",
          provenance: "SOURCE",
        };

      case "inventory":
        return {
          title: "AI Analysis: Cold Chain & FEFO Shelf-Life Optimisation",
          summary:
            "Post-harvest and processing losses across 54 commodities in India are valued at roughly ₹1.53 lakh crore annually (MoFPI/NABCONS). We solve this through a tiered storage structure combining CoolBot (4°C), ZECC (19°C), and Solar Dry storage.",
          bulletPoints: [
            "FEFO vs FIFO: First-Expired, First-Out rotation prioritizes items with faster physiological ripening rather than simple arrival sequence.",
            "ABC Classification: Fast-spoiling, high-value perishables (Category A: Tomatoes & Mangoes) receive priority cold room space.",
            "Energy Efficiency: CoolBot operates an ordinary window AC down to 4°C with 40% lower electricity consumption than traditional commercial units.",
            "Excursion Watch: Zero excursions above 8°C detected today across Chamber A and B.",
          ],
          recommendedAction:
            "Dispatch Lot B-2026-0913-E (Baby Spinach) within 18 hours or transfer immediately to processing line to avoid ₹6,400 spoilage loss.",
          provenance: "SOURCE",
        };

      case "machines":
        return {
          title: "AI Analysis: Machine Fleet Health & Poka-Yoke Safeguards",
          summary:
            "Rather than high-capex centralized automation, this unit operates modular, multipurpose equipment designed for small batch runs with digital error-proofing (Poka-yoke).",
          bulletPoints: [
            "CoolBot Compressor (MCH-01): Evaporator fin temp is 2.1°C with healthy 32-hour thermal storage buffer.",
            "Sanitizing Basin (MCH-02): Active chlorine is 108 ppm. Digital 120-second immersion timer prevents premature crate removal.",
            "Modular Sealer (MCH-03): Heat seal jaw at 146°C with 3.2 bar pneumatic clamp; alignment jig prevents film bunching.",
            "Solar Conduction Dryer (MCH-04): Zero grid power draw; drying ginger flakes at 0.84 kg/h moisture extraction rate.",
          ],
          recommendedAction:
            "Check Teflon barrier tape on packaging sealer MCH-03 at end of shift (160 hours remaining before preventive renewal).",
          provenance: "SOURCE",
        };

      case "quality":
        return {
          title: "AI Analysis: Process Capability & Multi-Stage Quality Verification",
          summary:
            "A typical manufacturing MSME spends around ₹15.55 lakh/year on compliance; failure risks license suspension. We employ visible standard operating procedures and in-line Poka-yoke tests instead of costly external lab delays.",
          bulletPoints: [
            "Process Capability Index (Cpk): Average Cpk is 1.45, well above the 1.33 industry benchmark for controlled manufacturing.",
            "Incoming Brix: 12.8°Brix for processing tomatoes confirms prime ripeness without fungal spoilage.",
            "Pouch Vacuum Burst: 3.25 bar burst strength exceeds minimum 2.8 bar packaging integrity specification.",
            "Full Batch Transparency: Every lot is tagged with a verifiable QR code tracking farm origin, wash timestamp, and chamber temperature history.",
          ],
          recommendedAction:
            "Sign off on Batch B-2026-0913-B quality release token for scheduled dispatch at 16:30.",
          provenance: "SOURCE",
        };

      case "finance":
        return {
          title: "AI Analysis: Working Capital, e-NWR Financing & Government Subsidies",
          summary:
            "Operational improvements reduce batch spoilage loss from ₹33,600 (baseline) down to ₹8,640, unlocking ₹24,960 in net daily savings. Stored inventory is collateralized via e-NWR loans to prevent distress sales.",
          bulletPoints: [
            "e-NWR Warehouse Financing: WDRA-regulated warehouse receipts allow borrowing up to 75% LTV at 7% p.a., avoiding a 30-40% distress sale discount.",
            "PMFME Scheme: 35% credit-linked capital subsidy (up to ₹10 Lakhs) claimed for CoolBot and solar dryer installation.",
            "MSE-CDP CFC Model: Ministry of MSME 70-80% funding scheme for shared common facility cold rooms and testing labs.",
            "Spoilage Insurance: ₹2,50,000 policy coverage active for chamber refrigeration failure risk transfer.",
          ],
          recommendedAction:
            "Drawdown ₹93,000 under e-NWR credit line against Chamber A cold stock to fund raw material procurement for next week without liquid cash depletion.",
          provenance: "SOURCE",
        };
    }
  }

  /**
   * Explains a specific machine's working principles, telemetry, and industrial engineering logic.
   */
  public explainMachine(machineId: string): ContextExplanation {
    const m = MACHINES_DATA.find((x) => x.id === machineId) || MACHINES_DATA[0];
    return {
      title: `AI Machine Analysis: ${m.name}`,
      summary: `${m.name} operates at ${m.oee}% OEE with a health score of ${m.healthScore}%. ${m.energySavingVsBaseline || ""}.`,
      bulletPoints: [
        `Operational Status: ${m.status.toUpperCase()} at ${m.powerKw} kW power draw with ${m.runtimeHours} logged runtime hours.`,
        `Preventive Maintenance: Next service due in ${m.nextServiceHours} hours. Last serviced on ${m.lastServiceDate}.`,
        `Poka-Yoke Error Proofing: ${m.pokaYokeGuides[0]}`,
        `SOP Core Rule: ${m.sopSteps[0].title} - ${m.sopSteps[0].safetyCheck}`,
      ],
      recommendedAction: `Follow SOP Step 1 before shift change. Ensure sensor connections are free of moisture condensation.`,
      provenance: m.provenance,
    };
  }

  /**
   * Explains a specific process test, testing mechanics, and failure remediation.
   */
  public explainTest(testId: string): ContextExplanation {
    const t = PROCESS_TESTS_DATA.find((x) => x.id === testId) || PROCESS_TESTS_DATA[0];
    return {
      title: `AI Test Analysis: ${t.name}`,
      summary: `${t.name} is conducted at ${t.processStep}. Current reading is ${t.currentValue} ${t.unit} (Nominal: ${t.nominalRange} ${t.unit}), yielding a Process Capability Cpk of ${t.cpk}.`,
      bulletPoints: [
        `Verification Method: ${t.procedure}`,
        `Test Classification: ${t.category} quality evaluation required for Rank ${t.requiredRank}+ employees.`,
        `Corrective Protocol: ${t.correctiveAction}`,
        `Compliance Standard: Meets FSSAI and MoFPI quality guidelines for small-scale food units.`,
      ],
      recommendedAction: `Record test observation in the digital batch ledger and verify Cpk remains above 1.33.`,
      provenance: t.provenance,
    };
  }

  /**
   * Pre-canned high-yield Q&A answers for voice and text chat.
   */
  public answerQuestion(query: string): string {
    const q = query.toLowerCase();

    if (
      q.includes("alert") || q.includes("alarm") || q.includes("not working") ||
      q.includes("breakdown") || q.includes("fault") || q.includes("jam") || q.includes("notification")
    ) {
      return (
        "Right now 1 machine needs attention. The sorting table MCH-05 has a belt jam: roller speed is 0 metres per second, " +
        "drive current is high at 8.9 amps, and the blemish sensor shows fault E-42. Health is 67 percent. " +
        "Open the Machines tab, tap Inspect and SOP on MCH-05, lock out the drive, clear the jam, and recalibrate the roller gaps before restart."
      );
    }

    if (
      q.includes("productivity") || q.includes("pipeline") || q.includes("raw material") ||
      q.includes("finished") || q.includes("yield") || q.includes("throughput") || q.includes("how many crates")
    ) {
      return (
        "Today's pipeline: 100 crates of raw intake. 94 crates cleared wash and quality checks after 6 rejections. " +
        "88 crates are good in cold store after 6 spoiled. 88 crates packed at 24 packs per minute, and 84 crates dispatched. " +
        "That is an 88 percent usable yield, up from a 62 percent baseline — a gain of ₹24,960 this batch."
      );
    }

    if (q.includes("coolbot") || q.includes("energy") || q.includes("ac")) {
      return (
        "A CoolBot is an intelligent micro-controller that tricks a standard, inexpensive window air conditioner " +
        "into cooling a room down to 4°C without freezing its cooling coils. While a traditional commercial walk-in cooler " +
        "costs several lakh rupees, a CoolBot setup runs at a fraction of the cost with 40% lower running energy consumption. " +
        "It uses thermal storage backup and protects sensitive perishables like tomatoes and mangoes effectively."
      );
    }

    if (q.includes("pmfme") || q.includes("subsidy") || q.includes("scheme") || q.includes("government")) {
      return (
        "The PMFME (PM Formalisation of Micro Food Processing Enterprises) scheme offers a 35% credit-linked capital " +
        "subsidy up to ₹10 Lakhs for individual micro-units, along with ₹40,000 seed capital per SHG member. " +
        "Additionally, the MSE-CDP scheme provides 70% to 80% Central Government grants for Common Facility Centres " +
        "like shared cold storage and testing laboratories."
      );
    }

    if (q.includes("fefo") || q.includes("fifo") || q.includes("spoilage") || q.includes("shelf")) {
      return (
        "FEFO stands for First-Expired, First-Out, whereas FIFO is First-In, First-Out. In food processing, batches arriving later " +
        "frequently ripen faster due to field heat exposure. FEFO sorts crates strictly by remaining shelf life, " +
        "which prevents mature stock from decaying in the back of the chamber. This single zero-cost practice reduces spoilage by over 60%."
      );
    }

    if (q.includes("enwr") || q.includes("warehouse") || q.includes("receipt") || q.includes("distress") || q.includes("cash")) {
      return (
        "Electronic Negotiable Warehouse Receipts (e-NWR), regulated by WDRA, allow small food units to deposit stock in an accredited " +
        "warehouse and borrow up to 75% loan-to-value at bank interest rates of around 7% per annum. " +
        "This gives the unit immediate liquid working capital, completely eliminating the need to sell produce at a 30% to 40% distress discount right after harvest."
      );
    }

    if (q.includes("seal") || q.includes("packaging") || q.includes("poka") || q.includes("burst")) {
      return (
        "Packaging seal integrity is checked using a vacuum burst test where sealed pouches are submerged under water at -0.8 bar. " +
        "Physical Poka-yoke alignment jigs ensure pouches are aligned within 5 millimeters of the sealing jaws, " +
        "while dual optical sensors protect worker hands and prevent defective seal crimps."
      );
    }

    if (q.includes("rank") || q.includes("employee") || q.includes("access") || q.includes("permission")) {
      return (
        "The application enforces 5 hierarchical access ranks: Rank 1 for Floor Operators (SOPs, timers, machine controls); " +
        "Rank 2 for Quality Inspectors (tests, sensor logs, FSSAI compliance); Rank 3 for Shift Engineers (maintenance, machine telemetry, line balancing); " +
        "Rank 4 for Supply Chain Leads (procurement, FPO scheduling, warehouse capacity); and Rank 5 for the Plant Owner/CFO (complete transparency, cash flow, subsidies, and e-NWR financing)."
      );
    }

    if (
      q.includes("grievance") || q.includes("complaint") || q.includes("safety hazard") ||
      q.includes("worker rights") || q.includes("awaaz") || q.includes("report problem")
    ) {
      return (
        "The Awaaz Grievance Portal provides confidential, voice-enabled safety and workplace grievance reporting for all factory workers. " +
        "Tap the Awaaz Grievance button on the home screen or app menu to record an audio report about safety hazards, cold room thermal PPE, " +
        "or machine guards. All complaints are tracked with live status updates, from submission to resolution, protecting worker health under industrial engineering safety protocols."
      );
    }

    return (
      "This mobile platform integrates demand-supply matching, cold-chain FEFO inventory, machine telemetry, " +
      "process evaluation tests, and cash flow financing. Select any tab or tap any metric to see live status, " +
      "or tap the voice button to hear a vocal explanation."
    );
  }

  /**
   * Vocally reads out an explanation or answer using the voice engine.
   */
  public speakExplanation(text: string): void {
    this.voiceEngine.speak(text);
  }
}
