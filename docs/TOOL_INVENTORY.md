# Tool inventory

Recorded per `AGENT.md` step 1: inspect the repository and installed tools; do
not assume specialised connectors exist.

## Available in this build

- **Node.js + npm** — package management and scripts.
- **Vite** — dev server and production bundler.
- **TypeScript** — type checking (`tsc --noEmit`).
- **Three.js** — rendering, scene graph, WebXR (`renderer.xr`), `VRButton`.

## Not available / not assumed

- No Blender MCP or Blender automation connector was detected. 3D assets are
  therefore authored as Three.js primitives in code. If a Blender pipeline is
  added later, keep source `.blend` files in `assets/blender/` and export runtime
  `.glb` to `public/assets/models/` per the brief.
- No asset-marketplace connector, image-search connector, or code-generation
  plugin was detected or used.
- No headset was available in this environment, so on-device frame time and
  draw-call counts have not been measured (see `docs/PERFORMANCE.md`).

## How to extend

- Add GLB assets under `public/assets/models/` and load them with
  `GLTFLoader`, replacing the most visible greybox objects first.
- Add Draco/Meshopt and KTX2/Basis to the loader pipeline once assets exist and
  load cost is measured on the target device.
