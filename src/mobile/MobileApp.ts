import { AudioVoiceEngine } from "./AudioVoiceEngine";
import { AiAssistant } from "./AiAssistant";
import { Mini3DViewer } from "./Mini3DViewer";
import type { AppTab, EmployeeProfile, EmployeeRank, PlantAlert, WorkerGrievance, MiniSceneKey } from "./types";
import {
  EMPLOYEE_PROFILES,
  MACHINES_DATA,
  PIPELINE_STAGES,
  PROCESS_TESTS_DATA,
  INVENTORY_CHAMBERS,
  FEFO_CRATES_DATA,
  SUPPLY_BATCHES_DATA,
  CASH_FLOW_DATA,
  INITIAL_GRIEVANCES,
} from "./mobileData";

export interface MobileAppOptions {
  container: HTMLElement;
  onOpenVRDigitalTwin?: () => void;
}

export class MobileApp {
  private container: HTMLElement;
  private onOpenVRDigitalTwin?: () => void;

  private activeTab: AppTab = "home";
  private activeRank: EmployeeRank = 3; // Default to Shift Supervisor (Amit Patel)
  private isFullScreenMode: boolean = false;

  private voiceEngine: AudioVoiceEngine;
  private aiAssistant: AiAssistant;
  private mini3D: Mini3DViewer | null = null;
  private activeMiniSceneKey: MiniSceneKey = "farmReceiving";

  private selectedMachineId: string = "MCH-05";
  private selectedTestId: string = "TEST-04";

  // Grievance Portal state
  private grievances: WorkerGrievance[] = [...INITIAL_GRIEVANCES];
  private isGrievanceModalOpen: boolean = false;
  private activeGrievanceCategory: WorkerGrievance["category"] = "Safety Hazard";
  private currentGrievanceTranscript: string = "";

  // Modal states
  private isRankModalOpen: boolean = false;
  private isAiModalOpen: boolean = false;
  private isMachineModalOpen: boolean = false;
  private isTestModalOpen: boolean = false;
  private isNotifOpen: boolean = false;
  private dismissedIds = new Set<string>();
  private bootToastShown = false;
  private micDraft = "";

  // e-NWR Calculator reactive state
  private calcCrates: number = 74;
  private calcCratePrice: number = 1200;
  private calcLtvPct: number = 75;

  constructor(options: MobileAppOptions) {
    this.container = options.container;
    this.onOpenVRDigitalTwin = options.onOpenVRDigitalTwin;

    this.voiceEngine = new AudioVoiceEngine();
    this.aiAssistant = new AiAssistant(this.voiceEngine);

    // Subscribe to voice state updates to re-render audio controls seamlessly
    this.voiceEngine.subscribe(() => {
      this.updateAudioDockUI();
    });

    this.render();
  }

  public getActiveEmployee(): EmployeeProfile {
    return EMPLOYEE_PROFILES.find((p) => p.rank === this.activeRank) || EMPLOYEE_PROFILES[2];
  }

  /** Live plant alerts derived from machine telemetry, chambers and FEFO lots. */
  public getNotifications(): PlantAlert[] {
    const alerts: PlantAlert[] = [];
    for (const m of MACHINES_DATA) {
      if (m.status === "alert") {
        alerts.push({
          id: `alert-${m.id}`,
          severity: "critical",
          title: `${m.name} needs attention`,
          detail: `Belt jam · health ${m.healthScore}% · service in ${m.nextServiceHours}h`,
          time: "2 min ago",
          machineId: m.id,
          actionTab: "machines",
          actionLabel: "Inspect",
        });
      } else if (m.status === "idle" || m.status === "maintenance") {
        alerts.push({
          id: `idle-${m.id}`,
          severity: "warn",
          title: `${m.name} is on standby`,
          detail: `OEE ${m.oee}% · next service ${m.nextServiceHours}h`,
          time: "1 h ago",
          machineId: m.id,
          actionTab: "machines",
          actionLabel: "View",
        });
      } else if (m.healthScore < 90) {
        alerts.push({
          id: `health-${m.id}`,
          severity: "warn",
          title: `${m.name} health ${m.healthScore}%`,
          detail: `OEE ${m.oee}% · check SOP at shift end`,
          time: "3 h ago",
          machineId: m.id,
          actionTab: "machines",
          actionLabel: "View",
        });
      }
    }
    const critical = FEFO_CRATES_DATA.filter((f) => f.status === "critical");
    for (const f of critical) {
      alerts.push({
        id: `fefo-${f.id}`,
        severity: "critical",
        title: `${f.commodity} expires in ${f.remainingShelfLifeDays}d`,
        detail: `${f.crateQuantity} crates · Lot ${f.batchLot} · ₹${f.estimatedValueRupees.toLocaleString("en-IN")} at risk`,
        time: "25 min ago",
        actionTab: "inventory",
        actionLabel: "Dispatch",
      });
    }
    const hot = INVENTORY_CHAMBERS.filter((c) => c.excursionsToday > 0);
    for (const c of hot) {
      alerts.push({
        id: `ch-${c.id}`,
        severity: "warn",
        title: `${c.name}: ${c.excursionsToday} excursion today`,
        detail: `${c.tempC}°C · ${c.occupiedCrates}/${c.capacityCrates} crates`,
        time: "50 min ago",
        actionTab: "inventory",
        actionLabel: "Check",
      });
    }
    const order: Record<PlantAlert["severity"], number> = { critical: 0, warn: 1, info: 2 };
    return alerts
      .filter((a) => !this.dismissedIds.has(a.id))
      .sort((a, b) => order[a.severity] - order[b.severity]);
  }

  public getUnreadCount(): number {
    return this.getNotifications().filter((a) => a.severity === "critical").length;
  }

  public setTab(tab: AppTab): void {
    this.activeTab = tab;
    this.render();
  }

  public setRank(rank: EmployeeRank): void {
    this.activeRank = rank;
    this.isRankModalOpen = false;
    this.render();
  }

  public toggleFullScreen(): void {
    this.isFullScreenMode = !this.isFullScreenMode;
    const frame = this.container.querySelector(".mobile-device-frame");
    if (frame) {
      frame.classList.toggle("full-screen-mode", this.isFullScreenMode);
    }
  }

  private updateAudioDockUI(): void {
    const state = this.voiceEngine.getState();
    const speakerBtn = this.container.querySelector(".audio-speaker-btn") as HTMLButtonElement | null;
    const visualizer = this.container.querySelector(".soundwave-visualizer");
    const statusText = this.container.querySelector(".audio-status-text");

    if (speakerBtn) {
      speakerBtn.classList.toggle("active", state.isPlaying);
      speakerBtn.innerHTML = state.isPlaying ? (state.isPaused ? "▶" : "⏸") : "🔊";
    }
    if (visualizer) {
      visualizer.classList.toggle("playing", state.isPlaying && !state.isPaused);
    }
    if (statusText) {
      statusText.textContent = state.isPlaying
        ? state.isPaused
          ? "Vocal Narration Paused"
          : "Speaking AI Analysis..."
        : "Vocal Audio Assistant Ready";
    }
  }

  private render(): void {
    const emp = this.getActiveEmployee();
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const unread = this.getUnreadCount();

    this.container.innerHTML = `
      <div id="mobile-wrapper">
        <!-- Host Top Bar for Desktop Preview / Viewport Switching -->
        <div class="host-controls-bar">
          <div class="host-brand">
            <span class="host-brand-icon">🏭</span>
            <span class="host-brand-name">Small-Scale Food Manufacturing Twin</span>
            <span class="brand-badge">Mobile App UI</span>
          </div>
          <div class="host-action-center">
            <button id="btn-toggle-frame" class="host-btn host-btn-display" title="Toggle smartphone bezel preview or full screen">
              ${this.isFullScreenMode ? "📱 Smartphone Frame" : "💻 Full Screen View"}
            </button>
          </div>
          <div class="host-action-right">
            <button id="btn-open-3d-twin" class="host-btn host-btn-vr" title="Switch into interactive 3D WebXR Digital Twin">
              🥽 3D / VR Digital Twin
            </button>
          </div>
        </div>

        <!-- Smartphone Device Frame -->
        <div class="mobile-device-frame ${this.isFullScreenMode ? "full-screen-mode" : ""}">
          <!-- Dynamic Island / Notch -->
          <div class="device-notch">
            <div class="notch-camera"></div>
            <div class="notch-sensor"></div>
          </div>

          <!-- Internal Screen Content -->
          <div class="mobile-screen">
            <!-- Mobile Status Bar -->
            <div class="mobile-status-bar">
              <span class="status-time">${timeStr}</span>
              <div class="status-icons">
                <span>5G</span>
                <span>📶</span>
                <span>🔋 94%</span>
              </div>
            </div>

            <!-- Mobile App Top Bar -->
            <div class="mobile-app-bar">
              <div class="app-bar-left">
                <div class="app-logo-mark">🌱</div>
                <div class="app-bar-titles">
                  <span class="app-bar-title">IndusAgri Ops</span>
                  <span class="app-bar-subtitle">Digital Twin Companion</span>
                </div>
              </div>
              <div class="app-bar-right">
                <button id="btn-notif" class="icon-btn bell-btn" title="Plant notifications" aria-label="Notifications">
                  <span class="bell-icon">◉</span>
                  ${unread > 0 ? `<span class="bell-badge">${unread}</span>` : ""}
                </button>
                <button id="btn-rank-selector" class="rank-badge-btn" title="Change Employee Rank (Role-Based Access)">
                  <span class="rank-dot" style="background:${emp.badgeColor}"></span>
                  <span>R${emp.rank} · ${emp.role.split(" ")[0]}</span>
                </button>
              </div>
            </div>

            <!-- Scrollable Viewport Content -->
            <div class="mobile-content-scroll">
              <!-- Vocal Audio Dock -->
              ${this.renderAudioDock()}

              <!-- Tab Content Rendering -->
              ${this.renderActiveTabContent()}
            </div>

            <!-- Floating AI Assistant Button -->
            <button id="fab-ai" class="fab-ai-assistant">
              <span class="fab-mic">◉</span>
              <span>Ask AI</span>
            </button>

            <!-- Bottom Navigation Bar -->
            ${this.renderBottomNavBar()}

            <!-- Home Bar Indicator -->
            <div class="device-home-bar"></div>
          </div>

          <!-- Toasts + Sheets -->
          <div id="toast-stack" class="toast-stack"></div>
          ${this.renderNotifSheet()}
          ${this.renderGrievanceModal()}
          ${this.renderRankModal()}
          ${this.renderAiModal()}
          ${this.renderMachineModal()}
          ${this.renderTestModal()}
        </div>
      </div>
    `;

    this.attachEventListeners();
    this.updateAudioDockUI();
    this.bootToastIfNeeded();
    this.mountMini3D();
  }

