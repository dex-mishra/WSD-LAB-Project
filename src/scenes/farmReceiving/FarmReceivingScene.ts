import * as THREE from "three";
import { SceneModule } from "../SceneModule";
import type { SceneKey } from "../../app/palette";
import {
  box,
  label,
  floorDecal,
  makeTextTexture,
  crateField,
  CRATE_STATE_COLOR,
  createWorkerFigure,
  createLightCommercialVan,
} from "../../app/builders";
import { makeInteractable } from "../../interaction/Interactable";
import type { EngineSnapshot, ScenarioEngine } from "../../simulation/ScenarioEngine";

/**
 * Environment 1: Farmland & Receiving Logistics Hub.
 * Demonstrates harvest operations, field heat accumulation, smart IoT telemetry,
 * drive-over weighbridge verification, and QC Brix/temperature grading.
 */
export class FarmReceivingScene extends SceneModule {
  readonly key: SceneKey = "farmReceiving";

  private crates!: { mesh: THREE.InstancedMesh; setColor: (i: number, hex: number) => void };
  private crateCount = 48;
  private tempPanel!: THREE.Mesh;
  private queueLabel!: THREE.Mesh;
  private weighbridgeLabel!: THREE.Mesh;
  private shadeGroup = new THREE.Group();
  private dummy = new THREE.Object3D();
  private workers: THREE.Group[] = [];
  private animTime = 0;
  private iotBeacon!: THREE.Mesh;

  constructor(engine: ScenarioEngine) {
    super(engine);
    this.init();
  }

  protected build(): void {
    // 1. Dual Ground: Agricultural Farmland (Left) + Paved Receiving Apron (Right)
    this.buildGroundSurfaces();

    // 2. Farmland Boundary Fences, Footpaths & Windbreak Trees
    this.buildFieldPerimeterAndTrees();

    // 3. Farmland, Multi-Crop Raised Beds & Irrigation (Left side)
    this.buildCropFields();

    // 4. Precision Drip Irrigation Piping & Solar Borewell Pump Station
    this.buildDripIrrigationAndWaterPump();

    // 5. Active Hand-Harvested Crates & Field Picking Troughs
    this.buildFieldHarvestCrates();

    // 6. GAP Field Sanitation Station, Tool Sterilization & Hydration Shelter
    this.buildFieldShadeShelterAndSanitation();

    // 7. High-Tech Utility Farm Tractor & Loaded Harvest Trailer
    this.buildTractorAndTrailer();

    // 8. Smart IoT Field Telemetry Station & Retractable Shade Canopy
    this.buildSmartAgriAndShade();

    // 9. Architectural Receiving Bay Facility & Cantilever Weather Canopy (Right side)
    this.buildReceivingBuilding();

    // 10. Drive-Over Weighbridge & Inbound Transport Bay
    this.buildWeighbridgeStation();

    // 11. Stainless-Steel QC Inspection & Brix Grading Station
    this.buildQCInspectionStation();

    // 12. Crate Staging Zone with Live Simulation Tinting
    this.buildCrateStaging();

    // 13. Animated Agricultural Crew & QC Inspectors
    this.buildFieldAndDockCrew();

    // Main Overhead Scene Banner
    const title = label("FARMLAND HARVEST & INTAKE RECEIVING LOGISTICS", 8.8, {
      fontSize: 48,
      width: 1280,
      height: 200,
      bg: "rgba(10, 26, 44, 0.95)",
    });
    title.position.set(0, 9.2, -14.0);
    this.group.add(title);
  }

