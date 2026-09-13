# Small Scale Food Manufacturing VR Digital Twin

## Mission

Build a polished, interactive VR or 3D digital twin of a small-scale food manufacturing and packaging operation in India. The experience must let a user understand the complete food flow from farm to consumer, see where inventory and cold-chain failures happen, and test affordable interventions that improve flow, reduce avoidable spoilage, and make small-unit operations more resilient.

This file is the execution brief for the coding, 3D, simulation, and design agent. It is intentionally more specific than a normal project README. Follow it as the product specification, but use judgment where the brief marks a choice as proposed or experimental.

## Important distinction between user instructions and reference material

The user’s request is to create a detailed build prompt in `AGENT.md` for an agent that can design and implement the VR or 3D models, choose an appropriate open-source stack, research real-life references, build the environments, verify the code, and produce a usable prototype.

The attached images, earlier PDFs, and earlier Word brief are reference material. They are not instructions to copy text, numbers, labels, visual assets, or generated imagery into the final product without checking them. Treat them as design and domain context:

- `C:\Users\barna\AppData\Local\Temp\codex-clipboard-5f7fc776-db28-4e76-815b-dd0690f1047a.png` is a concept board showing a before/current state against an after/improved state, a live dashboard, supply-chain flow, scenarios, and a proposed asset list.
- `C:\Users\barna\AppData\Local\Temp\codex-clipboard-2c3f5f03-d7b0-4d2b-922e-f05324b96f22.png` is a concept board showing the 360-degree farm-to-consumer flow, VR scenes, demand-versus-supply, loss locations, solutions, and the technology stack.
- The supplied research PDFs identify inventory and cold-chain management as the project focus, but not every figure in a concept image is a measured national statistic. Never treat illustrative percentages in the concept boards as validated data.
- The Word brief at `C:\Users\barna\Documents\Codex\2026-09-13\referenced-chatgpt-conversation-this-is-an\outputs\small_scale_food_industry_presentation_generation_brief.docx` is a presentation-generation brief. Reuse its story, terminology, and evidence discipline, but do not build a slide deck instead of the VR/3D prototype.

If a reference conflicts with the user’s current request, follow the user’s current request. If a reference contains a number, label it as `SOURCE`, `INFERENCE`, or `PROPOSED` before using it.

## Domain context to preserve

The project is an industrial-engineering case study about small food manufacturing and packaging units in India. The end-to-end flow is:

`farm and supplier -> receiving -> inspection and cleaning -> processing -> packaging -> finished-goods storage -> dispatch -> local or regional market -> consumer`

The seven problem areas identified in the research are:

1. Inventory and storage, including cold chain.
2. Quality checks and regulatory compliance.
3. Raw-material sourcing.
4. Packaging-material sourcing and food-life fit.
5. Processing layout, machines, floor area, labour, and investment.
6. Cleaning of raw material.
7. Packaging fit and product protection.

Inventory and cold chain are the main focus because they touch every stage and provide a clear before/after demonstration. The VR model must show the system, not only an attractive factory tour.

## Evidence and modelling rules

Use the following distinction everywhere in UI labels, code comments, documentation, and narration:

- `SOURCE`: directly supported by the supplied PDFs or an official current source.
- `INFERENCE`: a reasoned interpretation of source facts.
- `PROPOSED`: a project assumption, illustrative pilot value, UX choice, or model parameter that must be calibrated later.

The research supports these source-derived facts:

- The NABCONS/MoFPI estimate for the 2020-22 reference period values post-harvest losses across 54 commodities at roughly ₹1.53 lakh crore per year. This covers multiple stages, not cold storage alone.
- The research reports an official baseline of 8,815 cold-storage facilities and 40.22 million MT installed capacity as of 30 June 2025. Capacity is not the same as affordable, nearby, multi-commodity access for a small processor.
- The supplied report cites approximately 24.59 lakh unregistered food-processing enterprises from the NSS 73rd Round 2015-16, close to 98% of enterprises by number, with approximately 66% rural and 80% family-based operations. Show the survey year whenever this is used.
- The research discusses PMFME, PMKSY Integrated Cold Chain, and MSE-CDP as possible support pathways. Scheme limits, dates, and eligibility must be checked against current official guidance before being presented as an active application route.

