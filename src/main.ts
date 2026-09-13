import { App } from "./app/App";

/**
 * Entry point. Detects WebXR support for the boot overlay message, wires the
 * "Enter Digital Twin" button, then starts the render loop. The app is fully
 * usable in a normal browser without WebXR (desktop fallback controls).
 */

const overlay = document.getElementById("boot-overlay")!;
const startBtn = document.getElementById("btn-start") as HTMLButtonElement;
const xrStatus = document.getElementById("xr-status")!;

async function detectXR(): Promise<void> {
  const nav = navigator as Navigator & {
    xr?: { isSessionSupported(mode: string): Promise<boolean> };
  };
  if (!nav.xr) {
    xrStatus.textContent = "VR not detected — running in desktop mode.";
    xrStatus.classList.add("no");
    return;
  }
  try {
    const ok = await nav.xr.isSessionSupported("immersive-vr");
    if (ok) {
      xrStatus.textContent = "VR headset supported — an Enter VR button is available.";
      xrStatus.classList.add("ok");
    } else {
      xrStatus.textContent = "No immersive VR — desktop mode ready.";
      xrStatus.classList.add("no");
    }
  } catch {
    xrStatus.textContent = "VR check unavailable — desktop mode ready.";
    xrStatus.classList.add("no");
  }
}

let app: App | null = null;

function boot(): void {
  const container = document.getElementById("app")!;
  app = new App(container);
  (window as any).__APP__ = app;
  app.start();
  overlay.classList.add("hidden");
}

startBtn.addEventListener("click", boot);
void detectXR();

// Surface uncaught errors instead of failing silently.
window.addEventListener("error", (e) => {
  console.error("[digital-twin] runtime error:", e.error ?? e.message);
});
