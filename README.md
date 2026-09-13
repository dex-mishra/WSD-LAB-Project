# Small-Scale Food Manufacturing VR Digital Twin

An interactive 3D / WebXR digital twin of a small-scale food manufacturing and
packaging operation in India. It shows the complete farm-to-consumer flow,
makes inventory and cold-chain failures visible, and lets a user test
affordable interventions and compare a baseline versus an improved state.

Built with **Three.js + TypeScript + Vite + WebXR** per the execution brief in
`AGENT.md`.

## What it does

- Four navigable environments: Farm & Receiving, Processing & Packaging,
  Inventory & Cold Chain (the focus area), and Dispatch & Market.
- A data-driven scenario engine with four scenarios that update the same shared
  state variables: **Baseline**, **Demand Increase**, **Cold-Capacity Decrease**,
  and **Improved State**.
- A live dashboard (both in-world and as a desktop HUD) showing metrics with
  units, scenario name, source status, usable yield, and loss avoided vs
  baseline.
- Runs in a normal browser (desktop fallback with WASD + drag-look) and in an
  immersive headset via WebXR when available.

## Requirements

- Node.js 18+ and npm.
- A modern browser. WebXR + immersive VR requires a **secure context**
  (HTTPS or `localhost`).

## Getting started

```bash
npm install
npm run dev
```

Open the printed `http://localhost:5173` URL. `localhost` is a secure context,
so the **Enter VR** button appears automatically when a headset is connected.

For LAN / headset testing over an IP address, serve over HTTPS (Vite is started
with `--host`; add TLS certs to `server.https` in `vite.config.ts`).

### Build

```bash
npm run build      # tsc --noEmit type-check + vite production build
npm run preview    # preview the production bundle
```

## Controls

**Desktop**

- Drag with the left mouse button to look.
- `W A S D` or arrow keys to move; hold `Shift` to move faster.
- Click an object to inspect it (info panel with source status).
- Use the top scene chips to switch environments.
- Use the bottom scenario buttons to run scenarios and compare.
- "Reset position" recenters you; "Reset scenario" returns to Baseline.

**VR**

- Click **Enter VR** (bottom of the screen) on a supported headset.
- Point the controller ray at objects; the trigger selects.
- The yellow ring marks the current focus object.

## Project structure

```text
src/
  app/          renderer, camera rig, XR, lights, desktop controls, builders
  scenes/       the four environment modules
  simulation/   scenario engine + domain types (source of truth, no Three.js)
  interaction/  raycast selection, focus ring, interactable metadata
  ui/           in-world dashboard/info panel + DOM HUD + styles
  data/         scenarios.json (all values PROPOSED until calibrated)
docs/           DESIGN, PERFORMANCE, DATA_STATUS, ASSET_CREDITS, TOOL_INVENTORY
```

## Evidence discipline

Every value in this prototype is labelled **SOURCE**, **INFERENCE**, or
**PROPOSED**. All demo numbers (loss rates, prices, temperatures, shelf life)
are **PROPOSED** placeholders and must be calibrated with real local data
before being presented as evidence. See `docs/DATA_STATUS.md`.

## License / assets

All 3D geometry is self-modelled with Three.js primitives (no third-party
assets bundled). See `docs/ASSET_CREDITS.md`.