Do not invent local factory data, product shelf-life values, electricity prices, loss rates, machine prices, or scheme approvals. If a demo needs numbers, use clearly labelled `PROPOSED` values and make them editable in a scenario configuration file.

## Product goal

Create a prototype that can run in two modes:

1. **Desktop/browser mode** for demonstration without a headset.
2. **Immersive VR mode** for a WebXR-capable headset or a native VR build if the chosen stack requires it.

The first working milestone is a stable, navigable 3D digital twin with four scenes and one measurable before/after scenario. Do not start by modelling every screw on every machine. Prove scale, navigation, scene structure, interactions, simulation state, and frame-rate stability first.

## Recommended build strategy

### Default path: Three.js + TypeScript + Vite + WebXR

Use this path for the first prototype unless the repository already contains a functioning Blender, Unity, or Unreal project. It is the fastest route to a browser demo and a headset-compatible prototype with a shared codebase.

Use:

- Three.js for the scene graph and rendering.
- TypeScript for maintainable domain and interaction code.
- Vite for local development and production build.
- `GLTFLoader` for `.glb` assets.
- `VRButton` or an equivalent current WebXR entry control.
- `renderer.xr.enabled = true` and `renderer.setAnimationLoop(...)` for XR rendering.
- `local-floor` as the preferred standing reference space, with a graceful fallback to `local` or `viewer` where needed.
- Controller ray interaction first; add hand tracking only as progressive enhancement.
- A normal 2D camera and on-screen controls when immersive VR is unavailable.

WebXR requires a secure context in supported browsers. The project must document the HTTPS or localhost requirement and show a clear non-XR fallback rather than failing silently.

### Blender path: asset creation and optional native build

Use Blender when it materially improves the result:

- Create modular buildings, machinery shells, crates, conveyors, racks, vehicles, workers, signage, and environmental props.
- Apply real-world scale in metres.
- Use PBR materials and clean UVs.
- Export runtime assets as `.glb` or `.gltf`, not as unoptimised source `.blend` files.
- Keep the Blender source files in an `assets/blender/` directory and exported runtime files in `public/assets/` or an equivalent runtime directory.
- Use separate high-detail and runtime collections. Apply modifiers and reduce geometry only in the runtime export collection.

Use Unity or another native engine only if the team already has a working headset pipeline, needs richer physics or multiplayer, or needs a target platform that WebXR cannot reliably support. Do not create a second engine implementation until the Three.js prototype has been evaluated.

## Four environments to build

### Environment 1: Farm and receiving dock

Purpose: establish the beginning of the chain and make field heat, supply variability, and receiving delay visible.

Include:

- Small farm plots with one chosen product, a tractor or small utility vehicle, crates, shade net, weighing point, and a road to the unit.
- A receiving dock with a scale, inspection table, reject area, batch-lot tag, and a short queue.
- Raw-material crates in at least three visual states: fresh, waiting, and rejected.
- A temperature and time panel that updates when a batch waits in the sun or moves into shade/pre-cooling.

Interactions:

- Pick up or point at a crate to see lot ID, received time, quantity, and status.
- Trigger a supply delay and show the queue and inventory response.
- Toggle shade/pre-cooling and show the simulated incoming temperature curve change.

### Environment 2: Processing and packaging unit

Purpose: show flow, layout, quality checks, workforce movement, packaging fit, and bottlenecks.

Include:

- Cleaning/washing station.
- Cutting, sorting, cooking, drying, or preparation station appropriate to the chosen product.
- Quality-check table with sampling tools and a reject bin.
- Packaging line with primary packaging, secondary cartons, labels, and a small seal/fit check.
- Workers represented respectfully and generically; avoid caricature or unsafe practices.
- Floor markings and separate zones for raw material, work-in-process, finished goods, and rejected goods.