  private renderAudioDock(): string {
    const state = this.voiceEngine.getState();
    return `
      <div class="audio-dock">
        <div class="audio-dock-info">
          <button id="btn-audio-toggle" class="audio-speaker-btn ${state.isPlaying ? "active" : ""}" title="Click to listen to vocal AI explanation">
            ${state.isPlaying ? (state.isPaused ? "▶" : "⏸") : "🔊"}
          </button>
          <div style="display:flex; flex-direction:column; overflow:hidden;">
            <span class="audio-status-text">Vocal Audio Assistant Ready</span>
            <span style="font-size:0.65rem; color:#94a3b8;">Web Speech Synthesis • Real-time Vocal Answers</span>
          </div>
        </div>
        <div style="display:flex; align-items:center; gap:8px;">
          <div class="soundwave-visualizer ${state.isPlaying && !state.isPaused ? "playing" : ""}">
            <div class="soundwave-bar"></div>
            <div class="soundwave-bar"></div>
            <div class="soundwave-bar"></div>
            <div class="soundwave-bar"></div>
            <div class="soundwave-bar"></div>
          </div>
          <button id="btn-speech-rate" class="audio-speed-btn" title="Change vocal speech rate">${state.rate}x</button>
        </div>
      </div>
    `;
  }

  private renderBottomNavBar(): string {
    const emp = this.getActiveEmployee();
    const tab = (id: AppTab, icon: string, label: string, locked = false) => `
      <button class="nav-tab-btn ${this.activeTab === id ? "active" : ""} ${locked ? "restricted" : ""}" data-tab="${id}">
        <div class="nav-pill-indicator"></div>
        <span class="nav-tab-icon">${icon}</span>
        <span class="nav-tab-label">${label}</span>
        ${locked ? `<span class="nav-lock-badge">●</span>` : ""}
      </button>`;
    return `
      <div class="mobile-bottom-nav nav-6">
        ${tab("home", "◈", "Home")}
        ${tab("supply", "▤", "Supply")}
        ${tab("inventory", "❄", "Cold")}
        ${tab("machines", "⚙", "Machines")}
        ${tab("quality", "✓", "Tests")}
        ${tab("finance", "₹", "Finance", emp.rank < 4)}
      </div>
    `;
  }

  private renderActiveTabContent(): string {
    switch (this.activeTab) {
      case "home":
        return this.renderHomeTab();
      case "supply":
        return this.renderSupplyTab();
      case "inventory":
        return this.renderInventoryTab();
      case "machines":
        return this.renderMachinesTab();
      case "quality":
        return this.renderQualityTab();
      case "finance":
        return this.renderFinanceTab();
    }
  }