  /**
   * Builds split ground: Rich organic topsoil on the left, heavy-duty asphalt receiving apron on the right.
   */
  private buildGroundSurfaces(): void {
    // Soil Ground (Left side)
    const soilMat = new THREE.MeshStandardMaterial({
      color: 0x6e5233, // Rich dark farmland earth
      roughness: 0.95,
      metalness: 0.02,
    });
    const soil = new THREE.Mesh(new THREE.PlaneGeometry(28, 36), soilMat);
    soil.rotation.x = -Math.PI / 2;
    soil.position.set(-13, 0, 0);
    soil.receiveShadow = true;
    this.group.add(soil);

    // Asphalt / Concrete Receiving Apron (Right side)
    const apronMat = new THREE.MeshStandardMaterial({
      color: 0x424a52, // Durable industrial pavement
      roughness: 0.78,
      metalness: 0.08,
    });
    const apron = new THREE.Mesh(new THREE.PlaneGeometry(24, 36), apronMat);
    apron.rotation.x = -Math.PI / 2;
    apron.position.set(11, 0.01, 0);
    apron.receiveShadow = true;
    this.group.add(apron);

    // Green grass divider berm between field and asphalt
    const bermMat = new THREE.MeshStandardMaterial({
      color: 0x4a7c36, // Grass green
      roughness: 0.9,
    });
    const berm = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 36), bermMat);
    berm.rotation.x = -Math.PI / 2;
    berm.position.set(-0.3, 0.02, 0);
    this.group.add(berm);

    // Field perimeter wooden split-rail fence posts along berm
    for (let z = -14; z <= 14; z += 3.5) {
      const post = box(0.12, 0.9, 0.12, 0x8a633a);
      post.position.set(-0.3, 0.45, z);
      this.group.add(post);

      if (z < 14) {
        const railTop = box(0.06, 0.08, 3.5, 0x8a633a);
        railTop.position.set(-0.3, 0.75, z + 1.75);
        this.group.add(railTop);

        const railMid = box(0.06, 0.08, 3.5, 0x8a633a);
        railMid.position.set(-0.3, 0.35, z + 1.75);
        this.group.add(railMid);
      }
    }

    // Floor Zone Decals
    this.group.add(decal("FIELD HARVEST ZONE", 3.6, "#2E7D32", -12, 8));
    this.group.add(decal("INTAKE DOCK & WEIGHBRIDGE", 4.2, "#F4C542", 10, 8));
  }

  /**
   * Builds realistic raised crop beds with varied vegetation (Tomatoes on stakes, leafy greens, root veg).
   */
  private buildCropFields(): void {
    const cropsGroup = new THREE.Group();

    // 1. Tomato Crop Rows with wooden stakes & red fruit clusters
    for (const rowX of [-17.5, -15.5]) {
      // Raised soil bed mound
      const mound = box(0.9, 0.15, 12, 0x5a4128, { rough: 1.0 });
      mound.position.set(rowX, 0.075, -2);
      cropsGroup.add(mound);

      // Wooden Stakes & Tomato Vines
      for (let z = -7; z <= 3; z += 1.2) {
        const stake = box(0.05, 1.4, 0.05, 0x9c7a4d);
        stake.position.set(rowX, 0.7, z);
        cropsGroup.add(stake);

        // Green foliage bush
        const bush = box(0.5, 0.65, 0.5, 0x2e7d32);
        bush.position.set(rowX, 0.65, z);
        cropsGroup.add(bush);

        // Red tomato clusters
        for (const [ox, oy, oz] of [
          [0.2, 0.45, 0.1],
          [-0.2, 0.6, -0.1],
          [0.15, 0.75, -0.15],
        ]) {
          const tomato = new THREE.Mesh(
            new THREE.SphereGeometry(0.06, 6, 6),
            new THREE.MeshStandardMaterial({ color: 0xd32f2f, roughness: 0.3 })
          );
          tomato.position.set(rowX + ox, oy, z + oz);
          cropsGroup.add(tomato);
        }
      }
    }

    // 2. Leafy Greens / Lettuce Rows
    for (const rowX of [-13.5, -11.5]) {
      const mound = box(0.9, 0.15, 12, 0x5a4128);
      mound.position.set(rowX, 0.075, -2);
      cropsGroup.add(mound);

      for (let z = -7; z <= 3; z += 0.8) {
        const lettuce = new THREE.Mesh(
          new THREE.DodecahedronGeometry(0.22),
          new THREE.MeshStandardMaterial({ color: 0x43a047, roughness: 0.8 })
        );
        lettuce.position.set(rowX + (Math.sin(z) * 0.1), 0.22, z);
        cropsGroup.add(lettuce);
      }
    }

    // 3. Carrot / Root Crop Rows with leafy green tops
    for (const rowX of [-9.5, -7.5]) {
      const mound = box(0.9, 0.15, 12, 0x5a4128);
      mound.position.set(rowX, 0.075, -2);
      cropsGroup.add(mound);

      for (let z = -7; z <= 3; z += 0.7) {
        const top = box(0.3, 0.25, 0.3, 0x1b5e20);
        top.position.set(rowX, 0.22, z);
        cropsGroup.add(top);
      }
    }

    // Interactive crop plot metadata
    cropsGroup.position.set(0, 0, 0);
    this.group.add(makeInteractable(cropsGroup, {
      id: "crop-plots",
      title: "Commercial Multi-Crop Beds",
      info: [
        "Variety: Roma Tomatoes, Hydroponic Greens, Heritage Carrots",
        "Harvest Method: Manual selective picking & batch crating",
        "Field Temperature: ~32°C (Vulnerable to field heat)",
      ],
      assetType: "farm",
      zone: "farm",
      sourceStatus: "PROPOSED",
    }));
  }

  /**
   * Builds farm boundary split-rail fences, soil footpath connectors, and perimeter windbreak trees.
   */
  private buildFieldPerimeterAndTrees(): void {
    const perimeterGroup = new THREE.Group();

    // 1. Far-left boundary fence (along X = -26.5)
    for (let z = -16; z <= 16; z += 4.0) {
      const post = box(0.12, 1.0, 0.12, 0x795548);
      post.position.set(-26.5, 0.5, z);
      perimeterGroup.add(post);

      if (z < 16) {
        const topRail = box(0.06, 0.08, 4.0, 0x8d6e63);
        topRail.position.set(-26.5, 0.82, z + 2.0);
        perimeterGroup.add(topRail);

        const midRail = box(0.06, 0.08, 4.0, 0x8d6e63);
        midRail.position.set(-26.5, 0.42, z + 2.0);
        perimeterGroup.add(midRail);
      }
    }

    // 2. Far-back boundary fence (along Z = -17.5, from X = -26.5 to X = -0.5)
    for (let x = -26.5; x <= -0.5; x += 4.0) {
      const post = box(0.12, 1.0, 0.12, 0x795548);
      post.position.set(x, 0.5, -17.5);
      perimeterGroup.add(post);

      if (x < -0.5) {
        const span = Math.min(4.0, -0.5 - x);
        const topRail = box(span, 0.08, 0.06, 0x8d6e63);
        topRail.position.set(x + span / 2, 0.82, -17.5);
        perimeterGroup.add(topRail);

        const midRail = box(span, 0.08, 0.06, 0x8d6e63);
        midRail.position.set(x + span / 2, 0.42, -17.5);
        perimeterGroup.add(midRail);
      }
    }

    // 3. Low-Poly Windbreak & Orchard Boundary Trees
    const treePositions: [number, number, number, number][] = [
      [-25.5, -14, 1.1, 0x2e7d32],
      [-25.5, -8, 0.95, 0x388e3c],
      [-25.5, -2, 1.2, 0x1b5e20],
      [-25.5, 5, 1.0, 0x2e7d32],
      [-25.5, 12, 1.15, 0x388e3c],
      [-21.0, -15.5, 1.05, 0x1b5e20],
      [-15.0, -15.5, 1.1, 0x2e7d32],
      [-9.0, -15.5, 0.9, 0x388e3c],
    ];

    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x5d4037, roughness: 0.9 });
    for (const [tx, tz, scale, foliageColor] of treePositions) {
      const tree = new THREE.Group();

      // Trunk
      const trunk = new THREE.Mesh(
        new THREE.CylinderGeometry(0.18 * scale, 0.26 * scale, 1.8 * scale, 8),
        trunkMat
      );
      trunk.position.set(0, 0.9 * scale, 0);
      trunk.castShadow = true;
      tree.add(trunk);

      // Layered Low-Poly Canopy
      const folMat = new THREE.MeshStandardMaterial({ color: foliageColor, roughness: 0.85 });

      const layer1 = new THREE.Mesh(new THREE.DodecahedronGeometry(1.3 * scale), folMat);
      layer1.position.set(0, 2.2 * scale, 0);
      layer1.castShadow = true;
      tree.add(layer1);

      const layer2 = new THREE.Mesh(new THREE.DodecahedronGeometry(1.0 * scale), folMat);
      layer2.position.set(0.15 * scale, 3.1 * scale, -0.1 * scale);
      layer2.castShadow = true;
      tree.add(layer2);

      const layer3 = new THREE.Mesh(new THREE.DodecahedronGeometry(0.7 * scale), folMat);
      layer3.position.set(-0.1 * scale, 3.8 * scale, 0.1 * scale);
      layer3.castShadow = true;
      tree.add(layer3);

      tree.position.set(tx, 0, tz);
      perimeterGroup.add(tree);
    }

    // 4. Compact soil footpath between rows and staging shelter
    const pathMat = new THREE.MeshStandardMaterial({ color: 0x553e26, roughness: 0.98 });
    const path = new THREE.Mesh(new THREE.PlaneGeometry(16, 1.6), pathMat);
    path.rotation.x = -Math.PI / 2;
    path.position.set(-13, 0.015, 5.0);
    perimeterGroup.add(path);

    this.group.add(perimeterGroup);
  }

  /**
   * Builds precision drip irrigation laterals along crop mounds and a smallholder solar borewell pump unit.
   */
  private buildDripIrrigationAndWaterPump(): void {
    const irrigationGroup = new THREE.Group();

    // 1. Black Polyethylene Drip Lateral Tubes along each crop row
    const dripTubeMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.5, metalness: 0.2 });
    const rowPositions = [-17.5, -15.5, -13.5, -11.5, -9.5, -7.5];

    for (const rx of rowPositions) {
      // Main tube along bed length (11m)
      const tube = new THREE.Mesh(
        new THREE.CylinderGeometry(0.018, 0.018, 11, 8),
        dripTubeMat
      );
      tube.rotation.x = Math.PI / 2;
      tube.position.set(rx + 0.25, 0.16, -2.0);
      irrigationGroup.add(tube);

      // Micro-dripper emitters along the tube
      for (let z = -7; z <= 3; z += 1.5) {
        const dripper = box(0.04, 0.03, 0.04, 0x0288d1);
        dripper.position.set(rx + 0.25, 0.18, z);
        irrigationGroup.add(dripper);
      }
    }

    // Header manifold pipe connecting rows at the north end (z = -7.8)
    const headerPipe = new THREE.Mesh(
      new THREE.CylinderGeometry(0.03, 0.03, 11, 8),
      dripTubeMat
    );
    headerPipe.rotation.z = Math.PI / 2;
    headerPipe.position.set(-12.5, 0.16, -7.8);
    irrigationGroup.add(headerPipe);

    // Feeder sub-main pipe from pump to header
    const feederPipe = new THREE.Mesh(
      new THREE.CylinderGeometry(0.035, 0.035, 10.5, 8),
      dripTubeMat
    );
    feederPipe.rotation.x = Math.PI / 2;
    feederPipe.rotation.y = 0.2;
    feederPipe.position.set(-20.0, 0.16, -6.9);
    irrigationGroup.add(feederPipe);

    // 2. Solar Borewell & Drip Filtration Pump Station at (-22.5, 0, -6.0)
    const pumpStation = new THREE.Group();

    // Concrete Equipment Slab
    const slab = box(2.0, 0.18, 1.8, 0x78909c, { rough: 0.8 });
    slab.position.set(0, 0.09, 0);
    pumpStation.add(slab);

    // Wellhead Casing (Ground pipe flange)
    const casing = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12, 0.12, 0.5, 12),
      new THREE.MeshStandardMaterial({ color: 0x37474f, metalness: 0.8, roughness: 0.3 })
    );
    casing.position.set(-0.5, 0.3, -0.4);
    pumpStation.add(casing);

    // Centrifugal Booster / Submersible Surface Controller Pump (Blue Agri-Pump)
    const pumpMotor = new THREE.Mesh(
      new THREE.CylinderGeometry(0.18, 0.18, 0.6, 12),
      new THREE.MeshStandardMaterial({ color: 0x1976d2, roughness: 0.4, metalness: 0.6 })
    );
    pumpMotor.rotation.z = Math.PI / 2;
    pumpMotor.position.set(0.1, 0.38, -0.4);
    pumpStation.add(pumpMotor);

    // Disc / Screen Filter Cylinder (Yellow Agricultural Filter)
    const filterUnit = new THREE.Mesh(
      new THREE.CylinderGeometry(0.14, 0.14, 0.55, 12),
      new THREE.MeshStandardMaterial({ color: 0xfbc02d, roughness: 0.5 })
    );
    filterUnit.position.set(0.6, 0.45, 0.1);
    pumpStation.add(filterUnit);

    // Pressure Gauge & Brass Valves
    const gauge = new THREE.Mesh(
      new THREE.CylinderGeometry(0.07, 0.07, 0.04, 16),
      new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.2 })
    );
    gauge.rotation.x = Math.PI / 2;
    gauge.position.set(0.6, 0.8, 0.1);
    pumpStation.add(gauge);

    const redValve = box(0.08, 0.08, 0.08, 0xd32f2f);
    redValve.position.set(0.6, 0.68, 0.1);
    pumpStation.add(redValve);

    // Solar MPPT Pump Inverter Controller Stand & Screen
    const stand = box(0.08, 1.8, 0.08, 0x455a64, { metal: 0.7 });
    stand.position.set(-0.6, 0.9, 0.5);
    pumpStation.add(stand);

    const controllerBox = box(0.55, 0.75, 0.25, 0xd0dfea, { metal: 0.4 });
    controllerBox.position.set(-0.6, 1.45, 0.5);
    pumpStation.add(controllerBox);

    const pumpStatusLabel = label("SOLAR DRIP PUMP\nFLOW: 48 L/min · 2.4 BAR\nSTATUS: ONLINE", 1.2, {
      fontSize: 34,
      width: 440,
      height: 220,
      bg: "rgba(10, 32, 54, 0.95)",
    });
    pumpStatusLabel.position.set(-0.6, 1.45, 0.64);
    pumpStation.add(pumpStatusLabel);

    pumpStation.position.set(-22.5, 0, -6.0);
    irrigationGroup.add(pumpStation);

    this.group.add(makeInteractable(irrigationGroup, {
      id: "farm-drip-pump-system",
      title: "Solar Drip Irrigation & Borewell System",
      info: [
        "Capacity: 3HP Solar-powered submersible borewell pump",
        "Water Efficiency: Direct root-zone micro-drip fertigation (-60% water loss)",
        "Automation: Soil moisture threshold automated valve gating",
      ],
      assetType: "scale",
      zone: "farm",
      sourceStatus: "PROPOSED",
    }));
  }

  /**
   * Builds active hand-picked harvest crates, sorting baskets, and staging bins right beside the crop rows.
   */
  private buildFieldHarvestCrates(): void {
    // Helper to create a detailed HDPE harvest crate with produce fill
    const makeFilledCrate = (
      crateColor: number,
      produceColor: number,
      x: number,
      y: number,
      z: number,
      rotY = 0
    ) => {
      const crateG = new THREE.Group();
      // Outer crate shell
      const crateMesh = box(0.65, 0.32, 0.48, crateColor, { rough: 0.6 });
      crateMesh.position.set(0, 0.16, 0);
      crateG.add(crateMesh);

      // Inner hollow / produce top mound
      const fillMesh = box(0.58, 0.14, 0.42, produceColor, { rough: 0.85 });
      fillMesh.position.set(0, 0.3, 0);
      crateG.add(fillMesh);

      crateG.position.set(x, y, z);
      crateG.rotation.y = rotY;
      return crateG;
    };

    // 1. Tomato Picking Staging beside row -15.5 & Harvester Worker (Green crates with red tomatoes)
    const tomatoCratesGroup = new THREE.Group();
    const tomatoCrate1 = makeFilledCrate(0x2e7d32, 0xd32f2f, -14.8, 0, 1.8, 0.1);
    tomatoCratesGroup.add(tomatoCrate1);
    const tomatoCrate2 = makeFilledCrate(0x2e7d32, 0xe53935, -14.8, 0.32, 1.8, 0.05);
    tomatoCratesGroup.add(tomatoCrate2);

    this.group.add(makeInteractable(tomatoCratesGroup, {
      id: "field-crate-tomatoes",
      title: "Roma Tomato Harvest Crates (Green Box)",
      info: [
        "Produce: Vine-ripened Roma tomatoes (Grade A)",
        "Field Temperature: ~32°C (Subject to field heat accumulation)",
        "Action: Staged for rapid trailer loading to prevent softening & rot",
        "Packaging: 25kg ventilated food-grade HDPE crate",
      ],
      assetType: "crate",
      zone: "farm",
      sourceStatus: "PROPOSED",
    }));

    // 2. Leafy Greens Harvest Crate beside row -13.5 (Blue crate with green lettuce)
    const greensCrate = makeFilledCrate(0x1e88e5, 0x43a047, -12.5, 0, 1.2, -0.2);
    this.group.add(makeInteractable(greensCrate, {
      id: "field-crate-greens",
      title: "Leafy Greens Harvest Crate (Blue Box)",
      info: [
        "Produce: Freshly cut Butterhead & Romaine lettuce",
        "Respiration Rate: Very high; rapid moisture loss if unshaded",
        "Target: Immediate transport to shaded intake & hydro-cooling",
        "Packaging: 15kg perforated sanitized harvest tub",
      ],
      assetType: "crate",
      zone: "farm",
      sourceStatus: "PROPOSED",
    }));

    // 3. Carrot Harvest Crate beside row -9.5 (Orange crate with root crops)
    const carrotCrate = makeFilledCrate(0xf57c00, 0xe65100, -8.5, 0, 1.6, 0.3);
    this.group.add(makeInteractable(carrotCrate, {
      id: "field-crate-carrots",
      title: "Carrot & Root Crop Harvest Crate (Orange Box)",
      info: [
        "Produce: Nantes carrots with tops trimmed in the field",
        "Condition: Field-brushed soil, pending intake de-stoner wash",
        "Destination: Intake wash flume & mechanical peeler line",
        "Packaging: 30kg heavy-duty HDPE field crate",
      ],
      assetType: "crate",
      zone: "farm",
      sourceStatus: "PROPOSED",
    }));

    // 4. Stack of sanitized empty blue harvest crates ready for next pick cycle
    const emptyCratesGroup = new THREE.Group();
    for (let h = 0; h < 3; h++) {
      const emptyCrate = box(0.65, 0.32, 0.48, 0x1565c0, { rough: 0.5 });
      emptyCrate.position.set(-16.6, 0.16 + h * 0.32, 0.6);
      emptyCrate.rotation.y = h * 0.04;
      emptyCratesGroup.add(emptyCrate);
    }
    this.group.add(makeInteractable(emptyCratesGroup, {
      id: "field-crate-empty-buffer",
      title: "Sanitized Empty Crates Buffer (Blue Stack)",
      info: [
        "Standard: Food contact surface sanitized (100ppm chlorine dip)",
        "Material: UV-stabilized virgin HDPE plastic",
        "Function: Clean stock ready for pickers during continuous harvest",
      ],
      assetType: "crate",
      zone: "farm",
      sourceStatus: "PROPOSED",
    }));

    // 5. Wooden hand harvest basket & snips
    const basketGroup = new THREE.Group();
    const basket = box(0.4, 0.22, 0.28, 0x8d6e63);
    basket.position.set(-13.8, 0.11, 0.2);
    basketGroup.add(basket);

    const snips = box(0.18, 0.03, 0.08, 0xb0bec5, { metal: 0.9 });
    snips.position.set(-13.8, 0.24, 0.2);
    basketGroup.add(snips);

    this.group.add(makeInteractable(basketGroup, {
      id: "field-hand-harvest-basket",
      title: "Manual Harvest Basket & Snips",
      info: [
        "Tool: Ergonomic stainless bypass harvest snips",
        "Technique: Selective hand-picking to prevent stem/skin tearing",
        "Hygiene: Blades disinfected at GAP field wash station",
      ],
      assetType: "crate",
      zone: "farm",
      sourceStatus: "PROPOSED",
    }));
  }

  /**
   * Builds the GAP field sanitation station, harvest tool sterilization, and worker shade awning.
   */
  private buildFieldShadeShelterAndSanitation(): void {
    const shelterGroup = new THREE.Group();

    // 1. Rustic Field Shade Awning Structure (3.2m x 2.4m, Height 2.6m)
    for (const [px, pz] of [
      [-1.4, -1.0],
      [1.4, -1.0],
      [-1.4, 1.0],
      [1.4, 1.0],
    ]) {
      const post = box(0.12, 2.6, 0.12, 0x6d4c41);
      post.position.set(px, 1.3, pz);
      shelterGroup.add(post);
    }

    // Pitched Corrugated Green Tin Roof
    const roof = box(3.4, 0.12, 2.6, 0x2e5630, { rough: 0.6 });
    roof.position.set(0, 2.65, 0);
    roof.rotation.z = 0.05;
    shelterGroup.add(roof);

    // 2. Heavy-Duty Wooden Staging & Sanitation Workbench
    const bench = box(2.0, 0.85, 0.8, 0x8d6e63, { rough: 0.9 });
    bench.position.set(0, 0.425, 0);
    shelterGroup.add(bench);

    // 3. Worker Hand-Wash Station & Sanitizer Dispenser
    const washBasin = box(0.45, 0.25, 0.35, 0xd0dfea);
    washBasin.position.set(-0.6, 0.95, 0);
    shelterGroup.add(washBasin);

    const sanitizerBottle = box(0.1, 0.2, 0.1, 0x0288d1);
    sanitizerBottle.position.set(-0.6, 1.15, -0.1);
    shelterGroup.add(sanitizerBottle);

    // 4. Tool Sterilizing Dip Tank (Blue Bucket with chlorine disinfectant)
    const dipTank = new THREE.Mesh(
      new THREE.CylinderGeometry(0.16, 0.14, 0.35, 12),
      new THREE.MeshStandardMaterial({ color: 0x1565c0, roughness: 0.4 })
    );
    dipTank.position.set(0.05, 1.02, 0);
    shelterGroup.add(dipTank);

    // 5. Insulated Field Water Cooler (Orange 5-Gallon Hydration Station)
    const waterCooler = new THREE.Mesh(
      new THREE.CylinderGeometry(0.18, 0.18, 0.5, 12),
      new THREE.MeshStandardMaterial({ color: 0xf57c00, roughness: 0.5 })
    );
    waterCooler.position.set(0.65, 1.1, 0);
    shelterGroup.add(waterCooler);

    // 6. GAP Field Lot Traceability Board / Clipboard
    const logSign = label("GAP FIELD LOG\nLOT: #TB-0914\nSAN: VERIFIED", 0.9, {
      fontSize: 34,
      width: 360,
      height: 200,
      bg: "rgba(10, 32, 54, 0.95)",
    });
    logSign.position.set(0, 1.9, -0.98);
    shelterGroup.add(logSign);

    shelterGroup.position.set(-22.0, 0, 1.5);
    this.group.add(makeInteractable(shelterGroup, {
      id: "field-gap-sanitation-shelter",
      title: "GAP Field Sanitation & Traceability Shelter",
      info: [
        "Standards: Good Agricultural Practices (GAP) & Codex Alimentarius",
        "Sanitation: Active chlorine dip for harvest snips between rows",
        "Worker Welfare: Clean potable water hydration station & handwash unit",
      ],
      assetType: "table",
      zone: "farm",
      sourceStatus: "PROPOSED",
    }));
  }

  /**
   * Builds an upgraded agricultural utility tractor with enclosed cab,
   * treaded rear tires, front chrome grille, and hitched flatbed harvest trailer loaded with crates.
   */
  private buildTractorAndTrailer(): void {
    const tractorGroup = new THREE.Group();

    // --- Modern Agricultural Tractor ---
    const tractorBody = new THREE.Group();

    // Heavy Engine Hood / Chassis (Crimson Red)
    const hood = box(1.3, 0.9, 2.0, 0xc62828, { rough: 0.4 });
    hood.position.set(0, 0.95, 0.8);
    tractorBody.add(hood);

    // Front Grille & Headlights
    const grille = box(1.1, 0.65, 0.06, 0x111111);
    grille.position.set(0, 0.95, 1.83);
    tractorBody.add(grille);

    for (const hx of [-0.42, 0.42]) {
      const light = new THREE.Mesh(
        new THREE.CircleGeometry(0.1, 12),
        new THREE.MeshStandardMaterial({ color: 0xfffae8, emissive: 0xfffae8, emissiveIntensity: 0.9 })
      );
      light.position.set(hx, 1.15, 1.84);
      tractorBody.add(light);
    }

    // Chrome Vertical Exhaust Stack
    const exhaust = new THREE.Mesh(
      new THREE.CylinderGeometry(0.05, 0.05, 1.2, 12),
      new THREE.MeshStandardMaterial({ color: 0x8899aa, metalness: 0.85, roughness: 0.2 })
    );
    exhaust.position.set(0.55, 1.8, 0.4);
    tractorBody.add(exhaust);

    const exhaustCap = box(0.12, 0.02, 0.12, 0x333333);
    exhaustCap.position.set(0.55, 2.4, 0.4);
    tractorBody.add(exhaustCap);

    // Enclosed Operator Cab with dark tinted glass
    const cab = box(1.4, 1.3, 1.4, 0x222e3a);
    cab.position.set(0, 1.75, -0.6);
    tractorBody.add(cab);

    const cabGlassF = box(1.25, 0.8, 0.05, 0x112233, { rough: 0.1, metal: 0.8 });
    cabGlassF.position.set(0, 1.85, 0.12);
    tractorBody.add(cabGlassF);

    const cabGlassR = box(1.25, 0.8, 0.05, 0x112233, { rough: 0.1, metal: 0.8 });
    cabGlassR.position.set(0, 1.85, -1.32);
    tractorBody.add(cabGlassR);

    // Amber Cab Warning Beacon
    const beacon = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.08, 0.12, 12),
      new THREE.MeshStandardMaterial({ color: 0xf4a100, emissive: 0xf4a100, emissiveIntensity: 1.2 })
    );
    beacon.position.set(0, 2.46, -0.6);
    tractorBody.add(beacon);

    // Oversized Agricultural Rear Wheels
    const rearWheelGeo = new THREE.CylinderGeometry(0.75, 0.75, 0.42, 16);
    const tireMat = new THREE.MeshStandardMaterial({ color: 0x181a1c, roughness: 0.95 });
    const rimMat = new THREE.MeshStandardMaterial({ color: 0xf4c542, roughness: 0.5 });

    for (const rx of [-0.85, 0.85]) {
      const tire = new THREE.Mesh(rearWheelGeo, tireMat);
      tire.rotation.z = Math.PI / 2;
      tire.position.set(rx, 0.75, -0.6);
      tire.castShadow = true;

      const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.43, 12), rimMat);
      tire.add(rim);
      tractorBody.add(tire);
    }

    // Front Steering Wheels
    const frontWheelGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.28, 16);
    for (const fx of [-0.75, 0.75]) {
      const tire = new THREE.Mesh(frontWheelGeo, tireMat);
      tire.rotation.z = Math.PI / 2;
      tire.position.set(fx, 0.42, 1.2);
      tire.castShadow = true;

      const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.29, 12), rimMat);
      tire.add(rim);
      tractorBody.add(tire);
    }

    tractorGroup.add(tractorBody);

    // --- Hitched Flatbed Harvest Trailer ---
    const trailer = new THREE.Group();

    // Hitch Towbar
    const towbar = box(0.12, 0.1, 1.0, 0x333333);
    towbar.position.set(0, 0.45, -1.8);
    trailer.add(towbar);

    // Flatbed Frame & Wood Planks
    const trailerBed = box(2.1, 0.2, 3.4, 0x8a633a, { rough: 0.85 });
    trailerBed.position.set(0, 0.65, -3.8);
    trailer.add(trailerBed);

    // Stake Side Rails
    for (const sz of [-2.3, -3.8, -5.3]) {
      const postL = box(0.06, 0.75, 0.06, 0x5a3e1b);
      postL.position.set(-1.02, 1.05, sz);
      trailer.add(postL);

      const postR = box(0.06, 0.75, 0.06, 0x5a3e1b);
      postR.position.set(1.02, 1.05, sz);
      trailer.add(postR);
    }

    // Trailer Wheels
    const trailerWheelGeo = new THREE.CylinderGeometry(0.45, 0.45, 0.26, 16);
    for (const tx of [-1.15, 1.15]) {
      const wheel = new THREE.Mesh(trailerWheelGeo, tireMat);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(tx, 0.45, -4.0);
      wheel.castShadow = true;
      trailer.add(wheel);
    }

    // Stacked harvest crates in trailer
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 2; col++) {
        const crate = box(0.75, 0.35, 0.85, row % 2 === 0 ? 0x2e7d32 : 0xd32f2f);
        crate.position.set(col === 0 ? -0.45 : 0.45, 0.92, -2.8 - row * 0.95);
        trailer.add(crate);

        // Produce fill inside crate
        const fill = box(0.65, 0.1, 0.75, row % 2 === 0 ? 0x43a047 : 0xe53935);
        fill.position.set(col === 0 ? -0.45 : 0.45, 1.12, -2.8 - row * 0.95);
        trailer.add(fill);
      }
    }

    tractorGroup.add(trailer);

    // Placement in the farm lane
    tractorGroup.position.set(-4.5, 0, 0.5);
    tractorGroup.rotation.y = Math.PI * 0.06;

    this.group.add(makeInteractable(tractorGroup, {
      id: "harvest-tractor-fleet",
      title: "Utility Harvest Tractor & Field Trailer",
      info: [
        "Model: AgriTrans 95HP Heavy Hauler",
        "Role: Collects field crates directly from pickers",
        "Payload: 12 Field crates (~300kg fresh produce)",
      ],
      assetType: "vehicle",
      zone: "farm",
      sourceStatus: "PROPOSED",
    }));
  }

  /**
   * Builds smart IoT agricultural telemetry weather/soil probe & retractable UV shade net structure.
   */
  private buildSmartAgriAndShade(): void {
    // 1. Smart IoT Field Telemetry Weather/Soil Mast
    const iotMast = new THREE.Group();

    const pole = box(0.12, 3.2, 0.12, 0x8a99a8, { metal: 0.8 });
    pole.position.set(0, 1.6, 0);
    iotMast.add(pole);

    // Solar Panel on top
    const solar = box(0.75, 0.05, 0.5, 0x1a385c, { rough: 0.2, metal: 0.7 });
    solar.position.set(0, 3.25, 0);
    solar.rotation.x = 0.35;
    iotMast.add(solar);

    // Weather Anemometer
    const anemometer = box(0.4, 0.06, 0.4, 0x334455);
    anemometer.position.set(0, 3.45, 0);
    iotMast.add(anemometer);

    // IoT Telemetry Telemetry Enclosure Box
    const enclosure = box(0.45, 0.65, 0.3, 0xd0dfea);
    enclosure.position.set(0, 1.7, 0.18);
    iotMast.add(enclosure);

    // Glowing LED Status Beacon
    this.iotBeacon = new THREE.Mesh(
      new THREE.SphereGeometry(0.06, 8, 8),
      new THREE.MeshStandardMaterial({ color: 0x00ff88, emissive: 0x00ff88, emissiveIntensity: 1.4 })
    );
    this.iotBeacon.position.set(0, 2.05, 0.35);
    iotMast.add(this.iotBeacon);

    // Digital field sensor readouts
    const iotLabel = label("IoT FIELD TELEMETRY\nSOIL: 72% · HEAT: ~32°C", 1.8, {
      fontSize: 40,
      width: 480,
      height: 220,
      bg: "rgba(10, 32, 54, 0.95)",
    });
    iotLabel.position.set(0, 1.0, 0.35);
    iotMast.add(iotLabel);

    iotMast.position.set(-18.5, 0, 7.5);
    this.group.add(makeInteractable(iotMast, {
      id: "iot-field-telemetry",
      title: "IoT Agricultural Microclimate Station",
      info: [
        "Sensors: Soil moisture, ambient solar irradiance, canopy temp",
        "Connectivity: LoRaWAN to digital twin simulation engine",
        "Alert: High field heat triggering accelerated post-harvest respiration",
      ],
      assetType: "scale",
      zone: "farm",
      sourceStatus: "PROPOSED",
    }));

    // 2. High-Tech Field Shade Net Canopy (Toggled by Intervention)
    this.shadeGroup = new THREE.Group();

    const posts = [
      [-19, 0, -8],
      [-7, 0, -8],
      [-19, 0, 4],
      [-7, 0, 4],
    ];
    for (const [px, , pz] of posts) {
      const post = box(0.14, 3.4, 0.14, 0xb0bec5, { metal: 0.7 });
      post.position.set(px, 1.7, pz);
      this.shadeGroup.add(post);

      // Concrete foundation footing
      const footing = box(0.4, 0.25, 0.4, 0x78909c);
      footing.position.set(px, 0.12, pz);
      this.shadeGroup.add(footing);
    }

    // Tension Cables
    const cable1 = box(12, 0.04, 0.04, 0x334455);
    cable1.position.set(-13, 3.35, -8);
    this.shadeGroup.add(cable1);

    const cable2 = box(12, 0.04, 0.04, 0x334455);
    cable2.position.set(-13, 3.35, 4);
    this.shadeGroup.add(cable2);

    // UV Protective Translucent Green Fabric Shade Canopy
    const netMat = new THREE.MeshStandardMaterial({
      color: 0x1b5e20,
      transparent: true,
      opacity: 0.45,
      side: THREE.DoubleSide,
      roughness: 0.8,
    });
    const net = new THREE.Mesh(new THREE.PlaneGeometry(12.4, 12.4), netMat);
    net.rotation.x = -Math.PI / 2;
    net.position.set(-13, 3.35, -2);
    this.shadeGroup.add(net);

    // Shade activation alert banner
    const shadeBadge = label("PROTECTIVE UV SHADE CLOTH DEPLOYED\nField Heat Dropped to ~14°C", 3.8, {
      fontSize: 42,
      width: 900,
      height: 180,
      bg: "rgba(27, 94, 32, 0.95)",
    });
    shadeBadge.position.set(-13, 4.2, -2);
    this.shadeGroup.add(shadeBadge);

    this.shadeGroup.visible = false;
    this.group.add(this.shadeGroup);
  }

  /**
   * Builds modern architectural receiving bay facility with corrugated panels,
   * steel weather shelter canopy, and overhead digital facility status boards.
   */
  private buildReceivingBuilding(): void {
    const intakeBuilding = new THREE.Group();

    // Main Receiving Dock Facility Wall (Width 16m, Height 6.5m)
    const facilityWall = box(16, 6.5, 0.5, 0xd0dfea, { rough: 0.5 });
    facilityWall.position.set(11, 3.25, -10.5);
    intakeBuilding.add(facilityWall);

    // Architectural dark accent trim
    const roofTrim = box(16.4, 0.4, 0.8, 0x17324d);
    roofTrim.position.set(11, 6.6, -10.4);
    intakeBuilding.add(roofTrim);

    // Cantilever Overhead Steel Weather Shelter Canopy
    const canopyRoof = box(14, 0.25, 4.5, 0x223e59);
    canopyRoof.position.set(11, 5.0, -7.8);
    intakeBuilding.add(canopyRoof);

    // Steel Cantilever Support Columns
    for (const cx of [4.5, 17.5]) {
      const col = box(0.25, 5.0, 0.25, 0x8a99a8, { metal: 0.7 });
      col.position.set(cx, 2.5, -5.6);
      intakeBuilding.add(col);

      // Yellow safety bollard base
      const bollard = box(0.45, 0.9, 0.45, 0xf4c542);
      bollard.position.set(cx, 0.45, -5.6);
      intakeBuilding.add(bollard);
    }

    // Industrial Roll-Up Dock Bay Door
    const bayFrame = box(5.5, 4.2, 0.2, 0x1a2634);
    bayFrame.position.set(14, 2.1, -10.2);
    intakeBuilding.add(bayFrame);

    const bayDoor = box(5.1, 3.8, 0.08, 0x78909c, { metal: 0.5 });
    bayDoor.position.set(14, 2.1, -10.1);
    intakeBuilding.add(bayDoor);

    // Facility Signage Banner
    const dockSign = label("CENTRAL INTAKE & INCOMING INSPECTION BAY", 6.8, {
      fontSize: 48,
      width: 1100,
      height: 180,
      bg: "rgba(10, 32, 54, 0.95)",
    });
    dockSign.position.set(11, 5.7, -7.8);
    intakeBuilding.add(dockSign);

    // Digital Temperature Excursion / Field Heat Status Board mounted on wall
    this.tempPanel = label("FIELD HEAT STATUS\n~32°C · EXCURSION +3.6°C", 3.2, {
      bg: "#b23a2b",
      fontSize: 48,
      width: 600,
      height: 260,
    });
    this.tempPanel.position.set(6.2, 3.2, -10.2);
    intakeBuilding.add(this.tempPanel);

    // Queue / Intake Throughput Status Board
    this.queueLabel = label("INTAKE QUEUE\n22 CRATES WAITING", 2.8, {
      bg: "#b23a2b",
      fontSize: 48,
      width: 540,
      height: 240,
    });
    this.queueLabel.position.set(6.2, 1.5, -10.2);
    intakeBuilding.add(this.queueLabel);

    this.group.add(makeInteractable(intakeBuilding, {
      id: "receiving-facility-bay",
      title: "Intake & Receiving Facility",
      info: [
        "Capacity: 120 Crate Lots / hr",
        "Function: Rapid receiving, core temp scan & pre-cooling triage",
        "Standards: HACCP & GlobalGAP Intake Compliance",
      ],
      assetType: "dock",
      zone: "receiving",
      sourceStatus: "PROPOSED",
    }));
  }

  /**
   * Builds the drive-over vehicle weighbridge, digital scale kiosk, and parked inbound harvest truck.
   */
  /**
   * Builds the small-scale dual weighing intake hub:
   * 1. 5-Ton Surface-Mounted Agri-Tractor Axle Scale
   * 2. 1,500kg Low-Profile Stainless Steel Digital Pallet Floor Scale with Crate Tare Verifier & Barcode Scanner
   */
  private buildWeighbridgeStation(): void {
    // ==========================================
    // 1. Surface-Mounted Agri-Tractor Axle Scale (5 Ton)
    // ==========================================
    const axleScaleGroup = new THREE.Group();

    // Drive-Over Steel Weighbridge Platform (Length 7.5m, Width 3.2m, Height 0.16m)
    const scalePlatform = box(3.2, 0.16, 7.5, 0x546e7a, { metal: 0.6, rough: 0.4 });
    scalePlatform.position.set(14.5, 0.08, -1.0);
    axleScaleGroup.add(scalePlatform);

    // High-visibility hazard boundary striping around scale perimeter
    for (const [bx, bz, bw, bd] of [
      [14.5, -4.9, 3.6, 0.15],
      [14.5, 2.9, 3.6, 0.15],
      [12.6, -1.0, 0.15, 7.8],
      [16.4, -1.0, 0.15, 7.8],
    ]) {
      const stripe = box(bw, 0.02, bd, 0xf4c542);
      stripe.position.set(bx, 0.015, bz);
      axleScaleGroup.add(stripe);
    }

    // Yellow Safety Guide Rails on scale edges
    for (const rx of [12.8, 16.2]) {
      const rail = box(0.12, 0.22, 7.5, 0xf4c542);
      rail.position.set(rx, 0.19, -1.0);
      axleScaleGroup.add(rail);
    }

    // Approach Entry/Exit Ramps
    const rampF = box(3.2, 0.08, 1.2, 0x455a64);
    rampF.position.set(14.5, 0.04, 3.35);
    axleScaleGroup.add(rampF);

    const rampB = box(3.2, 0.08, 1.2, 0x455a64);
    rampB.position.set(14.5, 0.04, -5.35);
    axleScaleGroup.add(rampB);

    // Digital Weighbridge Kiosk Tower & LED Terminal (Positioned cleanly on outer curb)
    const kioskPost = box(0.15, 2.0, 0.15, 0x334455);
    kioskPost.position.set(17.4, 1.0, 0.5);
    axleScaleGroup.add(kioskPost);

    this.weighbridgeLabel = label(
      "AGRI-VEHICLE AXLE SCALE (5T)\nGROSS: 3,240 KG · TARE: 1,820 KG\nNET PRODUCE: 1,420 KG · LOT: #HARV-2026-09",
      2.5,
      {
        fontSize: 34,
        width: 620,
        height: 290,
        bg: "rgba(10, 24, 40, 0.96)",
      }
    );
    this.weighbridgeLabel.position.set(17.4, 2.15, 0.5);
    axleScaleGroup.add(this.weighbridgeLabel);

    // Inbound Harvest Delivery Van parked on axle scale (matching small-scale light commercial box van)
    const inboundVan = createLightCommercialVan({
      cabColor: 0xf5f7fa, // Clean commercial white cab
      cargoColor: 0xffffff, // Insulated FRP box body
    });
    inboundVan.position.set(14.5, 0.08, -1.0);
    inboundVan.rotation.y = Math.PI;
    axleScaleGroup.add(inboundVan);

    this.group.add(makeInteractable(axleScaleGroup, {
      id: "intake-axle-scale",
      title: "Agri-Delivery Van & Axle Scale (3.5T)",
      info: [
        "Vehicle: 3.5-Ton Light Commercial Box Van (LCV)",
        "Payload: 60-80 Harvest Crates (~1,200kg fresh produce)",
        "Scale: Surface-Mounted Axle Load Cells (±0.5 kg accuracy)",
        "Role: Rapid farm-to-dock transport from regional smallholder network",
      ],
      assetType: "scale",
      zone: "receiving",
      sourceStatus: "PROPOSED",
    }));

    // ==========================================
    // 2. Low-Profile Stainless Steel Digital Pallet Scale (1,500 kg)
    // ==========================================
    const palletScaleGroup = new THREE.Group();

    // 1.4m x 1.4m Stainless Steel Diamond-Plate Platform (Height 0.07m)
    const platform = box(1.4, 0.07, 1.4, 0x78909c, { metal: 0.85, rough: 0.25 });
    platform.position.set(0, 0.035, 0);
    palletScaleGroup.add(platform);

    // Entry Ramp for Hand Pallet Truck
    const palletRamp = box(1.4, 0.035, 0.45, 0x546e7a, { metal: 0.8 });
    palletRamp.position.set(0, 0.018, 0.925);
    palletScaleGroup.add(palletRamp);

    // Yellow hazard perimeter outline
    for (const [px, pz, pw, pd] of [
      [0, -0.75, 1.6, 0.08],
      [-0.75, 0.1, 0.08, 1.6],
      [0.75, 0.1, 0.08, 1.6],
    ]) {
      const hazardLine = box(pw, 0.015, pd, 0xf4c542);
      hazardLine.position.set(px, 0.01, pz);
      palletScaleGroup.add(hazardLine);
    }

    // Euro Wooden Pallet (1.2m x 0.8m x 0.14m) on the scale platform
    const palletBase = box(1.2, 0.14, 0.8, 0x8d6e63, { rough: 0.9 });
    palletBase.position.set(0, 0.14, 0);
    palletScaleGroup.add(palletBase);

    // Staged 8 Crates on the Pallet (4 Green Tomato + 4 Blue Greens)
    for (let r = 0; r < 2; r++) {
      for (let c = 0; c < 2; c++) {
        for (let tier = 0; tier < 2; tier++) {
          const crateColor = (r + c) % 2 === 0 ? 0x2e7d32 : 0x1e88e5;
          const produceColor = (r + c) % 2 === 0 ? 0xd32f2f : 0x43a047;

          const pCrate = box(0.55, 0.26, 0.38, crateColor, { rough: 0.6 });
          pCrate.position.set(-0.28 + c * 0.56, 0.34 + tier * 0.27, -0.18 + r * 0.38);
          palletScaleGroup.add(pCrate);

          const pFill = box(0.48, 0.08, 0.32, produceColor, { rough: 0.8 });
          pFill.position.set(-0.28 + c * 0.56, 0.44 + tier * 0.27, -0.18 + r * 0.38);
          palletScaleGroup.add(pFill);
        }
      }
    }

    // Stainless Steel Indicator Column & Backlit Digital LED Terminal (Moved to operator side)
    const indicatorPost = box(0.08, 1.3, 0.08, 0xb0bec5, { metal: 0.85 });
    indicatorPost.position.set(-0.95, 0.65, -0.2);
    palletScaleGroup.add(indicatorPost);

    const indicatorHead = box(0.42, 0.32, 0.15, 0x1a2634, { metal: 0.5 });
    indicatorHead.position.set(-0.95, 1.35, -0.2);
    palletScaleGroup.add(indicatorHead);

    const palletScaleLabel = label(
      "DIGITAL PALLET SCALE\n8 CRATES · GROSS: 184.0 KG\nNET: 168.0 KG · TARE: 16.0 KG",
      1.2,
      {
        fontSize: 32,
        width: 440,
        height: 230,
        bg: "rgba(10, 32, 54, 0.96)",
      }
    );
    palletScaleLabel.position.set(-0.95, 1.35, -0.1);
    palletScaleGroup.add(palletScaleLabel);

    // Handheld Barcode / QR Lot Scanner on articulated arm
    const scannerArm = box(0.04, 0.35, 0.04, 0x334455);
    scannerArm.position.set(-0.95, 1.1, 0.0);
    palletScaleGroup.add(scannerArm);

    const scannerGun = box(0.08, 0.14, 0.12, 0xf4a100);
    scannerGun.position.set(-0.95, 1.25, 0.04);
    palletScaleGroup.add(scannerGun);

    // Position Pallet Scale so its right side touches the yellow rail of the truck scale
    palletScaleGroup.position.set(12.0, 0, 0.0);

    this.group.add(makeInteractable(palletScaleGroup, {
      id: "intake-pallet-scale",
      title: "Digital Pallet Scale & Crate Tare Verifier",
      info: [
        "Capacity: 1,500 kg Low-Profile Stainless Steel Platform Scale",
        "Auto-Tare: Deducts exact standard tare (2.0 kg / crate) automatically",
        "Traceability: Wireless barcode lot scanner logs batch into ERP",
        "Function: Immediate lot verification before washing & QC grading",
      ],
      assetType: "scale",
      zone: "receiving",
      sourceStatus: "PROPOSED",
    }));
  }

  /**
   * Builds the commercial stainless-steel QC inspection station, optical Brix grading hood,
   * temperature probe sensor, and 3 color-coded grading sort bins (arranged neatly IN FRONT of the table).
   */
  private buildQCInspectionStation(): void {
    const qcGroup = new THREE.Group();

    // Stainless-Steel Heavy-Duty QC Table (Positioned under canopy at x = 4.8, z = -4.8)
    const tableTop = box(3.2, 0.1, 1.4, 0xb0bec5, { metal: 0.85, rough: 0.25 });
    tableTop.position.set(4.8, 0.9, -4.8);
    qcGroup.add(tableTop);

    for (const [lx, lz] of [
      [3.4, -5.3],
      [6.2, -5.3],
      [3.4, -4.3],
      [6.2, -4.3],
    ]) {
      const leg = box(0.08, 0.85, 0.08, 0x78909c, { metal: 0.8 });
      leg.position.set(lx, 0.45, lz);
      qcGroup.add(leg);
    }

    // Overhead Optical Grading Scanner & LED Light Hood
    const hoodArmL = box(0.06, 1.2, 0.06, 0x334455);
    hoodArmL.position.set(3.4, 1.5, -4.8);
    qcGroup.add(hoodArmL);

    const hoodArmR = box(0.06, 1.2, 0.06, 0x334455);
    hoodArmR.position.set(6.2, 1.5, -4.8);
    qcGroup.add(hoodArmR);

    const lightHood = box(3.0, 0.15, 0.6, 0x223344);
    lightHood.position.set(4.8, 2.1, -4.8);
    qcGroup.add(lightHood);

    const ledStrip = new THREE.Mesh(
      new THREE.PlaneGeometry(2.8, 0.4),
      new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide })
    );
    ledStrip.rotation.x = Math.PI / 2;
    ledStrip.position.set(4.8, 2.02, -4.8);
    qcGroup.add(ledStrip);

    // Digital Refractometer Brix Tester & Core Temp Probe on table
    const brixTester = box(0.4, 0.15, 0.3, 0x112233);
    brixTester.position.set(4.2, 1.02, -4.8);
    qcGroup.add(brixTester);

    const brixScreen = label("BRIX: 12.4°Bx\nCORE: 28.5°C", 0.6, {
      fontSize: 48,
      width: 320,
      height: 180,
      bg: "#17324D",
    });
    brixScreen.position.set(4.2, 1.15, -4.8);
    qcGroup.add(brixScreen);

    // 3 Segregated Color-Coded Grading Sorting Bins (Arranged neatly IN FRONT of the QC Table)
    // 1. Grade A Premium (Green Bin)
    const binGradeA = box(0.75, 0.65, 0.75, 0x2e7d32);
    binGradeA.position.set(3.6, 0.35, -3.0);
    qcGroup.add(binGradeA);
    const fillGradeA = box(0.65, 0.08, 0.65, 0x43a047);
    fillGradeA.position.set(3.6, 0.68, -3.0);
    qcGroup.add(fillGradeA);
    qcGroup.add(floorDecalAt("GRADE A", 1.0, "#2E7D32", 3.6, -2.1));

    // 2. Processing Grade (Yellow Bin)
    const binProc = box(0.75, 0.65, 0.75, 0xf4c542);
    binProc.position.set(4.8, 0.35, -3.0);
    qcGroup.add(binProc);
    const fillProc = box(0.65, 0.08, 0.65, 0xfbc02d);
    fillProc.position.set(4.8, 0.68, -3.0);
    qcGroup.add(fillProc);
    qcGroup.add(floorDecalAt("PROCESSING", 1.0, "#F4C542", 4.8, -2.1));

    // 3. Reject / Spoiled (Red Bin)
    const binReject = box(0.75, 0.65, 0.75, 0xb23a2b);
    binReject.position.set(6.0, 0.35, -3.0);
    qcGroup.add(binReject);
    const fillReject = box(0.65, 0.08, 0.65, 0x8d6e63);
    fillReject.position.set(6.0, 0.68, -3.0);
    qcGroup.add(fillReject);
    qcGroup.add(floorDecalAt("REJECT", 1.0, "#B23A2B", 6.0, -2.1));

    this.group.add(makeInteractable(qcGroup, {
      id: "qc-grading-station",
      title: "Quality Inspection & Brix Grading Station",
      info: [
        "Tests: Digital Optical Brix Refractometry, Core Temperature Probe",
        "Grading Criteria: Sugar content, firmness, skin blemishes",
        "Action: Sorts into Grade A, Processing, or Cull/Reject bins directly in front of table",
      ],
      assetType: "table",
      zone: "receiving",
      sourceStatus: "PROPOSED",
    }));
  }

  /**
   * Staged incoming checked batch crates stacked neatly on 4 wooden pallets (48 crates total)
   * under the covered receiving canopy right beside the factory intake door.
   */
  private buildCrateStaging(): void {
    const stagingGroup = new THREE.Group();

    // 4 Euro Wooden Staging Pallets in a 2x2 grid under the canopy
    const stagingPalletPositions: [number, number][] = [
      [8.8, -6.4],
      [8.8, -4.8],
      [10.4, -6.4],
      [10.4, -4.8],
    ];

    for (const [px, pz] of stagingPalletPositions) {
      const pallet = box(1.2, 0.14, 0.85, 0x8d6e63, { rough: 0.9 });
      pallet.position.set(px, 0.07, pz);
      stagingGroup.add(pallet);

      // Yellow safety staging lane box outline
      const outline = box(1.35, 0.015, 1.0, 0xf4c542);
      outline.position.set(px, 0.01, pz);
      stagingGroup.add(outline);
    }

    // Floor zone decal in front of the staging pallets
    stagingGroup.add(floorDecalAt("APPROVED BATCH QUEUE ➔ ENTRY", 3.2, "#2E7D32", 9.6, -3.6));

    this.crates = crateField(this.crateCount, 0.52);
    this.layoutCrates();
    stagingGroup.add(this.crates.mesh);

    this.group.add(makeInteractable(stagingGroup, {
      id: "approved-incoming-harvest-crates",
      title: "Approved Batch Staging (Ready for Processing)",
      info: [
        "Status: 48 Weighed, QC inspected & verified crates ready for production",
        "Destination: Continuous washing flume & prep line (Scene 2)",
        "Live Simulation State: Color-coded by condition",
        "Green: Approved fresh batch · Red/Brown: Culled defect fraction",
      ],
      assetType: "crate",
      zone: "receiving",
      sourceStatus: "PROPOSED",
    }));
  }

  /**
   * Organizes the 48 checked crates into 4 neat 3-tier pallet stacks (12 crates per pallet)
   * positioned directly under the canopy beside the roll-up entrance door.
   */
  private layoutCrates(): void {
    let i = 0;
    const palletPositions: [number, number][] = [
      [8.8, -6.4],
      [8.8, -4.8],
      [10.4, -6.4],
      [10.4, -4.8],
    ];

    for (const [px, pz] of palletPositions) {
      for (let tier = 0; tier < 3; tier++) {
        for (let row = 0; row < 2; row++) {
          for (let col = 0; col < 2; col++) {
            if (i >= this.crateCount) break;
            const cx = px - 0.28 + col * 0.56;
            const cy = 0.22 + tier * 0.28;
            const cz = pz - 0.19 + row * 0.38;

            this.dummy.position.set(cx, cy, cz);
            this.dummy.rotation.set(0, 0, 0);
            this.dummy.updateMatrix();
            this.crates.mesh.setMatrixAt(i, this.dummy.matrix);
            i++;
          }
        }
      }
    }
    this.crates.mesh.instanceMatrix.needsUpdate = true;
  }

  /**
   * Builds animated farm harvesting crew, QC inspector, and dock material handlers with uncluttered spacing.
   */
  private buildFieldAndDockCrew(): void {
    // 1. Field Harvester Worker (in crop rows)
    const harvester1 = createWorkerFigure({
      shirtColor: 0x388e3c, // Green farm shirt
      apronColor: 0x5d4037, // Brown canvas utility apron
      capColor: 0xfbc02d,  // Sun straw hat / cap
    });
    harvester1.position.set(-14.5, 0, 0.8);
    harvester1.rotation.y = Math.PI * 0.4;
    this.workers.push(harvester1);
    this.group.add(makeInteractable(harvester1, {
      id: "worker-field-harvester",
      title: "Agricultural Harvester",
      info: [
        "Task: Hand-picking ripe produce at peak maturity",
        "Field Equipment: Ergonomic harvesting shears & sanitized field crates",
      ],
      assetType: "operator",
      zone: "farm",
      sourceStatus: "PROPOSED",
    }));

    // 2. Trailer Loader Worker
    const harvester2 = createWorkerFigure({
      shirtColor: 0xd84315, // Orange high-vis shirt
      apronColor: 0x37474f,
      capColor: 0xffffff,
    });
    harvester2.position.set(-3.2, 0, -2.5);
    harvester2.rotation.y = Math.PI * 1.1;
    this.workers.push(harvester2);
    this.group.add(makeInteractable(harvester2, {
      id: "worker-trailer-loader",
      title: "Field Logistics Handler",
      info: [
        "Task: Loading harvested crates onto tractor trailer",
        "Objective: Minimize field exposure and heat absorption",
      ],
      assetType: "operator",
      zone: "farm",
      sourceStatus: "PROPOSED",
    }));

    // 3. QA / QC Quality Inspector (Standing comfortably behind QC Table facing forward)
    const qcInspector = createWorkerFigure({
      shirtColor: 0x1565c0, // Blue QA uniform
      apronColor: 0xffffff, // White sterile lab apron
      capColor: 0xffffff,
    });
    qcInspector.position.set(4.8, 0, -5.8);
    qcInspector.rotation.y = 0; // Facing inspection table towards front
    this.workers.push(qcInspector);
    this.group.add(makeInteractable(qcInspector, {
      id: "worker-qc-inspector",
      title: "Intake Quality Assurance Inspector",
      info: [
        "Task: Performing Brix sugar refractometry & core temperature probing",
        "Protocol: Rejects batches with core temp > 30°C or visible mold",
      ],
      assetType: "operator",
      zone: "receiving",
      sourceStatus: "PROPOSED",
    }));

    // 4. Dock Material Handler (Standing at pallet scale right beside truck scale rail)
    const dockHandler = createWorkerFigure({
      shirtColor: 0xf57c00, // Safety amber
      apronColor: 0x263238,
      capColor: 0xf4c542,
    });
    dockHandler.position.set(12.0, 0, 1.5);
    dockHandler.rotation.y = -Math.PI * 0.1;
    this.workers.push(dockHandler);
    this.group.add(makeInteractable(dockHandler, {
      id: "worker-dock-handler",
      title: "Dock Material Handler",
      info: [
        "Task: Verifying pallet gross weight & transferring graded crates",
        "Equipment: Low-profile digital scale & barcode scanner",
      ],
      assetType: "operator",
      zone: "receiving",
      sourceStatus: "PROPOSED",
    }));
  }

  /**
   * Reacts to scenario simulation updates: Crate color distributions,
   * shade net deployment, temperature excursion telemetry, and queue length.
   */
  protected onSnapshot(snap: EngineSnapshot): void {
    const { state, flags } = snap;

    // Distribute crate tints by proportion of good/waiting/rejected/spoiled
    const total = this.crateCount;
    const good = Math.round((state.quantityGood / state.quantityReceived) * total);
    const spoiled = Math.round((state.quantitySpoiled / state.quantityReceived) * total);
    const rejected = Math.round((state.quantityRejected / state.quantityReceived) * total);

    for (let i = 0; i < total; i++) {
      let hex: number = CRATE_STATE_COLOR.fresh;
      if (i >= total - spoiled) hex = CRATE_STATE_COLOR.spoiled;
      else if (i >= total - spoiled - rejected) hex = CRATE_STATE_COLOR.rejected;
      else if (i >= good) hex = CRATE_STATE_COLOR.waiting;
      this.crates.setColor(i, hex);
    }

    // Retractable Shade Canopy Reaction
    const shaded = flags.shadePrecooling;
    this.shadeGroup.visible = shaded;

    // Temperature Excursion Display Board
    const tempExcursionC = (state.temperatureExposure / 4).toFixed(1);
    const tempText = shaded
      ? `PRE-COOLED STATE\n~14°C · EXCURSION: +${tempExcursionC}°C (${state.temperatureExposure} °C·h)`
      : `FIELD HEAT WARNING\n~32°C · EXCURSION: +${tempExcursionC}°C (${state.temperatureExposure} °C·h)`;
    this.updateLabel(this.tempPanel, tempText, shaded ? "#2a78a8" : "#b23a2b");

    // Intake Queue Display Board
    const isBottleneck = state.queueLength > 20;
    this.updateLabel(
      this.queueLabel,
      `INTAKE QUEUE\n${state.queueLength} CRATES WAITING`,
      isBottleneck ? "#b23a2b" : "#2e7d32"
    );
  }

  private updateLabel(mesh: THREE.Mesh, text: string, bg: string): void {
    const mat = mesh.material as THREE.MeshBasicMaterial;
    const old = mat.map;
    mat.map = makeTextTexture(text, { bg, fontSize: 48, width: 600, height: 260 });
    mat.needsUpdate = true;
    old?.dispose();
  }

  /**
   * Frame-by-frame animations for crew, air arrows, and IoT beacon.
   */
  update(dt: number): void {
    this.animTime += dt;

    // Worker arm working animations
    for (let i = 0; i < this.workers.length; i++) {
      const w = this.workers[i];
      const armL = w.getObjectByName("armL");
      const armR = w.getObjectByName("armR");
      const offset = i * 2.1;
      if (armL) armL.rotation.x = 0.45 + Math.sin(this.animTime * 3.2 + offset) * 0.16;
      if (armR) armR.rotation.x = 0.45 + Math.cos(this.animTime * 3.2 + offset) * 0.16;
    }

    // Pulsing IoT Beacon LED
    if (this.iotBeacon) {
      const beaconMat = this.iotBeacon.material as THREE.MeshStandardMaterial;
      beaconMat.emissiveIntensity = 0.8 + Math.sin(this.animTime * 4.0) * 0.6;
    }
  }
}

function decal(text: string, w: number, color: string, x: number, z: number): THREE.Mesh {
  const m = floorDecal(text, w, color);
  m.position.set(x, 0.03, z);
  return m;
}

function floorDecalAt(text: string, w: number, color: string, x: number, z: number): THREE.Mesh {
  const m = floorDecal(text, w, color);
  m.position.set(x, 0.03, z);
  return m;
}