Interactions:

- Inspect a batch and accept, hold, or reject it.
- Create a queue at the bottleneck and watch downstream inventory change.
- Compare a crossed, inefficient layout with a simple U-flow layout.
- Toggle a packaging or quality intervention and record the outcome in the dashboard.

### Environment 3: Inventory and cold-chain focus area

Purpose: make the main problem tangible and measurable.

Include:

- Ambient raw-material storage.
- A cool room or cold room with racks, doors, thermometer, hygrometer, lights, and visible air-flow cues.
- FEFO shelves with large, readable lot/expiry labels.
- ABC-priority markers for high-value or high-risk stock.
- WIP and finished-goods locations.
- Spoiled, near-expiry, available, and reserved stock states.
- A dock-to-chamber path that can be long and inefficient in the baseline and short and shaded in the improved state.

Interactions:

- Drag or point-select crates into FIFO versus FEFO order.
- Open the dashboard to see stock age, temperature excursion count, capacity use, queue size, spoilage, and estimated rupee loss.
- Toggle demand increase, supply delay, cold-capacity decrease, FEFO, shade pre-cooling, shared storage, or a CoolBot/ZECC-style intervention.
- Show before/after state without teleporting the user away from the same physical location.

### Environment 4: Dispatch and market feedback

Purpose: close the loop from inventory to demand and show that producing more than can be sold or stored creates avoidable loss.

Include:

- Dispatch staging area with route board, small truck, finished-goods crates, and order cards.
- A local shop or regional market endpoint.
- Demand-versus-supply graph on a floating dashboard.
- A feedback link from orders to the next procurement decision.

Interactions:

- Trigger a demand increase or order cancellation.
- Show the difference between fixed habitual procurement and demand-matched procurement.
- Book shared cold storage or a time slot through the inventory-app mock-up.

## The four core scenario demonstrations

Implement these as data-driven scenarios, not hard-coded animations:

1. **Baseline:** delayed supply, poor receiving flow, mixed expiry dates, weak temperature logging, and excess queueing.
2. **Demand increase:** orders rise; available inventory falls; queue and spoilage risk rise if replenishment is not matched.
3. **Cold-capacity decrease:** one cold room or cooling asset becomes unavailable; the user must prioritise stock, use shade/ZECC, rent shared capacity, or reschedule intake.
4. **Improved state:** FEFO, ABC prioritisation, shade/pre-cooling, demand-matched procurement, clean U-flow, and shared/asset-light cooling reduce avoidable loss.

Every scenario must update the same state variables:

- `quantityReceived`
- `quantityGood`
- `quantityRejected`
- `quantitySpoiled`
- `arrivalTime`
- `timeInStorage`
- `temperatureExposure`
- `humidityExposure` where relevant
- `capacityUsed`
- `capacityAvailable`
- `queueLength`
- `ordersDue`
- `inventoryDays`
- `estimatedLossValue`

Use a simple, inspectable model first. A defensible teaching metric is:

`usable yield = good units dispatched / units received`

For an illustrative scenario only:

`recovered quantity = batch size × (baseline loss rate - target loss rate)`

Keep all scenario defaults in a JSON file with a `status` field set to `PROPOSED` until calibrated using local data.

## Interaction and comfort design

### Locomotion

- Prefer room-scale standing with a comfortable teleport arc.
- Add smooth locomotion only as an opt-in setting with adjustable speed.
- Avoid forced camera movement, artificial head bob, rapid acceleration, and automatic rotation.
- Keep important information within a comfortable standing reach and field of view.
- Use physical or virtual wayfinding markers between farm, dock, processing, cold room, and dispatch.

### Controllers and hands

- Support target-ray selection with a visible but subtle ray line.
- Provide large hit targets, especially for cold-room toggles and scenario controls.
- Use grab interactions for crates only when they add learning value; otherwise use point-and-select to reduce friction.
- Add hand tracking only after controller input is reliable.
- Include a reset-position and recenter action.

