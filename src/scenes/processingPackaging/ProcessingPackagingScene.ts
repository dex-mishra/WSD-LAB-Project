import * as THREE from "three";
import { SceneModule } from "../SceneModule";
import type { SceneKey } from "../../app/palette";
import { PALETTE } from "../../app/palette";
import {
  box,
  ground,
  label,
  floorDecal,
  makeTextTexture,
  createWorkerFigure,
  createForklift,
} from "../../app/builders";
import { makeInteractable } from "../../interaction/Interactable";
import type { EngineSnapshot, ScenarioEngine } from "../../simulation/ScenarioEngine";

/**
 * Environment 2: Processing, Chopping & Packaging Line Facility.
 * Arranged in a continuous linear factory flow (Left-to-Right) across 3 dedicated cleanroom bays:
 * 1. Raw Intake & Staging Buffer
 * 2. Room 1: Hygienic Washing & Flume Sanitization Bay
 * 3. Room 2: Sterile Cutting, Trimming & Prep Cleanroom Suite
 * 4. Automated Conveyor Packaging & Sealing Line (with Bottleneck Telemetry)
 * 5. Room 3: Quality Assurance & Food Safety Laboratory (Enclosed Testing Room)
 * 6. Finished Goods Palletizing & Forklift Dispatch
 */
export class ProcessingPackagingScene extends SceneModule {
  readonly key: SceneKey = "processingPackaging";

  private conveyor!: THREE.Group;
  private beltItems: THREE.Mesh[] = [];
  private bottleneckLabel!: THREE.Mesh;
  private beltSpeed = 0.6;
  private workers: THREE.Group[] = [];
  private workerTime = 0;

  constructor(engine: ScenarioEngine) {
    super(engine);
    this.init();
  }

  protected build(): void {
    // 1. Factory Floor & Perimeter Architecture
    this.buildFacilityStructure();

    // 2. Station 1: Raw Produce Intake Buffer & Hygiene Washbasin (Far Left: x = -16.5)
    this.buildRawIntakeBuffer();

    // 3. Station 2: Room 1 - Hygienic Washing & Flume Sanitization Bay (x = -10.0)
    this.buildWashingCleanroomBay();

    // 4. Station 3: Room 2 - Sterile Cutting, Trimming & Prep Cleanroom Suite (x = -2.3)
    this.buildPrepCleanroomSuite();

    // 5. Station 4: Automated Conveyor Packaging & Sealing Line (x = 5.4)
    this.buildPackagingConveyorLine();

    // 6. Station 5: Room 3 - Quality Assurance & Food Safety Laboratory (x = 12.8)
    this.buildQualityTestingCleanroomLab();

    // 7. Station 6: Finished Goods Palletizing & Forklift Dispatch (Far Right: x = 18.2)
    this.buildFinishedGoodsStation();

    // 8. Industrial Workers positioned along the linear workflow
    this.buildLineOperators();

    // Main Overhead Facility Banner
    const title = label("CENTRAL FOOD PROCESSING, PACKAGING & QA FACILITY", 8.8, {
      fontSize: 48,
      width: 1280,
      height: 200,
      bg: "rgba(10, 26, 44, 0.95)",
    });
    title.position.set(0, 6.8, -7.8);
    this.group.add(title);
  }

  /**
   * Builds the factory floor, back structural wall, and sequential process zone floor markings.
   */
  private buildFacilityStructure(): void {
    // High-durability food-grade hygienic epoxy floor
    const floor = ground(48, 28, PALETTE.cream);
    this.group.add(floor);

    // Architectural facility back wall with clean industrial trim
    const backWall = box(48, 7.0, 0.4, 0xdfe6ec, { rough: 0.6 });
    backWall.position.set(0, 3.5, -8.0);
    this.group.add(backWall);

    const wallTrim = box(48.2, 0.35, 0.6, 0x1a365d);
    wallTrim.position.set(0, 7.1, -7.9);
    this.group.add(wallTrim);

    // Linear Process Direction Floor Decals (Arranged sequentially Left to Right)
    this.group.add(decal("1. RAW INTAKE BUFFER", 2.6, "#F4C542", -16.5, 2.5));
    this.group.add(decal("2. HYGIENIC WASHING BAY", 3.0, "#29B6F6", -10.0, 2.5));
    this.group.add(decal("3. PREP & CUTTING SUITE", 3.0, "#26A69A", -2.3, 2.5));
    this.group.add(decal("4. PACKAGING & SEALING LINE", 3.2, "#AB47BC", 5.4, 2.5));
    this.group.add(decal("5. QA & TESTING LAB (ROOM 3)", 3.4, "#1E88E5", 12.8, 2.5));
    this.group.add(decal("6. FINISHED DISPATCH", 2.8, "#2E7D32", 18.2, 2.5));
  }

  /**
   * Station 1: Raw Harvest Produce Intake Buffer & Hygiene Washbasin
   */
  private buildRawIntakeBuffer(): void {
    const intakeGroup = new THREE.Group();

    // Wooden Euro-Pallet staging fresh harvest crates
    const pallet = box(1.2, 0.14, 0.85, 0x8d6e63, { rough: 0.9 });
    pallet.position.set(-16.5, 0.07, -2.2);
    intakeGroup.add(pallet);

    // Staged harvest crates (8 crates: green, red, blue)
    for (let r = 0; r < 2; r++) {
      for (let c = 0; c < 2; c++) {
        for (let tier = 0; tier < 2; tier++) {
          const color = (r + c) % 2 === 0 ? 0x2e7d32 : 0xd32f2f;
          const produceColor = (r + c) % 2 === 0 ? 0x43a047 : 0xe53935;

          const crate = box(0.55, 0.26, 0.38, color);
          crate.position.set(-16.78 + c * 0.56, 0.27 + tier * 0.27, -2.39 + r * 0.38);
          intakeGroup.add(crate);

          const produce = box(0.48, 0.08, 0.32, produceColor);
          produce.position.set(-16.78 + c * 0.56, 0.37 + tier * 0.27, -2.39 + r * 0.38);
          intakeGroup.add(produce);
        }
      }
    }

    // Gowning & Personnel Hygiene Washbasin Station
    const sinkBase = box(0.55, 0.9, 0.45, 0xb0bec5, { metal: 0.8 });
    sinkBase.position.set(-16.5, 0.45, 0.2);
    intakeGroup.add(sinkBase);

    const sinkBasin = box(0.5, 0.15, 0.4, 0xffffff, { rough: 0.2 });
    sinkBasin.position.set(-16.5, 0.95, 0.2);
    intakeGroup.add(sinkBasin);

    const faucet = box(0.04, 0.22, 0.12, 0x78909c, { metal: 0.9 });
    faucet.position.set(-16.5, 1.1, 0.1);
    intakeGroup.add(faucet);

    // Boot sanitizing footbath mat
    const footmat = box(0.9, 0.02, 0.6, 0x1565c0);
    footmat.position.set(-16.5, 0.01, 1.0);
    intakeGroup.add(footmat);

    this.group.add(makeInteractable(intakeGroup, {
      id: "raw-intake-buffer",
      title: "Raw Produce Intake & Gowning Buffer",
      info: [
        "Function: Receives graded farm crates & stages for washing",
        "Hygiene: Hands-free sanitization sink & boot bath",
        "Traceability: Batch ID verified before cleanroom entry",
      ],
      assetType: "pallet",
      zone: "processing",
      sourceStatus: "PROPOSED",
    }));
  }

