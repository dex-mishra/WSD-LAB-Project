import type { SceneKey } from "../app/palette";

export interface CutsceneZoneConfig {
  zoneNumber: string;
  title: string;
  subtitle: string;
  objective: string;
  badge: string;
  kanji: string;
  metrics: { label: string; value: string }[];
  colors: {
    primary: string;
    secondary: string;
    dark: string;
    accent: string;
    rgbaStroke: string;
    rgbaAccent: string;
  };
  voiceBriefing: string;
}

export const CUTSCENE_ZONES: Record<SceneKey, CutsceneZoneConfig> = {
  farmReceiving: {
    zoneNumber: "ZONE 01",
    title: "FARMLAND HARVEST & INTAKE",
    subtitle: "SOLAR SHADE PRE-COOLING · WEIGHBRIDGE AUDIT · FPO TRACEABILITY",
    objective: "Direct field heat mitigation & rapid crate staging under cantilever weather canopy",
    badge: "GATE LOGISTICS 01",
    kanji: "収穫", // Harvest
    metrics: [
      { label: "FIELD HEAT", value: "~32°C → 14°C" },
      { label: "INTAKE BATCH", value: "100 Crates" },
      { label: "TARGET EXCURSION", value: "< 1.5 °C·h" },
    ],
    colors: {
      primary: "#22c55e",      // Fresh sprout green
      secondary: "#f59e0b",    // Golden wheat
      dark: "#17110c",         // Fertile earth
      accent: "#84cc16",       // Lime shoot
      rgbaStroke: "rgba(34, 197, 94, 0.95)",
      rgbaAccent: "rgba(245, 158, 11, 0.9)",
    },
    voiceBriefing: "Zone 1: Farmland harvest intake active. Deploy shade pre-cooling canopy and verify weighbridge records.",
  },
  processingPackaging: {
    zoneNumber: "ZONE 02",
    title: "CLEANROOM FLUME & PACKAGING",
    subtitle: "TRIPLE WATER FLUME · PAA IMMERSION · MODIFIED ATMOSPHERE SEAL",
    objective: "Decontaminate produce surfaces and seal with nitrogen gas flush to inhibit aerobic spoilage",
    badge: "CLEANROOM BAY 02",
    kanji: "洗装", // Wash & Pack
    metrics: [
      { label: "FLUME WATER", value: "4.0°C chilled" },
      { label: "PAA RESIDUAL", value: "80 PPM" },
      { label: "OEE TARGET", value: "92%" },
    ],
    colors: {
      primary: "#06b6d4",      // Sanitizing wash cyan
      secondary: "#10b981",    // Organic emerald
      dark: "#0a1d28",         // Deep wash basin
      accent: "#38bdf8",       // Pure water ripple
      rgbaStroke: "rgba(6, 182, 212, 0.95)",
      rgbaAccent: "rgba(16, 185, 129, 0.9)",
    },
    voiceBriefing: "Zone 2: Sanitized cleanroom packaging line online. Monitoring PAA concentration and nitrogen flush MAP seals.",
  },
  inventoryColdChain: {
    zoneNumber: "ZONE 03",
    title: "3-CHAMBER INDUSTRIAL COLD STORE",
    subtitle: "COOLBOT HYBRID COOLING · MULTI-BAY FEFO RACKS · ZERO THERMAL EXCURSION",
    objective: "Safeguard high-value perishables with precision temperature zones and automated shelf-life indexing",
    badge: "COLD COMPLEX 03",
    kanji: "保冷", // Cold Preservation
    metrics: [
      { label: "CHAMBERS", value: "A / B / C / Dock" },
      { label: "STORAGE TEMP", value: "0.8°C to 3.8°C" },
      { label: "EXPIRY INDEX", value: "FEFO First-Out" },
    ],
    colors: {
      primary: "#38bdf8",      // Cryo frost ice
      secondary: "#f59e0b",    // CoolBot amber
      dark: "#141a24",         // Chilled chamber interior
      accent: "#60a5fa",       // Cold air plume
      rgbaStroke: "rgba(56, 189, 248, 0.95)",
      rgbaAccent: "rgba(245, 158, 11, 0.9)",
    },
    voiceBriefing: "Zone 3: Three-chamber industrial cold store verified. Multi-rack FEFO tracking active with zero thermal excursions.",
  },
  dispatchMarket: {
    zoneNumber: "ZONE 04",
    title: "DISPATCH DOCK & MANDI HUB",
    subtitle: "REEFER FLEET LOGISTICS · e-NAM APMC TERMINAL · WAREHOUSE RECEIPT FINANCE",
    objective: "Eliminate distress sales via real-time market price discovery and cold reefer truck dispatch",
    badge: "MARKET TERMINAL 04",
    kanji: "流通", // Distribution & Market Flow
    metrics: [
      { label: "DAILY DISPATCH", value: "84 Crates" },
      { label: "MANDI PRICE", value: "₹42/kg optimal" },
      { label: "e-NWR LOANS", value: "7.0% APR" },
    ],
    colors: {
      primary: "#f59e0b",      // Harvest saffron amber
      secondary: "#c2410c",    // APMC brick terracotta
      dark: "#1c120c",         // Roasted grain
      accent: "#fbbf24",       // Sunlight gold
      rgbaStroke: "rgba(245, 158, 11, 0.95)",
      rgbaAccent: "rgba(194, 65, 12, 0.9)",
    },
    voiceBriefing: "Zone 4: Reefer dispatch terminal and wholesale Mandi hub ready. Daily market clearing at optimal commodity pricing.",
  },
};

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  decay: number;
}

