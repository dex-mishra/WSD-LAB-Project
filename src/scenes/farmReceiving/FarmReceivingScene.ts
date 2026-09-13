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
  createRefrigeratedTruck,
  makeAirArrowMesh,
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
  private crateCount = 24;
  private tempPanel!: THREE.Mesh;
  private queueLabel!: THREE.Mesh;
  private weighbridgeLabel!: THREE.Mesh;
  private shadeGroup = new THREE.Group();
  private dummy = new THREE.Object3D();
  private workers: THREE.Group[] = [];
  private airArrows: THREE.Mesh[] = [];
  private animTime = 0;
  private iotBeacon!: THREE.Mesh;

  constructor(engine: ScenarioEngine) {
    super(engine);
    this.init();
  }

  protected build(): void {
    // 1. Dual Ground: Agricultural Farmland (Left) + Paved Receiving Apron (Right)
    this.buildGroundSurfaces();

    // 2. Farmland, Multi-Crop Raised Beds & Irrigation (Left side)
    this.buildCropFields();

    // 3. High-Tech Utility Farm Tractor & Loaded Harvest Trailer
    this.buildTractorAndTrailer();

    // 4. Smart IoT Field Telemetry Station & Retractable Shade Canopy
    this.buildSmartAgriAndShade();

    // 5. Architectural Receiving Bay Facility & Cantilever Weather Canopy (Right side)
    this.buildReceivingBuilding();

    // 6. Drive-Over Weighbridge & Inbound Transport Bay
    this.buildWeighbridgeStation();

    // 7. Stainless-Steel QC Inspection & Brix Grading Station
    this.buildQCInspectionStation();

    // 8. Crate Staging Zone with Live Simulation Tinting
    this.buildCrateStaging();

    // 9. Floating 3D Air Arrows Indicating Intake Logistics Flow
    this.buildFlowAirArrows();

    // 10. Animated Agricultural Crew & QC Inspectors
    this.buildFieldAndDockCrew();

    // Main Overhead Scene Banner
    const title = label("FARMLAND HARVEST & INTAKE RECEIVING LOGISTICS", 8.8, {
      fontSize: 48,
      width: 1280,
      height: 200,
      bg: "rgba(10, 26, 44, 0.95)",
    });
    title.position.set(0, 7.5, -13.5);
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
    this.tempPanel = label("FIELD HEAT STATUS\n~32°C · EXCURSION 210", 3.2, {
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
  private buildWeighbridgeStation(): void {
    const weighbridgeGroup = new THREE.Group();

    // Drive-Over Steel Weighbridge Platform (Length 8m, Width 3.2m, Height 0.18m)
    const scalePlatform = box(3.2, 0.16, 7.5, 0x546e7a, { metal: 0.6, rough: 0.4 });
    scalePlatform.position.set(14.5, 0.08, -1.0);
    weighbridgeGroup.add(scalePlatform);

    // Yellow Safety Guide Rails on scale edges
    for (const rx of [12.8, 16.2]) {
      const rail = box(0.12, 0.22, 7.5, 0xf4c542);
      rail.position.set(rx, 0.19, -1.0);
      weighbridgeGroup.add(rail);
    }

    // Approach Entry/Exit Ramps
    const rampF = box(3.2, 0.08, 1.2, 0x455a64);
    rampF.position.set(14.5, 0.04, 3.35);
    weighbridgeGroup.add(rampF);

    const rampB = box(3.2, 0.08, 1.2, 0x455a64);
    rampB.position.set(14.5, 0.04, -5.35);
    weighbridgeGroup.add(rampB);

    // Digital Weighbridge Kiosk Tower & LED Terminal
    const kioskPost = box(0.15, 2.0, 0.15, 0x334455);
    kioskPost.position.set(12.2, 1.0, -1.0);
    weighbridgeGroup.add(kioskPost);

    this.weighbridgeLabel = label("AUTOMATED WEIGHBRIDGE\nGROSS: 4,820 KG · NET: 2,450 KG\nLOT: #HARV-2026-09", 2.6, {
      fontSize: 38,
      width: 600,
      height: 280,
      bg: "rgba(10, 24, 40, 0.96)",
    });
    this.weighbridgeLabel.position.set(12.2, 2.15, -1.0);
    weighbridgeGroup.add(this.weighbridgeLabel);

    // Inbound Harvest Delivery Truck parked on weighbridge / dock
    const inboundTruck = createRefrigeratedTruck({
      cabColor: 0x2e7d32, // Forest Green Agri-Haul
      cargoColor: 0xffffff,
    });
    inboundTruck.position.set(14.5, 0.08, -1.5);
    inboundTruck.rotation.y = Math.PI;
    inboundTruck.scale.set(0.95, 0.95, 0.95);
    weighbridgeGroup.add(inboundTruck);

    this.group.add(makeInteractable(weighbridgeGroup, {
      id: "intake-weighbridge-station",
      title: "Drive-Over Intake Weighbridge & Scale",
      info: [
        "Scale Accuracy: ±0.5 kg Industrial Load Cells",
        "Telemetry: Automatic lot weight logging into ERP",
        "Truck Payload: Fresh field harvest crates ready for grading",
      ],
      assetType: "scale",
      zone: "receiving",
      sourceStatus: "PROPOSED",
    }));
  }

  /**
   * Builds the commercial stainless-steel QC inspection station, optical Brix grading hood,
   * temperature probe sensor, and 3 color-coded grading sort bins.
   */
  private buildQCInspectionStation(): void {
    const qcGroup = new THREE.Group();

    // Stainless-Steel Heavy-Duty QC Table
    const tableTop = box(3.2, 0.1, 1.4, 0xb0bec5, { metal: 0.85, rough: 0.25 });
    tableTop.position.set(5.5, 0.9, -4.5);
    qcGroup.add(tableTop);

    for (const [lx, lz] of [
      [4.1, -5.0],
      [6.9, -5.0],
      [4.1, -4.0],
      [6.9, -4.0],
    ]) {
      const leg = box(0.08, 0.85, 0.08, 0x78909c, { metal: 0.8 });
      leg.position.set(lx, 0.45, lz);
      qcGroup.add(leg);
    }

    // Overhead Optical Grading Scanner & LED Light Hood
    const hoodArmL = box(0.06, 1.2, 0.06, 0x334455);
    hoodArmL.position.set(4.1, 1.5, -4.5);
    qcGroup.add(hoodArmL);

    const hoodArmR = box(0.06, 1.2, 0.06, 0x334455);
    hoodArmR.position.set(6.9, 1.5, -4.5);
    qcGroup.add(hoodArmR);

    const lightHood = box(3.0, 0.15, 0.6, 0x223344);
    lightHood.position.set(5.5, 2.1, -4.5);
    qcGroup.add(lightHood);

    const ledStrip = new THREE.Mesh(
      new THREE.PlaneGeometry(2.8, 0.4),
      new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide })
    );
    ledStrip.rotation.x = Math.PI / 2;
    ledStrip.position.set(5.5, 2.02, -4.5);
    qcGroup.add(ledStrip);

    // Digital Refractometer Brix Tester & Core Temp Probe on table
    const brixTester = box(0.4, 0.15, 0.3, 0x112233);
    brixTester.position.set(4.8, 1.02, -4.5);
    qcGroup.add(brixTester);

    const brixScreen = label("BRIX: 12.4°Bx\nCORE: 28.5°C", 0.6, {
      fontSize: 48,
      width: 320,
      height: 180,
      bg: "#17324D",
    });
    brixScreen.position.set(4.8, 1.15, -4.5);
    qcGroup.add(brixScreen);

    // 3 Segregated Color-Coded Grading Sorting Bins (Grade A, Processing, Reject)
    // 1. Grade A Premium (Green Bin)
    const binGradeA = box(0.9, 0.8, 0.9, 0x2e7d32);
    binGradeA.position.set(3.8, 0.4, -2.5);
    qcGroup.add(binGradeA);
    qcGroup.add(floorDecalAt("GRADE A (FRESH)", 1.6, "#2E7D32", 3.8, -1.6));

    // 2. Processing Grade (Yellow Bin)
    const binProc = box(0.9, 0.8, 0.9, 0xf4c542);
    binProc.position.set(5.5, 0.4, -2.5);
    qcGroup.add(binProc);
    qcGroup.add(floorDecalAt("PROCESSING", 1.4, "#F4C542", 5.5, -1.6));

    // 3. Reject / Spoiled (Red Bin)
    const binReject = box(0.9, 0.8, 0.9, 0xb23a2b);
    binReject.position.set(7.2, 0.4, -2.5);
    qcGroup.add(binReject);
    qcGroup.add(floorDecalAt("REJECT / SPOILED", 1.6, "#B23A2B", 7.2, -1.6));

    this.group.add(makeInteractable(qcGroup, {
      id: "qc-grading-station",
      title: "Quality Inspection & Brix Grading Station",
      info: [
        "Tests: Digital Optical Brix Refractometry, Core Temperature Probe",
        "Grading Criteria: Sugar content, firmness, skin blemishes",
        "Action: Sorts into Grade A, Processing, or Cull/Reject",
      ],
      assetType: "table",
      zone: "receiving",
      sourceStatus: "PROPOSED",
    }));
  }

  /**
   * Staged incoming crates with dynamic instance matrix and simulator color tinting.
   */
  private buildCrateStaging(): void {
    this.crates = crateField(this.crateCount, 0.6);
    this.layoutCrates();

    this.group.add(makeInteractable(this.crates.mesh, {
      id: "incoming-harvest-crates",
      title: "Staged Incoming Harvest Crates",
      info: [
        "Live Simulation State: Color-coded by condition",
        "Green: Fresh harvested batch",
        "Yellow: Waiting in receiving queue (Field heat accumulating)",
        "Red: Rejected / Exceeded temperature excursion threshold",
      ],
      assetType: "crate",
      zone: "receiving",
      sourceStatus: "PROPOSED",
    }));
  }

  private layoutCrates(): void {
    let i = 0;
    for (let z = 0; z < 4; z++) {
      for (let x = 0; x < 6; x++) {
        if (i >= this.crateCount) break;
        this.dummy.position.set(3.8 + x * 0.75, 0.25, 0.5 + z * 0.75);
        this.dummy.rotation.set(0, 0, 0);
        this.dummy.updateMatrix();
        this.crates.mesh.setMatrixAt(i, this.dummy.matrix);
        i++;
      }
    }
    this.crates.mesh.instanceMatrix.needsUpdate = true;
  }

  /**
   * Floating 3D Air Arrows clearly displaying step names and purposes along the agricultural flow.
   */
  private buildFlowAirArrows(): void {
    // Arrow 1: Field Harvest -> Inbound Weighbridge
    const arrow1 = makeAirArrowMesh({
      step: "HARVEST ➔ INTAKE WEIGHBRIDGE",
      purpose: "Bulk weight verification & lot logging",
      colorHex: 0x2e7d32,
      widthM: 3.4,
    });
    arrow1.position.set(-0.5, 1.6, 2.5);
    arrow1.userData.baseY = 1.6;
    this.airArrows.push(arrow1);
    this.group.add(arrow1);

    // Arrow 2: Weighbridge -> QC Inspection & Grading Table
    const arrow2 = makeAirArrowMesh({
      step: "WEIGHBRIDGE ➔ QC INSPECTION",
      purpose: "Core temp probe, Brix test & defect sort",
      colorHex: 0x2a78a8,
      widthM: 3.4,
    });
    arrow2.position.set(9.0, 1.6, -3.2);
    arrow2.userData.baseY = 1.6;
    this.airArrows.push(arrow2);
    this.group.add(arrow2);

    // Arrow 3: Grading -> Pre-Cooling & Cold Storage Chain Entry
    const arrow3 = makeAirArrowMesh({
      step: "QC GRADING ➔ COLD CHAIN ENTRY",
      purpose: "Transfer approved lots to rapid pre-cooling",
      colorHex: 0xf4a100,
      widthM: 3.5,
    });
    arrow3.position.set(5.5, 1.7, -6.8);
    arrow3.userData.baseY = 1.7;
    this.airArrows.push(arrow3);
    this.group.add(arrow3);
  }

  /**
   * Builds animated farm harvesting crew, QC inspector, and dock material handlers.
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

    // 3. QA / QC Quality Inspector at Inspection Table
    const qcInspector = createWorkerFigure({
      shirtColor: 0x1565c0, // Blue QA uniform
      apronColor: 0xffffff, // White sterile lab apron
      capColor: 0xffffff,
    });
    qcInspector.position.set(5.5, 0, -5.5);
    qcInspector.rotation.y = 0; // Facing inspection table
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

    // 4. Dock Material Handler with Pallet Jack
    const dockHandler = createWorkerFigure({
      shirtColor: 0xf57c00, // Safety amber
      apronColor: 0x263238,
      capColor: 0xf4c542,
    });
    dockHandler.position.set(9.8, 0, 1.8);
    dockHandler.rotation.y = -Math.PI * 0.45;
    this.workers.push(dockHandler);
    this.group.add(makeInteractable(dockHandler, {
      id: "worker-dock-handler",
      title: "Dock Material Handler",
      info: [
        "Task: Transferring graded crates to rapid pre-chiller rooms",
        "Equipment: Hydraulic hand pallet truck",
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
    const tempText = shaded
      ? `PRE-COOLED STATE\n~14°C · EXCURSION: ${state.temperatureExposure}`
      : `FIELD HEAT WARNING\n~32°C · EXCURSION: ${state.temperatureExposure}`;
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

    // Floating bobbing motion for 3D air arrows
    for (let i = 0; i < this.airArrows.length; i++) {
      const arrow = this.airArrows[i];
      const base = arrow.userData.baseY ?? arrow.position.y;
      arrow.position.y = base + Math.sin(this.animTime * 2.4 + i * 1.3) * 0.05;
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
