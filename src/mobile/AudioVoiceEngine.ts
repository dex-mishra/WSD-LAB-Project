/**
 * AudioVoiceEngine: Handles Text-to-Speech (TTS) vocal narration
 * using the browser's native Web Speech Synthesis API.
 * Provides real-time vocal feedback for employee questions, SOPs,
 * sensor alarms, and AI explanations.
 */

export interface VoicePlaybackState {
  isPlaying: boolean;
  isPaused: boolean;
  currentText: string;
  rate: number;
  pitch: number;
  voiceName: string;
}

export type VoiceStateListener = (state: VoicePlaybackState) => void;
export type TranscriptListener = (text: string, isFinal: boolean) => void;

// Minimal typing for the Web Speech Recognition API (Chrome/Edge; graceful fallback elsewhere).
interface SpeechRecognitionLike {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((e: any) => void) | null;
  onerror: ((e: any) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

export class AudioVoiceEngine {
  private synth: SpeechSynthesis | null = null;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private voices: SpeechSynthesisVoice[] = [];
  private selectedVoice: SpeechSynthesisVoice | null = null;
  private listeners: Set<VoiceStateListener> = new Set();

  private state: VoicePlaybackState = {
    isPlaying: false,
    isPaused: false,
    currentText: "",
    rate: 1.0,
    pitch: 1.0,
    voiceName: "Default",
  };

  constructor() {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      this.synth = window.speechSynthesis;
      this.loadVoices();
      if (this.synth.onvoiceschanged !== undefined) {
        this.synth.onvoiceschanged = () => this.loadVoices();
      }
    }
  }

  private loadVoices(): void {
    if (!this.synth) return;
    this.voices = this.synth.getVoices();
    // Prefer Indian English or standard English voices
    const preferred =
      this.voices.find((v) => v.lang.startsWith("en-IN")) ||
      this.voices.find((v) => v.lang.startsWith("en-GB")) ||
      this.voices.find((v) => v.lang.startsWith("en-US")) ||
      this.voices[0];
    if (preferred) {
      this.selectedVoice = preferred;
      this.state.voiceName = preferred.name;
    }
  }

  public getAvailableVoices(): { name: string; lang: string }[] {
    return this.voices.map((v) => ({ name: v.name, lang: v.lang }));
  }

  public setVoice(name: string): void {
    const v = this.voices.find((x) => x.name === name);
    if (v) {
      this.selectedVoice = v;
      this.state.voiceName = v.name;
      this.notifyListeners();
    }
  }

  public setRate(rate: number): void {
    this.state.rate = Math.max(0.5, Math.min(2.0, rate));
    this.notifyListeners();
  }

  public getCurrentUtterance(): SpeechSynthesisUtterance | null {
    return this.currentUtterance;
  }

  public isSupported(): boolean {
    return this.synth !== null;
  }

  public getState(): VoicePlaybackState {
    return { ...this.state };
  }

  public subscribe(listener: VoiceStateListener): () => void {
    this.listeners.add(listener);
    listener(this.getState());
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    const s = this.getState();
    for (const l of this.listeners) {
      l(s);
    }
  }

  /**
   * Cleans text for pleasant vocal delivery (removes markdown symbols, URLs, etc.)
   */
  private cleanTextForSpeech(text: string): string {
    return text
      .replace(/[*_#`~[\]()]/g, " ")
      .replace(/₹\s*/g, " Rupees ")
      .replace(/°C/g, " degrees Celsius ")
      .replace(/°Brix/g, " degrees Brix ")
      .replace(/%/g, " percent ")
      .replace(/\s+/g, " ")
      .trim();
  }

  public speak(text: string, onEndCallback?: () => void): void {
    if (!this.synth) {
      console.warn("[AudioVoiceEngine] Speech synthesis not supported in this browser.");
      onEndCallback?.();
      return;
    }

    // Cancel any active utterance
    this.synth.cancel();

    const readableText = this.cleanTextForSpeech(text);
    const utterance = new SpeechSynthesisUtterance(readableText);

    if (this.selectedVoice) {
      utterance.voice = this.selectedVoice;
    }
    utterance.rate = this.state.rate;
    utterance.pitch = this.state.pitch;

    utterance.onstart = () => {
      this.state.isPlaying = true;
      this.state.isPaused = false;
      this.state.currentText = text;
      this.notifyListeners();
    };

    utterance.onpause = () => {
      this.state.isPaused = true;
      this.notifyListeners();
    };

    utterance.onresume = () => {
      this.state.isPaused = false;
      this.notifyListeners();
    };

    utterance.onend = () => {
      this.state.isPlaying = false;
      this.state.isPaused = false;
      this.state.currentText = "";
      this.currentUtterance = null;
      this.notifyListeners();
      onEndCallback?.();
    };

    utterance.onerror = (e) => {
      console.error("[AudioVoiceEngine] Speech error:", e);
      this.state.isPlaying = false;
      this.state.isPaused = false;
      this.state.currentText = "";
      this.currentUtterance = null;
      this.notifyListeners();
      onEndCallback?.();
    };

    this.currentUtterance = utterance;
    this.synth.speak(utterance);
  }

  public pause(): void {
    if (this.synth && this.state.isPlaying && !this.state.isPaused) {
      this.synth.pause();
      this.state.isPaused = true;
      this.notifyListeners();
    }
  }

  public resume(): void {
    if (this.synth && this.state.isPlaying && this.state.isPaused) {
      this.synth.resume();
      this.state.isPaused = false;
      this.notifyListeners();
    }
  }

  public stop(): void {
    if (this.synth) {
      this.synth.cancel();
      this.state.isPlaying = false;
      this.state.isPaused = false;
      this.state.currentText = "";
      this.currentUtterance = null;
      this.notifyListeners();
    }
  }

  public togglePlay(text: string): void {
    if (this.state.isPlaying) {
      if (this.state.isPaused) {
        this.resume();
      } else {
        this.pause();
      }
    } else {
      this.speak(text);
    }
  }

  // ---------- Speech-to-text (voice query input) ----------

  private recognizer: SpeechRecognitionLike | null = null;
  private listening = false;
  private listenListeners = new Set<(listening: boolean) => void>();

  public isListenSupported(): boolean {
    if (typeof window === "undefined") return false;
    const w = window as any;
    return !!(w.SpeechRecognition || w.webkitSpeechRecognition);
  }

  public isListening(): boolean {
    return this.listening;
  }

  public subscribeListening(fn: (listening: boolean) => void): () => void {
    this.listenListeners.add(fn);
    fn(this.listening);
    return () => this.listenListeners.delete(fn);
  }

  private setListening(v: boolean): void {
    this.listening = v;
    for (const fn of this.listenListeners) fn(v);
  }

  /**
   * Starts one voice-capture session. Interim transcripts stream via onTranscript;
   * the final transcript fires onFinal. Auto-stops on end/error. No backend —
   * the transcript is handed straight to the on-device AiAssistant.
   */
  public startListening(onTranscript: TranscriptListener, onFinal: (text: string) => void): void {
    const w = window as any;
    const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!Ctor) {
      onFinal("");
      return;
    }
    try {
      this.stopListening();
      const rec: SpeechRecognitionLike = new Ctor();
      rec.lang = "en-IN";
      rec.interimResults = true;
      rec.maxAlternatives = 1;
      this.recognizer = rec;
      this.setListening(true);
      rec.onresult = (e: any) => {
        let interim = "";
        let finalText = "";
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const r = e.results[i];
          if (r.isFinal) finalText += r[0].transcript;
          else interim += r[0].transcript;
        }
        if (finalText) {
          onTranscript(finalText, true);
          onFinal(finalText.trim());
        } else if (interim) {
          onTranscript(interim, false);
        }
      };
      rec.onerror = () => {
        this.setListening(false);
        this.recognizer = null;
      };
      rec.onend = () => {
        this.setListening(false);
        this.recognizer = null;
      };
      rec.start();
    } catch {
      this.setListening(false);
      onFinal("");
    }
  }

  public stopListening(): void {
    try {
      this.recognizer?.stop();
    } catch {
      /* noop */
    }
    this.recognizer = null;
    if (this.listening) this.setListening(false);
  }
}