interface BrushStroke {
  points: { x: number; y: number; width: number }[];
  color: string;
  progress: number;
  speed: number;
  bristles: number;
  splattersGenerated: boolean;
}

export class CutsceneEngine {
  private overlay: HTMLElement;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private animId: number | null = null;
  private audioCtx: AudioContext | null = null;
  private isPlaying = false;
  private onCompleteCallback: (() => void) | null = null;
  private startTime = 0;
  private activeZone: CutsceneZoneConfig | null = null;

  public getActiveZone(): CutsceneZoneConfig | null {
    return this.activeZone;
  }

  private strokes: BrushStroke[] = [];
  private particles: Particle[] = [];

  constructor() {
    this.overlay = document.createElement("div");
    this.overlay.id = "cutscene-overlay";
    this.overlay.className = "cutscene-overlay";
    this.overlay.style.display = "none";

    this.canvas = document.createElement("canvas");
    this.canvas.className = "cutscene-canvas";
    this.ctx = this.canvas.getContext("2d", { alpha: true })!;

    this.overlay.appendChild(this.canvas);
    document.body.appendChild(this.overlay);

    window.addEventListener("resize", () => this.resizeCanvas());
    this.resizeCanvas();

    // Keyboard shortcut to skip: Space or Escape
    window.addEventListener("keydown", (e) => {
      if (this.isPlaying && (e.code === "Space" || e.code === "Escape")) {
        e.preventDefault();
        this.skip();
      }
    });

    // Tap or click overlay to skip
    this.overlay.addEventListener("click", (e) => {
      const target = e.target as HTMLElement;
      if (target.id === "btn-skip-cutscene" || target.closest("#btn-skip-cutscene")) {
        this.skip();
      } else if (this.isPlaying) {
        this.skip();
      }
    });
  }

  private resizeCanvas(): void {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = window.innerWidth * dpr;
    this.canvas.height = window.innerHeight * dpr;
    this.canvas.style.width = `${window.innerWidth}px`;
    this.canvas.style.height = `${window.innerHeight}px`;
    this.ctx.scale(dpr, dpr);
  }

  /** Synthesize a cinematic whoosh + martial taiko impact using Web Audio API */
  private playSoundEffects(): void {
    try {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!this.audioCtx) {
        this.audioCtx = new AudioContextClass();
      }
      if (this.audioCtx.state === "suspended") {
        this.audioCtx.resume().catch(() => {});
      }

      const now = this.audioCtx.currentTime;

      // 1. Blade / Brush Whoosh (Filtered noise sweep)
      const bufferSize = this.audioCtx.sampleRate * 0.45;
      const noiseBuffer = this.audioCtx.createBuffer(1, bufferSize, this.audioCtx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }

      const whiteNoise = this.audioCtx.createBufferSource();
      whiteNoise.buffer = noiseBuffer;

      const filter = this.audioCtx.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.setValueAtTime(1400, now);
      filter.frequency.exponentialRampToValueAtTime(220, now + 0.4);
      filter.Q.setValueAtTime(3.5, now);

      const noiseGain = this.audioCtx.createGain();
      noiseGain.gain.setValueAtTime(0.01, now);
      noiseGain.gain.linearRampToValueAtTime(0.35, now + 0.08);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

      whiteNoise.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(this.audioCtx.destination);
      whiteNoise.start(now);

      // 2. Cinematic Deep Taiko Impact Boom
      const osc = this.audioCtx.createOscillator();
      const oscGain = this.audioCtx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(130, now + 0.12);
      osc.frequency.exponentialRampToValueAtTime(34, now + 0.65);

      oscGain.gain.setValueAtTime(0.01, now + 0.12);
      oscGain.gain.linearRampToValueAtTime(0.42, now + 0.15);
      oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.7);

