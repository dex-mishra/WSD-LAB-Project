import * as THREE from "three";
import { SceneModule } from "../SceneModule";
import type { SceneKey } from "../../app/palette";
import { box, label, floorDecal, makeTextTexture, createWorkerFigure, createForklift, createRefrigeratedTruck } from "../../app/builders";
import { makeInteractable } from "../../interaction/Interactable";
import type { EngineSnapshot, ScenarioEngine } from "../../simulation/ScenarioEngine";

/**
 * Environment 3: 3-Chamber High-Bay Industrial Cold Storage Complex.
 * Features 3 distinct temperature-controlled rooms (Left, Middle, Right):
 * - Cold Room A: Pre-Cooling & Intake
 * - Cold Room B: Central High-Bay FEFO Storage
 * - Cold Room C: Finished Goods & Blast Storage
 * Each room has a transparent front thermal wall with an industrial cold storage sliding door,
 * high-bay racking systems, pallet inventory, chiller evaporator fans, and overhead lighting.
 */
export class InventoryColdChainScene extends SceneModule {
  readonly key: SceneKey = "inventoryColdChain";

  private fans: THREE.Group[] = [];
  private mists: THREE.Mesh[] = [];
  private palletCargoMeshes: THREE.Mesh[] = [];
  private roomCGroup = new THREE.Group(); // Room C (Secondary chamber) toggled on capacity cuts
  private workers: THREE.Group[] = [];
  private tempDisplayMesh!: THREE.Mesh;
  private capacityDisplayMesh!: THREE.Mesh;
  private fefoDisplayMesh!: THREE.Mesh;
  private animTime = 0;

  constructor(engine: ScenarioEngine) {
    super(engine);
    this.init();
  }

