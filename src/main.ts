import { App } from "./app/App";
import { MobileApp } from "./mobile/MobileApp";

/**
 * Main application entry point.
 * Provides dual-mode execution:
 * 1. Mobile Operations & Twin Companion App UI (Role-based access, machine telemetry, process tests, AI audio)
 * 2. Interactive 3D / WebXR Digital Twin (Three.js 4-environment factory model)
 */

const overlay = document.getElementById("boot-overlay")!;
const startVrBtn = document.getElementById("btn-start") as HTMLButtonElement | null;
const startMobileBtn = document.getElementById("btn-start-mobile") as HTMLButtonElement | null;
const xrStatus = document.getElementById("xr-status")!;
const mobileRoot = document.getElementById("mobile-root")!;
const appContainer = document.getElementById("app")!;

let app: App | null = null;
let mobileApp: MobileApp | null = null;

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

function launchMobileApp(): void {
  mobileRoot.style.display = "block";
  if (!mobileApp) {
    mobileApp = new MobileApp({
      container: mobileRoot,
      onOpenVRDigitalTwin: () => launch3dTwin(),
    });
    (window as any).__MOBILE_APP__ = mobileApp;
  }
  overlay.classList.add("hidden");
}

function launch3dTwin(): void {
  mobileRoot.style.display = "none";
  if (!app) {
    app = new App(appContainer, () => launchMobileApp());
    (window as any).__APP__ = app;
    app.start();
  }
  overlay.classList.add("hidden");
}

startMobileBtn?.addEventListener("click", launchMobileApp);
startVrBtn?.addEventListener("click", launch3dTwin);

// Support direct link parameters (?mode=mobile or #mobile) to open companion app immediately
const params = new URLSearchParams(window.location.search);
if (params.get("mode") === "mobile" || window.location.hash === "#mobile") {
  launchMobileApp();
} else if (params.get("mode") === "vr" || window.location.hash === "#vr") {
  launch3dTwin();
}

void detectXR();

// Surface uncaught errors instead of failing silently.
window.addEventListener("error", (e) => {
  console.error("[manufacturing-suite] runtime error:", e.error ?? e.message);
});
