import * as THREE from "three";
import type { MiniSceneKey } from "./types";

/**
 * Mini3DViewer: High-performance, lightweight Three.js 3D viewport embedded
 * directly inside the mobile operations companion app.
 * Provides interactive 3D dioramas of all 4 upgraded factory environments:
 * 1. Farm & Inbound Receiving (Tractor trailer, crop beds, IoT weather mast, weighbridge)
 * 2. Modular Cleanroom Processing (Wash flume, prep suite, conveyor, MAP nitrogen sealer)
 * 3. 3-Chamber Cold Storage Complex (Chamber A pre-cooling, B high-bay FEFO, C blast goods)
 * 4. Dispatch Logistics & APMC Mandi Hub (40ft reefer truck, loading dock, retail stalls)
 */
export class Mini3DViewer {
  private container: HTMLElement;
  private renderer!: THREE.WebGLRenderer;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private animId: number | null = null;
  private isInteracting: boolean = false;
  private previousMousePosition = { x: 0, y: 0 };
  private modelGroup!: THREE.Group;
  private activeKey: MiniSceneKey = "farmReceiving";

  // Dynamic animated components per scene
  private animRotators: { mesh: THREE.Object3D; axis: "x" | "y" | "z"; speed: number }[] = [];
  private animOscillators: { mesh: THREE.Object3D; basePos: THREE.Vector3; axis: "x" | "z"; range: number; speed: number }[] = [];
  private beaconMesh: THREE.Mesh | null = null;
  private animClock = 0;

  constructor(container: HTMLElement, initialScene: MiniSceneKey = "farmReceiving") {
    this.container = container;
    this.activeKey = initialScene;
    this.init();
  }

  private init(): void {
    const width = this.container.clientWidth || 360;
    const height = 210;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x17110c); // Warm dark roasted soil tone