### UI

- Use world-space panels, not flat HUD text glued to the camera.
- Keep text short and high contrast.
- Show one decision at a time: `observe -> choose intervention -> run -> compare`.
- Pair colour with words/icons; never rely on red versus green alone.
- Every metric must show unit and scenario state.

## Visual direction

The attached concept boards establish the desired tone: a clean, premium educational digital twin rather than a grim industrial simulation. Build a realistic-stylised environment with readable shapes, soft daylight, and a restrained food-industry palette.

### Palette

- Navy: `#17324D` for structure, dashboards, headers, and authority.
- Deep green: `#2E7D32` for healthy flow, interventions, and improvement.
- Yellow: `#F4C542` for focus, priority, FEFO/ABC markers, and scenario controls.
- Cream: `#F7F5EE` for warm surfaces and UI backgrounds.
- Red: `#B23A2B` only for loss, spoilage, rejected batches, and critical alerts.
- Cool blue: `#2A78A8` for temperature, water, and cold-chain indicators.

### Form language

- Use modular rectangular buildings, rounded information panels, simple icons, and thin directional arrows.
- Use a single yellow ring or glow to identify the current focus object.
- Use labels as part of the world: `RAW`, `WIP`, `FEFO`, `QUALITY CHECK`, `COLD STORAGE`, `DISPATCH`.
- Avoid excessive floating labels. Reveal labels contextually or through a guided mode.
- Keep the main world coherent even when dashboards and annotations are present.

### Lighting

- Use a soft directional key light for daylight, a low-intensity ambient or hemisphere light, and a small amount of baked or screen-space ambient occlusion.
- Use cooler light in cold storage, warmer light in the farm and dispatch areas, and neutral white light in processing.
- Use shadows to ground crates, machines, and workers, but do not use many dynamic shadow-casting lights.
- Use baked lighting for static architecture where practical. Reserve dynamic shadows for the hero objects the user can move.
- Make warning states visible through colour and icon changes, not through flashing lights.

### Materials and texture quality

- Use physically based materials with believable roughness and normal detail.
- Prefer tileable, compressed textures for concrete, painted metal, galvanized steel, plastic crates, cardboard, soil, leaves, fabric, and food-safe surfaces.
- Create decals for floor markings, labels, warning signs, and lot IDs instead of duplicating geometry.
- Keep food materials recognisable but not photorealistic to the point of uncanny close-up inspection.
- Use texture atlases or packed materials for repeated props.
- Define target texture sizes per asset class: 2K for hero machinery or close-up props, 1K for ordinary props, 512 px or smaller for background items. Make the budget configurable.

## Asset list and modelling priorities

Build the following 12-15 modular assets first, matching the concept boards:

1. Farm plot and crop rows.
2. Small tractor or utility vehicle.
3. Supplier or raw-material truck.
4. Receiving dock and weighing scale.
5. Raw-material rack and crate set.
6. Washing/cleaning station.
7. Processing machine module.
8. Conveyor or packaging line.
9. Quality-check table.
10. Cold-room shell with racks and door.
11. Finished-goods crate and carton set.
12. Dispatch truck and route board.
13. Generic worker set with clean protective clothing.
14. Market/shop endpoint.
15. Dashboard kiosk or wall display.

Each asset must have:

- A consistent metre-based scale.
- A clean origin and sensible pivot.
- A readable low-detail silhouette at a distance.
- A runtime version and an optional close-up version.
- Collision geometry only where interaction needs it.
- Named materials and semantic metadata such as `assetType`, `zone`, `interactable`, and `sourceStatus`.
- A thumbnail or preview image for the asset library.

## Runtime performance and rendering requirements

Design for a standalone headset first, then add a higher-quality desktop/browser mode. If the actual headset is unknown, use a conservative target and make quality tiers configurable.

### Frame rate and frame timing