  protected build(): void {
    // 1. Polished Reflective Cold Storage Warehouse Ground Floor
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x9cb0c2,
      roughness: 0.18,
      metalness: 0.25,
    });
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(52, 38), floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.group.add(floor);

    // Floor Guide Markings in front of chambers
    this.group.add(decal("COLD COMPLEX · DOCK APRON", 5.0, "#17324D", 0, 7.2));
    this.group.add(decal("CHAMBER A", 2.2, "#F4C542", -13.5, 5.0));
    this.group.add(decal("CHAMBER B (MAIN)", 2.6, "#2A78A8", 0, 5.0));
    this.group.add(decal("CHAMBER C", 2.2, "#2E7D32", 13.5, 5.0));

    // 2. Build the 3 Cold Storage Chambers (Left, Middle, Right)
    this.buildChamber(-13.5, "COLD ROOM A (PRE-COOLING)", "#f4c542", false);
    this.buildChamber(0, "COLD ROOM B (CENTRAL HIGH-BAY)", "#2a78a8", true);
    this.buildChamber(13.5, "COLD ROOM C (FINISHED GOODS)", "#2e7d32", false, this.roomCGroup);
    this.group.add(this.roomCGroup);

    // 3. Overhead Warehouse Roof Structure & Dividing Walls
    this.buildWarehouseArchitecture();

    // 4. Digital Twin Telemetry Kiosks & Monitoring
    this.buildDigitalTwinMonitors();

    // 5. Loading Dock Apron with Refrigerated Delivery Truck, Forklift & Workers
    this.buildLogisticsDock();

    // Top Facility Signboard
    const title = label("INTEGRATED 3-CHAMBER COLD STORAGE FACILITY", 8.2, {
      fontSize: 48,
      width: 1200,
      height: 200,
      bg: "rgba(10, 26, 44, 0.95)",
    });
    title.position.set(0, 7.6, 4.3);
    this.group.add(title);
  }

  /**
   * Builds one of the 3 cold storage chambers with:
   * - Front Transparent Glass/Insulated Thermal Wall with Metal Mullions
   * - Industrial Cold Storage Sliding Door
   * - High-Bay Pallet Racks (Left & Right within the chamber)
   * - Shrink-Wrapped Pallet Freight
   * - Overhead Evaporator Chiller Blower with Spinning Fans
   * - Overhead High-Bay LED Lights & Frost Mist
   */
  private buildChamber(
    centerX: number,
    roomName: string,
    accentColor: string,
    isCenter: boolean,
    targetGroup: THREE.Group = this.group
  ): void {
    const chamberGroup = new THREE.Group();
    const roomWidth = 11.6;
    const roomHeight = 6.8;
    const frontZ = 4.0;
    const rearZ = -13.5;

    // --- A. Front Transparent Thermal Glass Covering ---
    const glassMat = new THREE.MeshStandardMaterial({
      color: 0xd6ebfc,
      transparent: true,
      opacity: 0.28,
      roughness: 0.1,
      metalness: 0.15,
      depthWrite: false,
      side: THREE.DoubleSide,
    });

    // Glass panel left of door
    const glassLeftW = (roomWidth - 2.8) / 2;
    const glassL = new THREE.Mesh(new THREE.PlaneGeometry(glassLeftW, roomHeight - 0.2), glassMat);
    glassL.position.set(centerX - 1.4 - glassLeftW / 2, roomHeight / 2, frontZ);
    chamberGroup.add(glassL);

    // Glass panel right of door
    const glassR = new THREE.Mesh(new THREE.PlaneGeometry(glassLeftW, roomHeight - 0.2), glassMat);
    glassR.position.set(centerX + 1.4 + glassLeftW / 2, roomHeight / 2, frontZ);
    chamberGroup.add(glassR);

    // Glass panel above door transom
    const glassTop = new THREE.Mesh(new THREE.PlaneGeometry(2.8, roomHeight - 3.8), glassMat);
    glassTop.position.set(centerX, 3.8 + (roomHeight - 3.8) / 2, frontZ);
    chamberGroup.add(glassTop);

    // Steel Framing / Mullions around transparent glass wall
    const frameColor = 0x223547;
    // Top beam
    const topFrame = box(roomWidth, 0.18, 0.2, frameColor);
    topFrame.position.set(centerX, roomHeight, frontZ);
    chamberGroup.add(topFrame);
    // Base sill
    const baseSill = box(roomWidth, 0.12, 0.25, frameColor);
    baseSill.position.set(centerX, 0.06, frontZ);
    chamberGroup.add(baseSill);
    // Outer side uprights
    for (const sx of [-roomWidth / 2, roomWidth / 2]) {
      const col = box(0.18, roomHeight, 0.25, frameColor);
      col.position.set(centerX + sx, roomHeight / 2, frontZ);
      chamberGroup.add(col);
    }

    // --- B. Industrial Cold Storage Sliding Door ---
    const doorGroup = new THREE.Group();
    // Sliding Overhead Track
    const track = box(4.4, 0.14, 0.15, 0x8899aa, { metal: 0.7 });
    track.position.set(centerX + 0.6, 3.85, frontZ + 0.12);
    doorGroup.add(track);

    // Heavy Insulated Door Panel (Slightly open to invite viewing inside!)
    const doorPanel = box(2.2, 3.6, 0.14, 0x165288, { rough: 0.4 });
    const doorXOffset = isCenter ? 0.35 : 0.4; // slightly slid open
    doorPanel.position.set(centerX + doorXOffset, 1.8, frontZ + 0.1);
    doorGroup.add(doorPanel);

    // White insulation face panel with inspection window
    const doorFace = box(2.0, 3.4, 0.02, 0xeaf2f8);
    doorFace.position.set(centerX + doorXOffset, 1.8, frontZ + 0.18);
    doorGroup.add(doorFace);

    // Vision window in door
    const windowGlass = new THREE.Mesh(
      new THREE.PlaneGeometry(0.5, 0.8),
      new THREE.MeshStandardMaterial({
        color: 0x99ccff,
        transparent: true,
        opacity: 0.5,
        roughness: 0.1,
      })
    );
    windowGlass.position.set(centerX + doorXOffset, 2.2, frontZ + 0.2);
    doorGroup.add(windowGlass);

    // Chrome Grab Handle
    const handle = box(0.06, 0.7, 0.08, 0xdde5ed, { metal: 0.9 });
    handle.position.set(centerX + doorXOffset - 0.8, 1.8, frontZ + 0.22);
    doorGroup.add(handle);

    // Yellow/Black Safety Hazard Stripes around doorway
    const hazardL = box(0.12, 3.8, 0.15, 0xf4c542);
    hazardL.position.set(centerX - 1.25, 1.9, frontZ + 0.05);
    doorGroup.add(hazardL);

    const hazardR = box(0.12, 3.8, 0.15, 0xf4c542);
    hazardR.position.set(centerX + 1.25, 1.9, frontZ + 0.05);
    doorGroup.add(hazardR);

    chamberGroup.add(doorGroup);

    // Chamber Header Sign on Glass Top
    const headerSign = label(roomName, 3.6, {
      bg: accentColor,
      fg: "#ffffff",
      fontSize: 44,
      width: 700,
      height: 180,
    });
    headerSign.position.set(centerX, 5.8, frontZ + 0.05);
    chamberGroup.add(headerSign);

    // --- C. High-Bay Racks Inside the Chamber ---
    this.buildInternalRacks(chamberGroup, centerX - 3.2, frontZ, rearZ, true);
    this.buildInternalRacks(chamberGroup, centerX + 3.2, frontZ, rearZ, false);

    // --- D. Rear Evaporator Chiller Unit with Rotating Fans ---
    this.buildChamberChiller(chamberGroup, centerX, rearZ, roomHeight);

    // --- E. Overhead High-Bay LED Lights & Mist ---
    for (const z of [1.5, -3.5, -8.5]) {
      // Light fixture
      const fixture = new THREE.Mesh(
        new THREE.CylinderGeometry(0.2, 0.32, 0.2, 16),
        new THREE.MeshStandardMaterial({ color: 0x223344, metalness: 0.8 })
      );
      fixture.position.set(centerX, roomHeight - 0.2, z);
      chamberGroup.add(fixture);

      // Glowing lens
      const lens = new THREE.Mesh(
        new THREE.CircleGeometry(0.28, 16),
        new THREE.MeshBasicMaterial({ color: 0xf0f8ff, side: THREE.DoubleSide })
      );
      lens.rotation.x = Math.PI / 2;
      lens.position.set(centerX, roomHeight - 0.31, z);
      chamberGroup.add(lens);

      // Point Light
      const pLight = new THREE.PointLight(0xdcf0ff, 0.9, 14, 1.2);
      pLight.position.set(centerX, roomHeight - 0.6, z);
      chamberGroup.add(pLight);
    }

    // Cold Mist Planes
    const mistMat = new THREE.MeshBasicMaterial({
      color: 0xdef0fc,
      transparent: true,
      opacity: 0.12,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    for (let m = 0; m < 3; m++) {
      const mist = new THREE.Mesh(new THREE.PlaneGeometry(5.5, 2.0), mistMat);
      mist.position.set(centerX, 4.0 + m * 0.5, rearZ + 2.5 + m * 3.5);
      mist.rotation.x = -0.15;
      this.mists.push(mist);
      chamberGroup.add(mist);
    }

    targetGroup.add(makeInteractable(chamberGroup, {
      id: `chamber-${centerX}`,
      title: roomName,
      info: [
        "Temperature controlled refrigerated zone",
        "Insulated thermal glass enclosure with rapid sliding door",
        "Selective pallet racking & continuous cold chain logging",
      ],
      assetType: "rack",
      zone: "coldchain",
      sourceStatus: "SOURCE",
    }));
  }

  /**
   * Builds high-bay pallet racking rows inside a chamber.
   */
  private buildInternalRacks(
    parent: THREE.Group,
    rackX: number,
    frontZ: number,
    rearZ: number,
    _isLeft: boolean
  ): void {
    const rackGroup = new THREE.Group();
    const rackWidth = 1.6;
    const beamColor = 0x12569e;
    const uprightColor = 0x8a98a6;
    const tierHeights = [0.25, 1.75, 3.25, 4.75]; // 4 tiers
    const bayCount = 4;
    const startZ = frontZ - 1.8;
    const endZ = rearZ + 2.2;
    const bayLen = (startZ - endZ) / bayCount;

    // Upright frames
    for (let b = 0; b <= bayCount; b++) {
      const z = startZ - b * bayLen;
      for (const ox of [-rackWidth / 2, rackWidth / 2]) {
        const col = box(0.08, 6.2, 0.08, uprightColor);
        col.position.set(rackX + ox, 3.1, z);
        rackGroup.add(col);
      }

      // Diagonal cross-trusses
      for (let t = 0; t < 3; t++) {
        const brace = box(0.04, 0.04, rackWidth * 0.9, uprightColor);
        brace.position.set(rackX, 1.0 + t * 1.5, z);
        brace.rotation.y = Math.PI / 2;
        brace.rotation.z = (t % 2 === 0 ? 1 : -1) * 0.35;
        rackGroup.add(brace);
      }
    }

    // Horizontal beams & Pallet Cargo
    for (let t = 0; t < tierHeights.length; t++) {
      const y = tierHeights[t];
      for (let b = 0; b < bayCount; b++) {
        const zMid = startZ - b * bayLen - bayLen / 2;

        for (const ox of [-rackWidth / 2, rackWidth / 2]) {
          const beam = box(0.06, 0.14, bayLen, beamColor);
          beam.position.set(rackX + ox, y, zMid);
          rackGroup.add(beam);
        }

        // 2 Pallets per bay tier
        for (let p = 0; p < 2; p++) {
          const pZ = zMid - 0.45 + p * 0.9;

          // Wooden Euro-Pallet
          const pallet = box(1.05, 0.1, 0.8, 0xb8884d);
          pallet.position.set(rackX, y + 0.05, pZ);
          rackGroup.add(pallet);

          // Shrink-wrapped freight box
          const cargoHeight = t === 0 ? 0.95 : 1.15;
          const cargoMat = new THREE.MeshStandardMaterial({
            color: 0xeef5fa,
            roughness: 0.25,
            metalness: 0.1,
          });
          const cargo = new THREE.Mesh(
            new THREE.BoxGeometry(0.98, cargoHeight, 0.76),
            cargoMat
          );
          cargo.position.set(rackX, y + 0.1 + cargoHeight / 2, pZ);
          cargo.castShadow = true;
          this.palletCargoMeshes.push(cargo);
          rackGroup.add(cargo);

          // Black strapping band
          const strap = box(1.0, 0.03, 0.78, 0x223344);
          strap.position.set(rackX, y + 0.5, pZ);
          rackGroup.add(strap);
        }
      }
    }

    parent.add(rackGroup);
  }

  /**
   * Builds the evaporator chiller unit on the rear wall of a chamber.
   */
  private buildChamberChiller(
    parent: THREE.Group,
    centerX: number,
    rearZ: number,
    roomHeight: number
  ): void {
    const chiller = new THREE.Group();
    const housing = box(4.8, 1.4, 0.9, 0xd0dfea, { rough: 0.3, metal: 0.4 });
    housing.position.set(centerX, roomHeight - 1.4, rearZ + 0.6);
    chiller.add(housing);

    // Front protective grille
    const grille = box(4.6, 1.2, 0.04, 0x1f2e3d);
    grille.position.set(centerX, roomHeight - 1.4, rearZ + 1.07);
    chiller.add(grille);

    // 3 Evaporator Fan Blowers
    for (const fx of [-1.4, 0, 1.4]) {
      const shroud = new THREE.Mesh(
        new THREE.CylinderGeometry(0.44, 0.44, 0.14, 20),
        new THREE.MeshStandardMaterial({ color: 0x101a24, metalness: 0.6 })
      );
      shroud.rotation.x = Math.PI / 2;
      shroud.position.set(centerX + fx, roomHeight - 1.4, rearZ + 1.1);
      chiller.add(shroud);

      // Rotating fan blade group
      const fanGroup = new THREE.Group();
      fanGroup.position.set(centerX + fx, roomHeight - 1.4, rearZ + 1.13);

      const hub = new THREE.Mesh(
        new THREE.CylinderGeometry(0.1, 0.1, 0.1, 16),
        new THREE.MeshStandardMaterial({ color: 0x8898a6, metalness: 0.8 })
      );
      hub.rotation.x = Math.PI / 2;
      fanGroup.add(hub);

      for (let i = 0; i < 4; i++) {
        const blade = box(0.08, 0.34, 0.02, 0x3a4b5c, { metal: 0.7 });
        blade.position.set(0, 0.17, 0);
        blade.rotation.z = (i * Math.PI) / 2;
        blade.rotation.y = 0.35;
        fanGroup.add(blade);
      }

      this.fans.push(fanGroup);
      chiller.add(fanGroup);
    }

    parent.add(chiller);
  }

  /**
   * Builds the outer warehouse insulated panel walls, dividing partition walls, and roof.
   */
  private buildWarehouseArchitecture(): void {
    const wallMat = new THREE.MeshStandardMaterial({
      color: 0xe2ecf4,
      roughness: 0.6,
      metalness: 0.1,
    });

    // Continuous Rear Wall across all 3 rooms
    const backWall = new THREE.Mesh(new THREE.BoxGeometry(46, 8.5, 0.4), wallMat);
    backWall.position.set(0, 4.25, -14.2);
    this.group.add(backWall);

    // Far Left and Far Right Outer Walls
    for (const wx of [-21.5, 21.5]) {
      const outerWall = new THREE.Mesh(new THREE.BoxGeometry(0.4, 8.5, 22), wallMat);
      outerWall.position.set(wx, 4.25, -3.5);
      this.group.add(outerWall);
    }

    // Chamber Dividing Partition Walls (Between Room A & B, and Room B & C)
    for (const divX of [-7.0, 7.0]) {
      const divider = new THREE.Mesh(new THREE.BoxGeometry(0.3, 7.5, 18.5), wallMat);
      divider.position.set(divX, 3.75, -4.8);
      this.group.add(divider);
    }

    // High Insulated Ceiling Canopy across all chambers
    const ceiling = new THREE.Mesh(
      new THREE.BoxGeometry(46, 0.3, 22),
      new THREE.MeshStandardMaterial({ color: 0xd0dce8, roughness: 0.65 })
    );
    ceiling.position.set(0, 7.6, -3.5);
    this.group.add(ceiling);

    // Steel Structural Girders across ceiling
    for (const z of [3.5, -2.0, -7.5, -13.0]) {
      const girder = box(45, 0.22, 0.22, 0x3d4d5e);
      girder.position.set(0, 7.4, z);
      this.group.add(girder);
    }
  }

  /**
   * Builds digital twin telemetry monitors in the central dock apron area.
   */
  private buildDigitalTwinMonitors(): void {
    // 1. Digital Room Thermometer Display
    this.tempDisplayMesh = label("COLD COMPLEX TEMP\nCHAMBER B: 3.8°C (OK)", 2.8, {
      bg: "#102a45",
      fg: "#ffffff",
      fontSize: 44,
      width: 540,
      height: 220,
    });
    this.tempDisplayMesh.position.set(-4.5, 2.0, 5.4);
    this.tempDisplayMesh.rotation.y = Math.PI / 6;
    this.group.add(this.tempDisplayMesh);

    // 2. Capacity Utilization Gauge
    this.capacityDisplayMesh = label("STORAGE CAPACITY\n118 / 120 Pallets (98%)", 2.8, {
      bg: "#17324d",
      fg: "#ffffff",
      fontSize: 44,
      width: 540,
      height: 220,
    });
    this.capacityDisplayMesh.position.set(4.5, 2.0, 5.4);
    this.capacityDisplayMesh.rotation.y = -Math.PI / 6;
    this.group.add(this.capacityDisplayMesh);

    // 3. FEFO Stock Rotation Status Board
    this.fefoDisplayMesh = label("ROTATION: FEFO ACTIVE\nFirst-Expiry First-Out", 3.4, {
      bg: "#2e7d32",
      fg: "#ffffff",
      fontSize: 44,
      width: 680,
      height: 200,
    });
    this.fefoDisplayMesh.position.set(0, 3.8, 5.8);
    this.group.add(this.fefoDisplayMesh);
  }

  /**
   * Builds the loading dock staging area with a refrigerated delivery box truck,
   * electric forklift carrying a pallet, and 3 human workers.
   */
  private buildLogisticsDock(): void {
    const dockGroup = new THREE.Group();

    // 1. Heavy Refrigerated Delivery Box Truck (Docked on right side near Chamber C)
    const truck = createRefrigeratedTruck({ cabColor: 0x184c7a, cargoColor: 0xf2f6fa });
    truck.position.set(11.5, 0, 9.2);
    truck.rotation.y = -Math.PI / 8;
    dockGroup.add(makeInteractable(truck, {
      id: "cold-chain-truck",
      title: "Refrigerated Delivery Box Truck",
      info: [
        "Equipped with active over-cab Thermo King reefer unit (-18°C to +4°C)",
        "Loading cold-chain produce pallets for direct market dispatch",
      ],
      assetType: "vehicle",
      zone: "coldchain",
      sourceStatus: "SOURCE",
    }));

    // 2. Cold Chain Electric Counterbalance Forklift (Carrying a shrink-wrapped pallet)
    const forklift = createForklift({ color: 0xf4a100 });
    forklift.position.set(-4.2, 0, 8.2);
    forklift.rotation.y = Math.PI / 3;

    // Pallet on the forklift tines
    const forkPallet = box(1.1, 0.1, 0.9, 0xbe8d52);
    forkPallet.position.set(0, 0.22, 1.35);
    forklift.add(forkPallet);

    // 2 Tiers of shrink-wrapped boxes on the forklift pallet
    const forkCargo = box(1.0, 0.85, 0.82, 0xeaf2f8);
    forkCargo.position.set(0, 0.7, 1.35);
    forklift.add(forkCargo);

    const forkStrap = box(1.02, 0.04, 0.84, 0x223344);
    forkStrap.position.set(0, 0.7, 1.35);
    forklift.add(forkStrap);

    dockGroup.add(makeInteractable(forklift, {
      id: "dock-forklift",
      title: "Cold Chain Electric Forklift",
      info: [
        "Rapid pallet transfer from Chamber B high-bay racks to delivery truck",
        "Preserves temperature buffer during staging operations",
      ],
      assetType: "vehicle",
      zone: "coldchain",
      sourceStatus: "SOURCE",
    }));

    // 3. Human Logistics & Quality Team
    // Worker 1: Logistics & Dispatch Manager (Standing by the truck with manifest)
    const workerManager = createWorkerFigure({
      shirtColor: 0x1a4570,
      apronColor: 0xf4c542,
      capColor: 0xffffff,
    });
    workerManager.position.set(8.2, 0, 7.8);
    workerManager.rotation.y = -Math.PI * 0.4;
    this.workers.push(workerManager);
    dockGroup.add(makeInteractable(workerManager, {
      id: "worker-dispatch-manager",
      title: "Cold Logistics Dispatch Manager",
      info: [
        "Verifies digital temperature logs & seal numbers",
        "Authorizes outbound reefer truck departures",
      ],
      assetType: "operator",
      zone: "coldchain",
      sourceStatus: "SOURCE",
    }));

    // Worker 2: Dock Marshall & Forklift Operator (Guiding loading path)
    const workerMarshall = createWorkerFigure({
      shirtColor: 0xb85623,
      apronColor: 0xf4c542,
      capColor: 0xf4c542,
    });
    workerMarshall.position.set(-1.2, 0, 7.5);
    workerMarshall.rotation.y = -Math.PI * 0.6;
    this.workers.push(workerMarshall);
    dockGroup.add(makeInteractable(workerMarshall, {
      id: "worker-dock-marshall",
      title: "Dock Marshall & Loading Specialist",
      info: [
        "Directs forklift traffic in the dock staging area",
        "Monitors rapid turnaround to prevent heat infiltration",
      ],
      assetType: "operator",
      zone: "coldchain",
      sourceStatus: "SOURCE",
    }));

    // Worker 3: Cold Storage Quality Inspector (Standing at Chamber A entrance checking probe)
    const workerInspector = createWorkerFigure({
      shirtColor: 0x2e6f40,
      apronColor: 0xffffff,
      capColor: 0x4aa3df,
    });
    workerInspector.position.set(-13.5, 0, 5.6);
    workerInspector.rotation.y = Math.PI * 0.9;
    this.workers.push(workerInspector);
    dockGroup.add(makeInteractable(workerInspector, {
      id: "worker-cold-inspector",
      title: "Cold Chain Quality Inspector",
      info: [
        "Monitors Chamber A pre-cooling pull-down performance",
        "Samples core produce temperature during intake",
      ],
      assetType: "operator",
      zone: "coldchain",
      sourceStatus: "SOURCE",
    }));

    this.group.add(dockGroup);
  }

  protected onSnapshot(snap: EngineSnapshot): void {
    const { state, flags } = snap;

    // Toggle Room C (Secondary chamber) on cold capacity reduction
    this.roomCGroup.visible = !flags.coldCapacityReduced;

    // Dynamically update cargo pallet colors based on FEFO & spoilage metrics
    const totalPallets = this.palletCargoMeshes.length;
    const spoiledCount = Math.min(
      totalPallets,
      Math.round((state.quantitySpoiled / Math.max(1, state.quantityReceived)) * totalPallets)
    );

    for (let i = 0; i < totalPallets; i++) {
      const mesh = this.palletCargoMeshes[i];
      let isSpoiled: boolean;

      if (flags.fefo) {
        isSpoiled = i < spoiledCount;
      } else {
        isSpoiled = (i * 7) % totalPallets < spoiledCount;
      }

      const mat = mesh.material as THREE.MeshStandardMaterial;
      if (isSpoiled) {
        mat.color.setHex(0xb26852); // Spoiled / thermal excursion hue
      } else {
        mat.color.setHex(0xeaf2f8); // Fresh shrink-wrapped cargo
      }
    }

    // Update Digital Telemetry Displays
    const tempValue = flags.shadePrecooling
      ? `ALL CHAMBERS: 3.8°C\nExcursion: ${state.temperatureExposure} °C·h (OPTIMAL)`
      : `ALL CHAMBERS: 9.4°C\nExcursion: ${state.temperatureExposure} °C·h (EXCURSION)`;
    const tempBg = flags.shadePrecooling ? "#104e8b" : "#b23a2b";
    this.retexture(this.tempDisplayMesh, tempValue, tempBg, 220);

    const capPct = Math.round((state.capacityUsed / Math.max(1, state.capacityAvailable)) * 100);
    this.retexture(
      this.capacityDisplayMesh,
      `TOTAL CAPACITY: ${capPct}%\n${state.capacityUsed} / ${state.capacityAvailable} Pallets`,
      capPct > 95 ? "#b23a2b" : "#17324d",
      220
    );

    this.retexture(
      this.fefoDisplayMesh,
      flags.fefo
        ? "FEFO ROTATION ACTIVE\nFirst-Expiry First-Out (Loss Mitigated)"
        : "FIFO ROTATION (UNSORTED)\nHigh Risk of Internal Lot Spoilage",
      flags.fefo ? "#2e7d32" : "#c47a28",
      200
    );
  }

  private retexture(mesh: THREE.Mesh, text: string, bg: string, h: number): void {
    const mat = mesh.material as THREE.MeshBasicMaterial;
    const old = mat.map;
    mat.map = makeTextTexture(text, { bg, fontSize: 44, width: 540, height: h });
    mat.needsUpdate = true;
    old?.dispose();
  }

  update(dt: number): void {
    this.animTime += dt;

    // Spin industrial evaporator chiller blower fans across all 3 chambers
    for (const fan of this.fans) {
      fan.rotation.z += 12 * dt;
    }

    // Subtle atmospheric mist vapor floating & drifting
    for (let i = 0; i < this.mists.length; i++) {
      const mist = this.mists[i];
      mist.position.y += Math.sin(this.animTime * 1.5 + i) * 0.003;
      mist.position.x += Math.cos(this.animTime * 0.8 + i) * 0.002;
    }

    // Subtle idle working arm animations for human operators
    for (let i = 0; i < this.workers.length; i++) {
      const w = this.workers[i];
      const armL = w.getObjectByName("armL");
      const armR = w.getObjectByName("armR");
      const offset = i * 2.1;
      if (armL) armL.rotation.x = 0.45 + Math.sin(this.animTime * 3.5 + offset) * 0.14;
      if (armR) armR.rotation.x = 0.45 + Math.cos(this.animTime * 3.5 + offset) * 0.14;
    }
  }
}

function decal(text: string, w: number, color: string, x: number, z: number): THREE.Mesh {
  const m = floorDecal(text, w, color);
  m.position.set(x, 0.03, z);
  return m;
}
