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

  // Dynamic Visual Scenario Elements
  private queueGroup!: THREE.Group;
  private queueStatusLabel!: THREE.Mesh;
  private waterMonitor!: THREE.Mesh;
  private flumeWaterMat!: THREE.MeshStandardMaterial;
  private dicerHmi!: THREE.Mesh;
  private recipeScreen!: THREE.Mesh;
  private dicerAuxGroup!: THREE.Group;
  private qaTablet!: THREE.Mesh;
  private rejectBinGroup!: THREE.Group;
  private finishedPalletGroup!: THREE.Group;
  private cleanroomStatusBeacons: THREE.Mesh[] = [];
  private currentScenarioId = "baseline";

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

    // Dynamic queue crate group container
    this.queueGroup = new THREE.Group();
    intakeGroup.add(this.queueGroup);

    // Overhead dynamic queue telemetry signboard
    this.queueStatusLabel = label("INTAKE QUEUE: INITIALIZING", 2.6, {
      fontSize: 38,
      width: 620,
      height: 200,
      bg: "#E65100",
    });
    this.queueStatusLabel.position.set(-15.6, 2.7, -1.8);
    intakeGroup.add(this.queueStatusLabel);

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
   */
  private buildWashingCleanroomBay(): void {
    const washRoom = new THREE.Group();

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

    // Cleanroom Status Indicator Beacon
    const beacon = box(0.28, 0.22, 0.28, 0x81d4fa, { emissive: 0x81d4fa });
    beacon.position.set(-10.0, 4.0, 0.6);
    washRoom.add(beacon);
    this.cleanroomStatusBeacons.push(beacon);

    // --- Front Facade ---
    const frontHalfWall = box(3.8, 0.95, 0.15, 0xedf2f7);
    frontHalfWall.position.set(-9.0, 0.475, 0.5);
    washRoom.add(frontHalfWall);

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

    const winFrameT = box(3.8, 0.08, 0.18, 0x37474f, { metal: 0.8 });
    winFrameT.position.set(-9.0, 3.25, 0.5);
    washRoom.add(winFrameT);

    const winFrameB = box(3.8, 0.08, 0.18, 0x37474f, { metal: 0.8 });
    winFrameB.position.set(-9.0, 0.95, 0.5);
    washRoom.add(winFrameB);

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

    const roomHeader = label("ROOM 1 · HYGIENIC WASHING & FLUME SANITATION BAY", 4.2, {
      fontSize: 38,
      width: 960,
      height: 160,
      bg: "rgba(15, 32, 54, 0.95)",
    });
    roomHeader.position.set(-9.0, 3.55, 0.6);
    washRoom.add(roomHeader);

    // --- Interior Machines inside Room 1 ---
    const flumeTank = box(3.6, 0.85, 1.3, 0x90a4ae, { metal: 0.85, rough: 0.25 });
    flumeTank.position.set(-10.0, 0.425, -2.2);
    washRoom.add(flumeTank);

    this.flumeWaterMat = new THREE.MeshStandardMaterial({
      color: 0x00bcd4,
      transparent: true,
      opacity: 0.72,
      roughness: 0.1,
    });
    const water = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 1.1), this.flumeWaterMat);
    water.rotation.x = -Math.PI / 2;
    water.position.set(-10.0, 0.8, -2.2);
    washRoom.add(water);

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

      for (const nz of [-2.5, -2.2, -1.9]) {
        const nozzle = box(0.06, 0.08, 0.06, 0x37474f);
        nozzle.position.set(sx, 1.6, nz);
        washRoom.add(nozzle);
      }
    }

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

    const dosingRack = box(0.8, 1.2, 0.3, 0x37474f);
    dosingRack.position.set(-11.4, 1.6, -4.75);
    washRoom.add(dosingRack);

    const jugPAA = box(0.3, 0.4, 0.22, 0x0288d1);
    jugPAA.position.set(-11.6, 1.2, -4.65);
    washRoom.add(jugPAA);

    const jugSan = box(0.3, 0.4, 0.22, 0x43a047);
    jugSan.position.set(-11.2, 1.2, -4.65);
    washRoom.add(jugSan);

    this.waterMonitor = label("WASH WATER: 5.2°C\nPAA: 65 PPM\nEXCURSION: +1.4°C (+3.2°C·h)", 1.6, {
      fontSize: 34,
      width: 460,
      height: 220,
      bg: "#0A2540",
    });
    this.waterMonitor.position.set(-9.2, 2.3, -4.72);
    washRoom.add(this.waterMonitor);

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
   */
  private buildPrepCleanroomSuite(): void {
    const prepRoom = new THREE.Group();

    const curbL = box(0.18, 0.25, 5.4, 0x78909c, { metal: 0.8 });
    curbL.position.set(-5.5, 0.125, -2.2);
    prepRoom.add(curbL);

    const curbR = box(0.18, 0.25, 5.4, 0x78909c, { metal: 0.8 });
    curbR.position.set(0.9, 0.125, -2.2);
    prepRoom.add(curbR);

    const wallLeft = box(0.15, 3.8, 5.4, 0xedf2f7);
    wallLeft.position.set(-5.5, 1.9, -2.2);
    prepRoom.add(wallLeft);

    const wallBack = box(6.4, 3.8, 0.15, 0xedf2f7);
    wallBack.position.set(-2.3, 1.9, -4.9);
    prepRoom.add(wallBack);

    const wallRightTop = box(0.15, 2.4, 5.4, 0xedf2f7);
    wallRightTop.position.set(0.9, 2.6, -2.2);
    prepRoom.add(wallRightTop);

    const wallRightBotF = box(0.15, 1.4, 2.2, 0xedf2f7);
    wallRightBotF.position.set(0.9, 0.7, -0.6);
    prepRoom.add(wallRightBotF);

    const wallRightBotB = box(0.15, 1.4, 2.2, 0xedf2f7);
    wallRightBotB.position.set(0.9, 0.7, -3.8);
    prepRoom.add(wallRightBotB);

    const ceiling = box(6.4, 0.18, 5.4, 0xd0dfea);
    ceiling.position.set(-2.3, 3.8, -2.2);
    prepRoom.add(ceiling);

    const ledPanel = box(2.4, 0.05, 0.6, 0xffffff, { emissive: 0xffffff });
    ledPanel.position.set(-2.3, 3.7, -2.2);
    prepRoom.add(ledPanel);

    const hvacUnit = box(1.6, 0.6, 1.2, 0x90a4ae, { metal: 0.6 });
    hvacUnit.position.set(-2.3, 4.2, -2.2);
    prepRoom.add(hvacUnit);

    const beacon = box(0.28, 0.22, 0.28, 0x81d4fa, { emissive: 0x81d4fa });
    beacon.position.set(-2.3, 4.0, 0.6);
    prepRoom.add(beacon);
    this.cleanroomStatusBeacons.push(beacon);

    const frontHalfWall = box(4.0, 0.95, 0.15, 0xedf2f7);
    frontHalfWall.position.set(-1.3, 0.475, 0.5);
    prepRoom.add(frontHalfWall);

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

    const winFrameT = box(4.0, 0.08, 0.18, 0x37474f, { metal: 0.8 });
    winFrameT.position.set(-1.3, 3.25, 0.5);
    prepRoom.add(winFrameT);

    const winFrameB = box(4.0, 0.08, 0.18, 0x37474f, { metal: 0.8 });
    winFrameB.position.set(-1.3, 0.95, 0.5);
    prepRoom.add(winFrameB);

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

    const roomHeader = label("ROOM 2 · STERILE CUTTING, TRIMMING & PREP SUITE", 4.4, {
      fontSize: 38,
      width: 980,
      height: 160,
      bg: "rgba(15, 32, 54, 0.95)",
    });
    roomHeader.position.set(-1.3, 3.55, 0.6);
    prepRoom.add(roomHeader);

    // Primary Industrial Produce Dicer
    const dicerCabinet = box(1.5, 1.4, 1.2, 0x78909c, { metal: 0.85, rough: 0.25 });
    dicerCabinet.position.set(-4.0, 0.7, -2.2);
    prepRoom.add(dicerCabinet);

    const dicerHopper = box(0.7, 0.5, 0.7, 0xb0bec5, { metal: 0.9 });
    dicerHopper.position.set(-4.0, 1.65, -2.2);
    prepRoom.add(dicerHopper);

    const rotaryChamber = new THREE.Mesh(
      new THREE.CylinderGeometry(0.38, 0.38, 0.5, 16),
      new THREE.MeshStandardMaterial({ color: 0x37474f, metalness: 0.9, roughness: 0.2 })
    );
    rotaryChamber.position.set(-4.0, 1.15, -1.6);
    prepRoom.add(rotaryChamber);

    this.dicerHmi = label("DICER HMI · BOTTLENECK\nRATE: 11.5 C/H (SINGLE)\nQUEUE DELAY: 1.9h", 0.9, {
      fontSize: 36,
      width: 400,
      height: 220,
      bg: "#F57F17",
    });
    this.dicerHmi.position.set(-4.0, 1.6, -1.55);
    prepRoom.add(this.dicerHmi);

    // Auxiliary Secondary High-Speed Dicer (Visible in Improved State to eliminate bottleneck)
    this.dicerAuxGroup = new THREE.Group();
    const auxCabinet = box(1.1, 1.3, 0.9, 0x546e7a, { metal: 0.85 });
    auxCabinet.position.set(-4.0, 0.65, -3.7);
    this.dicerAuxGroup.add(auxCabinet);

    const auxHopper = box(0.5, 0.4, 0.5, 0x90a4ae, { metal: 0.9 });
    auxHopper.position.set(-4.0, 1.45, -3.7);
    this.dicerAuxGroup.add(auxHopper);

    const auxSign = label("AUX DICER #2 · 18 C/H\nBALANCED LOAD", 0.75, {
      fontSize: 32,
      width: 360,
      height: 180,
      bg: "#1B5E20",
    });
    auxSign.position.set(-4.0, 1.4, -3.15);
    this.dicerAuxGroup.add(auxSign);
    this.dicerAuxGroup.visible = false;
    prepRoom.add(this.dicerAuxGroup);

    // Trimming & Prep Table
    const prepTable = box(2.8, 0.1, 1.3, 0xb0bec5, { metal: 0.85, rough: 0.25 });
    prepTable.position.set(-1.3, 0.9, -2.2);
    prepRoom.add(prepTable);

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

    const cuttingBoard1 = box(1.1, 0.04, 0.9, 0xffffff, { rough: 0.4 });
    cuttingBoard1.position.set(-2.0, 0.97, -2.2);
    prepRoom.add(cuttingBoard1);

    const cuttingBoard2 = box(1.1, 0.04, 0.9, 0xffffff, { rough: 0.4 });
    cuttingBoard2.position.set(-0.6, 0.97, -2.2);
    prepRoom.add(cuttingBoard2);

    const dicedTray1 = box(0.45, 0.12, 0.35, 0x2e7d32);
    dicedTray1.position.set(-2.0, 1.05, -2.2);
    prepRoom.add(dicedTray1);

    const dicedTray2 = box(0.45, 0.12, 0.35, 0xd32f2f);
    dicedTray2.position.set(-0.6, 1.05, -2.2);
    prepRoom.add(dicedTray2);

    this.recipeScreen = label("CONVENTIONAL PREP\nYIELD EFFICIENCY: 62.0%\nNET LOSS: ₹33,600", 1.4, {
      fontSize: 34,
      width: 440,
      height: 220,
      bg: "#102A43",
    });
    this.recipeScreen.position.set(-1.3, 2.0, -4.75);
    prepRoom.add(this.recipeScreen);

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
   */
  private buildPackagingConveyorLine(): void {
    this.conveyor = new THREE.Group();

    const belt = box(9.6, 0.18, 0.85, 0x263238, { metal: 0.4, rough: 0.6 });
    belt.position.set(5.4, 0.89, -2.2);
    this.conveyor.add(belt);

    for (const rz of [-2.65, -1.75]) {
      const sideRail = box(9.6, 0.08, 0.04, 0xb0bec5, { metal: 0.9 });
      sideRail.position.set(5.4, 1.02, rz);
      this.conveyor.add(sideRail);
    }

    for (const lx of [1.2, 3.2, 5.2, 7.2, 9.2]) {
      const leg = box(0.12, 0.8, 0.12, 0x455a64, { metal: 0.8 });
      leg.position.set(lx, 0.4, -2.2);
      this.conveyor.add(leg);

      const foot = box(0.24, 0.04, 0.24, 0x78909c);
      foot.position.set(lx, 0.02, -2.2);
      this.conveyor.add(foot);
    }

    for (let i = 0; i < 8; i++) {
      const itemGroup = new THREE.Group();

      const tray = box(0.42, 0.12, 0.32, 0xffffff, { rough: 0.3 });
      tray.position.set(0, 0.06, 0);
      itemGroup.add(tray);

      const contents = box(0.38, 0.1, 0.28, i % 2 === 0 ? 0xd32f2f : 0x43a047);
      contents.position.set(0, 0.14, 0);
      itemGroup.add(contents);

      const film = box(0.42, 0.02, 0.32, 0x90caf9, { rough: 0.1, metal: 0.3 });
      film.position.set(0, 0.2, 0);
      itemGroup.add(film);

      itemGroup.position.set(1.4 + i * 1.15, 0.98, -2.2);
      this.beltItems.push(itemGroup as unknown as THREE.Mesh);
      this.conveyor.add(itemGroup);
    }

    const sealerCabinet = box(1.8, 1.6, 1.3, 0x546e7a, { metal: 0.85, rough: 0.3 });
    sealerCabinet.position.set(4.0, 1.4, -2.2);
    this.conveyor.add(sealerCabinet);

    const filmRoll = new THREE.Mesh(
      new THREE.CylinderGeometry(0.24, 0.24, 0.55, 16),
      new THREE.MeshStandardMaterial({ color: 0x90caf9, metalness: 0.3, roughness: 0.4 })
    );
    filmRoll.rotation.z = Math.PI / 2;
    filmRoll.position.set(4.0, 2.35, -2.2);
    this.conveyor.add(filmRoll);

    const tunnelOpening = box(0.85, 0.4, 0.95, 0x1a2634);
    tunnelOpening.position.set(4.0, 1.05, -2.2);
    this.conveyor.add(tunnelOpening);

    const coderPole = box(0.06, 1.4, 0.06, 0x37474f);
    coderPole.position.set(7.0, 1.5, -2.7);
    this.conveyor.add(coderPole);

    const coderHead = box(0.18, 0.22, 0.25, 0xf4a100);
    coderHead.position.set(7.0, 1.3, -2.4);
    this.conveyor.add(coderHead);

    const gantryL = box(0.1, 4.0, 0.1, 0x1e3a5f);
    gantryL.position.set(2.8, 2.0, -2.2);
    this.conveyor.add(gantryL);

    const gantryR = box(0.1, 4.0, 0.1, 0x1e3a5f);
    gantryR.position.set(5.2, 2.0, -2.2);
    this.conveyor.add(gantryR);

    const gantryTop = box(2.6, 0.1, 0.1, 0x1e3a5f);
    gantryTop.position.set(4.0, 4.0, -2.2);
    this.conveyor.add(gantryTop);

    this.bottleneckLabel = label("BOTTLENECK: NOMINAL FLOW", 2.8, {
      bg: "#2E7D32",
      fontSize: 48,
      width: 560,
      height: 200,
    });
    this.bottleneckLabel.position.set(4.0, 3.35, -2.2);
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
   */
  private buildQualityTestingCleanroomLab(): void {
    const qaLab = new THREE.Group();

    const curbL = box(0.18, 0.25, 5.4, 0x78909c, { metal: 0.8 });
    curbL.position.set(9.8, 0.125, -2.2);
    qaLab.add(curbL);

    const curbR = box(0.18, 0.25, 5.4, 0x78909c, { metal: 0.8 });
    curbR.position.set(15.8, 0.125, -2.2);
    qaLab.add(curbR);

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

    const wallRightTop = box(0.15, 2.4, 5.4, 0xedf2f7);
    wallRightTop.position.set(15.8, 2.6, -2.2);
    qaLab.add(wallRightTop);

    const wallRightBotF = box(0.15, 1.4, 2.2, 0xedf2f7);
    wallRightBotF.position.set(15.8, 0.7, -0.6);
    qaLab.add(wallRightBotF);

    const wallRightBotB = box(0.15, 1.4, 2.2, 0xedf2f7);
    wallRightBotB.position.set(15.8, 0.7, -3.8);
    qaLab.add(wallRightBotB);

    const ceiling = box(6.0, 0.18, 5.4, 0xd0dfea);
    ceiling.position.set(12.8, 3.8, -2.2);
    qaLab.add(ceiling);

    const ledPanel = box(2.4, 0.05, 0.6, 0xffffff, { emissive: 0xffffff });
    ledPanel.position.set(12.8, 3.7, -2.2);
    qaLab.add(ledPanel);

    const hvacUnit = box(1.6, 0.6, 1.2, 0x90a4ae, { metal: 0.6 });
    hvacUnit.position.set(12.8, 4.2, -2.2);
    qaLab.add(hvacUnit);

    const beacon = box(0.28, 0.22, 0.28, 0x81d4fa, { emissive: 0x81d4fa });
    beacon.position.set(12.8, 4.0, 0.6);
    qaLab.add(beacon);
    this.cleanroomStatusBeacons.push(beacon);

    const frontHalfWall = box(3.8, 0.95, 0.15, 0xedf2f7);
    frontHalfWall.position.set(12.0, 0.475, 0.5);
    qaLab.add(frontHalfWall);

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

    const winFrameT = box(3.8, 0.08, 0.18, 0x37474f, { metal: 0.8 });
    winFrameT.position.set(12.0, 3.25, 0.5);
    qaLab.add(winFrameT);

    const winFrameB = box(3.8, 0.08, 0.18, 0x37474f, { metal: 0.8 });
    winFrameB.position.set(12.0, 0.95, 0.5);
    qaLab.add(winFrameB);

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

    const roomHeader = label("ROOM 3 · QUALITY ASSURANCE & TESTING LABORATORY", 4.4, {
      fontSize: 38,
      width: 980,
      height: 160,
      bg: "rgba(15, 32, 54, 0.95)",
    });
    roomHeader.position.set(12.0, 3.55, 0.6);
    qaLab.add(roomHeader);

    const detectorTunnel = box(0.65, 0.75, 0.95, 0x37474f, { metal: 0.8 });
    detectorTunnel.position.set(10.6, 1.25, -2.2);
    qaLab.add(detectorTunnel);

    const tunnelCore = box(0.5, 0.5, 0.8, 0x102a43);
    tunnelCore.position.set(10.6, 1.2, -2.2);
    qaLab.add(tunnelCore);

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

    const sealTester = box(0.5, 0.35, 0.4, 0x112233);
    sealTester.position.set(12.4, 1.12, -2.2);
    qaLab.add(sealTester);

    const microscopeBase = box(0.24, 0.04, 0.24, 0xffffff);
    microscopeBase.position.set(13.3, 0.97, -2.2);
    qaLab.add(microscopeBase);

    const microscopeArm = box(0.04, 0.32, 0.04, 0x37474f);
    microscopeArm.position.set(13.3, 1.15, -2.3);
    qaLab.add(microscopeArm);

    const microscopeHead = box(0.18, 0.14, 0.22, 0x1565c0);
    microscopeHead.position.set(13.3, 1.28, -2.2);
    qaLab.add(microscopeHead);

    this.qaTablet = label("QA RELEASE: 62 UNITS\nSPOILED: 28 CRATES\nREJECTS: 10 CRATES", 0.9, {
      fontSize: 34,
      width: 420,
      height: 200,
      bg: "#0D47A1",
    });
    this.qaTablet.position.set(14.0, 1.25, -2.2);
    qaLab.add(this.qaTablet);

    const sampleCabinet = box(1.2, 1.4, 0.35, 0x607d8b, { metal: 0.7 });
    sampleCabinet.position.set(13.0, 2.0, -4.75);
    qaLab.add(sampleCabinet);

    const sampleGlass = box(1.0, 1.2, 0.02, 0x81d4fa, { rough: 0.1 });
    sampleGlass.position.set(13.0, 2.0, -4.56);
    qaLab.add(sampleGlass);

    // Reject bin container & dynamic reject item group
    const rejectBin = box(0.7, 0.8, 0.7, 0xb23a2b);
    rejectBin.position.set(11.2, 0.4, -0.6);
    qaLab.add(rejectBin);

    const rejectLid = box(0.75, 0.08, 0.75, 0x8a2318);
    rejectLid.position.set(11.2, 0.84, -0.6);
    qaLab.add(rejectLid);

    this.rejectBinGroup = new THREE.Group();
    qaLab.add(this.rejectBinGroup);

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
   */
  private buildFinishedGoodsStation(): void {
    const finishedGroup = new THREE.Group();

    const pallet = box(1.4, 0.14, 1.1, 0x8d6e63, { rough: 0.9 });
    pallet.position.set(17.2, 0.07, -2.2);
    finishedGroup.add(pallet);

    const outline = box(1.6, 0.015, 1.3, 0x2e7d32);
    outline.position.set(17.2, 0.01, -2.2);
    finishedGroup.add(outline);

    // Dynamic finished goods cartons container
    this.finishedPalletGroup = new THREE.Group();
    finishedGroup.add(this.finishedPalletGroup);

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
    const workerWash = createWorkerFigure({
      shirtColor: 0x0288d1,
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

    const workerPrep = createWorkerFigure({
      shirtColor: 0x00897b,
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

    const workerInfeed = createWorkerFigure({
      shirtColor: 0xe65100,
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

    const workerQA = createWorkerFigure({
      shirtColor: 0x1565c0,
      apronColor: 0xffffff,
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

    const workerFinished = createWorkerFigure({
      shirtColor: 0x2e7d32,
      apronColor: 0x263238,
      capColor: 0x81c784,
    });
    workerFinished.position.set(17.2, 0, -0.9);
    workerFinished.rotation.y = 0;
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
   * Helper to refresh text textures on an in-world canvas label.
   */
  private updateLabel(
    labelMesh: THREE.Mesh,
    text: string,
    opts: Parameters<typeof makeTextTexture>[1] = {}
  ): void {
    if (!labelMesh) return;
    const mat = labelMesh.material as THREE.MeshBasicMaterial;
    const oldTex = mat.map;
    mat.map = makeTextTexture(text, opts);
    mat.needsUpdate = true;
    oldTex?.dispose();
  }

  /**
   * Dynamically renders physical crate stacks on the intake floor reflecting scenario queue backlogs.
   */
  private updateQueueVisuals(_queueLength: number, scenarioId: string): void {
    while (this.queueGroup.children.length > 0) {
      const child = this.queueGroup.children[0];
      this.queueGroup.remove(child);
      if (child instanceof THREE.Mesh) {
        child.geometry?.dispose();
        if (Array.isArray(child.material)) child.material.forEach((m) => m.dispose());
        else child.material?.dispose();
      }
    }

    if (scenarioId === "improved") {
      // 1 neat wooden pallet, 5 fresh green crates, clean spacing
      const pallet = box(1.2, 0.14, 0.85, 0x8d6e63, { rough: 0.9 });
      pallet.position.set(-16.0, 0.07, -1.8);
      this.queueGroup.add(pallet);

      const leanBorder = box(1.4, 0.02, 1.05, 0x2e7d32);
      leanBorder.position.set(-16.0, 0.01, -1.8);
      this.queueGroup.add(leanBorder);

      const crateCoords = [
        [-16.3, 0.27, -2.05],
        [-15.7, 0.27, -2.05],
        [-16.3, 0.27, -1.55],
        [-15.7, 0.27, -1.55],
        [-16.0, 0.54, -1.8],
      ];
      for (const [cx, cy, cz] of crateCoords) {
        const crate = box(0.52, 0.26, 0.38, 0x2e7d32);
        crate.position.set(cx, cy, cz);
        this.queueGroup.add(crate);

        const produce = box(0.46, 0.08, 0.32, 0x43a047);
        produce.position.set(cx, cy + 0.1, cz);
        this.queueGroup.add(produce);
      }

      this.updateLabel(
        this.queueStatusLabel,
        `LEAN JIT QUEUE: 5 CRATES\nTACT TIME 100% · ZERO SPOILAGE`,
        { bg: "#1B5E20", fontSize: 40, width: 640, height: 200 }
      );
    } else if (scenarioId === "demandIncrease") {
      // 3 pallets, 34 crates stacked high and spreading
      const pallets = [
        [-16.8, -2.2],
        [-15.4, -2.2],
        [-14.0, -2.2],
      ];
      for (const [px, pz] of pallets) {
        const p = box(1.2, 0.14, 0.85, 0x8d6e63, { rough: 0.9 });
        p.position.set(px, 0.07, pz);
        this.queueGroup.add(p);
      }

      let placed = 0;
      for (let pIdx = 0; pIdx < 3 && placed < 34; pIdx++) {
        const px = pallets[pIdx][0];
        const pz = pallets[pIdx][1];
        for (let tier = 0; tier < 3 && placed < 34; tier++) {
          for (let r = 0; r < 2 && placed < 34; r++) {
            for (let c = 0; c < 2 && placed < 34; c++) {
              const color = placed % 3 === 0 ? 0xd84315 : (placed % 2 === 0 ? 0xf57c00 : 0x2e7d32);
              const crate = box(0.52, 0.25, 0.38, color);
              crate.position.set(px - 0.28 + c * 0.56, 0.26 + tier * 0.26, pz - 0.2 + r * 0.4);
              this.queueGroup.add(crate);

              const prodColor = color === 0x2e7d32 ? 0x43a047 : 0xe65100;
              const produce = box(0.45, 0.07, 0.32, prodColor);
              produce.position.set(px - 0.28 + c * 0.56, 0.35 + tier * 0.26, pz - 0.2 + r * 0.4);
              this.queueGroup.add(produce);
              placed++;
            }
          }
        }
      }
      while (placed < 34) {
        const crate = box(0.52, 0.25, 0.38, 0xd84315);
        crate.position.set(-15.4 + (placed % 2) * 0.56, 1.04, -2.2);
        this.queueGroup.add(crate);
        placed++;
      }

      for (const cx of [-16.9, -13.8]) {
        const cone = box(0.2, 0.45, 0.2, 0xff6d00);
        cone.position.set(cx, 0.22, -1.2);
        this.queueGroup.add(cone);
      }

      this.updateLabel(
        this.queueStatusLabel,
        `SURGE BOTTLENECK: 34 CRATES\nDEMAND SPIKE · ARRIVAL > CAPACITY`,
        { bg: "#D84315", fontSize: 40, width: 640, height: 200 }
      );
    } else if (scenarioId === "coldCapacityDecrease") {
      // 3 pallets + floor overflow, 41 crates stacked chaotically with spoiled brown crates
      const pallets = [
        [-17.0, -2.2],
        [-15.5, -2.2],
        [-14.0, -2.2],
      ];
      for (const [px, pz] of pallets) {
        const p = box(1.2, 0.14, 0.85, 0x8d6e63, { rough: 0.9 });
        p.position.set(px, 0.07, pz);
        this.queueGroup.add(p);
      }

      let placed = 0;
      for (let pIdx = 0; pIdx < 3 && placed < 41; pIdx++) {
        const px = pallets[pIdx][0];
        const pz = pallets[pIdx][1];
        for (let tier = 0; tier < 3 && placed < 41; tier++) {
          for (let r = 0; r < 2 && placed < 41; r++) {
            for (let c = 0; c < 2 && placed < 41; c++) {
              const isSpoiled = placed % 2 === 0;
              const color = isSpoiled ? 0x5d4037 : 0xc62828;
              const crate = box(0.52, 0.25, 0.38, color);
              crate.position.set(px - 0.28 + c * 0.56, 0.26 + tier * 0.26, pz - 0.2 + r * 0.4);
              this.queueGroup.add(crate);

              const prodColor = isSpoiled ? 0x3e2723 : 0xb71c1c;
              const produce = box(0.45, 0.07, 0.32, prodColor);
              produce.position.set(px - 0.28 + c * 0.56, 0.35 + tier * 0.26, pz - 0.2 + r * 0.4);
              this.queueGroup.add(produce);
              placed++;
            }
          }
        }
      }
      while (placed < 41) {
        const crate = box(0.52, 0.25, 0.38, 0x4e342e);
        crate.position.set(-16.0 + (placed - 36) * 0.55, 1.04, -2.1);
        this.queueGroup.add(crate);
        placed++;
      }

      for (const hx of [-17.2, -13.5]) {
        const hazard = box(0.22, 0.5, 0.22, 0xb71c1c, { emissive: 0xb71c1c });
        hazard.position.set(hx, 0.25, -1.2);
        this.queueGroup.add(hazard);
      }

      this.updateLabel(
        this.queueStatusLabel,
        `CRITICAL BACKLOG: 41 CRATES\nCOLD STORE DOWN · SPOILAGE SPIKE`,
        { bg: "#B71C1C", fontSize: 40, width: 640, height: 200 }
      );
    } else {
      // Baseline: 2 pallets, 22 crates
      const pallets = [
        [-16.5, -2.2],
        [-15.0, -2.2],
      ];
      for (const [px, pz] of pallets) {
        const p = box(1.2, 0.14, 0.85, 0x8d6e63, { rough: 0.9 });
        p.position.set(px, 0.07, pz);
        this.queueGroup.add(p);
      }

      let placed = 0;
      for (let pIdx = 0; pIdx < 2 && placed < 22; pIdx++) {
        const px = pallets[pIdx][0];
        const pz = pallets[pIdx][1];
        for (let tier = 0; tier < 3 && placed < 22; tier++) {
          for (let r = 0; r < 2 && placed < 22; r++) {
            for (let c = 0; c < 2 && placed < 22; c++) {
              if (tier === 2 && (r === 1 || c === 1) && placed >= 22) break;
              const color = placed % 2 === 0 ? 0x2e7d32 : 0xd32f2f;
              const crate = box(0.52, 0.25, 0.38, color);
              crate.position.set(px - 0.28 + c * 0.56, 0.26 + tier * 0.26, pz - 0.2 + r * 0.4);
              this.queueGroup.add(crate);

              const prodColor = color === 0x2e7d32 ? 0x43a047 : 0xe53935;
              const produce = box(0.45, 0.07, 0.32, prodColor);
              produce.position.set(px - 0.28 + c * 0.56, 0.35 + tier * 0.26, pz - 0.2 + r * 0.4);
              this.queueGroup.add(produce);
              placed++;
            }
          }
        }
      }
      while (placed < 22) {
        const crate = box(0.52, 0.25, 0.38, 0xd32f2f);
        crate.position.set(-15.8 + (placed - 20) * 0.56, 0.78, -2.2);
        this.queueGroup.add(crate);
        placed++;
      }

      this.updateLabel(
        this.queueStatusLabel,
        `INTAKE QUEUE: 22 CRATES\nDELAY: ~1.9h · TEMP EXCURSION RISING`,
        { bg: "#E65100", fontSize: 40, width: 640, height: 200 }
      );
    }
  }

  /**
   * Dynamically renders finished master cartons according to scenario quantityGood (62 vs 58 vs 48 vs 88).
   */
  private updateFinishedGoodsVisuals(scenarioId: string): void {
    while (this.finishedPalletGroup.children.length > 0) {
      const child = this.finishedPalletGroup.children[0];
      this.finishedPalletGroup.remove(child);
      if (child instanceof THREE.Mesh) {
        child.geometry?.dispose();
        if (Array.isArray(child.material)) child.material.forEach((m) => m.dispose());
        else child.material?.dispose();
      }
    }

    if (scenarioId === "improved") {
      // 24 master cartons (3 full tiers) + transparent protective stretch film + golden QA seal
      for (let tier = 0; tier < 3; tier++) {
        for (let r = 0; r < 2; r++) {
          for (let c = 0; c < 2; c++) {
            const carton = box(0.6, 0.34, 0.45, 0x2e7d32);
            carton.position.set(16.9 + c * 0.62, 0.31 + tier * 0.35, -2.45 + r * 0.48);
            this.finishedPalletGroup.add(carton);

            const stamp = box(0.22, 0.12, 0.01, 0xffd700);
            stamp.position.set(16.9 + c * 0.62, 0.31 + tier * 0.35, -2.22 + r * 0.48);
            this.finishedPalletGroup.add(stamp);
          }
        }
      }

      const wrapMat = new THREE.MeshStandardMaterial({
        color: 0xbbdefb,
        transparent: true,
        opacity: 0.38,
        roughness: 0.15,
      });
      const shrinkWrap = new THREE.Mesh(new THREE.BoxGeometry(1.3, 1.15, 1.05), wrapMat);
      shrinkWrap.position.set(17.2, 0.72, -2.2);
      this.finishedPalletGroup.add(shrinkWrap);

      const banner = label("MAXIMUM SHIPMENT: 88 CRATES\n+42% GAIN · QA RELEASE APPROVED", 2.2, {
        fontSize: 36,
        width: 540,
        height: 180,
        bg: "#1B5E20",
      });
      banner.position.set(17.2, 1.65, -2.2);
      this.finishedPalletGroup.add(banner);
    } else if (scenarioId === "coldCapacityDecrease") {
      // 8 cartons (sparse 1 tier)
      for (let r = 0; r < 2; r++) {
        for (let c = 0; c < 2; c++) {
          const carton = box(0.6, 0.34, 0.45, 0x8d6e63);
          carton.position.set(16.9 + c * 0.62, 0.31, -2.45 + r * 0.48);
          this.finishedPalletGroup.add(carton);
        }
      }

      const banner = label("RESTRICTED DISPATCH: 48 CRATES\n-23% LOSS · BOTTLENECKED", 2.2, {
        fontSize: 36,
        width: 520,
        height: 180,
        bg: "#B71C1C",
      });
      banner.position.set(17.2, 1.05, -2.2);
      this.finishedPalletGroup.add(banner);
    } else if (scenarioId === "demandIncrease") {
      // 12 cartons
      for (let tier = 0; tier < 2; tier++) {
        for (let r = 0; r < 2; r++) {
          for (let c = 0; c < 2; c++) {
            if (tier === 1 && r === 1) continue;
            const carton = box(0.6, 0.34, 0.45, 0xd84315);
            carton.position.set(16.9 + c * 0.62, 0.31 + tier * 0.35, -2.45 + r * 0.48);
            this.finishedPalletGroup.add(carton);
          }
        }
      }

      const banner = label("BELOW TARGET: 58 CRATES\nDEMAND 110 · DEFICIT -52", 2.2, {
        fontSize: 36,
        width: 520,
        height: 180,
        bg: "#E65100",
      });
      banner.position.set(17.2, 1.25, -2.2);
      this.finishedPalletGroup.add(banner);
    } else {
      // Baseline: 16 cartons (2 full tiers)
      for (let tier = 0; tier < 2; tier++) {
        for (let r = 0; r < 2; r++) {
          for (let c = 0; c < 2; c++) {
            const carton = box(0.6, 0.34, 0.45, 0x2e7d32);
            carton.position.set(16.9 + c * 0.62, 0.31 + tier * 0.35, -2.45 + r * 0.48);
            this.finishedPalletGroup.add(carton);

            const stamp = box(0.2, 0.1, 0.01, 0xffffff);
            stamp.position.set(16.9 + c * 0.62, 0.31 + tier * 0.35, -2.22 + r * 0.48);
            this.finishedPalletGroup.add(stamp);
          }
        }
      }

      const banner = label("BASELINE OUTPUT: 62 CRATES\nYIELD: 62% · LOSS: 38 CRATES", 2.2, {
        fontSize: 36,
        width: 520,
        height: 180,
        bg: "#0D47A1",
      });
      banner.position.set(17.2, 1.35, -2.2);
      this.finishedPalletGroup.add(banner);
    }
  }

  /**
   * Dynamically renders defect culls inside and spilling from the QA reject bin.
   */
  private updateRejectBinVisuals(scenarioId: string): void {
    while (this.rejectBinGroup.children.length > 0) {
      const child = this.rejectBinGroup.children[0];
      this.rejectBinGroup.remove(child);
      if (child instanceof THREE.Mesh) {
        child.geometry?.dispose();
        if (Array.isArray(child.material)) child.material.forEach((m) => m.dispose());
        else child.material?.dispose();
      }
    }

    if (scenarioId === "improved") {
      const cull = box(0.18, 0.1, 0.18, 0x78909c);
      cull.position.set(11.2, 0.45, -0.6);
      this.rejectBinGroup.add(cull);
    } else if (scenarioId === "coldCapacityDecrease") {
      for (let i = 0; i < 8; i++) {
        const cull = box(0.25, 0.15, 0.22, 0x5d4037);
        cull.position.set(11.1 + (i % 3) * 0.12, 0.85 + Math.floor(i / 3) * 0.14, -0.6 + (i % 2) * 0.12);
        this.rejectBinGroup.add(cull);
      }
      for (const [sx, sz] of [[11.7, -0.6], [10.7, -0.5], [11.2, -0.1]]) {
        const spill = box(0.28, 0.12, 0.25, 0xb71c1c);
        spill.position.set(sx, 0.06, sz);
        this.rejectBinGroup.add(spill);
      }
    } else if (scenarioId === "demandIncrease") {
      for (let i = 0; i < 6; i++) {
        const cull = box(0.24, 0.14, 0.22, 0xb71c1c);
        cull.position.set(11.1 + (i % 2) * 0.16, 0.75 + Math.floor(i / 2) * 0.12, -0.6);
        this.rejectBinGroup.add(cull);
      }
    } else {
      for (let i = 0; i < 4; i++) {
        const cull = box(0.22, 0.12, 0.2, 0xb71c1c);
        cull.position.set(11.1 + (i % 2) * 0.15, 0.65 + Math.floor(i / 2) * 0.12, -0.6);
        this.rejectBinGroup.add(cull);
      }
    }
  }

  /**
   * Reacts to scenario simulation updates: Transforms 3D crate queues, line speeds, and cleanroom machine displays.
   */
  protected onSnapshot(snap: EngineSnapshot): void {
    const { state, scenarioId } = snap;
    this.currentScenarioId = scenarioId;

    // 1. Dynamic Physical Crate Queue on Intake Floor
    this.updateQueueVisuals(state.queueLength, scenarioId);

    // 2. Dynamic Finished Goods Master Carton Pallet
    this.updateFinishedGoodsVisuals(scenarioId);

    // 3. Dynamic Defect Bin Cull Items
    this.updateRejectBinVisuals(scenarioId);

    // 4. Room 1: Washing Bay Water Monitor & Flume Appearance
    if (scenarioId === "improved") {
      this.updateLabel(
        this.waterMonitor,
        `CHILLED FLUME: 3.2°C OPTIMAL\nPAA: 150 PPM · pH: 6.8\nUV + OZONATION: ACTIVE`,
        { bg: "#1B5E20", fontSize: 34, width: 440, height: 220 }
      );
      this.flumeWaterMat.color.setHex(0x00e5ff);
      this.flumeWaterMat.opacity = 0.88;
    } else if (scenarioId === "coldCapacityDecrease") {
      this.updateLabel(
        this.waterMonitor,
        `CHILLER FAULT: 14.2°C\nPAA: 40 PPM CRITICAL\nCONTAMINATION RISK HIGH`,
        { bg: "#B71C1C", fontSize: 34, width: 440, height: 220 }
      );
      this.flumeWaterMat.color.setHex(0x8d6e63);
      this.flumeWaterMat.opacity = 0.65;
    } else if (scenarioId === "demandIncrease") {
      this.updateLabel(
        this.waterMonitor,
        `WASH WATER: 7.8°C (RISING)\nPAA: 55 PPM (DILUTED)\nFLOW: 17.5 C/H OVERLOAD`,
        { bg: "#E65100", fontSize: 34, width: 440, height: 220 }
      );
      this.flumeWaterMat.color.setHex(0x26c6da);
      this.flumeWaterMat.opacity = 0.72;
    } else {
      this.updateLabel(
        this.waterMonitor,
        `WASH WATER: 5.2°C\nPAA: 65 PPM (SUB-OPTIMAL)\nEXCURSION: +1.4°C (+3.2°C·h)`,
        { bg: "#0D47A1", fontSize: 34, width: 440, height: 220 }
      );
      this.flumeWaterMat.color.setHex(0x00bcd4);
      this.flumeWaterMat.opacity = 0.72;
    }

    // 5. Room 2: Dicer HMI Screen & Recipe Terminal
    if (scenarioId === "improved") {
      this.updateLabel(
        this.dicerHmi,
        `DUAL DICERS: SYNCHRONIZED\nCAPACITY: 18.0 C/H (LEAN)\nSTATUS: ZERO BOTTLENECK`,
        { bg: "#1B5E20", fontSize: 34, width: 400, height: 220 }
      );
      this.updateLabel(
        this.recipeScreen,
        `LEAN U-FLOW FORMULATION\nYIELD: 88.0% (+26% RECOVERY)\nNET SAVINGS: ₹24,960`,
        { bg: "#1B5E20", fontSize: 34, width: 440, height: 220 }
      );
      this.dicerAuxGroup.visible = true;
    } else if (scenarioId === "coldCapacityDecrease") {
      this.updateLabel(
        this.dicerHmi,
        `DICER HMI: THROTTLED\nRATE: 9.8 C/H (STALLED)\nDOWNSTREAM FULL`,
        { bg: "#B71C1C", fontSize: 34, width: 400, height: 220 }
      );
      this.updateLabel(
        this.recipeScreen,
        `HOLD / RETENTION STATE\nYIELD: 48.0% (SPOILED: 40C)\nNET LOSS: ₹48,000`,
        { bg: "#B71C1C", fontSize: 34, width: 440, height: 220 }
      );
      this.dicerAuxGroup.visible = false;
    } else if (scenarioId === "demandIncrease") {
      this.updateLabel(
        this.dicerHmi,
        `DICER: SEVERE BOTTLENECK\nRATE: 11.5 / 17.5 INFLOW\nSURGE CONGESTION`,
        { bg: "#D84315", fontSize: 34, width: 400, height: 220 }
      );
      this.updateLabel(
        this.recipeScreen,
        `HIGH-SPEED RUN\nYIELD: 58.0% (LOSS RISING)\nNET LOSS: ₹37,200`,
        { bg: "#E65100", fontSize: 34, width: 440, height: 220 }
      );
      this.dicerAuxGroup.visible = false;
    } else {
      this.updateLabel(
        this.dicerHmi,
        `DICER HMI: BOTTLENECK\nRATE: 11.5 C/H (SINGLE)\nQUEUE DELAY: 1.9h`,
        { bg: "#F57F17", fontSize: 34, width: 400, height: 220 }
      );
      this.updateLabel(
        this.recipeScreen,
        `CONVENTIONAL PREP\nYIELD EFFICIENCY: 62.0%\nNET LOSS: ₹33,600`,
        { bg: "#102A43", fontSize: 34, width: 440, height: 220 }
      );
      this.dicerAuxGroup.visible = false;
    }

    // 6. Packaging Conveyor Velocity & Bottleneck Gantry Sign
    if (scenarioId === "improved") {
      this.beltSpeed = 1.1;
      this.updateLabel(
        this.bottleneckLabel,
        `CONTINUOUS LEAN FLOW\nQUEUE: 5 CRATES · ZERO DWELL TIME`,
        { bg: "#2E7D32", fontSize: 44, width: 560, height: 200 }
      );
    } else if (scenarioId === "demandIncrease") {
      this.beltSpeed = 0.35;
      this.updateLabel(
        this.bottleneckLabel,
        `SEVERE CAPACITY OVERLOAD\nQUEUE: 34 CRATES · SPEED: 35%`,
        { bg: "#D84315", fontSize: 44, width: 560, height: 200 }
      );
    } else if (scenarioId === "coldCapacityDecrease") {
      this.beltSpeed = 0.22;
      this.updateLabel(
        this.bottleneckLabel,
        `LINE STALLED / BLOCKED\nQUEUE: 41 CRATES · SPEED: 22%`,
        { bg: "#B71C1C", fontSize: 44, width: 560, height: 200 }
      );
    } else {
      this.beltSpeed = 0.6;
      this.updateLabel(
        this.bottleneckLabel,
        `BOTTLENECK WARNING\nQUEUE: 22 CRATES · SPEED: 60%`,
        { bg: "#F57F17", fontSize: 44, width: 560, height: 200 }
      );
    }

    // 7. Room 3: QA Tablet Display
    if (scenarioId === "improved") {
      this.updateLabel(
        this.qaTablet,
        `QA RELEASED: 88 GOOD UNITS\nDEFECTS: 6 (2% MINIMAL)\nSTATUS: ISO 8 CERTIFIED`,
        { bg: "#1B5E20", fontSize: 34, width: 420, height: 200 }
      );
    } else if (scenarioId === "coldCapacityDecrease") {
      this.updateLabel(
        this.qaTablet,
        `CRITICAL QA FAIL\nGOOD: 48 / SPOILED: 40\nNET LOSS: ₹48,000`,
        { bg: "#B71C1C", fontSize: 34, width: 420, height: 200 }
      );
    } else if (scenarioId === "demandIncrease") {
      this.updateLabel(
        this.qaTablet,
        `QA ALERT: 31 SPOILED\nREJECTS: 11 CRATES\nQUEUE DWELL EXCEEDED`,
        { bg: "#E65100", fontSize: 34, width: 420, height: 200 }
      );
    } else {
      this.updateLabel(
        this.qaTablet,
        `QA RELEASE: 62 UNITS\nSPOILED: 28 CRATES\nREJECTS: 10 CRATES`,
        { bg: "#0D47A1", fontSize: 34, width: 420, height: 200 }
      );
    }

    // 8. Cleanroom Roof Beacon Status
    for (const beacon of this.cleanroomStatusBeacons) {
      const mat = beacon.material as THREE.MeshStandardMaterial;
      if (scenarioId === "improved") {
        mat.color.setHex(0x00e676);
        mat.emissive.setHex(0x00e676);
      } else if (scenarioId === "coldCapacityDecrease") {
        mat.color.setHex(0xff1744);
        mat.emissive.setHex(0xff1744);
      } else if (scenarioId === "demandIncrease") {
        mat.color.setHex(0xff9100);
        mat.emissive.setHex(0xff9100);
      } else {
        mat.color.setHex(0x81d4fa);
        mat.emissive.setHex(0x81d4fa);
      }
    }
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

    // Pulse cleanroom beacons in warning/error scenarios
    if (this.currentScenarioId === "coldCapacityDecrease" || this.currentScenarioId === "demandIncrease") {
      const intensity = 0.4 + Math.sin(this.workerTime * 6.0) * 0.4;
      for (const beacon of this.cleanroomStatusBeacons) {
        const mat = beacon.material as THREE.MeshStandardMaterial;
        mat.emissiveIntensity = Math.max(0.1, intensity);
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

