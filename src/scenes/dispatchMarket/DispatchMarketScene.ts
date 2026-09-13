import * as THREE from "three";
import { SceneModule } from "../SceneModule";
import type { SceneKey } from "../../app/palette";
import { PALETTE } from "../../app/palette";
import {
  box,
  label,
  floorDecal,
  makeTextTexture,
  createWorkerFigure,
  createRefrigeratedTruck,
  createForklift,
} from "../../app/builders";
import { makeInteractable } from "../../interaction/Interactable";
import type { EngineSnapshot, ScenarioEngine } from "../../simulation/ScenarioEngine";

/**
 * Environment 4: Dispatch Logistics & Fresh Retail Market Hub.
 * Connects the cold chain loop to consumer demand. Features:
 * - Industrial raised dispatch loading dock with roll-up bay doors & route board
 * - Heavy refrigerated delivery box truck loading palletized produce
 * - Vibrant fresh produce market with striped fabric canopies, tiered fruit & vegetable stalls
 * - Digital market price board and interactive supply-vs-demand telemetry
 * - Animated market vendor, dock loader, and retail shopper
 */
export class DispatchMarketScene extends SceneModule {
  readonly key: SceneKey = "dispatchMarket";

  private truck!: THREE.Group;
  private forklift!: THREE.Group;
  private supplyBar!: THREE.Mesh;
  private demandBar!: THREE.Mesh;
  private matchLabel!: THREE.Mesh;
  private marketTickerLabel!: THREE.Mesh;
  private workers: THREE.Group[] = [];
  private animTime = 0;

  constructor(engine: ScenarioEngine) {
    super(engine);
    this.init();
  }