  private stageIcon(icon: string): string {
    const paths: Record<string, string> = {
      tractor: `<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3.2"/>`,
      drop: `<path d="M12 3c3.5 4.2 6 7.4 6 10.4A6 6 0 0 1 6 13.4C6 10.4 8.5 7.2 12 3z"/>`,
      snow: `<path d="M12 2v20M4 6l16 12M20 6L4 18M12 2l-2.5 2.5M12 2l2.5 2.5M12 22l-2.5-2.5M12 22l2.5-2.5"/>`,
      box: `<path d="M3.5 7.5L12 3l8.5 4.5v9L12 21l-8.5-4.5z"/><path d="M3.5 7.5L12 12l8.5-4.5M12 12v9"/>`,
      truck: `<path d="M2.5 6.5h11v10h-11zM13.5 10h4l3.5 3.5v3h-7.5z"/><circle cx="7" cy="17.5" r="1.8"/><circle cx="17" cy="17.5" r="1.8"/>`,
    };
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${paths[icon] ?? paths.box}</svg>`;
  }

  // TAB 0: HOME — visual plant overview, pipeline counts, alerts
  private renderHomeTab(): string {
    const emp = this.getActiveEmployee();
    const first = emp.name.split(" ")[0];
    const alerts = this.getNotifications();
    const crit = alerts.filter((a) => a.severity === "critical").length;
    const hour = new Date().getHours();
    const greet = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
    return `
      <div class="home-greet">
        <div>
          <div class="home-hello">${greet}, ${first}</div>
          <div class="home-sub">${emp.role} · ${emp.shift.split("(")[0]}</div>
        </div>
        <div class="home-shift-pill"><span class="pulse-dot"></span>Shift live</div>
      </div>

      <div class="kpi-strip">
        <button class="kpi-tile kpi-leaf" data-action="goto" data-goto="quality">
          <span class="kpi-num">88%</span><span class="kpi-lab">Yield</span>
          <span class="kpi-bar"><i style="width:88%"></i></span>
        </button>
        <button class="kpi-tile kpi-ink" data-action="goto" data-goto="supply">
          <span class="kpi-num">84</span><span class="kpi-lab">Dispatched</span>
          <span class="kpi-bar"><i style="width:70%"></i></span>
        </button>
        <button class="kpi-tile ${crit > 0 ? "kpi-red" : "kpi-teal"}" data-action="open-notif">
          <span class="kpi-num">${alerts.length}</span><span class="kpi-lab">Alerts</span>
          <span class="kpi-bar"><i style="width:${Math.min(100, alerts.length * 25)}%"></i></span>
        </button>
        <button class="kpi-tile kpi-gold" data-action="goto" data-goto="finance">
          <span class="kpi-num">₹25k</span><span class="kpi-lab">Saved</span>
          <span class="kpi-bar"><i style="width:82%"></i></span>
        </button>
      </div>

      <div class="mobile-card pipe-card">
        <div class="card-header">
          <div class="card-title"><span>Pipeline today</span><span class="prov-badge prov-source">100 → 84</span></div>
          <button class="btn-sm-outline" data-action="goto" data-goto="supply">Details</button>
        </div>
        <div class="pipe-flow">
          ${PIPELINE_STAGES.map(
            (s, i) => `
            <button class="pipe-node tone-${s.tone}" data-action="stage" data-stage="${s.id}" title="${s.label}: ${s.count} ${s.unit}">
              <span class="pipe-icon">${this.stageIcon(s.icon)}</span>
              <span class="pipe-count">${s.count}</span>
              <span class="pipe-name">${s.short}</span>
              ${s.loss ? `<span class="pipe-loss">${s.loss}</span>` : ""}
              ${i < PIPELINE_STAGES.length - 1 ? `<span class="pipe-link"></span>` : ""}
            </button>`
          ).join("")}
        </div>
        <div class="pipe-foot">
          <span>Raw <b>100</b></span><span class="pipe-dot">·</span>
          <span>WIP <b>94</b></span><span class="pipe-dot">·</span>
          <span>Finished <b>88</b></span><span class="pipe-dot">·</span>
          <span class="pipe-yield">Yield <b>88%</b></span>
        </div>
      </div>

      <!-- Interactive 3D Digital Twin Model Card -->
      <div class="mobile-card mini-3d-card">
        <div class="card-header" style="margin-bottom:8px;">
          <div>
            <div class="card-title">
              <span>Interactive 3D Plant Model</span>
              <span class="prov-badge prov-source">LIVE TWIN</span>
            </div>
            <div class="card-subtitle">Select environment diorama or enter VR</div>
          </div>
          <button class="btn-sm-primary" data-action="open-twin">
            Launch VR ➔
          </button>
        </div>

        <!-- 4-Environment Scene Selector Chips -->
        <div class="mini-3d-scene-selector">
          <button class="scene-chip ${this.activeMiniSceneKey === "farmReceiving" ? "active" : ""}" data-scene="farmReceiving">1. Farm</button>
          <button class="scene-chip ${this.activeMiniSceneKey === "processingPackaging" ? "active" : ""}" data-scene="processingPackaging">2. Clean</button>
          <button class="scene-chip ${this.activeMiniSceneKey === "inventoryColdChain" ? "active" : ""}" data-scene="inventoryColdChain">3. Cold</button>
          <button class="scene-chip ${this.activeMiniSceneKey === "dispatchMarket" ? "active" : ""}" data-scene="dispatchMarket">4. Mandi</button>
        </div>

        <div id="home-3d-viewport">
          <div class="mini-3d-badge">↺ Drag / swipe to inspect environment in 3D</div>
        </div>
      </div>

      <!-- Worker Voice & Safety Grievances ("आवाज / Awaaz") -->
      <div class="mobile-card grievance-card">
        <div class="card-header">
          <div>
            <div class="card-title">
              <span>📢 Worker Grievance & Safety (आवाज)</span>
              <span class="prov-badge prov-source">AUDIO REDRESSAL</span>
            </div>
            <div style="font-size:0.68rem; color:var(--text-muted);">Confidential Voice Portal · Factories Act Safety Protocol</div>
          </div>
          <button class="btn-sm-primary" id="btn-open-grievance" style="background:var(--terra); border:none; box-shadow:0 2px 8px rgba(194,65,12,0.3);">
            🎙️ Voice Grievance
          </button>
        </div>
        <div style="font-size:0.73rem; color:var(--text-sub); line-height:1.4;">
          Direct vocal audio reporting for plant workers, operators, and SHG members. Report safety hazards, extreme cold PPE needs, or shift concerns with instant audio playback.
        </div>
        <div style="display:flex; gap:8px; margin-top:10px;">
          <button class="btn-sm-outline" id="btn-audio-rights" style="flex:1; justify-content:center; font-size:0.72rem;">
            🔊 Listen to Safety Rights
          </button>
          <button class="btn-sm-outline" id="btn-view-grievances" style="flex:1; justify-content:center; font-size:0.72rem;">
            📋 Grievances (${this.grievances.length})
          </button>
        </div>
      </div>

      <div class="mobile-card">
        <div class="card-header">
          <div class="card-title"><span>Needs attention</span><span class="prov-badge ${crit ? "prov-alert" : "prov-source"}">${crit ? crit + " critical" : "all clear"}</span></div>
          <button class="btn-sm-outline" data-action="open-notif">All (${alerts.length})</button>
        </div>
        ${alerts.length === 0 ? `<div class="all-clear">All machines running. No action needed.</div>` : alerts.slice(0, 2).map((a) => `
          <div class="alert-row sev-${a.severity}">
            <span class="alert-dot"></span>
            <div class="alert-body">
              <div class="alert-title">${a.title}</div>
              <div class="alert-detail">${a.detail}</div>
            </div>
            <button class="btn-sm-primary" data-action="alert-goto" data-alert="${a.id}">Open</button>
          </div>`).join("")}
      </div>

      <div class="quick-grid">
        <button class="quick-btn" data-action="ask-ai"><span class="q-ic">◉</span><span>Voice AI</span></button>
        <button class="quick-btn" id="btn-quick-grievance"><span class="q-ic">📢</span><span>Grievance</span></button>
        <button class="quick-btn" data-action="goto" data-goto="machines"><span class="q-ic">⚙</span><span>Machines</span></button>
        <button class="quick-btn" data-action="goto" data-goto="inventory"><span class="q-ic">❄</span><span>Cold store</span></button>
        <button class="quick-btn" data-action="goto" data-goto="quality"><span class="q-ic">✓</span><span>Run test</span></button>
      </div>
    `;
  }

  private mountMini3D(): void {
    const vport = this.container.querySelector("#home-3d-viewport") as HTMLElement | null;
    if (vport && this.activeTab === "home") {
      if (this.mini3D) {
        this.mini3D.destroy();
        this.mini3D = null;
      }
      this.mini3D = new Mini3DViewer(vport, this.activeMiniSceneKey);
    } else if (this.mini3D) {
      this.mini3D.destroy();
      this.mini3D = null;
    }
  }

  private renderGrievanceModal(): string {
    if (!this.isGrievanceModalOpen) return "";
    const categories: WorkerGrievance["category"][] = [
      "Safety Hazard",
      "Cold Exposure / PPE",
      "Machine Breakdown",
      "Shift & Wage",
      "Hygiene & Washroom",
    ];

    return `
      <div class="mobile-modal-overlay open" id="modal-grievance-overlay">
        <div class="mobile-sheet" style="max-height:88%;">
          <div class="sheet-handle"></div>
          <div class="sheet-header">
            <div style="display:flex; align-items:center; gap:8px;">
              <span style="font-size:1.2rem;">📢</span>
              <div>
                <div class="sheet-title">Awaaz Grievance & Safety Redressal</div>
                <div style="font-size:0.7rem; color:var(--text-muted);">Confidential Worker Voice Portal · Factories Act 1948</div>
              </div>
            </div>
            <button class="sheet-close-btn" id="btn-close-grievance-modal">✕</button>
          </div>
          <div class="sheet-body">
            <!-- Voice Grievance Recording Box -->
            <div class="voice-grievance-box">
              <div style="display:flex; justify-content:space-between; align-items:center;">
                <span style="font-size:0.82rem; font-weight:700; color:var(--primary-navy);">
                  🎙️ Speak Your Grievance or Safety Hazard
                </span>
                <span class="prov-badge prov-source">CONFIDENTIAL</span>
              </div>
              <div style="font-size:0.72rem; color:var(--text-sub); margin-top:2px;">
                Tap the microphone button and state your issue aloud. Speech is transcribed and logged directly to factory management.
              </div>

              <!-- Category selector pills -->
              <div class="grievance-category-pills">
                ${categories
                  .map(
                    (cat) => `
                  <button class="grievance-cat-pill ${this.activeGrievanceCategory === cat ? "active" : ""}" data-cat="${cat}">
                    ${cat}
                  </button>
                `
                  )
                  .join("")}
              </div>

              <!-- Mic Record Trigger Zone -->
              <div class="mic-record-zone">
                <button id="btn-record-grievance-audio" class="grievance-mic-btn ${this.voiceEngine.isListening() ? "recording" : ""}">
                  <span>${this.voiceEngine.isListening() ? "⏹" : "🎙️"}</span>
                  <span>${this.voiceEngine.isListening() ? "Listening... Tap to Stop" : "Tap to Speak Voice Grievance"}</span>
                </button>
              </div>

              <!-- Live Transcript Box -->
              <div id="grievance-transcript-display" class="grievance-transcript-box">
                ${
                  this.currentGrievanceTranscript ||
                  `<span style="color:#a8a29e; font-style:italic;">Speak into your microphone or type below: e.g. "Cold room door seal is damaged"</span>`
                }
              </div>

              <div style="display:flex; gap:8px; margin-top:10px;">
                <input type="text" id="input-grievance-text" class="ai-input-field" style="border:1px solid #e2ddd5; border-radius:8px; padding:6px 10px; background:#ffffff; font-size:0.78rem; flex:1;" placeholder="Or type grievance note here..." value="${this.currentGrievanceTranscript}" />
                <button id="btn-submit-grievance" class="btn-sm-primary" style="background:var(--terra); border:none; padding:6px 14px;">
                  Submit Ticket
                </button>
              </div>
            </div>

            <!-- Active Grievance Log & Resolution Status -->
            <div style="display:flex; justify-content:space-between; align-items:center; margin:14px 0 8px;">
              <span style="font-size:0.82rem; font-weight:700; color:var(--primary-navy);">Active Grievance Log (${this.grievances.length})</span>
              <button class="btn-sm-outline" id="btn-audio-speak-rights" style="font-size:0.68rem; padding:3px 8px;">
                🔊 Read Safety Rights
              </button>
            </div>

            ${this.grievances
              .map(
                (g) => `
              <div class="grievance-log-card">
                <div class="grievance-log-top">
                  <span class="grievance-id">${g.id} · <span style="font-weight:600; color:#57534e;">${g.category}</span></span>
                  <span class="grievance-status-tag ${
                    g.status === "Resolved"
                      ? "status-resolved"
                      : g.status === "Action Taken"
                      ? "status-action"
                      : "status-review"
                  }">
                    ${g.status}
                  </span>
                </div>
                <div style="font-size:0.74rem; color:var(--text-main); line-height:1.4; margin:4px 0;">
                  "${g.transcript}"
                </div>
                <div style="display:flex; justify-content:space-between; align-items:center; margin-top:6px; font-size:0.68rem; color:#78716c;">
                  <span>Logged: <b>${g.timestamp}</b> by ${g.workerName} (Rank ${g.rank})</span>
                  <button class="btn-sm-outline btn-listen-grievance-item" data-grv-id="${g.id}" style="padding:2px 8px; font-size:0.68rem;">
                    🔊 Listen Status
                  </button>
                </div>
              </div>
            `
              )
              .join("")}
          </div>
        </div>
      </div>
    `;
  }

  private renderNotifSheet(): string {
    if (!this.isNotifOpen) return "";
    const alerts = this.getNotifications();
    return `
      <div class="mobile-modal-overlay open" id="modal-notif-overlay">
        <div class="mobile-sheet" style="max-height:86%;">
          <div class="sheet-handle"></div>
          <div class="sheet-header">
            <div>
              <div class="sheet-title">Notifications</div>
              <div style="font-size:0.7rem; color:#78716c;">${alerts.length} active · machines, lots & chambers</div>
            </div>
            <button class="sheet-close-btn" id="btn-close-notif">✕</button>
          </div>
          <div class="sheet-body">
            ${alerts.length === 0 ? `<div class="all-clear">All clear — every machine reporting normal.</div>` : alerts.map((a) => `
              <div class="alert-row sev-${a.severity}">
                <span class="alert-dot"></span>
                <div class="alert-body">
                  <div class="alert-title">${a.title}</div>
                  <div class="alert-detail">${a.detail}</div>
                  <div class="alert-time">${a.time}</div>
                </div>
                <div class="alert-side">
                  ${a.actionTab ? `<button class="btn-sm-primary" data-action="alert-goto" data-alert="${a.id}">${a.actionLabel ?? "Open"}</button>` : ""}
                  <button class="link-btn" data-action="dismiss" data-alert="${a.id}">Dismiss</button>
                </div>
              </div>`).join("")}
          </div>
        </div>
      </div>`;
  }

  private pushToast(title: string, body: string, severity: "critical" | "warn" | "info" = "info"): void {
    const stack = this.container.querySelector("#toast-stack");
    if (!stack) return;
    const el = document.createElement("div");
    el.className = `toast sev-${severity}`;
    el.innerHTML = `<span class="alert-dot"></span><div><div class="toast-title">${title}</div><div class="toast-body">${body}</div></div><button class="toast-x" aria-label="Dismiss">✕</button>`;
    el.querySelector(".toast-x")?.addEventListener("click", () => el.remove());
    stack.appendChild(el);
    window.setTimeout(() => {
      el.classList.add("out");
      window.setTimeout(() => el.remove(), 350);
    }, 5200);
  }

  private bootToastIfNeeded(): void {
    if (this.bootToastShown) return;
    this.bootToastShown = true;
    const alerts = this.getNotifications().filter((a) => a.severity === "critical");
    window.setTimeout(() => {
      for (const a of alerts.slice(0, 2)) this.pushToast(a.title, a.detail, "critical");
    }, 600);
  }

  // TAB 1: SUPPLY & DEMAND CHAIN (FARM INTAKE & WEIGHBRIDGE)
  private renderSupplyTab(): string {
    const emp = this.getActiveEmployee();
    return `
      <!-- Zero Cost Scheduling & SCM Overview -->
      <div class="mobile-card">
        <div class="card-header">
          <div>
            <div class="card-title">
              <span>Farm Harvest & Procurement</span>
              <span class="prov-badge prov-source">FARM GATE</span>
            </div>
            <div class="card-subtitle">Active: ${emp.name} (Rank ${emp.rank}) · Staggered intake slots</div>
          </div>
          <button class="btn-sm-outline" id="btn-explain-tab">✨ Explain</button>
        </div>

        <div class="metric-grid-2">
          <div class="metric-pill">
            <span class="metric-pill-label">Active Orders Due</span>
            <span class="metric-pill-value">84 <span class="metric-pill-unit">crates</span></span>
            <span class="metric-pill-nominal">Regional Mandi & Supermarkets</span>
          </div>
          <div class="metric-pill">
            <span class="metric-pill-label">Scheduled Inflow</span>
            <span class="metric-pill-value">100 <span class="metric-pill-unit">crates</span></span>
            <span class="metric-pill-nominal">Staggered across 3 slots</span>
          </div>
        </div>
      </div>

      <!-- Drive-Over Weighbridge & Field IoT Microclimate -->
      <div class="mobile-card">
        <div class="card-header">
          <div>
            <div class="card-title">
              <span>Drive-Over Weighbridge & Field IoT</span>
              <span class="prov-badge prov-source">VR TWIN SYNC</span>
            </div>
            <div class="card-subtitle">Tractor Trailer KA-04-TR-5021 · Direct Apron Dock</div>
          </div>
        </div>

        <div class="metric-grid-3">
          <div class="metric-pill">
            <span class="metric-pill-label">Gross Weight</span>
            <span class="metric-pill-value">4,820 <span class="metric-pill-unit">kg</span></span>
            <span class="metric-pill-nominal">Tractor + Trailer</span>
          </div>
          <div class="metric-pill">
            <span class="metric-pill-label">Tare Weight</span>
            <span class="metric-pill-value">2,420 <span class="metric-pill-unit">kg</span></span>
            <span class="metric-pill-nominal">Empty Rig</span>
          </div>
          <div class="metric-pill">
            <span class="metric-pill-label">Net Payload</span>
            <span class="metric-pill-value" style="color:var(--agri-green);">2,400 <span class="metric-pill-unit">kg</span></span>
            <span class="metric-pill-nominal">100 Crates Verified</span>
          </div>
        </div>

        <div class="metric-grid-3" style="margin-top:7px;">
          <div class="metric-pill">
            <span class="metric-pill-label">Field Temp</span>
            <span class="metric-pill-value">28.4 <span class="metric-pill-unit">°C</span></span>
            <span class="metric-pill-nominal">Pull-down req: 24°C</span>
          </div>
          <div class="metric-pill">
            <span class="metric-pill-label">Field Humidity</span>
            <span class="metric-pill-value">62 <span class="metric-pill-unit">%</span></span>
            <span class="metric-pill-nominal">Solar PAR: 1,120</span>
          </div>
          <div class="metric-pill">
            <span class="metric-pill-label">Soil Moisture</span>
            <span class="metric-pill-value">34 <span class="metric-pill-unit">%</span></span>
            <span class="metric-pill-nominal">Drip Irrigated</span>
          </div>
        </div>
      </div>

      <!-- Staggered Intake Delivery Schedule -->
      <div class="mobile-card">
        <div class="card-header">
          <div class="card-title">
            <span>Staggered Intake Slots</span>
            <span class="prov-badge prov-source">3 BATCHES TODAY</span>
          </div>
        </div>

        ${SUPPLY_BATCHES_DATA.map(
          (b) => `
          <div style="background:var(--bg-surface-elevated); border:1px solid var(--border-subtle); border-radius:10px; padding:10px; margin-bottom:8px;">
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <span style="font-size:0.84rem; font-weight:700; color:var(--text-primary);">${b.commodity}</span>
              <span class="prov-badge ${b.demandMatched ? "prov-source" : "prov-warn"}">
                ${b.demandMatched ? "Demand Matched" : "Buffer Stock"}
              </span>
            </div>
            <div style="font-size:0.72rem; color:var(--text-secondary); margin-top:2px;">
              ${b.farmerOrFpo} · ${b.district}
            </div>
            <div style="display:flex; justify-content:space-between; align-items:center; margin-top:6px; font-size:0.72rem; color:var(--text-primary);">
              <span>Slot: <b>${b.staggerSlot}</b></span>
              <span>Volume: <b>${b.quantityCrates} crates</b></span>
              <span>Gate Temp: <b>${b.farmGateTempC}°C</b></span>
            </div>
            <div style="display:flex; justify-content:space-between; align-items:center; margin-top:4px; font-size:0.68rem; color:var(--text-muted);">
              <span>Vendor Score: ⭐ <b>${b.scorecardRating}/5.0</b></span>
              <span>Historical Rejection: <b>${b.rejectionHistoryPct}%</b></span>
            </div>
          </div>
        `
        ).join("")}
      </div>

      <!-- Dock to Chamber Flow Card -->
      <div class="mobile-card">
        <div class="card-header">
          <div class="card-title">
            <span>Dock-to-Chamber Thermal Efficiency</span>
            <span class="prov-badge prov-source">COLD CHAIN</span>
          </div>
        </div>
        <div style="font-size:0.74rem; color:var(--text-secondary); line-height:1.45;">
          Unloading directly onto the apron under the cantilever weather canopy cuts field heat exposure from <b>+3.6 °C (14.2 °C·h) down to +0.3 °C (1.2 °C·h)</b>, protecting produce shelf-life before entering Cleanroom Flume Wash.
        </div>
      </div>
    `;
  }

  // TAB 2: INVENTORY & 3-CHAMBER COLD COMPLEX
  private renderInventoryTab(): string {
    return `
      <!-- Live Storage Chamber Conditions -->
      <div class="mobile-card">
        <div class="card-header">
          <div>
            <div class="card-title">
              <span>3-Chamber Cold Complex</span>
              <span class="prov-badge prov-source">VR TWIN SYNC</span>
            </div>
            <div class="card-subtitle">Chamber A (Pre-Cooling), B (High-Bay), C (Finished Goods)</div>
          </div>
          <button class="btn-sm-outline" id="btn-explain-tab">✨ Explain</button>
        </div>

        ${INVENTORY_CHAMBERS.map(
          (c) => `
          <div style="background:var(--bg-surface-elevated); border:1px solid var(--border-subtle); border-radius:10px; padding:10px; margin-bottom:8px;">
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <span style="font-size:0.84rem; font-weight:700; color:var(--text-primary);">${c.name}</span>
              <span class="prov-badge ${c.assetTier === "Zero Cost" ? "prov-warn" : "prov-source"}">${c.assetTier}</span>
            </div>
            <div class="metric-grid-3">
              <div class="metric-pill">
                <span class="metric-pill-label">Temp</span>
                <span class="metric-pill-value" style="color:var(--cryo-cyan);">${c.tempC} <span class="metric-pill-unit">°C</span></span>
                <span class="metric-pill-nominal">${c.targetTempC}</span>
              </div>
              <div class="metric-pill">
                <span class="metric-pill-label">Humidity</span>
                <span class="metric-pill-value">${c.humidityPct} <span class="metric-pill-unit">%</span></span>
                <span class="metric-pill-nominal">${c.targetHumidityPct}</span>
              </div>
              <div class="metric-pill">
                <span class="metric-pill-label">Occupancy</span>
                <span class="metric-pill-value">${c.occupiedCrates}/${c.capacityCrates}</span>
                <span class="metric-pill-nominal">crates</span>
              </div>
            </div>
            <div style="width:100%; height:4px; background:rgba(255,255,255,0.06); border-radius:2px; margin-top:8px; overflow:hidden;">
              <div style="width:${(c.occupiedCrates / c.capacityCrates) * 100}%; height:100%; background:${
            c.tempC > 10 ? "var(--warn-amber)" : "var(--cryo-cyan)"
          }; border-radius:2px;"></div>
            </div>
          </div>
        `
        ).join("")}
      </div>

      <!-- FEFO vs FIFO Shelf-Life Tracker -->
      <div class="mobile-card">
        <div class="card-header">
          <div class="card-title">
            <span>FEFO High-Bay Rotation Rack</span>
            <span class="prov-badge prov-source">FIRST-EXPIRED</span>
          </div>
        </div>
        <div style="font-size:0.72rem; color:var(--text-secondary); margin-bottom:8px;">
          ABC classification ensures fast-spoiling produce (A) is prioritized in cooling zones over durable stock (C).
        </div>

        ${FEFO_CRATES_DATA.map(
          (item) => `
          <div style="background:var(--bg-surface-elevated); border:1px solid var(--border-subtle); border-left:3px solid ${
            item.status === "critical"
              ? "var(--alert-red)"
              : item.status === "expiring_soon"
              ? "var(--warn-amber)"
              : "var(--agri-green)"
          }; border-radius:8px; padding:8px 10px; margin-bottom:8px;">
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <span style="font-size:0.82rem; font-weight:700; color:var(--text-primary);">${item.commodity}</span>
              <span style="font-size:0.68rem; font-weight:700; background:rgba(255,255,255,0.06); color:var(--text-secondary); padding:2px 6px; border-radius:4px;">
                Cat ${item.abcCategory} · ${item.crateQuantity} Crates
              </span>
            </div>
            <div style="display:flex; justify-content:space-between; align-items:center; margin-top:4px; font-size:0.72rem; color:var(--text-secondary);">
              <span>Lot: <b>${item.batchLot}</b></span>
              <span>Expires: <b>${item.expiryDate}</b></span>
              <span style="color:${
                item.remainingShelfLifeDays <= 2 ? "var(--alert-red)" : "var(--agri-green)"
              }; font-weight:700;">
                ${item.remainingShelfLifeDays}d left
              </span>
            </div>
          </div>
        `
        ).join("")}
      </div>

      <!-- Asset-Light Shared Storage (Oorja Model) -->
      <div class="mobile-card">
        <div class="card-header">
          <div class="card-title">
            <span>🤝 Shared Cold Storage Booking</span>
            <span class="prov-badge prov-source">SOURCE</span>
          </div>
        </div>
        <div style="font-size:0.75rem; color:#475569; line-height:1.4;">
          Following the <b>Oorja & PMFME pay-per-crate model</b>, small food units can rent decentralized cold slots at ₹1.50/crate/day during peak harvest without capital debt.
        </div>
      </div>
    `;
  }

  // TAB 3: MACHINE HUB (DEDICATED MACHINE TAB)
  private renderMachinesTab(): string {
    const emp = this.getActiveEmployee();
    return `
      <!-- Machine Hub Overview Banner -->
      <div class="mobile-card">
        <div class="card-header">
          <div>
            <div class="card-title">
              <span>⚙️ Machine Fleet & Telemetry</span>
              <span class="prov-badge prov-source">SOURCE</span>
            </div>
            <div class="card-subtitle">Operator: ${emp.name} (Rank ${emp.rank}) • Modular equipment</div>
          </div>
          <button class="btn-sm-outline" id="btn-explain-tab">✨ Explain</button>
        </div>
        <div class="metric-grid-3">
          <div class="metric-pill">
            <span class="metric-pill-label">Fleet OEE</span>
            <span class="metric-pill-value">88.2 <span class="metric-pill-unit">%</span></span>
            <span class="metric-pill-nominal">Target > 85%</span>
          </div>
          <div class="metric-pill">
            <span class="metric-pill-label">Power Draw</span>
            <span class="metric-pill-value">4.5 <span class="metric-pill-unit">kW</span></span>
            <span class="metric-pill-nominal">Total Line</span>
          </div>
          <div class="metric-pill">
            <span class="metric-pill-label">Active Units</span>
            <span class="metric-pill-value">4/5</span>
            <span class="metric-pill-nominal">1 Standby</span>
          </div>
        </div>
      </div>

      <!-- Machine Roster List -->
      ${MACHINES_DATA.map(
        (m) => `
        <div class="machine-item-card" data-machine-id="${m.id}">
          <div class="machine-card-top">
            <div class="machine-name">${m.name}</div>
            <span class="machine-status-tag status-${m.status}">
              ${m.status === "running" ? "● Running" : m.status === "alert" ? "▲ Fault" : m.status === "maintenance" ? "■ Service" : "○ Idle"}
            </span>
          </div>

          <div style="font-size:0.72rem; color:#64748b; margin-top:2px;">
            ${m.category} Line • Health Score: <b>${m.healthScore}%</b> • OEE: <b>${m.oee}%</b>
          </div>

          <div class="metric-grid-3" style="margin-top:8px;">
            <div class="metric-pill">
              <span class="metric-pill-label">${m.metrics[0].label}</span>
              <span class="metric-pill-value" style="font-size:1rem;">
                ${m.metrics[0].value} <span class="metric-pill-unit">${m.metrics[0].unit}</span>
              </span>
            </div>
            <div class="metric-pill">
              <span class="metric-pill-label">${m.metrics[1].label}</span>
              <span class="metric-pill-value" style="font-size:1rem;">
                ${m.metrics[1].value} <span class="metric-pill-unit">${m.metrics[1].unit}</span>
              </span>
            </div>
            <div class="metric-pill">
              <span class="metric-pill-label">Next Service</span>
              <span class="metric-pill-value" style="font-size:1rem;">
                ${m.nextServiceHours} <span class="metric-pill-unit">hrs</span>
              </span>
            </div>
          </div>

          <div style="display:flex; justify-content:space-between; align-items:center; margin-top:10px; padding-top:6px; border-top:1px solid #f1f5f9;">
            <span style="font-size:0.68rem; color:#64748b;">
              🛡️ Poka-Yoke: <b>${m.pokaYokeGuides.length} checks active</b>
            </span>
            <button class="btn-sm-primary btn-open-machine" data-machine-id="${m.id}">
              <span>Inspect & SOP</span>
              <span>➔</span>
            </button>
          </div>
        </div>
      `
      ).join("")}
    `;
  }

  // TAB 4: PROCESS EVALUATION & QUALITY TESTS
  private renderQualityTab(): string {
    const emp = this.getActiveEmployee();
    return `
      <!-- Process Capability & FSSAI Compliance Header -->
      <div class="mobile-card">
        <div class="card-header">
          <div>
            <div class="card-title">
              <span>🧪 Process Evaluation & Tests</span>
              <span class="prov-badge prov-source">SOURCE</span>
            </div>
            <div class="card-subtitle">FSSAI Compliance • Poka-Yoke In-Line Verification</div>
          </div>
          <button class="btn-sm-outline" id="btn-explain-tab">✨ Explain</button>
        </div>

        <div class="metric-grid-3">
          <div class="metric-pill">
            <span class="metric-pill-label">Line Cpk</span>
            <span class="metric-pill-value">1.45</span>
            <span class="metric-pill-nominal">Nominal > 1.33</span>
          </div>
          <div class="metric-pill">
            <span class="metric-pill-label">Dispatched Yield</span>
            <span class="metric-pill-value">88 <span class="metric-pill-unit">%</span></span>
            <span class="metric-pill-nominal">Baseline: 62%</span>
          </div>
          <div class="metric-pill">
            <span class="metric-pill-label">Compliance</span>
            <span class="metric-pill-value" style="color:var(--agri-green);">100%</span>
            <span class="metric-pill-nominal">Zero Violations</span>
          </div>
        </div>
      </div>

      <!-- Interactive Process Tests Roster -->
      ${PROCESS_TESTS_DATA.map(
        (t) => `
        <div class="test-item-card" data-test-id="${t.id}">
          <div style="display:flex; justify-content:space-between; align-items:flex-start;">
            <div>
              <div style="font-size:0.86rem; font-weight:700; color:var(--primary-navy);">${t.name}</div>
              <div style="font-size:0.7rem; color:#64748b; margin-top:2px;">
                ${t.processStep} • Category: <span class="test-category-tag">${t.category}</span>
              </div>
            </div>
            <span class="prov-badge ${t.status === "pass" ? "prov-source" : "prov-inference"}">
              ${t.status.toUpperCase()}
            </span>
          </div>

          <div class="metric-grid-2" style="margin-top:8px;">
            <div class="metric-pill">
              <span class="metric-pill-label">Current Reading</span>
              <span class="metric-pill-value" style="font-size:1.05rem;">
                ${t.currentValue} <span class="metric-pill-unit">${t.unit}</span>
              </span>
              <span class="metric-pill-nominal">Target: ${t.nominalRange}</span>
            </div>
            <div class="metric-pill">
              <span class="metric-pill-label">Process Cpk</span>
              <span class="metric-pill-value" style="font-size:1.05rem; color:${
                t.cpk >= 1.33 ? "var(--agri-green)" : "var(--alert-red)"
              };">
                ${t.cpk}
              </span>
              <span class="metric-pill-nominal">Tested: ${t.lastTestedAt.split(" ")[1]}</span>
            </div>
          </div>

          <div class="test-actions-row">
            <span style="font-size:0.68rem; color:#64748b;">
              Req: <b>Rank ${t.requiredRank}+</b> (${emp.rank >= t.requiredRank ? "Authorized" : "Read-Only"})
            </span>
            <button class="btn-sm-success btn-run-test" data-test-id="${t.id}">
              <span>Run Test Audit</span>
              <span>⚡</span>
            </button>
          </div>
        </div>
      `
      ).join("")}

      <!-- Farm-to-Consumer Traceability Ledger -->
      <div class="mobile-card">
        <div class="card-header">
          <div class="card-title">
            <span>🔍 End-to-End Batch Transparency</span>
            <span class="prov-badge prov-source">SOURCE</span>
          </div>
        </div>
        <div style="font-size:0.72rem; color:#64748b;">
          Every outgoing batch carries a tamper-evident QR code mapping farm harvest GPS, washing chlorine log, and cold chain temperature history.
        </div>
        <div class="batch-qr-box">
          <div class="qr-matrix-sim">QR CODE<br/>B-901</div>
          <div class="qr-info-text">
            <div>Batch: <b>B-2026-0912-A</b> (Nashik FPO)</div>
            <div>Wash: <b>108 ppm Cl @ 120s</b></div>
            <div>Storage: <b>4.6°C CoolBot (0 Excursions)</b></div>
            <div>FSSAI License: <b>11521034000128</b></div>
          </div>
        </div>
      </div>
    `;
  }

  // TAB 5: CASH FLOW & INDUSTRY ECONOMICS
  private renderFinanceTab(): string {
    const emp = this.getActiveEmployee();

    // Check RBAC: Only Rank 4+ can see financial records
    if (emp.rank < 4) {
      return `
        <div class="restricted-card-lock">
          <div class="restricted-lock-icon">🔒</div>
          <div class="restricted-title">Access Restricted: Rank 4+ Required</div>
          <div class="restricted-desc">
            You are logged in as <b>${emp.name} (Rank ${emp.rank})</b>. Financial treasury, e-NWR loans, and subsidy ledgers require Supply Chain Lead or Executive authorization.
          </div>
          <button class="btn-sm-primary" id="btn-request-access" style="margin-top:10px;">
            Switch to Rank 4 or 5 Profile
          </button>
        </div>
      `;
    }

    const loanVal = Math.round(this.calcCrates * this.calcCratePrice * (this.calcLtvPct / 100));
    const distressLossAvoided = Math.round(this.calcCrates * this.calcCratePrice * 0.35);

    return `
      <!-- Economic Overview Card -->
      <div class="mobile-card">
        <div class="card-header">
          <div>
            <div class="card-title">
              <span>💰 Cash Flow & Economics</span>
              <span class="prov-badge prov-source">SOURCE</span>
            </div>
            <div class="card-subtitle">Working Capital • Spoilage Savings • WDRA e-NWR</div>
          </div>
          <button class="btn-sm-outline" id="btn-explain-tab">✨ Explain</button>
        </div>

        <div class="metric-grid-2">
          <div class="metric-pill">
            <span class="metric-pill-label">Working Capital</span>
            <span class="metric-pill-value">₹${(CASH_FLOW_DATA.workingCapitalBalance / 1000).toFixed(0)}k</span>
            <span class="metric-pill-nominal">Liquid Bank Reserves</span>
          </div>
          <div class="metric-pill">
            <span class="metric-pill-label">Net Daily Savings</span>
            <span class="metric-pill-value" style="color:var(--agri-green);">+₹${(
              CASH_FLOW_DATA.netDailySavingsRupees / 1000
            ).toFixed(1)}k</span>
            <span class="metric-pill-nominal">Saved vs Baseline Spoilage</span>
          </div>
        </div>

        <div style="background:#f0fdf4; border:1px solid #bbf7d0; border-radius:8px; padding:10px; margin-top:10px; font-size:0.75rem; color:#166534; line-height:1.4;">
          <b>Post-Harvest Spoilage Comparison:</b><br/>
          Baseline Loss: <b>₹33,600</b> per 100 crates<br/>
          Improved Loss: <b>₹8,640</b> per 100 crates<br/>
          <b>Net Realized Gain: ₹24,960 / batch</b>
        </div>
      </div>

      <!-- Interactive e-NWR Financing Calculator -->
      <div class="mobile-card">
        <div class="card-header">
          <div>
            <div class="card-title">
              <span>🏦 e-NWR Warehouse Financing</span>
              <span class="prov-badge prov-source">SOURCE</span>
            </div>
            <div class="card-subtitle">WDRA electronic receipt loans avoid distress sales</div>
          </div>
        </div>

        <div class="calc-container">
          <div class="calc-slider-group">
            <div class="calc-slider-header">
              <span>Crates Stored in Accredited Cold Room:</span>
              <span class="val" id="val-crates">${this.calcCrates} crates</span>
            </div>
            <input type="range" class="calc-slider" id="slider-crates" min="20" max="150" value="${this.calcCrates}" />
          </div>

          <div class="calc-slider-group">
            <div class="calc-slider-header">
              <span>Produce Market Value per Crate:</span>
              <span class="val" id="val-price">₹${this.calcCratePrice}</span>
            </div>
            <input type="range" class="calc-slider" id="slider-price" min="600" max="2500" step="50" value="${
              this.calcCratePrice
            }" />
          </div>