- Use `renderer.setAnimationLoop()` for the render loop so the XR session controls timing.
- Do not manually create a second `requestAnimationFrame` loop during immersive XR.
- Target stable headset refresh rather than a high desktop FPS number. A 72 Hz target has approximately 13.9 ms per frame; 90 Hz has approximately 11.1 ms; 120 Hz has approximately 8.3 ms. Make the target visible in the performance notes and test the actual device.
- Avoid GC spikes in the XR loop. Reuse vectors, arrays, raycasters, and temporary objects.
- Display a debug performance panel only in developer mode.

### Geometry and draw calls

- Use `InstancedMesh` for repeated crates, racks, crop rows, lamps, and floor markings.
- Use LOD or simplified proxies for distant buildings and machinery.
- Merge static meshes where it improves draw calls without making interaction impossible.
- Use frustum culling and avoid hidden objects remaining active.
- Keep collision meshes simpler than render meshes.
- Prefer glTF/GLB runtime assets with Draco or Meshopt compression where the loader pipeline supports it; verify load time and runtime cost on the target device.

### Textures and colour

- Use KTX2/Basis textures when the runtime pipeline supports them.
- Avoid unnecessarily large transparent textures.
- Use baked AO and lightmaps for static areas when possible.
- Keep texture memory and draw-call budgets in a documented `PERFORMANCE.md` file.

### Pixel ratio, resolution, and vsync

- Do not promise one fixed “VR resolution”; the headset, browser, XR layer, and device refresh policy determine the actual framebuffer.
- Use a conservative configurable `renderer.setPixelRatio()` for inline desktop mode and avoid forcing an extreme pixel ratio in immersive XR.
- Measure the actual drawing buffer size and frame time on the target device.
- Do not attempt to implement manual vsync. In XR, use the XR session’s animation loop and let the runtime synchronize to the headset refresh cadence.
- On desktop fallback, resize with device pixel ratio clamped to a safe range such as 1.0-1.5, then test visual quality and GPU load.

### Quality tiers

Implement at least:

- `low`: low shadows, reduced texture resolution, no expensive post-processing, simplified distant assets.
- `medium`: baked AO/lightmaps, selective shadows, standard PBR, normal texture set.
- `high`: higher texture resolution, selected hero shadows, optional bloom or colour grading only if it remains comfortable and performant.

Expose quality in a developer panel, not as a confusing user-facing menu during the first demo.

## Project structure

Prefer a structure like:

```text
src/
  app/
  scenes/
    farmReceiving/
    processingPackaging/
    inventoryColdChain/
    dispatchMarket/
  simulation/
  xr/
  interaction/
  ui/
  assets/
  data/
public/
  assets/
    models/
    textures/
    audio/
docs/
  DESIGN.md
  PERFORMANCE.md
  DATA_STATUS.md
  ASSET_CREDITS.md
tests/
AGENT.md
README.md
```

Keep the simulation model independent from Three.js scene objects. The UI should subscribe to scenario state rather than reading values out of meshes. A crate mesh may display `quantitySpoiled`, but it must not be the source of truth for that value.

## Agent workflow

Follow this sequence:

1. Inspect the repository and installed tools. Do not assume a Blender MCP, asset marketplace connector, image-search connector, or code-generation plugin exists. If tools are available, record them in `docs/TOOL_INVENTORY.md`.
2. Read the supplied research text and the existing Word brief enough to understand the problem, not to copy unsupported claims.
3. Create a small design decision record explaining the selected stack, target headset/browser, unit scale, locomotion approach, and first milestone.
4. Build a greybox of the four environments using primitive geometry and semantic zones.
5. Implement navigation, controller ray interaction, reset, and the non-XR fallback.
6. Add the state-driven scenario engine and the before/after dashboard.
7. Replace only the most visible greybox objects with modular GLB assets. Do not block the prototype on perfect art.
8. Add lighting, materials, labels, and selective shadows.
9. Add the farm, processing, cold-chain, dispatch, and app interactions in that order.
10. Test on desktop first, then on the target headset. Record performance and any browser/device limitations.
11. Run automated checks, build the production bundle, and inspect the browser console for errors.
12. Update `README.md`, `PERFORMANCE.md`, `DATA_STATUS.md`, and `ASSET_CREDITS.md` before handing off.