    this.camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 100);
    this.camera.position.set(5.8, 4.4, 6.2);
    this.camera.lookAt(0, 0.6, 0);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2.0));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.container.innerHTML = "";
    this.container.appendChild(this.renderer.domElement);

    // Studio Lighting
    const ambientLight = new THREE.AmbientLight(0xfff8ed, 0.85);
    this.scene.add(ambientLight);

    const sun = new THREE.DirectionalLight(0xffedd5, 1.4);
    sun.position.set(6, 10, 5);
    sun.castShadow = true;
    sun.shadow.mapSize.width = 512;
    sun.shadow.mapSize.height = 512;
    this.scene.add(sun);

    const rimLight = new THREE.PointLight(0xf59e0b, 1.2, 14); // Warm golden amber rim
    rimLight.position.set(-4, 3, -3);
    this.scene.add(rimLight);

    this.modelGroup = new THREE.Group();
    this.scene.add(this.modelGroup);

    this.buildCurrentScene();
    this.attachControls();
    this.animate();
  }

  public setScene(key: MiniSceneKey): void {
    if (this.activeKey === key && this.modelGroup.children.length > 0) return;
    this.activeKey = key;
    this.clearModelGroup();
    this.buildCurrentScene();

    // Reset camera viewing angle smoothly
    this.modelGroup.rotation.set(0, 0, 0);
  }

  public getActiveScene(): MiniSceneKey {
    return this.activeKey;
  }

  private clearModelGroup(): void {
    this.animRotators = [];
    this.animOscillators = [];
    this.beaconMesh = null;

    while (this.modelGroup.children.length > 0) {
      const obj = this.modelGroup.children[0];
      this.modelGroup.remove(obj);
      this.disposeObject(obj);
    }
  }

  private disposeObject(obj: THREE.Object3D): void {
    obj.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        mesh.geometry?.dispose();
        if (Array.isArray(mesh.material)) {
          mesh.material.forEach((m) => m.dispose());
        } else if (mesh.material) {
          mesh.material.dispose();
        }
      }
    });
  }

  private buildCurrentScene(): void {
    switch (this.activeKey) {
      case "farmReceiving":
        this.buildFarmReceivingScene();
        break;
      case "processingPackaging":
        this.buildCleanroomProcessingScene();
        break;
      case "inventoryColdChain":
        this.build3ChamberColdScene();
        break;
      case "dispatchMarket":
        this.buildDispatchMarketScene();
        break;
    }
  }

  /* --------------------------------------------------------------------------
     1. FARM & INBOUND RECEIVING DIORAMA
     -------------------------------------------------------------------------- */
  private buildFarmReceivingScene(): void {
    // Ground: Rich agricultural earth (left) & asphalt receiving ramp (right)
    const soilMat = new THREE.MeshStandardMaterial({ color: 0x5c4228, roughness: 0.95 });
    const soil = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.15, 5.4), soilMat);
    soil.position.set(-1.8, -0.075, 0);
    soil.receiveShadow = true;
    this.modelGroup.add(soil);

    const apronMat = new THREE.MeshStandardMaterial({ color: 0x272e39, roughness: 0.8 });
    const apron = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.15, 5.4), apronMat);
    apron.position.set(1.8, -0.075, 0);
    apron.receiveShadow = true;
    this.modelGroup.add(apron);

    // Multi-Crop Raised Beds (Capsicum / Tomatoes / Greens)
    for (let z = -1.8; z <= 1.8; z += 0.9) {
      const bed = new THREE.Mesh(
        new THREE.BoxGeometry(2.8, 0.12, 0.55),
        new THREE.MeshStandardMaterial({ color: 0x3d2b1a, roughness: 0.9 })
      );
      bed.position.set(-2.0, 0.06, z);
      this.modelGroup.add(bed);

      // Crop plants along bed
      const cropMat = new THREE.MeshStandardMaterial({ color: z < 0 ? 0x22c55e : 0x16a34a, roughness: 0.6 });
      for (let x = -3.1; x <= -0.9; x += 0.45) {
        const plant = new THREE.Mesh(new THREE.SphereGeometry(0.12, 6, 6), cropMat);
        plant.scale.set(1, 1.4, 1);
        plant.position.set(x, 0.22, z);
        this.modelGroup.add(plant);
      }
    }

    // High-Tech Utility Farm Tractor & Trailer
    const tractorGroup = new THREE.Group();
    tractorGroup.position.set(1.4, 0, 0.6);

    // Tractor Body (Green & Yellow)
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.3, metalness: 0.2 });
    const hood = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.5, 0.65), bodyMat);
    hood.position.set(-0.2, 0.38, 0);
    hood.castShadow = true;
    tractorGroup.add(hood);

    const cabMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.4 });
    const cabRoof = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.06, 0.62), cabMat);
    cabRoof.position.set(0.32, 0.85, 0);
    tractorGroup.add(cabRoof);

    // Big Rear Wheels & Front Wheels
    const tireMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.9 });
    const rimMat = new THREE.MeshStandardMaterial({ color: 0xfacc15 });

    const makeWheel = (r: number, w: number, x: number, z: number) => {
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(r, r, w, 12), tireMat);
      wheel.rotation.x = Math.PI / 2;
      wheel.position.set(x, r, z);
      wheel.castShadow = true;
      const rim = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.55, r * 0.55, w * 1.05, 8), rimMat);
      rim.rotation.x = Math.PI / 2;
      rim.position.set(x, r, z);
      tractorGroup.add(wheel);
      tractorGroup.add(rim);
    };
    makeWheel(0.32, 0.18, 0.32, -0.42);
    makeWheel(0.32, 0.18, 0.32, 0.42);
    makeWheel(0.2, 0.12, -0.45, -0.38);
    makeWheel(0.2, 0.12, -0.45, 0.38);

    // Harvest Trailer hitched behind
    const trailer = new THREE.Mesh(
      new THREE.BoxGeometry(1.4, 0.35, 0.95),
      new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.4 })
    );
    trailer.position.set(1.6, 0.32, 0);
    trailer.castShadow = true;
    tractorGroup.add(trailer);

    // Harvest Crates inside trailer
    const crateColors = [0xef4444, 0x10b981, 0xf59e0b, 0x10b981];
    let ci = 0;
    for (let cx = 1.1; cx <= 2.1; cx += 0.45) {
      for (let cz = -0.3; cz <= 0.3; cz += 0.3) {
        const c = new THREE.Mesh(
          new THREE.BoxGeometry(0.38, 0.22, 0.25),
          new THREE.MeshStandardMaterial({ color: crateColors[ci++ % crateColors.length], roughness: 0.4 })
        );
        c.position.set(cx, 0.58, cz);
        tractorGroup.add(c);
      }
    }
    this.modelGroup.add(tractorGroup);

    // Drive-Over Weighbridge Platform
    const wbPlatform = new THREE.Mesh(
      new THREE.BoxGeometry(2.0, 0.08, 1.3),
      new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.5, roughness: 0.4 })
    );
    wbPlatform.position.set(1.6, 0.04, -1.6);
    this.modelGroup.add(wbPlatform);

    // Weighbridge Kiosk Display Post
    const kiosk = new THREE.Mesh(
      new THREE.BoxGeometry(0.18, 0.85, 0.18),
      new THREE.MeshStandardMaterial({ color: 0x334155 })
    );
    kiosk.position.set(2.8, 0.42, -1.6);
    const screen = new THREE.Mesh(
      new THREE.BoxGeometry(0.06, 0.24, 0.32),
      new THREE.MeshBasicMaterial({ color: 0x10b981 }) // 2,400 kg green display
    );
    screen.position.set(2.74, 0.72, -1.6);
    this.modelGroup.add(kiosk);
    this.modelGroup.add(screen);

    // Smart IoT Weather & Microclimate Mast
    const iotPole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.04, 0.04, 1.8),
      new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.8 })
    );
    iotPole.position.set(-0.3, 0.9, -1.9);
    this.modelGroup.add(iotPole);

    // Solar Panel on mast
    const panel = new THREE.Mesh(
      new THREE.BoxGeometry(0.42, 0.02, 0.3),
      new THREE.MeshStandardMaterial({ color: 0x1e3a8a, metalness: 0.9, roughness: 0.1 })
    );
    panel.rotation.x = Math.PI / 5;
    panel.position.set(-0.3, 1.7, -1.9);
    this.modelGroup.add(panel);

    // Blinking IoT Beacon
    const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 8), new THREE.MeshBasicMaterial({ color: 0x06b6d4 }));
    beacon.position.set(-0.3, 1.88, -1.9);
    this.beaconMesh = beacon;
    this.modelGroup.add(beacon);

    // QC Testing Table with Refractometer
    const qcTable = new THREE.Mesh(
      new THREE.BoxGeometry(0.9, 0.65, 0.5),
      new THREE.MeshStandardMaterial({ color: 0xcbd5e1, metalness: 0.7, roughness: 0.2 })
    );
    qcTable.position.set(0.1, 0.32, 1.8);
    this.modelGroup.add(qcTable);
  }

  /* --------------------------------------------------------------------------
     2. CLEANROOM PROCESSING & PACKAGING DIORAMA
     -------------------------------------------------------------------------- */
  private buildCleanroomProcessingScene(): void {
    // Floor: Epoxy Cleanroom Floor with Perimeter Wall
    const floorMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.3, metalness: 0.1 });
    const floor = new THREE.Mesh(new THREE.BoxGeometry(7.2, 0.15, 5.4), floorMat);
    floor.position.y = -0.075;
    floor.receiveShadow = true;
    this.modelGroup.add(floor);

    // Architectural Cleanroom Back Partition (White hygienic panels)
    const wallMat = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.2 });
    const backWall = new THREE.Mesh(new THREE.BoxGeometry(7.2, 2.0, 0.15), wallMat);
    backWall.position.set(0, 1.0, -2.6);
    this.modelGroup.add(backWall);

    // Cleanroom Air Shower Entry Portal (Left)
    const airShower = new THREE.Mesh(
      new THREE.BoxGeometry(1.2, 1.8, 1.0),
      new THREE.MeshStandardMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.4, roughness: 0.1 })
    );
    airShower.position.set(-2.6, 0.9, -1.8);
    this.modelGroup.add(airShower);

    // Stainless Steel Flume Wash & Ozone Sanitization Basin
    const flumeGroup = new THREE.Group();
    flumeGroup.position.set(-1.4, 0, 0.3);

    const ssMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.85, roughness: 0.2 });
    const basin = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.7, 0.8), ssMat);
    basin.position.y = 0.35;
    flumeGroup.add(basin);

    // Agitated Sanitizer Water Surface
    const waterMat = new THREE.MeshStandardMaterial({
      color: 0x06b6d4,
      transparent: true,
      opacity: 0.75,
      roughness: 0.1,
    });
    const water = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 0.65), waterMat);
    water.rotation.x = -Math.PI / 2;
    water.position.y = 0.71;
    flumeGroup.add(water);
    this.modelGroup.add(flumeGroup);

    // Automated Packaging Conveyor Belt (Linear Flow)
    const conveyorGroup = new THREE.Group();
    conveyorGroup.position.set(1.2, 0, 0.2);

    const beltMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.7 });
    const belt = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.08, 0.7), beltMat);
    belt.position.y = 0.75;
    conveyorGroup.add(belt);

    // Conveyor Legs
    for (const cx of [-1.3, 0, 1.3]) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.75), ssMat);
      leg.position.set(cx, 0.375, 0.3);
      conveyorGroup.add(leg);
      const leg2 = leg.clone();
      leg2.position.z = -0.3;
      conveyorGroup.add(leg2);
    }

    // Nitrogen MAP Packaging Gantry Sealer Unit
    const mapGantry = new THREE.Mesh(
      new THREE.BoxGeometry(0.7, 0.9, 0.85),
      new THREE.MeshStandardMaterial({ color: 0xe8930c, roughness: 0.3 })
    );
    mapGantry.position.set(0.1, 1.15, 0);
    conveyorGroup.add(mapGantry);

    // Nitrogen Cylinder Bank
    const n2Tank = new THREE.Mesh(
      new THREE.CylinderGeometry(0.14, 0.14, 1.1, 12),
      new THREE.MeshStandardMaterial({ color: 0x2563eb, metalness: 0.7 })
    );
    n2Tank.position.set(0.1, 0.55, -0.65);
    conveyorGroup.add(n2Tank);

    // Packets moving on belt
    for (let px = -1.2; px <= 1.2; px += 0.6) {
      const pack = new THREE.Mesh(
        new THREE.BoxGeometry(0.28, 0.08, 0.24),
        new THREE.MeshStandardMaterial({ color: 0x10b981, roughness: 0.3 })
      );
      pack.position.set(px, 0.83, 0);
      conveyorGroup.add(pack);
      this.animOscillators.push({ mesh: pack, basePos: pack.position.clone(), axis: "x", range: 0.25, speed: 0.02 });
    }
    this.modelGroup.add(conveyorGroup);

    // QA Testing Laboratory Station (Room 3)
    const qaBench = new THREE.Mesh(
      new THREE.BoxGeometry(1.3, 0.7, 0.6),
      new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.2 })
    );
    qaBench.position.set(-2.4, 0.35, 1.6);
    this.modelGroup.add(qaBench);

    const microscope = new THREE.Mesh(
      new THREE.CylinderGeometry(0.05, 0.08, 0.35, 8),
      new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.9 })
    );
    microscope.position.set(-2.4, 0.85, 1.6);
    this.modelGroup.add(microscope);
  }

  /* --------------------------------------------------------------------------
     3. 3-CHAMBER INDUSTRIAL COLD STORAGE COMPLEX DIORAMA
     -------------------------------------------------------------------------- */
  private build3ChamberColdScene(): void {
    // Floor: Reflective Cold Room Floor with Safety Demarcation Lines
    const floorMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.2, metalness: 0.3 });
    const floor = new THREE.Mesh(new THREE.BoxGeometry(7.2, 0.15, 5.4), floorMat);
    floor.position.y = -0.075;
    floor.receiveShadow = true;
    this.modelGroup.add(floor);

    // Build the 3 side-by-side Cold Chambers:
    // Chamber A: Left (-2.2), Chamber B: Center (0), Chamber C: Right (2.2)
    const chambers = [
      { x: -2.3, name: "A", color: 0xf59e0b, temp: "2.2°C", label: "PRE-COOL" },
      { x: 0.0, name: "B", color: 0x0ea5e9, temp: "0.8°C", label: "HIGH-BAY FEFO" },
      { x: 2.3, name: "C", color: 0x10b981, temp: "3.2°C", label: "BLAST STAGING" },
    ];

    const wallMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.5 });
    const glassMat = new THREE.MeshStandardMaterial({
      color: 0x7dd3fc,
      transparent: true,
      opacity: 0.35,
      roughness: 0.1,
      metalness: 0.8,
    });

    chambers.forEach((ch) => {
      const room = new THREE.Group();
      room.position.set(ch.x, 0, -0.6);

      // PUF Wall Frame
      const box = new THREE.Mesh(new THREE.BoxGeometry(2.0, 1.8, 2.4), wallMat);
      box.position.y = 0.9;
      room.add(box);

      // Transparent Front Inspection Pane
      const frontGlass = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.4, 0.06), glassMat);
      frontGlass.position.set(0, 0.9, 1.21);
      room.add(frontGlass);

      // Chamber Sliding Door Edge (Color-coded)
      const doorEdge = new THREE.Mesh(
        new THREE.BoxGeometry(0.7, 1.4, 0.08),
        new THREE.MeshStandardMaterial({ color: ch.color, roughness: 0.3 })
      );
      doorEdge.position.set(-0.45, 0.9, 1.23);
      room.add(doorEdge);

      // Temperature Digital Display Screen
      const tempDisplay = new THREE.Mesh(
        new THREE.BoxGeometry(0.42, 0.18, 0.06),
        new THREE.MeshBasicMaterial({ color: 0x000000 })
      );
      tempDisplay.position.set(0.35, 1.5, 1.24);
      room.add(tempDisplay);

      const tempLed = new THREE.Mesh(
        new THREE.BoxGeometry(0.36, 0.12, 0.07),
        new THREE.MeshBasicMaterial({ color: ch.color })
      );
      tempLed.position.set(0.35, 1.5, 1.25);
      room.add(tempLed);

      // Internal High-Bay Storage Racks & Pallets
      const rackMat = new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.7 });
      for (const rx of [-0.5, 0.5]) {
        for (const ry of [0.4, 0.9, 1.4]) {
          const beam = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.04, 1.8), rackMat);
          beam.position.set(rx, ry, 0);
          room.add(beam);

          // Crate stack
          const crateStack = new THREE.Mesh(
            new THREE.BoxGeometry(0.65, 0.22, 0.5),
            new THREE.MeshStandardMaterial({ color: ch.color, roughness: 0.5 })
          );
          crateStack.position.set(rx, ry + 0.13, 0.2);
          room.add(crateStack);
        }
      }

      // Overhead Evaporator Fan Unit
      const evapMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.3 });
      const evap = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.25, 0.4), evapMat);
      evap.position.set(0, 1.62, -0.4);
      room.add(evap);

      // Spinning Chiller Fan Blade
      const fanBlade = new THREE.Mesh(
        new THREE.BoxGeometry(0.32, 0.03, 0.02),
        new THREE.MeshBasicMaterial({ color: 0x0f172a })
      );
      fanBlade.position.set(0, 1.62, -0.19);
      room.add(fanBlade);
      this.animRotators.push({ mesh: fanBlade, axis: "z", speed: 0.35 });

      this.modelGroup.add(room);
    });

    // Heavy Electric High-Reach Forklift FL-02 in Staging Apron
    const flGroup = new THREE.Group();
    flGroup.position.set(-0.6, 0, 1.5);
    flGroup.rotation.y = -Math.PI / 4;

    const flBody = new THREE.Mesh(
      new THREE.BoxGeometry(0.7, 0.45, 1.1),
      new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.4 }) // Industrial safety yellow
    );
    flBody.position.y = 0.32;
    flGroup.add(flBody);

    // Mast and Forks
    const mast = new THREE.Mesh(
      new THREE.BoxGeometry(0.5, 1.2, 0.08),
      new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.8 })
    );
    mast.position.set(0, 0.7, 0.6);
    flGroup.add(mast);

    const forks = new THREE.Mesh(
      new THREE.BoxGeometry(0.4, 0.04, 0.55),
      new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.9 })
    );
    forks.position.set(0, 0.2, 0.85);
    flGroup.add(forks);

    this.modelGroup.add(flGroup);
  }

  /* --------------------------------------------------------------------------
     4. DISPATCH LOGISTICS & RETAIL MANDI HUB DIORAMA
     -------------------------------------------------------------------------- */
  private buildDispatchMarketScene(): void {
    // Split Ground: Asphalt Road (Left) + Paved Market Sidewalk (Right)
    const roadMat = new THREE.MeshStandardMaterial({ color: 0x1f242d, roughness: 0.9 });
    const road = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.15, 5.4), roadMat);
    road.position.set(-1.5, -0.075, 0);
    this.modelGroup.add(road);

    const plazaMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.5 });
    const plaza = new THREE.Mesh(new THREE.BoxGeometry(3.0, 0.15, 5.4), plazaMat);
    plaza.position.set(2.1, -0.075, 0);
    this.modelGroup.add(plaza);

    // Raised Dispatch Dock & Overhead Weather Canopy (Rear left)
    const dock = new THREE.Mesh(
      new THREE.BoxGeometry(3.8, 0.45, 1.8),
      new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.6 })
    );
    dock.position.set(-1.6, 0.22, -1.8);
    this.modelGroup.add(dock);

    // 40ft Multi-Zone Refrigerated Delivery Truck (Reefer Fleet)
    const truckGroup = new THREE.Group();
    truckGroup.position.set(-1.4, 0, 0.4);

    // Truck Cab
    const cabMat = new THREE.MeshStandardMaterial({ color: 0x2563eb, roughness: 0.3 });
    const cab = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.85, 0.95), cabMat);
    cab.position.set(0, 0.65, 1.2);
    cab.castShadow = true;
    truckGroup.add(cab);

    // Cab Windshield
    const glass = new THREE.Mesh(
      new THREE.BoxGeometry(0.8, 0.32, 0.08),
      new THREE.MeshStandardMaterial({ color: 0x93c5fd, roughness: 0.1, metalness: 0.9 })
    );
    glass.position.set(0, 0.8, 1.68);
    truckGroup.add(glass);

    // Insulated White Box Cargo Body (Carrier Transicold Unit)
    const reeferBody = new THREE.Mesh(
      new THREE.BoxGeometry(1.05, 1.2, 2.2),
      new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.2 })
    );
    reeferBody.position.set(0, 0.9, -0.4);
    reeferBody.castShadow = true;
    truckGroup.add(reeferBody);

    // Front Nose Refrigeration Unit (Chiller Pod)
    const chillerPod = new THREE.Mesh(
      new THREE.BoxGeometry(0.7, 0.35, 0.35),
      new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.4 })
    );
    chillerPod.position.set(0, 1.25, 0.8);
    truckGroup.add(chillerPod);

    // Truck Wheels
    const tireMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.9 });
    for (const z of [-1.1, -0.4, 1.1]) {
      for (const x of [-0.55, 0.55]) {
        const tire = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.14, 12), tireMat);
        tire.rotation.z = Math.PI / 2;
        tire.position.set(x, 0.22, z);
        truckGroup.add(tire);
      }
    }
    this.modelGroup.add(truckGroup);

    // Wholesale Mandi Plaza Canopy Stalls (Right side)
    const stallGroup = new THREE.Group();
    stallGroup.position.set(2.0, 0, 0.2);

    // Tiered Wooden Produce Display Stalls
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.8 });
    const stallBase = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.55, 1.2), woodMat);
    stallBase.position.y = 0.275;
    stallGroup.add(stallBase);

    // Striped Fabric Market Canopy
    const canopyMat = new THREE.MeshStandardMaterial({ color: 0xe11d48, roughness: 0.6 });
    const canopy = new THREE.Mesh(new THREE.ConeGeometry(1.2, 0.45, 4), canopyMat);
    canopy.position.set(0, 1.35, 0);
    canopy.rotation.y = Math.PI / 4;
    stallGroup.add(canopy);

    // Four Canopy Posts
    for (const [cx, cz] of [
      [-0.7, -0.5],
      [0.7, -0.5],
      [-0.7, 0.5],
      [0.7, 0.5],
    ]) {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.8), woodMat);
      pole.position.set(cx, 0.85, cz);
      stallGroup.add(pole);
    }

    // Produce Crates on Display
    const crateColors = [0xef4444, 0x10b981, 0xf59e0b, 0xe11d48];
    for (let i = 0; i < 4; i++) {
      const pCrate = new THREE.Mesh(
        new THREE.BoxGeometry(0.35, 0.18, 0.28),
        new THREE.MeshStandardMaterial({ color: crateColors[i], roughness: 0.4 })
      );
      pCrate.position.set(-0.4 + (i % 2) * 0.5, 0.65, -0.25 + Math.floor(i / 2) * 0.45);
      stallGroup.add(pCrate);
    }

    // Digital APMC Mandi Price Ticker Board
    const tickerPylon = new THREE.Mesh(
      new THREE.BoxGeometry(0.12, 1.5, 0.12),
      new THREE.MeshStandardMaterial({ color: 0x334155 })
    );
    tickerPylon.position.set(3.0, 0.75, -1.8);
    const tickerBoard = new THREE.Mesh(
      new THREE.BoxGeometry(1.2, 0.5, 0.08),
      new THREE.MeshStandardMaterial({ color: 0x0f172a })
    );
    tickerBoard.position.set(3.0, 1.3, -1.8);
    const tickerLed = new THREE.Mesh(
      new THREE.BoxGeometry(1.1, 0.4, 0.09),
      new THREE.MeshBasicMaterial({ color: 0x10b981 }) // Green ticker text simulation
    );
    tickerLed.position.set(3.0, 1.3, -1.79);
    stallGroup.add(tickerPylon);
    stallGroup.add(tickerBoard);
    stallGroup.add(tickerLed);

    this.modelGroup.add(stallGroup);
  }

  /* --------------------------------------------------------------------------
     CONTROLS & ANIMATION LOOP
     -------------------------------------------------------------------------- */
  private attachControls(): void {
    const dom = this.renderer.domElement;

    dom.addEventListener("mousedown", (e) => {
      this.isInteracting = true;
      this.previousMousePosition = { x: e.clientX, y: e.clientY };
    });

    window.addEventListener("mouseup", () => {
      this.isInteracting = false;
    });

    dom.addEventListener("mousemove", (e) => {
      if (!this.isInteracting) return;
      const deltaX = e.clientX - this.previousMousePosition.x;
      const deltaY = e.clientY - this.previousMousePosition.y;

      this.modelGroup.rotation.y += deltaX * 0.008;
      this.modelGroup.rotation.x = Math.max(-0.4, Math.min(0.4, this.modelGroup.rotation.x + deltaY * 0.005));

      this.previousMousePosition = { x: e.clientX, y: e.clientY };
    });

    // Mobile Touch interaction
    dom.addEventListener(
      "touchstart",
      (e) => {
        if (e.touches.length === 1) {
          this.isInteracting = true;
          this.previousMousePosition = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        }
      },
      { passive: true }
    );

    window.addEventListener("touchend", () => {
      this.isInteracting = false;
    });

    dom.addEventListener(
      "touchmove",
      (e) => {
        if (!this.isInteracting || e.touches.length !== 1) return;
        const deltaX = e.touches[0].clientX - this.previousMousePosition.x;
        const deltaY = e.touches[0].clientY - this.previousMousePosition.y;

        this.modelGroup.rotation.y += deltaX * 0.008;
        this.modelGroup.rotation.x = Math.max(-0.4, Math.min(0.4, this.modelGroup.rotation.x + deltaY * 0.005));

        this.previousMousePosition = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      },
      { passive: true }
    );
  }

  private animate = (): void => {
    this.animId = requestAnimationFrame(this.animate);
    this.animClock += 0.02;

    // Gentle passive orbit when user is not touching
    if (!this.isInteracting && this.modelGroup) {
      this.modelGroup.rotation.y += 0.0025;
    }

    // Dynamic rotators (fans, blades)
    for (const r of this.animRotators) {
      r.mesh.rotation[r.axis] += r.speed;
    }

    // Dynamic oscillators (conveyor belt packets)
    for (const o of this.animOscillators) {
      const offset = Math.sin(this.animClock * 2) * o.range;
      o.mesh.position[o.axis] = o.basePos[o.axis] + offset;
    }

    // IoT Beacon pulse
    if (this.beaconMesh) {
      const s = 0.9 + Math.sin(this.animClock * 6) * 0.25;
      this.beaconMesh.scale.set(s, s, s);
    }

    this.renderer.render(this.scene, this.camera);
  };

  public destroy(): void {
    if (this.animId !== null) {
      cancelAnimationFrame(this.animId);
    }
    this.clearModelGroup();
    this.renderer.dispose();
  }
}