          <div class="calc-slider-group">
            <div class="calc-slider-header">
              <span>Bank Loan-to-Value (LTV % @ 7% p.a.):</span>
              <span class="val" id="val-ltv">${this.calcLtvPct}%</span>
            </div>
            <input type="range" class="calc-slider" id="slider-ltv" min="50" max="85" value="${this.calcLtvPct}" />
          </div>

          <div class="calc-result-box">
            <div class="calc-result-row">
              <span>Total Collateralized Inventory Value:</span>
              <b>₹${(this.calcCrates * this.calcCratePrice).toLocaleString("en-IN")}</b>
            </div>
            <div class="calc-result-row">
              <span>Instant Bank Working Capital Credit:</span>
              <b style="color:#60a5fa;">₹${loanVal.toLocaleString("en-IN")}</b>
            </div>
            <div class="calc-result-row highlight">
              <span>Distress Sale Loss Avoided:</span>
              <span>+₹${distressLossAvoided.toLocaleString("en-IN")}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Government Schemes & Subsidies -->
      <div class="mobile-card">
        <div class="card-header">
          <div class="card-title">
            <span>🏛️ Government Subsidies</span>
            <span class="prov-badge prov-source">SOURCE</span>
          </div>
        </div>

        <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:10px; margin-bottom:8px;">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <span style="font-size:0.82rem; font-weight:700; color:var(--primary-navy);">PMFME 35% Capital Subsidy</span>
            <span class="prov-badge prov-source">Active</span>
          </div>
          <div style="font-size:0.72rem; color:#64748b; margin-top:2px;">
            Eligible: Up to ₹10 Lakhs • <b>₹3,50,000 Disbursed</b> for CoolBot & Solar Dryer.
          </div>
        </div>

