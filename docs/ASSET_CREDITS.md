# Asset credits and licences

## Summary

All 3D geometry in this prototype is **self-modelled at runtime** using Three.js
primitive geometries (boxes, planes, cylinders, rings, instanced meshes). No
third-party 3D models, textures, or images are bundled or downloaded.

- **Text labels, signage, floor decals, dashboards:** generated at runtime as
  HTML `<canvas>` textures (`src/app/builders.ts`). No external fonts beyond the
  system UI font stack.
- **Colours / palette:** the project palette defined in `AGENT.md`
  (`src/app/palette.ts`).

## Third-party runtime dependencies

- **three** (MIT License) — rendering, scene graph, WebXR, `VRButton` helper.
- **vite**, **typescript**, **@types/three** — dev tooling (MIT / Apache-2.0).

## If external references are used later

Per `AGENT.md`, when researching real layouts, machinery, cold rooms, or
packaging lines via image search, video, or asset libraries:

- Record the source URL and licence status in this file.
- Do not download or embed copyrighted imagery or models without permission.
- Prefer self-modelled geometry, CC0 assets, official open assets, or assets the
  team has a clear licence to use.
- Never present an AI-generated image as a real factory photograph or as
  measured evidence.

| Asset | Source URL | Licence | Notes |
| ----- | ---------- | ------- | ----- |
| _(none yet — all geometry is self-modelled)_ | — | — | — |
