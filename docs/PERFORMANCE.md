# Performance notes

## Frame timing

- The render loop uses `renderer.setAnimationLoop()` so the XR session controls
  timing when immersive. There is **no** second `requestAnimationFrame` loop.
- Target the headset refresh, not a high desktop FPS. Reference budgets:
  - 72 Hz ≈ 13.9 ms/frame
  - 90 Hz ≈ 11.1 ms/frame
  - 120 Hz ≈ 8.3 ms/frame
- Measure real frame time on the actual device; the values above are targets,
  not guarantees.

## Pixel ratio / resolution

- Desktop pixel ratio is clamped: `min(devicePixelRatio, 1.5)`.
- No fixed "VR resolution" is promised — the headset, browser, and XR layer
  determine the real framebuffer. No manual vsync; the XR runtime synchronises.

## Geometry & draw calls

- Repeated crates and crop rows use `InstancedMesh` with `DynamicDrawUsage`
  (per-instance colour for stock states) to keep draw calls low.
- A single shared `BoxGeometry` backs the `box()` builder (scaled per instance).
- Shadows: one directional key light casts shadows (2048² map, tight ortho
  frustum). Hemisphere + low ambient fill the rest. No many-light dynamic
  shadowing.
- Labels/decals are canvas textures on thin planes with `depthWrite: false`,
  reused and disposed on update to avoid leaks.

## Quality tiers (planned configuration)

The renderer is set up for a conservative default. Intended tiers:

- `low`: reduced shadow map, lower texture sizes, no post-processing.
- `medium`: baked AO/lightmaps where added, selective shadows, standard PBR.
- `high`: higher texture sizes, hero shadows, optional bloom/colour grading if
  it stays comfortable.

Expose tiers in a developer panel, not a user-facing menu during the first demo.

## Known measurement gaps

- Draw-call and memory counts per tier, and on-device frame time, still need to
  be captured with `renderer.info` and the headset's profiler. Not yet measured
  in this milestone.

## GC discipline in the loop

- Interaction reuses a `Raycaster`, `Matrix4`, and vectors rather than
  allocating per frame. Scene per-frame updates mutate existing objects.