        <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:10px;">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <span style="font-size:0.82rem; font-weight:700; color:var(--primary-navy);">MSE-CDP Common Facility Centre</span>
            <span class="prov-badge prov-source">Approved</span>
          </div>
          <div style="font-size:0.72rem; color:#64748b; margin-top:2px;">
            Ministry of MSME 70% Central + 20% State grant for cluster shared cold storage & testing.
          </div>
        </div>
      </div>
    `;
  }

  // MODAL 1: RANK / ROLE-BASED ACCESS CONTROL SWITCHER
  private renderRankModal(): string {
    if (!this.isRankModalOpen) return "";
    return `
      <div class="mobile-modal-overlay open" id="modal-rank-overlay">
        <div class="mobile-sheet">
          <div class="sheet-handle"></div>
          <div class="sheet-header">
            <div>
              <div class="sheet-title">Employee Rank & Access Control</div>
              <div style="font-size:0.7rem; color:#64748b;">Role-Based Information Visibility</div>
            </div>
            <button class="sheet-close-btn" id="btn-close-rank-modal">✕</button>
          </div>
          <div class="sheet-body">
            <p style="font-size:0.75rem; color:#475569; margin-bottom:12px;">
              Select an employee rank to simulate different operational visibility layers across the food manufacturing plant:
            </p>
            ${EMPLOYEE_PROFILES.map(
              (p) => `
              <div class="rank-select-card ${p.rank === this.activeRank ? "active" : ""}" data-rank-id="${p.rank}">
                <div class="rank-select-left">
                  <div class="rank-avatar" style="background:${p.badgeColor};">R${p.rank}</div>
                  <div class="rank-details">
                    <span class="rank-emp-name">${p.name}</span>
                    <span class="rank-emp-role">${p.role} • ${p.department}</span>
                  </div>
                </div>
                <div style="text-align:right;">
                  <span style="font-size:0.7rem; font-weight:800; color:${p.badgeColor};">Rank ${p.rank}</span>
                  <div style="font-size:0.62rem; color:#64748b;">
                    ${p.rank >= 4 ? "Full Financials" : p.rank >= 2 ? "Quality & Ops" : "Floor SOPs"}
                  </div>
                </div>
              </div>
            `
            ).join("")}
          </div>
        </div>
      </div>
    `;
  }

  // MODAL 2: AI ASSISTANT & VOCAL AUDIO DIALOG
  private renderAiModal(): string {
    if (!this.isAiModalOpen) return "";
    const explanation = this.aiAssistant.explainTabContext(this.activeTab, this.activeRank);
    const speechState = this.voiceEngine.getState();

    return `
      <div class="mobile-modal-overlay open" id="modal-ai-overlay">
        <div class="mobile-sheet" style="max-height:90%;">
          <div class="sheet-handle"></div>
          <div class="sheet-header">
            <div style="display:flex; align-items:center; gap:8px;">
              <span style="font-size:1.2rem;">✨</span>
              <div>
                <div class="sheet-title">IndusTwin AI Assistant</div>
                <div style="font-size:0.7rem; color:#64748b;">Context-Aware Industrial Companion</div>
              </div>
            </div>
            <button class="sheet-close-btn" id="btn-close-ai-modal">✕</button>
          </div>
          <div class="sheet-body">
            <!-- Vocal Playback Action -->
            <div style="background:var(--tech-blue-dim); border:1px solid rgba(56, 189, 248, 0.25); border-radius:12px; padding:12px; margin-bottom:12px;">
              <div style="display:flex; justify-content:space-between; align-items:center;">
                <span style="font-size:0.82rem; font-weight:700; color:var(--text-primary);">
                  🎙️ Vocal Audio Explanation
                </span>
                <button class="btn-sm-primary" id="btn-ai-speak">
                  <span>${speechState.isPlaying ? "⏹ Stop Audio" : "🔊 Read Vocally"}</span>
                </button>
              </div>
              <div style="font-size:0.72rem; color:var(--text-secondary); margin-top:4px;">
                Uses Web Speech Synthesis to explain telemetry and SOPs audibly for field operators.
              </div>
            </div>