  /**
   * Station 2: Room 1 - Hygienic Washing & Flume Sanitization Bay
   * Enclosed cleanroom room with clear observation glass facade, PVC strip curtains,
   * continuous immersion wash flume, rotary de-stoner drum, and automated water dosing kiosk.
   */
  private buildWashingCleanroomBay(): void {
    const washRoom = new THREE.Group();

    // --- Room Enclosure (Width 6.2m, Depth 5.4m, Height 3.8m, Center x = -10.0, z = -2.2) ---
    // Stainless base kickplate curb
    const curbL = box(0.18, 0.25, 5.4, 0x78909c, { metal: 0.8 });
    curbL.position.set(-13.1, 0.125, -2.2);
    washRoom.add(curbL);

    const curbR = box(0.18, 0.25, 5.4, 0x78909c, { metal: 0.8 });
    curbR.position.set(-6.9, 0.125, -2.2);
    washRoom.add(curbR);

    // Cleanroom Partition Walls (Hygienic composite white panels)
    const wallLeft = box(0.15, 3.8, 5.4, 0xedf2f7);
    wallLeft.position.set(-13.1, 1.9, -2.2);
    washRoom.add(wallLeft);

    const wallBack = box(6.2, 3.8, 0.15, 0xedf2f7);
    wallBack.position.set(-10.0, 1.9, -4.9);
    washRoom.add(wallBack);

    // Right Partition Wall with Pass-Through Conveyor Opening into Room 2
    const wallRightTop = box(0.15, 2.4, 5.4, 0xedf2f7);
    wallRightTop.position.set(-6.9, 2.6, -2.2);
    washRoom.add(wallRightTop);

    const wallRightBotF = box(0.15, 1.4, 2.2, 0xedf2f7);
    wallRightBotF.position.set(-6.9, 0.7, -0.6);
    washRoom.add(wallRightBotF);

    const wallRightBotB = box(0.15, 1.4, 2.2, 0xedf2f7);
    wallRightBotB.position.set(-6.9, 0.7, -3.8);
    washRoom.add(wallRightBotB);

    // Ceiling with recessed LED Cleanroom light bars
    const ceiling = box(6.2, 0.18, 5.4, 0xd0dfea);
    ceiling.position.set(-10.0, 3.8, -2.2);
    washRoom.add(ceiling);

    const ledPanel1 = box(2.4, 0.05, 0.6, 0xffffff, { emissive: 0xffffff });
    ledPanel1.position.set(-10.0, 3.7, -2.2);
    washRoom.add(ledPanel1);

    // Overhead HVAC / HEPA Filter Air Handler on roof
    const hepaUnit = box(1.6, 0.6, 1.2, 0x90a4ae, { metal: 0.6 });
    hepaUnit.position.set(-10.0, 4.2, -2.2);
    washRoom.add(hepaUnit);

    // --- Front Facade (Viewing Window + Operator Doorway) ---
    // Lower front half-wall
    const frontHalfWall = box(3.8, 0.95, 0.15, 0xedf2f7);
    frontHalfWall.position.set(-9.0, 0.475, 0.5);
    washRoom.add(frontHalfWall);

    // Cleanroom Large Observation Glass Window
    const glassMat = new THREE.MeshStandardMaterial({
      color: 0x90caf9,
      transparent: true,
      opacity: 0.35,
      roughness: 0.08,
      metalness: 0.15,
    });
    const glassWindow = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 2.25), glassMat);
    glassWindow.position.set(-9.0, 2.1, 0.5);
    washRoom.add(glassWindow);

    // Window stainless steel frame
    const winFrameT = box(3.8, 0.08, 0.18, 0x37474f, { metal: 0.8 });
    winFrameT.position.set(-9.0, 3.25, 0.5);
    washRoom.add(winFrameT);

    const winFrameB = box(3.8, 0.08, 0.18, 0x37474f, { metal: 0.8 });
    winFrameB.position.set(-9.0, 0.95, 0.5);
    washRoom.add(winFrameB);

    // Doorway opening with translucent hygienic blue PVC strip curtains
    const doorFrame = box(1.8, 3.8, 0.15, 0xedf2f7);
    doorFrame.position.set(-12.1, 1.9, 0.5);
    washRoom.add(doorFrame);

    const pvcMat = new THREE.MeshStandardMaterial({
      color: 0x0288d1,
      transparent: true,
      opacity: 0.45,
      roughness: 0.3,
    });
    for (let s = 0; s < 4; s++) {
      const strip = new THREE.Mesh(new THREE.PlaneGeometry(0.32, 2.6), pvcMat);
      strip.position.set(-12.6 + s * 0.28, 1.3, 0.52);
      washRoom.add(strip);
    }

    // Room Identification Header Plaque
    const roomHeader = label("ROOM 1 · HYGIENIC WASHING & FLUME SANITATION BAY", 4.2, {
      fontSize: 38,
      width: 960,
      height: 160,
      bg: "rgba(15, 32, 54, 0.95)",
    });
    roomHeader.position.set(-9.0, 3.55, 0.6);
    washRoom.add(roomHeader);

    // --- Interior Machines inside Room 1 ---
    // 1. Continuous Stainless Steel Wash Flume & Bubble Tank
    const flumeTank = box(3.6, 0.85, 1.3, 0x90a4ae, { metal: 0.85, rough: 0.25 });
    flumeTank.position.set(-10.0, 0.425, -2.2);
    washRoom.add(flumeTank);

    // Circulating Sanitized Wash Water with transparent cyan plane
    const waterMat = new THREE.MeshStandardMaterial({
      color: 0x00bcd4,
      transparent: true,
      opacity: 0.72,
      roughness: 0.1,
    });
    const water = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 1.1), waterMat);
    water.rotation.x = -Math.PI / 2;
    water.position.set(-10.0, 0.8, -2.2);
    washRoom.add(water);

    // Floating batch produce in water flume
    for (const [ox, oz] of [
      [-1.2, 0.2],
      [-0.6, -0.2],
      [0.0, 0.15],
      [0.7, -0.1],
      [1.2, 0.2],
    ]) {
      const floatingItem = box(0.28, 0.18, 0.28, 0xd32f2f);
      floatingItem.position.set(-10.0 + ox, 0.85, -2.2 + oz);
      washRoom.add(floatingItem);
    }

    // Overhead High-Pressure Spray Headers (3 Stainless Arches with spray nozzles)
    for (const sx of [-11.2, -10.0, -8.8]) {
      const archL = box(0.04, 0.8, 0.04, 0xb0bec5, { metal: 0.9 });
      archL.position.set(sx, 1.25, -2.8);
      washRoom.add(archL);

      const archR = box(0.04, 0.8, 0.04, 0xb0bec5, { metal: 0.9 });
      archR.position.set(sx, 1.25, -1.6);
      washRoom.add(archR);

      const archTop = box(0.04, 0.04, 1.24, 0xb0bec5, { metal: 0.9 });
      archTop.position.set(sx, 1.65, -2.2);
      washRoom.add(archTop);

      // Spray Nozzles
      for (const nz of [-2.5, -2.2, -1.9]) {
        const nozzle = box(0.06, 0.08, 0.06, 0x37474f);
        nozzle.position.set(sx, 1.6, nz);
        washRoom.add(nozzle);
      }
    }

    // 2. Rotary De-Stoning Drum / Soil Separator
    const drum = new THREE.Mesh(
      new THREE.CylinderGeometry(0.45, 0.45, 1.4, 16),
      new THREE.MeshStandardMaterial({ color: 0x78909c, metalness: 0.85, roughness: 0.3 })
    );
    drum.rotation.z = Math.PI / 2;
    drum.position.set(-12.0, 0.9, -2.2);
    washRoom.add(drum);

    const infeedHopper = box(0.8, 0.6, 0.8, 0x607d8b, { metal: 0.7 });
    infeedHopper.position.set(-12.6, 1.3, -2.2);
    washRoom.add(infeedHopper);

    // 3. Automated Chemical Dosing & IoT Water Quality Panel
    const dosingRack = box(0.8, 1.2, 0.3, 0x37474f);
    dosingRack.position.set(-10.0, 2.0, -4.75);
    washRoom.add(dosingRack);

    const jugPAA = box(0.3, 0.4, 0.22, 0x0288d1);
    jugPAA.position.set(-10.2, 1.6, -4.65);
    washRoom.add(jugPAA);

    const jugSan = box(0.3, 0.4, 0.22, 0x43a047);
    jugSan.position.set(-9.8, 1.6, -4.65);
    washRoom.add(jugSan);

    const waterMonitor = label("WASH WATER: 3.8°C\nPAA: 80 PPM · pH: 6.8\nFLOW: 140 L/MIN", 1.4, {
      fontSize: 34,
      width: 440,
      height: 220,
      bg: "#0A2540",
    });
    waterMonitor.position.set(-10.0, 2.2, -4.7);
    washRoom.add(waterMonitor);

    // 4. Stainless Floor Drain Trench with Perforated Grate
    const drainGrate = box(3.6, 0.02, 0.35, 0x455a64, { metal: 0.9 });
    drainGrate.position.set(-10.0, 0.015, -0.8);
    washRoom.add(drainGrate);

    this.group.add(makeInteractable(washRoom, {
      id: "wash-room",
      title: "Room 1: Hygienic Washing & Flume Bay",
      info: [
        "Capacity: 2.5 Tons/hr continuous immersion produce washing",
        "Treatment: High-pressure spray rinse + chilled PAA sanitization (4°C)",
        "Standards: ISO Class 8 Hygienic Wet Cleanroom Enclosure",
      ],
      assetType: "machine",
      zone: "processing",
      sourceStatus: "PROPOSED",
    }));
  }

  /**
   * Station 3: Room 2 - Sterile Cutting, Trimming & Prep Cleanroom Suite
   * Enclosed cleanroom suite with observation glass window, commercial vegetable dicer/slicer machine,
   * dual-sided stainless trimming prep table, recipe formulation terminal, and conveyor pass-through.
   */
  private buildPrepCleanroomSuite(): void {
    const prepRoom = new THREE.Group();

    // --- Room Enclosure (Width 6.4m, Depth 5.4m, Height 3.8m, Center x = -2.3, z = -2.2) ---
    // Stainless base kickplate curb
    const curbL = box(0.18, 0.25, 5.4, 0x78909c, { metal: 0.8 });
    curbL.position.set(-5.5, 0.125, -2.2);
    prepRoom.add(curbL);

    const curbR = box(0.18, 0.25, 5.4, 0x78909c, { metal: 0.8 });
    curbR.position.set(0.9, 0.125, -2.2);
    prepRoom.add(curbR);

    // Cleanroom Partition Walls (Hygienic composite white panels)
    const wallLeft = box(0.15, 3.8, 5.4, 0xedf2f7);
    wallLeft.position.set(-5.5, 1.9, -2.2);
    prepRoom.add(wallLeft);

    const wallBack = box(6.4, 3.8, 0.15, 0xedf2f7);
    wallBack.position.set(-2.3, 1.9, -4.9);
    prepRoom.add(wallBack);

    // Right Partition Wall with Output Conveyor Discharge Opening leading to Packaging Line
    const wallRightTop = box(0.15, 2.4, 5.4, 0xedf2f7);
    wallRightTop.position.set(0.9, 2.6, -2.2);
    prepRoom.add(wallRightTop);

    const wallRightBotF = box(0.15, 1.4, 2.2, 0xedf2f7);
    wallRightBotF.position.set(0.9, 0.7, -0.6);
    prepRoom.add(wallRightBotF);

    const wallRightBotB = box(0.15, 1.4, 2.2, 0xedf2f7);
    wallRightBotB.position.set(0.9, 0.7, -3.8);
    prepRoom.add(wallRightBotB);

    // Ceiling with recessed LED Cleanroom light bars
    const ceiling = box(6.4, 0.18, 5.4, 0xd0dfea);
    ceiling.position.set(-2.3, 3.8, -2.2);
    prepRoom.add(ceiling);

    const ledPanel = box(2.4, 0.05, 0.6, 0xffffff, { emissive: 0xffffff });
    ledPanel.position.set(-2.3, 3.7, -2.2);
    prepRoom.add(ledPanel);

    // Overhead HVAC Air Filtration Exhaust Unit on roof
    const hvacUnit = box(1.6, 0.6, 1.2, 0x90a4ae, { metal: 0.6 });
    hvacUnit.position.set(-2.3, 4.2, -2.2);
    prepRoom.add(hvacUnit);

    // --- Front Facade (Viewing Window + Operator Doorway) ---
    // Lower front half-wall
    const frontHalfWall = box(4.0, 0.95, 0.15, 0xedf2f7);
    frontHalfWall.position.set(-1.3, 0.475, 0.5);
    prepRoom.add(frontHalfWall);

    // Cleanroom Large Observation Glass Window
    const glassMat = new THREE.MeshStandardMaterial({
      color: 0x80cbc4,
      transparent: true,
      opacity: 0.35,
      roughness: 0.08,
      metalness: 0.15,
    });
    const glassWindow = new THREE.Mesh(new THREE.PlaneGeometry(3.8, 2.25), glassMat);
    glassWindow.position.set(-1.3, 2.1, 0.5);
    prepRoom.add(glassWindow);

    // Window frame
    const winFrameT = box(4.0, 0.08, 0.18, 0x37474f, { metal: 0.8 });
    winFrameT.position.set(-1.3, 3.25, 0.5);
    prepRoom.add(winFrameT);

    const winFrameB = box(4.0, 0.08, 0.18, 0x37474f, { metal: 0.8 });
    winFrameB.position.set(-1.3, 0.95, 0.5);
    prepRoom.add(winFrameB);

    // Doorway opening with translucent hygienic yellow PVC strip curtains
    const doorFrame = box(1.8, 3.8, 0.15, 0xedf2f7);
    doorFrame.position.set(-4.5, 1.9, 0.5);
    prepRoom.add(doorFrame);

    const pvcMatYellow = new THREE.MeshStandardMaterial({
      color: 0xfbc02d,
      transparent: true,
      opacity: 0.45,
      roughness: 0.3,
    });
    for (let s = 0; s < 4; s++) {
      const strip = new THREE.Mesh(new THREE.PlaneGeometry(0.32, 2.6), pvcMatYellow);
      strip.position.set(-5.0 + s * 0.28, 1.3, 0.52);
      prepRoom.add(strip);
    }

    // Room Identification Header Plaque
    const roomHeader = label("ROOM 2 · STERILE CUTTING, TRIMMING & PREP SUITE", 4.4, {
      fontSize: 38,
      width: 980,
      height: 160,
      bg: "rgba(15, 32, 54, 0.95)",
    });
    roomHeader.position.set(-1.3, 3.55, 0.6);
    prepRoom.add(roomHeader);

    // --- Interior Machines inside Room 2 ---
    // 1. High-Speed Industrial Produce Dicer / Slicer / Chopper Machine
    const dicerCabinet = box(1.5, 1.4, 1.2, 0x78909c, { metal: 0.85, rough: 0.25 });
    dicerCabinet.position.set(-4.0, 0.7, -2.2);
    prepRoom.add(dicerCabinet);

    // Stainless Infeed Hopper on Top
    const dicerHopper = box(0.7, 0.5, 0.7, 0xb0bec5, { metal: 0.9 });
    dicerHopper.position.set(-4.0, 1.65, -2.2);
    prepRoom.add(dicerHopper);

    // Rotary Cutting Chamber Housing
    const rotaryChamber = new THREE.Mesh(
      new THREE.CylinderGeometry(0.38, 0.38, 0.5, 16),
      new THREE.MeshStandardMaterial({ color: 0x37474f, metalness: 0.9, roughness: 0.2 })
    );
    rotaryChamber.position.set(-4.0, 1.15, -1.6);
    prepRoom.add(rotaryChamber);

    // Digital HMI Touch Control Screen
    const hmiScreen = label("DICER HMI · RUNNING\nBLADE: 12mm · SPEED: 95%\nBATCH: #PREP-2026-B", 0.9, {
      fontSize: 36,
      width: 400,
      height: 220,
      bg: "#0B1D2E",
    });
    hmiScreen.position.set(-4.0, 1.6, -1.55);
    prepRoom.add(hmiScreen);

    // 2. Heavy-Duty Stainless Trimming & Inspection Prep Table
    const prepTable = box(2.8, 0.1, 1.3, 0xb0bec5, { metal: 0.85, rough: 0.25 });
    prepTable.position.set(-1.3, 0.9, -2.2);
    prepRoom.add(prepTable);

    // Stainless Legs
    for (const [lx, lz] of [
      [-2.5, -2.7],
      [-0.1, -2.7],
      [-2.5, -1.7],
      [-0.1, -1.7],
    ]) {
      const leg = box(0.08, 0.85, 0.08, 0x78909c, { metal: 0.8 });
      leg.position.set(lx, 0.45, lz);
      prepRoom.add(leg);
    }

    // Sanitary White HDPE Cutting Board inserts on table
    const cuttingBoard1 = box(1.1, 0.04, 0.9, 0xffffff, { rough: 0.4 });
    cuttingBoard1.position.set(-2.0, 0.97, -2.2);
    prepRoom.add(cuttingBoard1);

    const cuttingBoard2 = box(1.1, 0.04, 0.9, 0xffffff, { rough: 0.4 });
    cuttingBoard2.position.set(-0.6, 0.97, -2.2);
    prepRoom.add(cuttingBoard2);

    // Diced produce trays on prep table
    const dicedTray1 = box(0.45, 0.12, 0.35, 0x2e7d32);
    dicedTray1.position.set(-2.0, 1.05, -2.2);
    prepRoom.add(dicedTray1);

    const dicedTray2 = box(0.45, 0.12, 0.35, 0xd32f2f);
    dicedTray2.position.set(-0.6, 1.05, -2.2);
    prepRoom.add(dicedTray2);

    // 3. Batch Recipe Terminal & Bench Scale mounted on back wall
    const recipeScreen = label("RECIPE: DICED ROOTS\nTARGET: 250g ± 2g\nYIELD EFFICIENCY: 98.2%", 1.4, {
      fontSize: 34,
      width: 440,
      height: 220,
      bg: "#102A43",
    });
    recipeScreen.position.set(-1.3, 2.0, -4.75);
    prepRoom.add(recipeScreen);

    // 4. Organic Trimmings & Waste Chute Collection Bin underneath
    const wasteBin = box(0.65, 0.7, 0.65, 0x5d4037);
    wasteBin.position.set(-2.4, 0.35, -3.4);
    prepRoom.add(wasteBin);

    this.group.add(makeInteractable(prepRoom, {
      id: "prep-room",
      title: "Room 2: Sterile Cutting, Trimming & Prep Suite",
      info: [
        "Equipment: Commercial Multi-Blade Dicer, Precision Trimming Tables",
        "Sanitation: HEPA filtered positive air pressure & UV knife sterilizers",
        "Function: Trims, dices, and proportions batch produce for packaging",
      ],
      assetType: "machine",
      zone: "processing",
      sourceStatus: "PROPOSED",
    }));
  }

  /**
   * Station 4: Automated Conveyor Packaging & Sealing Line (x = 5.4, z = -2.2)
   * Continuous linear conveyor connecting from Room 2's discharge port directly into Room 3 (QA Lab),
   * equipped with an automated tray sealer / flow-wrapper, inkjet batch coder,
   * and overhead dynamic bottleneck telemetry gantry.
   */
  private buildPackagingConveyorLine(): void {
    this.conveyor = new THREE.Group();

    // Main Linear Conveyor Bed (Length 9.6m, Width 0.85m, Height 0.18m, Center x = 5.4, z = -2.2)
    const belt = box(9.6, 0.18, 0.85, 0x263238, { metal: 0.4, rough: 0.6 });
    belt.position.set(5.4, 0.89, -2.2);
    this.conveyor.add(belt);

    // Stainless steel guide side rails
    for (const rz of [-2.65, -1.75]) {
      const sideRail = box(9.6, 0.08, 0.04, 0xb0bec5, { metal: 0.9 });
      sideRail.position.set(5.4, 1.02, rz);
      this.conveyor.add(sideRail);
    }

    // Heavy-duty stainless conveyor support legs
    for (const lx of [1.2, 3.2, 5.2, 7.2, 9.2]) {
      const leg = box(0.12, 0.8, 0.12, 0x455a64, { metal: 0.8 });
      leg.position.set(lx, 0.4, -2.2);
      this.conveyor.add(leg);

      const foot = box(0.24, 0.04, 0.24, 0x78909c);
      foot.position.set(lx, 0.02, -2.2);
      this.conveyor.add(foot);
    }

    // Continuous Moving Packaged Product Units on Conveyor
    for (let i = 0; i < 8; i++) {
      const itemGroup = new THREE.Group();

      // Clear eco-tray base
      const tray = box(0.42, 0.12, 0.32, 0xffffff, { rough: 0.3 });
      tray.position.set(0, 0.06, 0);
      itemGroup.add(tray);

      // Packaged fresh produce contents inside tray
      const contents = box(0.38, 0.1, 0.28, i % 2 === 0 ? 0xd32f2f : 0x43a047);
      contents.position.set(0, 0.14, 0);
      itemGroup.add(contents);

      // Sealed transparent top film
      const film = box(0.42, 0.02, 0.32, 0x90caf9, { rough: 0.1, metal: 0.3 });
      film.position.set(0, 0.2, 0);
      itemGroup.add(film);

      itemGroup.position.set(1.4 + i * 1.15, 0.98, -2.2);
      this.beltItems.push(itemGroup as unknown as THREE.Mesh);
      this.conveyor.add(itemGroup);
    }

    // 1. Automated Tray Sealer / Flow-Wrapper Module
    const sealerCabinet = box(1.8, 1.6, 1.3, 0x546e7a, { metal: 0.85, rough: 0.3 });
    sealerCabinet.position.set(4.0, 1.4, -2.2);
    this.conveyor.add(sealerCabinet);

    // Film Roll Reels on Top
    const filmRoll = new THREE.Mesh(
      new THREE.CylinderGeometry(0.24, 0.24, 0.55, 16),
      new THREE.MeshStandardMaterial({ color: 0x90caf9, metalness: 0.3, roughness: 0.4 })
    );
    filmRoll.rotation.z = Math.PI / 2;
    filmRoll.position.set(4.0, 2.35, -2.2);
    this.conveyor.add(filmRoll);

    // Heat Sealer Chamber Aperture Opening
    const tunnelOpening = box(0.85, 0.4, 0.95, 0x1a2634);
    tunnelOpening.position.set(4.0, 1.05, -2.2);
    this.conveyor.add(tunnelOpening);

    // 2. Continuous Inkjet Batch Coder / Barcode Printer
    const coderPole = box(0.06, 1.4, 0.06, 0x37474f);
    coderPole.position.set(7.0, 1.5, -2.7);
    this.conveyor.add(coderPole);

    const coderHead = box(0.18, 0.22, 0.25, 0xf4a100);
    coderHead.position.set(7.0, 1.3, -2.4);
    this.conveyor.add(coderHead);

    // 3. Overhead Bottleneck & Flow Telemetry Gantry
    const gantryL = box(0.1, 3.2, 0.1, 0x1e3a5f);
    gantryL.position.set(2.8, 1.6, -2.2);
    this.conveyor.add(gantryL);

    const gantryR = box(0.1, 3.2, 0.1, 0x1e3a5f);
    gantryR.position.set(5.2, 1.6, -2.2);
    this.conveyor.add(gantryR);

    const gantryTop = box(2.6, 0.1, 0.1, 0x1e3a5f);
    gantryTop.position.set(4.0, 3.2, -2.2);
    this.conveyor.add(gantryTop);

    this.bottleneckLabel = label("BOTTLENECK: NOMINAL FLOW", 2.8, {
      bg: "#2E7D32",
      fontSize: 48,
      width: 560,
      height: 200,
    });
    this.bottleneckLabel.position.set(4.0, 2.65, -2.2);
    this.conveyor.add(this.bottleneckLabel);

    this.group.add(makeInteractable(this.conveyor, {
      id: "packaging-line",
      title: "Automated Packaging, Sealing & Flow-Wrap Line",
      info: [
        "Speed: 45 Packs / min continuous modified atmosphere packaging (MAP)",
        "Equipment: Rotary Tray Sealer, Thermal Film Chamber, Inkjet Lot Coder",
        "Sensors: Optical infeed photo-eyes with dynamic line bottleneck detection",
      ],
      assetType: "conveyor",
      zone: "packaging",
      sourceStatus: "PROPOSED",
    }));
  }

  /**
   * Station 5: Room 3 - Quality Assurance & Food Safety Laboratory (Enclosed Testing Room)
   * Enclosed cleanroom testing lab with observation glass window, in-line checkweigher,
   * optical metal detector gate, analytical seal burst tester, stereo microscope,
   * microbiology sample retention incubator cabinet, and red defect purge bin.
   */
  private buildQualityTestingCleanroomLab(): void {
    const qaLab = new THREE.Group();

    // --- Room Enclosure (Width 6.0m, Depth 5.4m, Height 3.8m, Center x = 12.8, z = -2.2) ---
    // Stainless base kickplate curb
    const curbL = box(0.18, 0.25, 5.4, 0x78909c, { metal: 0.8 });
    curbL.position.set(9.8, 0.125, -2.2);
    qaLab.add(curbL);

    const curbR = box(0.18, 0.25, 5.4, 0x78909c, { metal: 0.8 });
    curbR.position.set(15.8, 0.125, -2.2);
    qaLab.add(curbR);

    // Cleanroom Partition Walls (Hygienic composite white panels)
    // Left Wall with Conveyor Infeed Cutout from Packaging Line
    const wallLeftTop = box(0.15, 2.4, 5.4, 0xedf2f7);
    wallLeftTop.position.set(9.8, 2.6, -2.2);
    qaLab.add(wallLeftTop);

    const wallLeftBotF = box(0.15, 1.4, 2.2, 0xedf2f7);
    wallLeftBotF.position.set(9.8, 0.7, -0.6);
    qaLab.add(wallLeftBotF);

    const wallLeftBotB = box(0.15, 1.4, 2.2, 0xedf2f7);
    wallLeftBotB.position.set(9.8, 0.7, -3.8);
    qaLab.add(wallLeftBotB);

    const wallBack = box(6.0, 3.8, 0.15, 0xedf2f7);
    wallBack.position.set(12.8, 1.9, -4.9);
    qaLab.add(wallBack);

    // Right Wall with Discharge Port to Finished Goods Pallet
    const wallRightTop = box(0.15, 2.4, 5.4, 0xedf2f7);
    wallRightTop.position.set(15.8, 2.6, -2.2);
    qaLab.add(wallRightTop);

    const wallRightBotF = box(0.15, 1.4, 2.2, 0xedf2f7);
    wallRightBotF.position.set(15.8, 0.7, -0.6);
    qaLab.add(wallRightBotF);

    const wallRightBotB = box(0.15, 1.4, 2.2, 0xedf2f7);
    wallRightBotB.position.set(15.8, 0.7, -3.8);
    qaLab.add(wallRightBotB);

    // Ceiling with recessed LED Cleanroom daylight panels
    const ceiling = box(6.0, 0.18, 5.4, 0xd0dfea);
    ceiling.position.set(12.8, 3.8, -2.2);
    qaLab.add(ceiling);

    const ledPanel = box(2.4, 0.05, 0.6, 0xffffff, { emissive: 0xffffff });
    ledPanel.position.set(12.8, 3.7, -2.2);
    qaLab.add(ledPanel);

    // Overhead HVAC / HEPA Filter Unit on roof
    const hvacUnit = box(1.6, 0.6, 1.2, 0x90a4ae, { metal: 0.6 });
    hvacUnit.position.set(12.8, 4.2, -2.2);
    qaLab.add(hvacUnit);

    // --- Front Facade (Observation Glass Window + Operator Doorway) ---
    // Lower front half-wall
    const frontHalfWall = box(3.8, 0.95, 0.15, 0xedf2f7);
    frontHalfWall.position.set(12.0, 0.475, 0.5);
    qaLab.add(frontHalfWall);

    // Cleanroom Large Observation Glass Window
    const glassMat = new THREE.MeshStandardMaterial({
      color: 0x81d4fa,
      transparent: true,
      opacity: 0.35,
      roughness: 0.08,
      metalness: 0.15,
    });
    const glassWindow = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 2.25), glassMat);
    glassWindow.position.set(12.0, 2.1, 0.5);
    qaLab.add(glassWindow);

    // Window frame
    const winFrameT = box(3.8, 0.08, 0.18, 0x37474f, { metal: 0.8 });
    winFrameT.position.set(12.0, 3.25, 0.5);
    qaLab.add(winFrameT);

    const winFrameB = box(3.8, 0.08, 0.18, 0x37474f, { metal: 0.8 });
    winFrameB.position.set(12.0, 0.95, 0.5);
    qaLab.add(winFrameB);

    // Doorway with translucent blue PVC strip curtains
    const doorFrame = box(1.8, 3.8, 0.15, 0xedf2f7);
    doorFrame.position.set(14.8, 1.9, 0.5);
    qaLab.add(doorFrame);

    const pvcMatBlue = new THREE.MeshStandardMaterial({
      color: 0x0288d1,
      transparent: true,
      opacity: 0.45,
      roughness: 0.3,
    });
    for (let s = 0; s < 4; s++) {
      const strip = new THREE.Mesh(new THREE.PlaneGeometry(0.32, 2.6), pvcMatBlue);
      strip.position.set(14.3 + s * 0.28, 1.3, 0.52);
      qaLab.add(strip);
    }

    // Room Identification Header Plaque
    const roomHeader = label("ROOM 3 · QUALITY ASSURANCE & TESTING LABORATORY", 4.4, {
      fontSize: 38,
      width: 980,
      height: 160,
      bg: "rgba(15, 32, 54, 0.95)",
    });
    roomHeader.position.set(12.0, 3.55, 0.6);
    qaLab.add(roomHeader);

    // --- Interior Testing Equipment inside Room 3 ---
    // 1. In-Line Checkweigher & Metal Detector Tunnel Gate on Infeed
    const detectorTunnel = box(0.65, 0.75, 0.95, 0x37474f, { metal: 0.8 });
    detectorTunnel.position.set(10.6, 1.25, -2.2);
    qaLab.add(detectorTunnel);

    const tunnelCore = box(0.5, 0.5, 0.8, 0x102a43);
    tunnelCore.position.set(10.6, 1.2, -2.2);
    qaLab.add(tunnelCore);

    // 2. Heavy-Duty Stainless Steel QA Workbench Table
    const qcTable = box(2.6, 0.1, 1.3, 0xb0bec5, { metal: 0.85, rough: 0.25 });
    qcTable.position.set(13.2, 0.9, -2.2);
    qaLab.add(qcTable);

    for (const [lx, lz] of [
      [12.1, -2.7],
      [14.3, -2.7],
      [12.1, -1.7],
      [14.3, -1.7],
    ]) {
      const leg = box(0.08, 0.85, 0.08, 0x78909c, { metal: 0.8 });
      leg.position.set(lx, 0.45, lz);
      qaLab.add(leg);
    }

    // 3. Digital Seal Burst & Leak Integrity Testing Chamber
    const sealTester = box(0.5, 0.35, 0.4, 0x112233);
    sealTester.position.set(12.4, 1.12, -2.2);
    qaLab.add(sealTester);

    // 4. Optical Stereo Inspection Microscope on Stand
    const microscopeBase = box(0.24, 0.04, 0.24, 0xffffff);
    microscopeBase.position.set(13.3, 0.97, -2.2);
    qaLab.add(microscopeBase);

    const microscopeArm = box(0.04, 0.32, 0.04, 0x37474f);
    microscopeArm.position.set(13.3, 1.15, -2.3);
    qaLab.add(microscopeArm);

    const microscopeHead = box(0.18, 0.14, 0.22, 0x1565c0);
    microscopeHead.position.set(13.3, 1.28, -2.2);
    qaLab.add(microscopeHead);

    // 5. QA Verification Terminal Tablet Display
    const qaTablet = label("QA VERIFIED · PASS\nSEAL: 100% · WT: 250g ± 1g\nCONTAMINANTS: ZERO", 0.9, {
      fontSize: 34,
      width: 420,
      height: 200,
      bg: "#1565C0",
    });
    qaTablet.position.set(14.0, 1.25, -2.2);
    qaLab.add(qaTablet);

    // 6. Microbiology Retained Sample & Incubation Cabinet on Back Wall
    const sampleCabinet = box(1.2, 1.4, 0.35, 0x607d8b, { metal: 0.7 });
    sampleCabinet.position.set(13.0, 2.0, -4.75);
    qaLab.add(sampleCabinet);

    const sampleGlass = box(1.0, 1.2, 0.02, 0x81d4fa, { rough: 0.1 });
    sampleGlass.position.set(13.0, 2.0, -4.56);
    qaLab.add(sampleGlass);

    // 7. Dedicated Red Non-Conformance Reject Cull Bin
    const rejectBin = box(0.7, 0.8, 0.7, 0xb23a2b);
    rejectBin.position.set(11.2, 0.4, -0.6);
    qaLab.add(rejectBin);

    const rejectLid = box(0.75, 0.08, 0.75, 0x8a2318);
    rejectLid.position.set(11.2, 0.84, -0.6);
    qaLab.add(rejectLid);

    this.group.add(makeInteractable(qaLab, {
      id: "qa-lab-room",
      title: "Room 3: Quality Assurance & Testing Laboratory",
      info: [
        "Function: Enclosed analytical testing cleanroom for final product release",
        "Equipment: Checkweigher, Metal Detector, Seal Burst Tester, Stereo Microscope",
        "Standards: HACCP Critical Control Point (CCP-2) & Microbial Sampling",
      ],
      assetType: "machine",
      zone: "quality",
      sourceStatus: "PROPOSED",
    }));
  }

  /**
   * Station 6: Finished Goods Palletizing & Forklift Dispatch (Far Right: x = 18.2, z = -2.2)
   * Staged shrink-wrapped Euro pallet with finished approved goods, floor staging line, and forklift.
   */
  private buildFinishedGoodsStation(): void {
    const finishedGroup = new THREE.Group();

    // Heavy-Duty Wooden Euro-Pallet
    const pallet = box(1.4, 0.14, 1.1, 0x8d6e63, { rough: 0.9 });
    pallet.position.set(17.2, 0.07, -2.2);
    finishedGroup.add(pallet);

    // Green staging perimeter lane outline
    const outline = box(1.6, 0.015, 1.3, 0x2e7d32);
    outline.position.set(17.2, 0.01, -2.2);
    finishedGroup.add(outline);

    // Stacked Finished Goods Master Cartons (16 boxes in neat tiers)
    for (let r = 0; r < 2; r++) {
      for (let c = 0; c < 2; c++) {
        for (let tier = 0; tier < 2; tier++) {
          const carton = box(0.6, 0.35, 0.45, 0x2e7d32);
          carton.position.set(16.9 + c * 0.62, 0.32 + tier * 0.36, -2.45 + r * 0.48);
          finishedGroup.add(carton);

          // QA Approved Green Stamp Label
          const stamp = box(0.2, 0.1, 0.01, 0xffffff);
          stamp.position.set(16.9 + c * 0.62, 0.32 + tier * 0.36, -2.22 + r * 0.48);
          finishedGroup.add(stamp);
        }
      }
    }

    // 2. Electric Warehouse Counterbalance Forklift
    const forklift = createForklift({ color: 0xf4a100 });
    forklift.position.set(20.0, 0, -2.2);
    forklift.rotation.y = -Math.PI / 2;
    finishedGroup.add(forklift);

    finishedGroup.add(floorDecalAt("APPROVED FINISHED PALLET ➔ COLD DISPATCH", 3.2, "#2E7D32", 17.2, -0.6));

    this.group.add(makeInteractable(finishedGroup, {
      id: "finished-goods-bay",
      title: "Finished Goods Palletizing & Cold Dispatch",
      info: [
        "Status: 100% QA inspected & approved ready for retail distribution",
        "Transfer: Heavy-duty electric forklift transfers pallets to Cold Storage (Scene 3)",
        "Capacity: 48 finished cartons / pallet",
      ],
      assetType: "pallet",
      zone: "finished",
      sourceStatus: "PROPOSED",
    }));
  }

  /**
   * Builds animated industrial workers stationed along the linear flow.
   */
  private buildLineOperators(): void {
    // 1. Washing Bay Operator (Inside Room 1 at Wash Flume)
    const workerWash = createWorkerFigure({
      shirtColor: 0x0288d1, // Waterproof cyan blue
      apronColor: 0xffffff,
      capColor: 0xf4c542,
    });
    workerWash.position.set(-10.0, 0, -1.0);
    workerWash.rotation.y = Math.PI;
    this.workers.push(workerWash);
    this.group.add(makeInteractable(workerWash, {
      id: "worker-wash",
      title: "Washing & Flume Operator",
      info: [
        "Task: Supervises flume immersion washing & sanitizer dosing",
        "PPE: Full waterproof apron, nitrile gloves, safety boots",
      ],
      assetType: "operator",
      zone: "processing",
      sourceStatus: "PROPOSED",
    }));

    // 2. Prep & Dicing Cleanroom Operator (Inside Room 2 at Dicer / Prep Table)
    const workerPrep = createWorkerFigure({
      shirtColor: 0x00897b, // Cleanroom teal
      apronColor: 0xffffff,
      capColor: 0xffffff,
    });
    workerPrep.position.set(-1.3, 0, -1.0);
    workerPrep.rotation.y = Math.PI;
    this.workers.push(workerPrep);
    this.group.add(makeInteractable(workerPrep, {
      id: "worker-prep",
      title: "Prep & Dicing Specialist",
      info: [
        "Task: Operates industrial rotary dicer & conducts produce trimming",
        "Standards: ISO Cleanroom sterile gowning & cut-resistant gloves",
      ],
      assetType: "operator",
      zone: "processing",
      sourceStatus: "PROPOSED",
    }));

    // 3. Packaging Line Infeed Worker (At start of Conveyor Line)
    const workerInfeed = createWorkerFigure({
      shirtColor: 0xe65100, // High-vis orange
      apronColor: 0x263238,
      capColor: 0xf4c542,
    });
    workerInfeed.position.set(2.0, 0, -1.0);
    workerInfeed.rotation.y = Math.PI;
    this.workers.push(workerInfeed);
    this.group.add(makeInteractable(workerInfeed, {
      id: "worker-infeed",
      title: "Packaging Infeed Operator",
      info: [
        "Task: Feeds prepared produce trays into automated tray sealer",
        "Throughput: Ensures synchronized belt spacing",
      ],
      assetType: "operator",
      zone: "packaging",
      sourceStatus: "PROPOSED",
    }));

    // 4. Quality Assurance Inspector (Inside Room 3 at QA Testing Workbench)
    const workerQA = createWorkerFigure({
      shirtColor: 0x1565c0, // Blue QA uniform
      apronColor: 0xffffff, // White sterile lab apron
      capColor: 0xffffff,
    });
    workerQA.position.set(13.2, 0, -1.0);
    workerQA.rotation.y = Math.PI;
    this.workers.push(workerQA);
    this.group.add(makeInteractable(workerQA, {
      id: "worker-qa",
      title: "Quality Assurance Specialist (Room 3)",
      info: [
        "Task: Conducts seal integrity burst tests, microscope check & metal detection logs",
        "Authority: Official batch release & defect purge authorization",
      ],
      assetType: "operator",
      zone: "quality",
      sourceStatus: "PROPOSED",
    }));

    // 5. Finished Goods & Palletizing Handler (Standing cleanly in front of Finished Pallet)
    const workerFinished = createWorkerFigure({
      shirtColor: 0x2e7d32, // Forest green
      apronColor: 0x263238,
      capColor: 0x81c784,
    });
    workerFinished.position.set(17.2, 0, -0.9);
    workerFinished.rotation.y = 0; // Facing the pallet and cartons
    this.workers.push(workerFinished);
    this.group.add(makeInteractable(workerFinished, {
      id: "worker-finished",
      title: "Finished Goods & Dispatch Handler",
      info: [
        "Task: Stacks, wraps, and inspects finished master cartons",
        "Coordination: Directs forklift pallet loading for Cold Store entry",
      ],
      assetType: "operator",
      zone: "finished",
      sourceStatus: "PROPOSED",
    }));
  }

  /**
   * Reacts to scenario simulation updates: Adjusts conveyor belt velocity and bottleneck alerts.
   */
  protected onSnapshot(snap: EngineSnapshot): void {
    const { state } = snap;

    // Conveyor speed slows when queue is high (bottleneck)
    this.beltSpeed = state.queueLength > 20 ? 0.25 : 0.75;

    const isBottleneck = state.queueLength > 20;
    const text = isBottleneck
      ? `BOTTLENECK WARNING\nQUEUE: ${state.queueLength} · FLOW REDUCED`
      : `LINE FLOW NOMINAL\nQUEUE: ${state.queueLength} · VELOCITY 100%`;
    const bg = isBottleneck ? "#b23a2b" : "#2e7d32";

    const mat = this.bottleneckLabel.material as THREE.MeshBasicMaterial;
    const old = mat.map;
    mat.map = makeTextTexture(text, { bg, fontSize: 44, width: 560, height: 200 });
    mat.needsUpdate = true;
    old?.dispose();
  }

  /**
   * Continuous frame animations for conveyor belt product movement and worker arm gestures.
   */
  update(dt: number): void {
    this.workerTime += dt;

    // Animate moving product trays along the continuous packaging conveyor belt
    for (const item of this.beltItems) {
      item.position.x += this.beltSpeed * dt;
      if (item.position.x > 10.4) {
        item.position.x = 1.4;
      }
    }

    // Dynamic arm motions for line workers
    for (let i = 0; i < this.workers.length; i++) {
      const w = this.workers[i];
      const armL = w.getObjectByName("armL");
      const armR = w.getObjectByName("armR");
      const offset = i * 1.8;
      if (armL) armL.rotation.x = 0.45 + Math.sin(this.workerTime * 3.2 + offset) * 0.15;
      if (armR) armR.rotation.x = 0.45 + Math.cos(this.workerTime * 3.2 + offset) * 0.15;
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