      osc.connect(oscGain);
      oscGain.connect(this.audioCtx.destination);
      osc.start(now + 0.12);
      osc.stop(now + 0.72);
    } catch {
      // Audio autoplay policy or device without audio
    }
  }

  /** Speak brief tactical voice narration */
  private speakBriefing(text: string): void {
    if (!("speechSynthesis" in window)) return;
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.08;
      utterance.pitch = 0.95;
      utterance.volume = 0.75;
      window.speechSynthesis.speak(utterance);
    } catch {
      // Speech synthesis blocked
    }
  }

  /**
   * Plays the full gaming cutscene intro for a given factory environment zone.
   * @param sceneKey The target zone identifier
   * @param onComplete Callback invoked when the cutscene reveals the 3D scene
   */
  public playSceneIntro(sceneKey: SceneKey, onComplete?: () => void): void {
    const config = CUTSCENE_ZONES[sceneKey] || CUTSCENE_ZONES.farmReceiving;
    this.activeZone = config;
    this.onCompleteCallback = onComplete || null;

    this.isPlaying = true;
    this.startTime = performance.now();
    this.resizeCanvas();
    this.overlay.style.display = "block";
    this.overlay.classList.remove("dissolve-out");

    this.initStrokesAndParticles(config);
    this.renderDomOverlay(config);
    this.playSoundEffects();
    this.speakBriefing(config.voiceBriefing);

    if (this.animId) cancelAnimationFrame(this.animId);
    this.tick();
  }

  private initStrokesAndParticles(config: CutsceneZoneConfig): void {
    const w = window.innerWidth;
    const h = window.innerHeight;

    this.strokes = [];
    this.particles = [];

    // Stroke 1: High-energy diagonal primary paint slash from top-left to center-right
    this.strokes.push({
      points: [
        { x: -50, y: h * 0.18, width: 28 },
        { x: w * 0.32, y: h * 0.36, width: 85 },
        { x: w * 0.65, y: h * 0.54, width: 75 },
        { x: w + 60, y: h * 0.72, width: 40 },
      ],
      color: config.colors.rgbaStroke,
      progress: 0,
      speed: 1.8,
      bristles: 18,
      splattersGenerated: false,
    });

    // Stroke 2: Secondary golden/accent counter-slash across the middle
    this.strokes.push({
      points: [
        { x: w + 40, y: h * 0.38, width: 22 },
        { x: w * 0.68, y: h * 0.44, width: 62 },
        { x: w * 0.28, y: h * 0.48, width: 50 },
        { x: -40, y: h * 0.58, width: 25 },
      ],
      color: config.colors.rgbaAccent,
      progress: -0.15,
      speed: 1.9,
      bristles: 14,
      splattersGenerated: false,
    });

    // Stroke 3: Broad dramatic ink wash banner framing the title text
    this.strokes.push({
      points: [
        { x: -30, y: h * 0.52, width: 15 },
        { x: w * 0.22, y: h * 0.5, width: 110 },
        { x: w * 0.78, y: h * 0.5, width: 110 },
        { x: w + 30, y: h * 0.52, width: 15 },
      ],
      color: "rgba(19, 14, 10, 0.88)",
      progress: -0.28,
      speed: 2.2,
      bristles: 10,
      splattersGenerated: false,
    });
  }

  private createSplatterBurst(x: number, y: number, color: string, count = 28): void {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 9 + 2;
      this.particles.push({
        x: x + (Math.random() - 0.5) * 35,
        y: y + (Math.random() - 0.5) * 35,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: Math.random() * 5.5 + 1.5,
        color,
        alpha: Math.random() * 0.75 + 0.25,
        decay: Math.random() * 0.018 + 0.012,
      });
    }
  }

  private renderDomOverlay(config: CutsceneZoneConfig): void {
    const oldUi = this.overlay.querySelector(".cutscene-ui-container");
    if (oldUi) oldUi.remove();

    const container = document.createElement("div");
    container.className = "cutscene-ui-container";
    container.innerHTML = `
      <!-- 21:9 Letterbox Bars -->
      <div class="letterbox-bar letterbox-top"></div>
      <div class="letterbox-bar letterbox-bottom"></div>

      <!-- Skip Button -->
      <div class="cutscene-controls">
        <button id="btn-skip-cutscene" class="cutscene-skip-pill" title="Skip to 3D Environment">
          <span>Skip Cutscene</span>
          <span class="skip-key">SPACE ⏭</span>
        </button>
      </div>

      <!-- Giant Kanji Watermark -->
      <div class="cutscene-watermark" style="color: ${config.colors.secondary}">
        ${config.kanji}
      </div>

      <!-- Central Mission Title Card -->
      <div class="cutscene-card">
        <div class="cutscene-badge" style="border-color: ${config.colors.primary}; color: ${config.colors.primary};">
          <span class="badge-dot" style="background: ${config.colors.primary};"></span>
          <span>${config.badge}</span>
          <span class="badge-sep">/</span>
          <span>${config.zoneNumber}</span>
        </div>

        <h1 class="cutscene-title">${config.title}</h1>
        <div class="cutscene-slash-line" style="background: linear-gradient(90deg, ${config.colors.primary}, ${config.colors.secondary});"></div>
        <p class="cutscene-sub">${config.subtitle}</p>

        <div class="cutscene-objective-strip">
          <span class="obj-label">MISSION DIRECTIVE:</span>
          <span class="obj-text">${config.objective}</span>
        </div>

        <!-- Telemetry Data Chips -->
        <div class="cutscene-metrics-row">
          ${config.metrics
            .map(
              (m) => `
            <div class="cutscene-metric-chip">
              <span class="cm-label">${m.label}</span>
              <span class="cm-val" style="color: ${config.colors.secondary};">${m.value}</span>
            </div>
          `
            )
            .join("")}
        </div>
      </div>
    `;

    this.overlay.appendChild(container);
  }

  private tick = (): void => {
    if (!this.isPlaying) return;

    const elapsed = (performance.now() - this.startTime) / 1000;
    const w = window.innerWidth;
    const h = window.innerHeight;

    this.ctx.clearRect(0, 0, w, h);

    // 1. Advance and render Calligraphy Brush Strokes
    for (const stroke of this.strokes) {
      if (stroke.progress < 1.0) {
        stroke.progress += 0.016 * stroke.speed;
      }
      if (stroke.progress > 0) {
        this.drawBrushRibbon(stroke);
        if (stroke.progress > 0.45 && !stroke.splattersGenerated) {
          stroke.splattersGenerated = true;
          const mid = stroke.points[Math.floor(stroke.points.length / 2)];
          this.createSplatterBurst(mid.x, mid.y, stroke.color, 36);
        }
      }
    }

    // 2. Advance and render Particle Ink Droplets
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vx *= 0.94;
      p.vy *= 0.94;
      p.alpha -= p.decay;

      if (p.alpha <= 0) {
        this.particles.splice(i, 1);
        continue;
      }

      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      this.ctx.fillStyle = p.color.replace(/[\d\.]+\)$/, `${p.alpha})`);
      this.ctx.fill();
    }

    // Auto finish after 2.6s
    if (elapsed >= 2.6) {
      this.finish();
      return;
    }

    this.animId = requestAnimationFrame(this.tick);
  };

  private drawBrushRibbon(stroke: BrushStroke): void {
    const pts = stroke.points;
    const t = Math.max(0, Math.min(1, stroke.progress));
    if (t <= 0) return;

    const strands = stroke.bristles;
    for (let b = 0; b < strands; b++) {
      const offsetRatio = (b / (strands - 1) - 0.5) * 2;
      const strandAlpha = 0.45 + Math.random() * 0.4;

      this.ctx.beginPath();
      for (let i = 0; i < pts.length; i++) {
        const pt = pts[i];
        const segT = i / (pts.length - 1);
        if (segT > t) break;

        const jitter = (Math.random() - 0.5) * 3;
        const currentW = pt.width * (0.4 + 0.6 * Math.sin(segT * Math.PI));
        const offsetX = offsetRatio * (currentW * 0.45) + jitter;
        const offsetY = jitter;

        const px = pt.x + offsetX;
        const py = pt.y + offsetY;

        if (i === 0) {
          this.ctx.moveTo(px, py);
        } else {
          const prev = pts[i - 1];
          const cpx = (prev.x + pt.x) / 2 + offsetX;
          const cpy = (prev.y + pt.y) / 2 + offsetY;
          this.ctx.quadraticCurveTo(cpx, cpy, px, py);
        }
      }

      this.ctx.strokeStyle = stroke.color.replace(/[\d\.]+\)$/, `${strandAlpha})`);
      this.ctx.lineWidth = Math.max(1.8, (stroke.points[1]?.width || 30) * 0.09);
      this.ctx.lineCap = "round";
      this.ctx.lineJoin = "round";
      this.ctx.stroke();
    }
  }

  public skip(): void {
    if (!this.isPlaying) return;
    this.finish();
  }

  private finish(): void {
    this.isPlaying = false;
    if (this.animId) {
      cancelAnimationFrame(this.animId);
      this.animId = null;
    }

    this.overlay.classList.add("dissolve-out");

    setTimeout(() => {
      this.overlay.style.display = "none";
      this.overlay.classList.remove("dissolve-out");
      if (this.onCompleteCallback) {
        this.onCompleteCallback();
        this.onCompleteCallback = null;
      }
    }, 400);
  }
}