            <!-- Context Explanation Card -->
            <div style="background:var(--bg-surface-elevated); border:1px solid var(--border-subtle); border-radius:12px; padding:14px; margin-bottom:12px;">
              <div style="font-size:0.92rem; font-weight:800; color:var(--text-primary); margin-bottom:6px;">
                ${explanation.title}
              </div>
              <div style="font-size:0.76rem; color:var(--text-secondary); line-height:1.45; margin-bottom:10px;">
                ${explanation.summary}
              </div>
              <ul style="margin:0; padding-left:18px; font-size:0.74rem; color:var(--text-secondary); line-height:1.5;">
                ${explanation.bulletPoints.map((bp) => `<li>${bp}</li>`).join("")}
              </ul>
              <div style="background:rgba(16, 185, 129, 0.08); border-left:3px solid var(--agri-green); border-radius:4px; padding:8px 10px; margin-top:10px; font-size:0.72rem; color:var(--text-primary);">
                <b>Recommended Next Step:</b> ${explanation.recommendedAction}
              </div>
            </div>

            <!-- Suggested Prompt Chips -->
            <div style="font-size:0.75rem; font-weight:700; color:var(--text-primary); margin-bottom:6px;">Suggested Inquiries:</div>
            <div class="ai-chips-wrap">
              <span class="ai-chip" data-chip="coolbot">Why does CoolBot save 40% energy?</span>
              <span class="ai-chip" data-chip="fefo">Explain FEFO vs FIFO spoilage</span>
              <span class="ai-chip" data-chip="pmfme">How to claim PMFME 35% subsidy?</span>
              <span class="ai-chip" data-chip="enwr">How does e-NWR prevent distress sales?</span>
              <span class="ai-chip" data-chip="seal">Explain packaging burst test</span>
            </div>