## Verification checklist

### Functional

- The app starts with a clear title and a `Enter VR` or equivalent control when supported.
- The app remains useful in a normal browser without WebXR.
- The user can reach all four environments or use a guided scene selector.
- The user can reset position and scenario state.
- At least four scenarios update shared state variables.
- The before and after views use the same underlying batch and scenario state.
- FEFO, demand matching, shade/pre-cooling, shared cooling, and capacity reduction have visibly different outcomes.
- Dashboard metrics show units, source status, and scenario name.
- No UI element requires the user to read long paragraphs while immersed.

### Technical

- No console errors on load or XR entry.
- `npm run build` succeeds.
- TypeScript checks pass if TypeScript is used.
- Assets load from known paths and have no missing textures.
- GLB assets have correct scale, orientation, pivots, and material names.
- Scene memory and draw calls are measured at least once for each quality tier.
- Frame time is measured on the actual headset if available.
- The app handles session end and re-entry.
- The app handles missing XR support with a clear fallback.

### Visual

- Farm, processing, cold room, and dispatch read as different zones at a glance.
- The before state is visibly worse through queueing, clutter, mixed expiry, or loss markers, not through random red overlays everywhere.
- The improved state is visibly better through flow, labels, stock order, and lower loss metrics.
- Lighting separates farm, processing, cold room, and dispatch without looking like four unrelated games.
- Shadows ground objects without consuming the entire GPU budget.
- Labels remain readable from the intended viewing distance.
- No stretched textures, floating objects, z-fighting, broken normals, or obvious scale errors remain.

## Research and source rules for the agent

Use official or primary sources for implementation details:

- Three.js VR content guide: https://threejs.org/manual/en/how-to-create-vr-content.html
- Three.js `WebXRManager` documentation: https://threejs.org/docs/pages/WebXRManager.html
- Three.js `WebGLRenderer` documentation: https://threejs.org/docs/pages/WebGLRenderer.html
- MDN WebXR Device API: https://developer.mozilla.org/en-US/docs/Web/API/WebXR_Device_API
- MDN WebXR geometry and reference spaces: https://developer.mozilla.org/en-US/docs/Web/API/WebXR_Device_API/Geometry
- MDN WebXR startup and shutdown: https://developer.mozilla.org/en-US/docs/Web/API/WebXR_Device_API/Startup_and_shutdown
- Blender glTF 2.0 exporter manual: https://docs.blender.org/manual/en/dev/addons/scene_gltf2.html
- MoFPI Integrated Cold Chain scheme: https://www.mofpi.gov.in/Schemes/cold-chain
- MoFPI PMFME Common Infrastructure: https://www.mofpi.gov.in/en/pmfme/common-infrastructure

If researching visual references through Google Images, YouTube, or online asset libraries:

- Use the search only to understand real layouts, machinery, receiving docks, cold rooms, packaging lines, and operator behaviour.
- Record source URLs and licence status in `docs/ASSET_CREDITS.md`.
- Do not download or embed copyrighted imagery or models without permission.
- Prefer self-modelled geometry, CC0 assets, official open assets, or assets the team has a clear licence to use.
- Do not use an AI-generated image as if it were a real factory photograph or measured evidence.

## Definition of done

The first milestone is complete only when a reviewer can open the project in a browser, enter a stable 3D or VR scene, understand the farm-to-consumer chain, walk or teleport to the cold-chain focus area, trigger at least three scenarios, observe metrics changing, compare baseline versus improved state, and read the documentation explaining what is source-derived versus proposed.

The best final result is not the highest polygon count. It is a coherent, attractive, technically stable, evidence-aware simulation that makes the small-unit inventory and cold-chain problem understandable and lets the user test realistic affordable interventions.