  protected build(): void {
    // 1. Split Ground: Asphalt Roadway (Left/Center) + Paved Market Plaza (Right)
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x383e46, // Dark Asphalt Road
      roughness: 0.85,
      metalness: 0.05,
    });
    const road = new THREE.Mesh(new THREE.PlaneGeometry(50, 36), floorMat);
    road.rotation.x = -Math.PI / 2;
    road.receiveShadow = true;
    this.group.add(road);

    // Paved Sidewalk / Market Plaza (Right side)
    const plazaMat = new THREE.MeshStandardMaterial({
      color: 0xd2dbe2, // Clean paved pedestrian tiles
      roughness: 0.45,
      metalness: 0.1,
    });
    const plaza = new THREE.Mesh(new THREE.PlaneGeometry(18, 36), plazaMat);
    plaza.rotation.x = -Math.PI / 2;
    plaza.position.set(12, 0.01, 0);
    plaza.receiveShadow = true;
    this.group.add(plaza);

    // Road Markings: White Dashed Centerline & Yellow Loading Bay Lines
    for (let z = -12; z <= 12; z += 4) {
      const dash = box(0.18, 0.02, 2.2, 0xffffff);
      dash.position.set(0.5, 0.02, z);
      this.group.add(dash);
    }

    // Truck Loading Bay Yellow Marking Box on Asphalt
    const bayBorderL = box(0.15, 0.02, 8, 0xf4c542);
    bayBorderL.position.set(-5.5, 0.02, 3.5);
    this.group.add(bayBorderL);

    const bayBorderR = box(0.15, 0.02, 8, 0xf4c542);
    bayBorderR.position.set(-1.5, 0.02, 3.5);
    this.group.add(bayBorderR);

    // Floor Zone Decals
    this.group.add(decal("DISPATCH BAY 01", 3.4, "#F4C542", -3.5, 7.5));
    this.group.add(decal("FRESH MARKET PLAZA", 3.8, "#17324D", 10.5, 7.5));

    // 2. Industrial Dispatch Dock (Left side)
    this.buildDispatchDock();

    // 3. Refrigerated Delivery Truck & Electric Forklift
    this.buildDeliveryFleet();

    // 4. Vibrant Fresh Produce Market & Retail Stalls (Right side)
    this.buildMarketplace();

    // 5. Supply-vs-Demand 3D Interactive Analytics Terminal
    this.buildDemandAnalyticsHub();

    // 6. Animated Market & Logistics Characters
    this.buildMarketCrew();

    // Main Header Title Banner
    const title = label("DISPATCH LOGISTICS & FRESH PRODUCE MARKET", 8.4, {
      fontSize: 48,
      width: 1200,
      height: 200,
      bg: "rgba(10, 26, 44, 0.95)",
    });
    title.position.set(0, 7.2, -13.5);
    this.group.add(title);
  }

  /**
   * Builds the raised industrial dispatch platform, warehouse wall,
   * roll-up bay door, and digital route scheduling board.
   */
  private buildDispatchDock(): void {
    const dockGroup = new THREE.Group();

    // Raised Concrete Loading Platform (Height = 0.7m)
    const platform = box(10, 0.7, 10, 0x8a98a6, { rough: 0.6 });
    platform.position.set(-9.5, 0.35, -4);
    dockGroup.add(platform);

    // Safety Yellow/Black Hazard Curb around platform edge
    const curbFront = box(10, 0.12, 0.2, 0xf4c542);
    curbFront.position.set(-9.5, 0.72, 1.0);
    dockGroup.add(curbFront);

    const curbRight = box(0.2, 0.12, 10, 0xf4c542);
    curbRight.position.set(-4.5, 0.72, -4);
    dockGroup.add(curbRight);

    // Rubber Heavy-Duty Dock Bumpers for trucks
    for (const by of [-3.8, -5.2]) {
      const bumper = box(0.25, 0.5, 0.2, 0x1a1a1a);
      bumper.position.set(by, 0.5, 1.12);
      dockGroup.add(bumper);
    }

    // Warehouse Facility Rear Wall
    const wall = box(12, 6.5, 0.4, 0xd8e4ee);
    wall.position.set(-10, 3.25, -9.2);
    dockGroup.add(wall);

    // Industrial Roll-Up Loading Bay Door (Half Open)
    const doorFrame = box(4.0, 4.8, 0.2, 0x334455);
    doorFrame.position.set(-9.5, 2.4, -9.0);
    dockGroup.add(doorFrame);

    const rollDoor = box(3.6, 2.8, 0.08, 0x5a6a7a, { metal: 0.5 });
    rollDoor.position.set(-9.5, 3.4, -8.95);
    dockGroup.add(rollDoor);

    // Finished Goods Crates & Pallet Stacks on Dock
    for (let i = 0; i < 8; i++) {
      const px = -11.5 + (i % 3) * 1.3;
      const pz = -5.5 + Math.floor(i / 3) * 1.3;
      const py = 0.7 + (i === 7 ? 0.5 : 0);

      const pallet = box(1.1, 0.1, 0.95, 0xbe8d52);
      pallet.position.set(px, py + 0.05, pz);
      dockGroup.add(pallet);

      const crate = box(0.98, 0.45, 0.85, i % 2 === 0 ? PALETTE.green : PALETTE.coolBlue);
      crate.position.set(px, py + 0.35, pz);
      dockGroup.add(crate);
    }

    // Digital Dispatch & Route Board (Electronic LED Panel)
    const routeBoardMesh = label(
      "DISPATCH ROUTE BOARD\nROUTE 1: METRO RETAIL (70 CRATES)\nROUTE 2: WHOLESALE APMC (45 CRATES)\nSTATUS: ON SCHEDULE · TEMP COLD-CERTIFIED",
      4.2,
      {
        bg: "rgba(16, 38, 64, 0.96)",
        fg: "#7fd6a0",
        fontSize: 32,
        width: 800,
        height: 280,
      }
    );
    routeBoardMesh.position.set(-9.5, 4.4, -3.8);
    dockGroup.add(routeBoardMesh);

    this.group.add(makeInteractable(dockGroup, {
      id: "dispatch-dock",
      title: "Logistics Dispatch Dock Platform",
      info: [
        "Primary consolidation & loading hub",
        "Direct connection between cold chain inventory and outbound fleet",
        "Active batch temperature & manifest verification",
      ],
      assetType: "building",
      zone: "dispatch",
      sourceStatus: "SOURCE",
    }));
  }

  /**
   * Builds the detailed refrigerated delivery truck backed into the dock
   * and an electric forklift transferring goods.
   */
  private buildDeliveryFleet(): void {
    // 1. Refrigerated Delivery Box Truck (Backed into the loading dock)
    this.truck = createRefrigeratedTruck({ cabColor: 0x184c7a, cargoColor: 0xf5f8fc });
    this.truck.position.set(-3.5, 0, 3.8);
    this.truck.rotation.y = Math.PI; // Backed up directly towards dock!
    this.group.add(makeInteractable(this.truck, {
      id: "dispatch-truck",
      title: "Refrigerated Delivery Box Truck",
      info: [
        "Active over-cab refrigeration unit maintains 4°C during transport",
        "Capacity: 8 Euro-Pallets / 120 Crates",
        "Direct cold-chain delivery to retail markets & supermarkets",
      ],
      assetType: "vehicle",
      zone: "dispatch",
      sourceStatus: "SOURCE",
    }));

    // 2. Electric Forklift at the dock apron
    this.forklift = createForklift({ color: 0xf4a100 });
    this.forklift.position.set(-0.5, 0, 8.5);
    this.forklift.rotation.y = -Math.PI / 4;

    // Pallet on the forklift forks
    const fPallet = box(1.1, 0.1, 0.9, 0xbe8d52);
    fPallet.position.set(0, 0.22, 1.35);
    this.forklift.add(fPallet);

    const fCrates = box(1.0, 0.8, 0.8, PALETTE.green);
    fCrates.position.set(0, 0.68, 1.35);
    this.forklift.add(fCrates);

    this.group.add(makeInteractable(this.forklift, {
      id: "dispatch-forklift",
      title: "Electric Warehouse Forklift",
      info: [
        "Transfers loaded pallets from dock platform into delivery trucks",
        "Zero-emission electric motor for indoor/outdoor compliance",
      ],
      assetType: "vehicle",
      zone: "dispatch",
      sourceStatus: "SOURCE",
    }));
  }

  /**
   * Builds the vibrant fresh produce market with striped awnings, tiered fruit/vegetable
   * display stands, produce crates, POS counter, and electronic market price ticker.
   */
  private buildMarketplace(): void {
    const marketGroup = new THREE.Group();

    // 1. Retail Market Building Structure
    const marketBuilding = box(10, 5.5, 8, 0xe8eff5, { rough: 0.5 });
    marketBuilding.position.set(11.5, 2.75, -5.5);
    marketGroup.add(marketBuilding);

    // Front Overhang & Glass Window Entrance
    const glassEntrance = box(4.0, 3.2, 0.1, 0x223344, { rough: 0.1, metal: 0.8 });
    glassEntrance.position.set(11.5, 1.6, -1.45);
    marketGroup.add(glassEntrance);

    // Market Header Sign
    const storeSign = label("FARM FRESH · WHOLESALE & RETAIL MARKET", 5.6, {
      bg: "#104e8b",
      fg: "#ffffff",
      fontSize: 42,
      width: 900,
      height: 180,
    });
    storeSign.position.set(11.5, 4.8, -1.4);
    marketGroup.add(storeSign);

    // 2. Striped Fabric Awning Canopy (Green & White stripes)
    const awningGroup = new THREE.Group();
    const stripeCount = 12;
    const awningW = 8.5;
    const stripeW = awningW / stripeCount;

    for (let s = 0; s < stripeCount; s++) {
      const isGreen = s % 2 === 0;
      const stripeMesh = box(stripeW, 0.05, 2.8, isGreen ? 0x2e7d32 : 0xfbfcfe);
      stripeMesh.position.set(11.5 - awningW / 2 + s * stripeW + stripeW / 2, 3.6, 0.0);
      stripeMesh.rotation.x = 0.28; // sloped downwards
      awningGroup.add(stripeMesh);
    }
    marketGroup.add(awningGroup);

    // 3. Tiered Fresh Produce Display Shelving & Colorful Crates
    const stallGroup = new THREE.Group();
    stallGroup.position.set(11.5, 0, 0.6);

    // Wooden Display Table Frame
    const tableTop = box(7.5, 0.1, 1.8, 0xb8884d);
    tableTop.position.set(0, 0.85, 0);
    stallGroup.add(tableTop);

    for (const lx of [-3.4, 0, 3.4]) {
      const leg = box(0.12, 0.85, 0.12, 0x8a6333);
      leg.position.set(lx, 0.425, 0.6);
      stallGroup.add(leg);
      const legB = box(0.12, 0.85, 0.12, 0x8a6333);
      legB.position.set(lx, 0.425, -0.6);
      stallGroup.add(legB);
    }

    // Produce Bins with vibrant colorful farm harvest!
    const produceCategories = [
      { name: "Tomatoes & Apples", color: 0xd93829, x: -2.6 },
      { name: "Farm Greens", color: 0x2e7d32, x: -0.9 },
      { name: "Oranges & Mangoes", color: 0xf4a100, x: 0.9 },
      { name: "Potatoes & Root Veg", color: 0xa67c48, x: 2.6 },
    ];

    for (const item of produceCategories) {
      // Tilted Wooden Produce Crate
      const crateBox = box(1.4, 0.35, 1.2, 0xc49a62);
      crateBox.position.set(item.x, 1.05, 0);
      crateBox.rotation.x = 0.22; // angled for customer viewing
      stallGroup.add(crateBox);

      // Fresh colorful crop pile
      const cropPile = box(1.3, 0.32, 1.1, item.color, { rough: 0.7 });
      cropPile.position.set(item.x, 1.12, 0);
      cropPile.rotation.x = 0.22;
      stallGroup.add(cropPile);

      // Price Tag Label on each bin
      const priceTag = box(0.4, 0.15, 0.02, 0xffffff);
      priceTag.position.set(item.x, 1.28, 0.62);
      stallGroup.add(priceTag);
    }

    marketGroup.add(stallGroup);

    // 4. Point-of-Sale (POS) Checkout Counter with Digital Weighing Scale
    const posCounter = box(1.8, 0.95, 1.0, 0x1f3448);
    posCounter.position.set(6.5, 0.475, 1.0);
    marketGroup.add(posCounter);

    // Digital Scale & Cash Register
    const scale = box(0.45, 0.08, 0.4, 0xd0dfea, { metal: 0.8 });
    scale.position.set(6.5, 0.99, 1.0);
    marketGroup.add(scale);

    const scaleDisplay = box(0.2, 0.2, 0.05, 0x111111);
    scaleDisplay.position.set(6.5, 1.12, 0.9);
    marketGroup.add(scaleDisplay);

    // 5. Electronic Live Wholesale Market Price Ticker Board
    this.marketTickerLabel = label(
      "WHOLESALE MARKET LIVE RATES (₹/kg)\nTOMATO: ₹32 · MANGO: ₹85 · CABBAGE: ₹24 · CAPSICUM: ₹48\nDEMAND INDEX: HIGH (94% FRESHNESS CERTIFIED)",
      4.8,
      {
        bg: "rgba(16, 36, 60, 0.96)",
        fg: "#f4c542",
        fontSize: 32,
        width: 900,
        height: 240,
      }
    );
    this.marketTickerLabel.position.set(11.5, 3.4, 2.5);
    marketGroup.add(this.marketTickerLabel);

    this.group.add(makeInteractable(marketGroup, {
      id: "fresh-market",
      title: "Fresh Produce Wholesale & Retail Hub",
      info: [
        "Consumer demand endpoint",
        "Receives cold-chain certified shipments directly from dispatch",
        "Dynamic price adjustments based on fresh shelf-life & lot quality",
      ],
      assetType: "building",
      zone: "market",
      sourceStatus: "SOURCE",
    }));
  }

  /**
   * Builds the 3D Interactive Supply-vs-Demand Analytics Kiosk.
   */
  private buildDemandAnalyticsHub(): void {
    const hubGroup = new THREE.Group();
    hubGroup.position.set(1.5, 0, -4.5);

    // Heavy kiosk pedestal
    const base = box(3.6, 0.2, 1.6, 0x17324d);
    base.position.set(0, 0.1, 0);
    hubGroup.add(base);

    // 3D Comparative Supply vs Demand Columns
    this.supplyBar = box(0.75, 1.5, 0.75, PALETTE.coolBlue, { rough: 0.3, emissive: 0x1a5288 });
    this.supplyBar.position.set(-0.7, 0.85, 0);
    hubGroup.add(this.supplyBar);

    this.demandBar = box(0.75, 1.5, 0.75, PALETTE.green, { rough: 0.3, emissive: 0x2e7d32 });
    this.demandBar.position.set(0.7, 0.85, 0);
    hubGroup.add(this.demandBar);

    // Column Base Decals
    const sDecal = floorDecal("SUPPLY (PRODUCED)", 1.4, "#2A78A8");
    sDecal.position.set(-0.7, 0.22, 0.9);
    hubGroup.add(sDecal);

    const dDecal = floorDecal("DEMAND (ORDERS)", 1.4, "#2E7D32");
    dDecal.position.set(0.7, 0.22, 0.9);
    hubGroup.add(dDecal);

    // Match Status Header Sign
    const post = box(0.08, 3.6, 0.08, 0x334455);
    post.position.set(0, 1.8, -0.6);
    hubGroup.add(post);

    this.matchLabel = label("PROCUREMENT: DEMAND-MATCHED", 3.8, {
      bg: "#2e7d32",
      fg: "#ffffff",
      fontSize: 44,
      width: 700,
      height: 190,
    });
    this.matchLabel.position.set(0, 3.7, -0.6);
    hubGroup.add(this.matchLabel);

    this.group.add(makeInteractable(hubGroup, {
      id: "demand-kiosk",
      title: "Supply vs Demand Synchronization Terminal",
      info: [
        "Compares contracted market orders against usable dispatched yield",
        "Prevents over-production spoilage and inventory obsolescence",
        "Digital Twin feedback mechanism for upstream production tuning",
      ],
      assetType: "board",
      zone: "dispatch",
      sourceStatus: "SOURCE",
    }));
  }

  /**
   * Adds animated human workers, drivers, and market shoppers.
   */
  private buildMarketCrew(): void {
    // 1. Dispatch Loader Operator (Standing on the dock near the truck)
    const workerLoader = createWorkerFigure({
      shirtColor: 0x1a4c7a,
      apronColor: 0xf4c542, // Safety vest
      capColor: 0xf4c542,
    });
    workerLoader.position.set(-6.5, 0.7, -0.5);
    workerLoader.rotation.y = -Math.PI * 0.25;
    this.workers.push(workerLoader);
    this.group.add(makeInteractable(workerLoader, {
      id: "worker-dispatch-loader",
      title: "Dock Staging & Loading Operator",
      info: [
        "Verifies pallet tie-down & cold air circulation spacing inside truck",
        "Inspects container thermal seal integrity before departure",
      ],
      assetType: "operator",
      zone: "dispatch",
      sourceStatus: "SOURCE",
    }));

    // 2. Fresh Market Vendor / Shopkeeper (Behind the produce stall)
    const workerVendor = createWorkerFigure({
      shirtColor: 0x2e6f40,
      apronColor: 0xffffff, // White clean apron
      capColor: 0xffffff,
    });
    workerVendor.position.set(11.5, 0, -0.7);
    workerVendor.rotation.y = 0; // Facing customers in front!
    this.workers.push(workerVendor);
    this.group.add(makeInteractable(workerVendor, {
      id: "worker-market-vendor",
      title: "Market Vendor & Produce Specialist",
      info: [
        "Maintains retail display bins and quality grading",
        "Tracks customer sales rate and triggers automated replenishment",
      ],
      assetType: "operator",
      zone: "market",
      sourceStatus: "SOURCE",
    }));

    // 3. Retail Customer / Wholesale Buyer (Browsing the stall)
    const customer = createWorkerFigure({
      shirtColor: 0x8a3838,
      apronColor: 0x334455,
      capColor: 0x2a78a8,
    });
    customer.position.set(11.5, 0, 2.2);
    customer.rotation.y = Math.PI; // Facing the produce stall!
    this.workers.push(customer);
    this.group.add(makeInteractable(customer, {
      id: "customer-buyer",
      title: "Retail Buyer & Supermarket Purchaser",
      info: [
        "Inspects fresh shelf-life & lot traceability QR codes",
        "Places wholesale contract orders based on guaranteed freshness",
      ],
      assetType: "operator",
      zone: "market",
      sourceStatus: "SOURCE",
    }));
  }

  protected onSnapshot(snap: EngineSnapshot): void {
    const { state, flags } = snap;

    // Scale 3D comparison bars: supply from good units, demand from orders due
    const supplyH = Math.max(0.3, (state.quantityGood / 100) * 3.2);
    const demandH = Math.max(0.3, (state.ordersDue / 120) * 3.2);

    this.supplyBar.scale.y = supplyH / 1.5;
    this.supplyBar.position.y = supplyH / 2 + 0.1;

    this.demandBar.scale.y = demandH / 1.5;
    this.demandBar.position.y = demandH / 2 + 0.1;

    // Color demand bar based on mismatch severity
    const mat = this.demandBar.material as THREE.MeshStandardMaterial;
    const mismatch = Math.abs(state.ordersDue - state.quantityGood);
    mat.color.setHex(mismatch > 25 ? PALETTE.red : PALETTE.green);

    // Update match status banner
    const text = flags.demandMatched
      ? "PROCUREMENT: DEMAND-MATCHED\nBalanced Flow · Zero Overproduction Waste"
      : "PROCUREMENT: FIXED HABITUAL\nHigh Risk of Oversupply Spoilage";
    const bg = flags.demandMatched ? "#2e7d32" : "#b23a2b";
    this.retexture(this.matchLabel, text, bg, 190);

    // Update Live Market Ticker Rates
    const tickerText = flags.demandMatched
      ? `WHOLESALE MARKET: DEMAND SYNCHRONIZED\nDELIVERED: ${state.quantityGood} / ${state.ordersDue} CRATES (${Math.round((state.quantityGood / Math.max(1, state.ordersDue)) * 100)}% FULFILLED)\nQUALITY PREMIUM: +₹${(state.quantityGood * 120).toLocaleString("en-IN")} REVENUE GAINED`
      : `WHOLESALE MARKET: HABITUAL OVERPRODUCTION\nSUPPLY: ${state.quantityGood} CRATES vs DEMAND: ${state.ordersDue} CRATES\nESTIMATED FINANCIAL WASTE: ₹${state.estimatedLossValue.toLocaleString("en-IN")}`;
    this.retexture(this.marketTickerLabel, tickerText, flags.demandMatched ? "#104e8b" : "#681e1e", 240);
  }

  private retexture(mesh: THREE.Mesh, text: string, bg: string, h: number): void {
    const mat = mesh.material as THREE.MeshBasicMaterial;
    const old = mat.map;
    mat.map = makeTextTexture(text, { bg, fontSize: 36, width: 700, height: h });
    mat.needsUpdate = true;
    old?.dispose();
  }

  update(dt: number): void {
    this.animTime += dt;

    // Working arm & body animation for crew members
    for (let i = 0; i < this.workers.length; i++) {
      const w = this.workers[i];
      const armL = w.getObjectByName("armL");
      const armR = w.getObjectByName("armR");
      const offset = i * 1.8;
      if (armL) armL.rotation.x = 0.45 + Math.sin(this.animTime * 3.0 + offset) * 0.12;
      if (armR) armR.rotation.x = 0.45 + Math.cos(this.animTime * 3.0 + offset) * 0.12;
    }
  }
}

function decal(text: string, w: number, color: string, x: number, z: number): THREE.Mesh {
  const m = floorDecal(text, w, color);
  m.position.set(x, 0.03, z);
  return m;
}