            <!-- Custom AI Question Input Bar -->
            <div class="ai-input-bar">
              <input type="text" id="ai-query-input" class="ai-input-field" placeholder="Type or speak a question…" value="${this.micDraft.replace(/"/g, "&quot;")}" />
              <button id="btn-ai-mic" class="ai-mic-btn" title="Speak your question">◉</button>
              <button id="btn-ai-query-submit" class="ai-send-btn">➔</button>
            </div>
            <div id="ai-mic-hint" class="mic-hint">Tap ◉ and speak — your words appear here for the AI.</div>
            <div id="ai-query-response" style="display:none; margin-top:12px; padding:10px; background:var(--bg-surface-active); border:1px solid var(--border-strong); border-radius:8px; font-size:0.75rem; color:var(--text-primary); line-height:1.45;"></div>
          </div>
        </div>
      </div>
    `;
  }

  // MODAL 3: MACHINE TELEMETRY & DIGITAL SOP VIEWER
  private renderMachineModal(): string {
    if (!this.isMachineModalOpen) return "";
    const m = MACHINES_DATA.find((x) => x.id === this.selectedMachineId) || MACHINES_DATA[0];

    return `
      <div class="mobile-modal-overlay open" id="modal-machine-overlay">
        <div class="mobile-sheet" style="max-height:92%;">
          <div class="sheet-handle"></div>
          <div class="sheet-header">
            <div>
              <div class="sheet-title">${m.name}</div>
              <div style="font-size:0.7rem; color:#64748b;">${m.category} Equipment • ID: ${m.id}</div>
            </div>
            <button class="sheet-close-btn" id="btn-close-machine-modal">✕</button>
          </div>
          <div class="sheet-body">
            <!-- Machine Status & Energy Card -->
            <div class="machine-health-banner ${m.status === "alert" ? "is-fault" : "is-ok"}">
              <div style="display:flex; justify-content:space-between; align-items:center;">
                <span style="font-size:0.85rem; font-weight:800;">
                  ${m.status === "alert" ? "▲ FAULT" : "● " + m.status.toUpperCase()} · ${m.oee}% OEE
                </span>
                <span class="prov-badge prov-source">SOURCE</span>
              </div>
              <div class="health-sub">
                Health ${m.healthScore}% · ${m.energySavingVsBaseline || "Optimized for minimal electricity draw"}
              </div>
              ${m.status === "alert" ? `<div class="health-fault-note">Drive current 8.9A exceeds 5.0A limit — clear belt jam before restart.</div>` : ""}
            </div>

            <!-- Detailed Telemetry Metrics -->
            <div style="font-size:0.8rem; font-weight:700; color:var(--text-primary); margin-bottom:6px;">
              Live Sensor Telemetry
            </div>
            <div class="metric-grid-2">
              ${m.metrics
                .map(
                  (met) => `
                <div class="metric-pill">
                  <span class="metric-pill-label">${met.label}</span>
                  <span class="metric-pill-value">${met.value} <span class="metric-pill-unit">${met.unit}</span></span>
                  <span class="metric-pill-nominal">Nominal: ${met.nominal}</span>
                </div>
              `
                )
                .join("")}
            </div>

            <!-- Digital SOP Walkthrough Checklist -->
            <div style="font-size:0.8rem; font-weight:700; color:var(--text-primary); margin:14px 0 6px;">
              Digital Standard Operating Procedure (SOP)
            </div>
            ${m.sopSteps
              .map(
                (sop) => `
              <div style="background:var(--bg-surface-elevated); border:1px solid var(--border-subtle); border-radius:8px; padding:10px; margin-bottom:8px;">
                <div style="font-size:0.78rem; font-weight:700; color:var(--text-primary);">
                  Step ${sop.step}: ${sop.title}
                </div>
                <div style="font-size:0.74rem; color:var(--text-secondary); margin-top:2px;">
                  ${sop.instruction}
                </div>
                <div style="font-size:0.68rem; color:var(--warn-amber); margin-top:4px; background:var(--warn-amber-dim); padding:4px 8px; border-radius:4px;">
                  ⚠️ Safety Checklist: ${sop.safetyCheck}
                </div>
              </div>
            `
              )
              .join("")}

            <!-- Poka-Yoke Safeguards -->
            <div style="font-size:0.8rem; font-weight:700; color:var(--text-primary); margin:14px 0 6px;">
              Poka-Yoke Error Proofing Safeguards
            </div>
            <ul style="margin:0; padding-left:18px; font-size:0.74rem; color:var(--text-secondary); line-height:1.45;">
              ${m.pokaYokeGuides.map((g) => `<li>${g}</li>`).join("")}
            </ul>

            <!-- 3D Digital Twin Inspection Button -->
            <div style="margin-top:16px;">
              <button class="btn-sm-primary" id="btn-view-machine-in-3d" style="width:100%; justify-content:center; padding:10px;">
                🥽 Inspect Machine in 3D Digital Twin
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  // MODAL 4: INTERACTIVE QUALITY TEST RUNNER
  private renderTestModal(): string {
    if (!this.isTestModalOpen) return "";
    const t = PROCESS_TESTS_DATA.find((x) => x.id === this.selectedTestId) || PROCESS_TESTS_DATA[0];

    return `
      <div class="mobile-modal-overlay open" id="modal-test-overlay">
        <div class="mobile-sheet" style="max-height:90%;">
          <div class="sheet-handle"></div>
          <div class="sheet-header">
            <div>
              <div class="sheet-title">${t.name}</div>
              <div style="font-size:0.7rem; color:#64748b;">${t.processStep}</div>
            </div>
            <button class="sheet-close-btn" id="btn-close-test-modal">✕</button>
          </div>
          <div class="sheet-body">
            <!-- Test Capability Badge -->
            <div style="background:var(--agri-green-dim); border:1px solid rgba(16, 185, 129, 0.3); border-radius:12px; padding:12px; margin-bottom:12px;">
              <div style="display:flex; justify-content:space-between; align-items:center;">
                <span style="font-size:0.84rem; font-weight:800; color:var(--agri-green);">
                  Verified: ${t.status.toUpperCase()} (Cpk = ${t.cpk})
                </span>
                <span class="prov-badge prov-source">SOURCE</span>
              </div>
              <div style="font-size:0.72rem; color:var(--text-secondary); margin-top:2px;">
                Nominal Range: <b>${t.nominalRange} ${t.unit}</b>
              </div>
            </div>

            <!-- Testing Procedure -->
            <div style="font-size:0.8rem; font-weight:700; color:var(--text-primary); margin-bottom:4px;">
              Standard Testing Procedure
            </div>
            <div style="font-size:0.75rem; color:var(--text-secondary); line-height:1.45; background:var(--bg-surface-elevated); border:1px solid var(--border-subtle); border-radius:8px; padding:10px;">
              ${t.procedure}
            </div>

            <!-- Corrective Action Protocol -->
            <div style="font-size:0.8rem; font-weight:700; color:var(--text-primary); margin:12px 0 4px;">
              Corrective Protocol if Out-of-Spec
            </div>
            <div style="font-size:0.75rem; color:var(--alert-red); line-height:1.45; background:var(--alert-red-dim); border:1px solid rgba(239, 68, 68, 0.3); border-radius:8px; padding:10px;">
              ${t.correctiveAction}
            </div>

            <!-- Live Test Execution Sandbox -->
            <div style="margin-top:16px; background:#1e293b; color:#fff; border-radius:12px; padding:14px; text-align:center;">
              <div style="font-size:0.75rem; color:#94a3b8;">Real-Time Instrument Reading</div>
              <div id="test-sandbox-value" style="font-size:2.2rem; font-weight:900; font-family:var(--font-mono); color:var(--accent-gold); margin:6px 0;">
                ${t.currentValue} <span style="font-size:1rem; color:#cbd5e1;">${t.unit}</span>
              </div>
              <button class="btn-sm-success" id="btn-execute-live-sample" style="width:100%; justify-content:center; padding:10px; margin-top:8px;">
                ⚡ Execute Live Verification Stroke
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  private attachEventListeners(): void {
    // Frame toggle
    const toggleFrameBtn = this.container.querySelector("#btn-toggle-frame");
    toggleFrameBtn?.addEventListener("click", () => this.toggleFullScreen());

    // Switch to 3D Digital Twin
    const openTwinBtn = this.container.querySelector("#btn-open-3d-twin");
    openTwinBtn?.addEventListener("click", () => {
      if (this.onOpenVRDigitalTwin) {
        this.onOpenVRDigitalTwin();
      }
    });

    // 3D Scene Selector Chips
    const sceneChips = this.container.querySelectorAll(".scene-chip");
    sceneChips.forEach((chip) => {
      chip.addEventListener("click", () => {
        const s = chip.getAttribute("data-scene") as MiniSceneKey;
        if (s) {
          this.activeMiniSceneKey = s;
          sceneChips.forEach((c) => c.classList.remove("active"));
          chip.classList.add("active");
          if (this.mini3D) {
            this.mini3D.setScene(s);
          }
        }
      });
    });

    // Rank selector open
    const rankBtn = this.container.querySelector("#btn-rank-selector");
    rankBtn?.addEventListener("click", () => {
      this.isRankModalOpen = true;
      this.render();
    });

    // Rank modal close
    const closeRankBtn = this.container.querySelector("#btn-close-rank-modal");
    closeRankBtn?.addEventListener("click", () => {
      this.isRankModalOpen = false;
      this.render();
    });

    // Rank option selection
    const rankCards = this.container.querySelectorAll(".rank-select-card");
    rankCards.forEach((card) => {
      card.addEventListener("click", () => {
        const rank = parseInt(card.getAttribute("data-rank-id") || "3", 10) as EmployeeRank;
        this.setRank(rank);
      });
    });

    // Bottom Navigation tab clicks
    const navBtns = this.container.querySelectorAll(".nav-tab-btn");
    navBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        const tab = btn.getAttribute("data-tab") as AppTab;
        if (tab) {
          this.setTab(tab);
        }
      });
    });

    // Notification bell + sheet
    this.container.querySelector("#btn-notif")?.addEventListener("click", () => {
      this.isNotifOpen = true;
      this.render();
    });
    this.container.querySelector("#btn-close-notif")?.addEventListener("click", () => {
      this.isNotifOpen = false;
      this.render();
    });
    this.container.querySelector("#modal-notif-overlay")?.addEventListener("click", (e) => {
      if ((e.target as HTMLElement).id === "modal-notif-overlay") {
        this.isNotifOpen = false;
        this.render();
      }
    });

    // Generic quick-action buttons (home + sheets)
    this.container.querySelectorAll("[data-action]").forEach((el) => {
      el.addEventListener("click", (e) => {
        e.stopPropagation();
        const action = el.getAttribute("data-action");
        if (action === "goto") {
          const tab = el.getAttribute("data-goto") as AppTab;
          if (tab) this.setTab(tab);
        } else if (action === "open-notif") {
          this.isNotifOpen = true;
          this.render();
        } else if (action === "ask-ai") {
          this.isAiModalOpen = true;
          this.render();
        } else if (action === "open-twin") {
          if (this.onOpenVRDigitalTwin) this.onOpenVRDigitalTwin();
        } else if (action === "stage") {
          const stage = el.getAttribute("data-stage");
          const map: Record<string, AppTab> = { raw: "supply", wash: "quality", cold: "inventory", pack: "machines", done: "supply" };
          const label = PIPELINE_STAGES.find((s) => s.id === stage);
          if (label) this.pushToast(`${label.label}: ${label.count} ${label.unit}`, label.sub, "info");
          this.setTab(map[stage ?? ""] ?? "supply");
        } else if (action === "alert-goto") {
          const id = el.getAttribute("data-alert");
          const alert = this.getNotifications().find((a) => a.id === id);
          if (alert?.machineId) this.selectedMachineId = alert.machineId;
          this.isNotifOpen = false;
          if (alert?.machineId) this.isMachineModalOpen = true;
          else if (alert?.actionTab) this.activeTab = alert.actionTab;
          this.render();
        } else if (action === "dismiss") {
          const id = el.getAttribute("data-alert");
          if (id) this.dismissedIds.add(id);
          this.render();
        }
      });
    });

    // Mic (speech-to-text) inside AI modal
    const micBtn = this.container.querySelector("#btn-ai-mic") as HTMLButtonElement | null;
    const queryInputEl = this.container.querySelector("#ai-query-input") as HTMLInputElement | null;
    const micHint = this.container.querySelector("#ai-mic-hint") as HTMLElement | null;
    const paintMic = (listening: boolean) => {
      micBtn?.classList.toggle("listening", listening);
      if (micBtn) micBtn.innerHTML = listening ? "■" : "◉";
      if (micHint) micHint.textContent = listening ? "Listening… speak now, tap ■ to stop." : "Tap ◉ and speak — your words appear here for the AI.";
    };
    paintMic(this.voiceEngine.isListening());
    micBtn?.addEventListener("click", () => {
      if (this.voiceEngine.isListening()) {
        this.voiceEngine.stopListening();
        paintMic(false);
        return;
      }
      if (!this.voiceEngine.isListenSupported()) {
        if (micHint) micHint.textContent = "Voice input not supported in this browser — please type instead.";
        this.pushToast("Mic not supported", "Type your question instead.", "warn");
        return;
      }
      paintMic(true);
      this.voiceEngine.startListening(
        (text, isFinal) => {
          if (queryInputEl && !isFinal) {
            queryInputEl.value = text;
            this.micDraft = text;
          }
        },
        (finalText) => {
          paintMic(false);
          if (finalText && queryInputEl) {
            queryInputEl.value = finalText;
            this.micDraft = finalText;
            // Hand the transcript straight to the AI assistant (no backend).
            const ans = this.aiAssistant.answerQuestion(finalText);
            const respEl = this.container.querySelector("#ai-query-response") as HTMLElement | null;
            if (respEl) {
              respEl.style.display = "block";
              respEl.innerHTML = `<b>Q: ${finalText}</b><br/><br/>${ans}`;
            }
            this.voiceEngine.speak(ans);
          }
        }
      );
    });

    // Audio toggle in dock
    const audioBtn = this.container.querySelector("#btn-audio-toggle");
    audioBtn?.addEventListener("click", () => {
      const explanation = this.aiAssistant.explainTabContext(this.activeTab, this.activeRank);
      const speechText = `${explanation.title}. ${explanation.summary} Recommended action: ${explanation.recommendedAction}`;
      this.voiceEngine.togglePlay(speechText);
    });

    // Speech rate button
    const rateBtn = this.container.querySelector("#btn-speech-rate");
    rateBtn?.addEventListener("click", () => {
      const current = this.voiceEngine.getState().rate;
      const nextRate = current === 1.0 ? 1.25 : current === 1.25 ? 1.5 : 1.0;
      this.voiceEngine.setRate(nextRate);
      if (rateBtn) rateBtn.textContent = `${nextRate}x`;
    });

    // Floating AI button & Explain tab buttons
    const fabAi = this.container.querySelector("#fab-ai");
    const explainTabBtn = this.container.querySelector("#btn-explain-tab");
    const openAiAction = () => {
      this.isAiModalOpen = true;
      this.render();
    };
    fabAi?.addEventListener("click", openAiAction);
    explainTabBtn?.addEventListener("click", openAiAction);

    // AI modal close
    const closeAiBtn = this.container.querySelector("#btn-close-ai-modal");
    closeAiBtn?.addEventListener("click", () => {
      this.isAiModalOpen = false;
      this.render();
    });

    // AI Read Vocally button inside modal
    const aiSpeakBtn = this.container.querySelector("#btn-ai-speak");
    aiSpeakBtn?.addEventListener("click", () => {
      const state = this.voiceEngine.getState();
      if (state.isPlaying) {
        this.voiceEngine.stop();
      } else {
        const explanation = this.aiAssistant.explainTabContext(this.activeTab, this.activeRank);
        this.voiceEngine.speak(`${explanation.title}. ${explanation.summary}`);
      }
    });

    // AI Prompt Chips
    const chips = this.container.querySelectorAll(".ai-chip");
    chips.forEach((c) => {
      c.addEventListener("click", () => {
        const text = c.textContent || "";
        const answer = this.aiAssistant.answerQuestion(text);
        const respEl = this.container.querySelector("#ai-query-response") as HTMLElement | null;
        if (respEl) {
          respEl.style.display = "block";
          respEl.innerHTML = `<b>Q: ${text}</b><br/><br/>${answer}`;
        }
        this.voiceEngine.speak(answer);
      });
    });

    // Custom AI Query Submit
    const queryInput = this.container.querySelector("#ai-query-input") as HTMLInputElement | null;
    const querySubmitBtn = this.container.querySelector("#btn-ai-query-submit");
    const handleQuery = () => {
      const q = queryInput?.value.trim();
      if (!q) return;
      const ans = this.aiAssistant.answerQuestion(q);
      const respEl = this.container.querySelector("#ai-query-response") as HTMLElement | null;
      if (respEl) {
        respEl.style.display = "block";
        respEl.innerHTML = `<b>Q: ${q}</b><br/><br/>${ans}`;
      }
      this.voiceEngine.speak(ans);
    };
    querySubmitBtn?.addEventListener("click", handleQuery);
    queryInput?.addEventListener("keydown", (e) => {
      if (e.key === "Enter") handleQuery();
    });

    // Machine click inspection
    const machineInspectBtns = this.container.querySelectorAll(".btn-open-machine");
    machineInspectBtns.forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        this.selectedMachineId = btn.getAttribute("data-machine-id") || "MCH-01";
        this.isMachineModalOpen = true;
        this.render();
      });
    });

    // Close Machine modal
    const closeMachineBtn = this.container.querySelector("#btn-close-machine-modal");
    closeMachineBtn?.addEventListener("click", () => {
      this.isMachineModalOpen = false;
      this.render();
    });

    // View Machine in 3D
    const viewMachine3dBtn = this.container.querySelector("#btn-view-machine-in-3d");
    viewMachine3dBtn?.addEventListener("click", () => {
      this.isMachineModalOpen = false;
      if (this.onOpenVRDigitalTwin) {
        this.onOpenVRDigitalTwin();
      }
    });

    // Test click inspection & Run Test
    const runTestBtns = this.container.querySelectorAll(".btn-run-test");
    runTestBtns.forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        this.selectedTestId = btn.getAttribute("data-test-id") || "TEST-04";
        this.isTestModalOpen = true;
        this.render();
      });
    });

    // Close Test modal
    const closeTestBtn = this.container.querySelector("#btn-close-test-modal");
    closeTestBtn?.addEventListener("click", () => {
      this.isTestModalOpen = false;
      this.render();
    });

    // Execute live sample inside test sandbox
    const executeSampleBtn = this.container.querySelector("#btn-execute-live-sample");
    executeSampleBtn?.addEventListener("click", () => {
      const sandboxVal = this.container.querySelector("#test-sandbox-value");
      if (sandboxVal) {
        sandboxVal.textContent = "Sampling...";
        setTimeout(() => {
          const t = PROCESS_TESTS_DATA.find((x) => x.id === this.selectedTestId);
          if (t && sandboxVal) {
            const jitter = (Math.random() * 0.2 - 0.1).toFixed(2);
            const newVal = (t.currentValue + parseFloat(jitter)).toFixed(2);
            sandboxVal.innerHTML = `${newVal} <span style="font-size:1rem; color:#cbd5e1;">${t.unit}</span>`;
            this.voiceEngine.speak(
              `Live test stroke complete for ${t.name}. Verified reading is ${newVal} ${t.unit}. Process within tolerance.`
            );
          }
        }, 600);
      }
    });

    // e-NWR Calculator Sliders
    const sliderCrates = this.container.querySelector("#slider-crates") as HTMLInputElement | null;
    const sliderPrice = this.container.querySelector("#slider-price") as HTMLInputElement | null;
    const sliderLtv = this.container.querySelector("#slider-ltv") as HTMLInputElement | null;

    if (sliderCrates && sliderPrice && sliderLtv) {
      const handleCalcUpdate = () => {
        this.calcCrates = parseInt(sliderCrates.value, 10);
        this.calcCratePrice = parseInt(sliderPrice.value, 10);
        this.calcLtvPct = parseInt(sliderLtv.value, 10);

        const valCrates = this.container.querySelector("#val-crates");
        const valPrice = this.container.querySelector("#val-price");
        const valLtv = this.container.querySelector("#val-ltv");
        if (valCrates) valCrates.textContent = `${this.calcCrates} crates`;
        if (valPrice) valPrice.textContent = `₹${this.calcCratePrice}`;
        if (valLtv) valLtv.textContent = `${this.calcLtvPct}%`;

        const totalVal = this.calcCrates * this.calcCratePrice;
        const loanVal = Math.round(totalVal * (this.calcLtvPct / 100));
        const distressAvoided = Math.round(totalVal * 0.35);

        const resBox = this.container.querySelector(".calc-result-box");
        if (resBox) {
          resBox.innerHTML = `
            <div class="calc-result-row">
              <span>Total Collateralized Inventory Value:</span>
              <b>₹${totalVal.toLocaleString("en-IN")}</b>
            </div>
            <div class="calc-result-row">
              <span>Instant Bank Working Capital Credit:</span>
              <b style="color:#60a5fa;">₹${loanVal.toLocaleString("en-IN")}</b>
            </div>
            <div class="calc-result-row highlight">
              <span>Distress Sale Loss Avoided:</span>
              <span>+₹${distressAvoided.toLocaleString("en-IN")}</span>
            </div>
          `;
        }
      };

      sliderCrates.addEventListener("input", handleCalcUpdate);
      sliderPrice.addEventListener("input", handleCalcUpdate);
      sliderLtv.addEventListener("input", handleCalcUpdate);
    }

    // Request Access button for lower ranks
    const reqAccessBtn = this.container.querySelector("#btn-request-access");
    reqAccessBtn?.addEventListener("click", () => {
      this.isRankModalOpen = true;
      this.render();
    });

    // Grievance modal open / close
    const openGrievanceBtn = this.container.querySelector("#btn-open-grievance");
    const quickGrievanceBtn = this.container.querySelector("#btn-quick-grievance");
    const viewGrievancesBtn = this.container.querySelector("#btn-view-grievances");
    const openGrv = () => {
      this.isGrievanceModalOpen = true;
      this.render();
    };
    openGrievanceBtn?.addEventListener("click", openGrv);
    quickGrievanceBtn?.addEventListener("click", openGrv);
    viewGrievancesBtn?.addEventListener("click", openGrv);

    const closeGrvBtn = this.container.querySelector("#btn-close-grievance-modal");
    closeGrvBtn?.addEventListener("click", () => {
      this.isGrievanceModalOpen = false;
      this.render();
    });

    const grvOverlay = this.container.querySelector("#modal-grievance-overlay");
    grvOverlay?.addEventListener("click", (e) => {
      if ((e.target as HTMLElement).id === "modal-grievance-overlay") {
        this.isGrievanceModalOpen = false;
        this.render();
      }
    });

    // Audio Safety Rights readout
    const audioRightsBtn = this.container.querySelector("#btn-audio-rights");
    const audioSpeakRightsBtn = this.container.querySelector("#btn-audio-speak-rights");
    const speakRights = () => {
      const speech =
        "Under Section 7A of the Factories Act 1948 and FSSAI guidelines: " +
        "First: Every food worker is entitled to thermal insulated PPE and rotation breaks for cold room work. " +
        "Second: Moving machinery belts and sealing clamp jaws must have physical guards and emergency stop buttons. " +
        "Third: Clean drinking water and hygienic handwashing dip stations must be provided at every changeover. " +
        "Fourth: Workers have the right to confidential, non-retaliatory grievance reporting.";
      this.voiceEngine.speak(speech);
      this.pushToast("Safety Rights Audio", "Vocal reading of worker rights under Factories Act", "info");
    };
    audioRightsBtn?.addEventListener("click", speakRights);
    audioSpeakRightsBtn?.addEventListener("click", speakRights);

    // Category pills in Grievance modal
    const catPills = this.container.querySelectorAll(".grievance-cat-pill");
    catPills.forEach((pill) => {
      pill.addEventListener("click", () => {
        const cat = pill.getAttribute("data-cat") as WorkerGrievance["category"];
        if (cat) {
          this.activeGrievanceCategory = cat;
          catPills.forEach((p) => p.classList.remove("active"));
          pill.classList.add("active");
        }
      });
    });

    // Record Voice Grievance
    const recGrvBtn = this.container.querySelector("#btn-record-grievance-audio");
    const transcriptEl = this.container.querySelector("#grievance-transcript-display");
    const inputGrv = this.container.querySelector("#input-grievance-text") as HTMLInputElement | null;

    recGrvBtn?.addEventListener("click", () => {
      if (this.voiceEngine.isListening()) {
        this.voiceEngine.stopListening();
        if (recGrvBtn) {
          recGrvBtn.classList.remove("recording");
          recGrvBtn.innerHTML = `<span>🎙️</span><span>Tap to Speak Voice Grievance</span>`;
        }
        return;
      }
      if (!this.voiceEngine.isListenSupported()) {
        this.pushToast("Microphone Notice", "Speech API not available. Type your grievance in the text field.", "warn");
        return;
      }
      if (recGrvBtn) {
        recGrvBtn.classList.add("recording");
        recGrvBtn.innerHTML = `<span>⏹</span><span>Listening... Tap to Stop</span>`;
      }
      this.voiceEngine.startListening(
        (text) => {
          if (transcriptEl) {
            transcriptEl.innerHTML = `<b>Transcribing:</b> ${text}`;
          }
          if (inputGrv) inputGrv.value = text;
          this.currentGrievanceTranscript = text;
        },
        (finalText) => {
          if (recGrvBtn) {
            recGrvBtn.classList.remove("recording");
            recGrvBtn.innerHTML = `<span>🎙️</span><span>Tap to Speak Voice Grievance</span>`;
          }
          if (finalText) {
            this.currentGrievanceTranscript = finalText;
            if (transcriptEl) transcriptEl.innerHTML = `<b>Recorded:</b> "${finalText}"`;
            if (inputGrv) inputGrv.value = finalText;
          }
        }
      );
    });

    inputGrv?.addEventListener("input", () => {
      this.currentGrievanceTranscript = inputGrv.value;
    });

    // Submit Grievance Ticket
    const submitGrvBtn = this.container.querySelector("#btn-submit-grievance");
    submitGrvBtn?.addEventListener("click", () => {
      const text = (inputGrv?.value || this.currentGrievanceTranscript).trim();
      if (!text) {
        this.pushToast("Empty Grievance", "Please speak or type a grievance note first.", "warn");
        return;
      }
      const emp = this.getActiveEmployee();
      const newId = `GRV-${Math.floor(104 + Math.random() * 890)}`;
      const newGrv: WorkerGrievance = {
        id: newId,
        workerName: emp.name,
        rank: emp.rank,
        category: this.activeGrievanceCategory,
        transcript: text,
        timestamp: "Just now",
        status: "Submitted",
        audioRecorded: true,
        priority: "High",
      };
      this.grievances.unshift(newGrv);
      this.currentGrievanceTranscript = "";
      this.pushToast(`Ticket ${newId} Logged`, `${this.activeGrievanceCategory} submitted confidentially.`, "info");
      this.voiceEngine.speak(
        `Your grievance ticket has been recorded with ID ${newId}. Logged for plant director review.`
      );
      this.render();
    });

    // Listen to individual grievance status
    const listenGrvBtns = this.container.querySelectorAll(".btn-listen-grievance-item");
    listenGrvBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-grv-id");
        const g = this.grievances.find((x) => x.id === id);
        if (g) {
          const speech = `Grievance ${g.id}. Category: ${g.category}. Status: ${g.status}. Worker note: ${g.transcript}. Action status: Under priority management review.`;
          this.voiceEngine.speak(speech);
          this.pushToast(`Speaking Status`, `Reading status for ${g.id}`, "info");
        }
      });
    });
  }
}
