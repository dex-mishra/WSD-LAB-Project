# Design decision record

## Selected stack

- **Three.js + TypeScript + Vite + WebXR** (the default path in `AGENT.md`).
  Fastest route to both a browser demo and a headset-compatible prototype from
  one codebase. No existing Blender/Unity/Unreal project was present in the
  repository, so no engine migration was warranted.

## Target

- **Primary:** desktop/browser demonstration (no headset required).
- **Secondary:** immersive WebXR on a `local-floor`-capable headset. Reference
  space is requested as `local-floor` with the runtime's internal fallback.
- If the actual headset is unknown, quality and pixel-ratio settings are kept
  conservative and configurable rather than tuned to one device.

## Unit scale

- Real-world **metres**. The camera sits at 1.6 m standing eye height. Buildings,
  crates (~0.5–0.6 m), machines, and vehicles use believable metre dimensions.

## Locomotion

- Room-scale standing. Desktop fallback uses comfortable smooth locomotion
  (~3.2 m/s, opt-in sprint). No forced camera movement, head bob, or auto
  rotation. A reset/recenter action is always available.
- Teleport-arc locomotion in immersive VR is a planned enhancement; controller
  ray selection is implemented first per the brief's ordering.

## Architecture

- The **simulation is the single source of truth** (`src/simulation`). It has no
  Three.js dependency. Scenes and UI *subscribe* to scenario snapshots; a crate
  mesh may *display* `quantitySpoiled` but never *owns* it.
- `App` owns the renderer, camera rig, lights, XR, and the single
  `setAnimationLoop` render loop (so the XR session controls frame timing; no
  second `requestAnimationFrame` during XR).
- Each environment is a `SceneModule` subclass that builds geometry once and
  reflects snapshots in `onSnapshot`.

## First milestone

A stable, navigable digital twin with all four environments, controller/pointer
interaction, the non-XR fallback, the state-driven scenario engine, and the
before/after dashboard. Art is greybox primitives; GLB assets are a later,
non-blocking replacement step.

## Interaction & comfort

- Subtle yellow target ray; a single yellow focus ring marks the current object.
- World-space panels (never flat HUD glued to the camera in VR).
- One decision at a time: observe -> choose intervention (scenario) -> run ->
  compare. Colour is always paired with words/icons (never red-vs-green alone).
- Every metric shows its unit and the current scenario's source status.

## Scenario model

Deliberately simple and inspectable. Teaching metric:
`usable yield = good units dispatched / units received`. Illustrative recovery:
`recovered quantity = batch size × (baseline loss rate − target loss rate)`.
All scenario defaults live in `src/data/scenarios.json` with `status: PROPOSED`.
