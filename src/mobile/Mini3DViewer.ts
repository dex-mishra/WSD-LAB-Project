import * as THREE from "three";

/**
 * Mini3DViewer: An interactive, lightweight Three.js 3D viewport embedded
 * directly inside the mobile application interface.
 * Allows employees to rotate and inspect the food manufacturing plant layout,
 * CoolBot chamber, and machinery in real-time 3D.
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
  private fanMesh!: THREE.Mesh;

  constructor(container: HTMLElement) {
    this.container = container;
    this.init();
  }

  private init(): void {
    const width = this.container.clientWidth || 360;
    const height = 190;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x142018); // Dark earthy industrial tone

    this.camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    this.camera.position.set(5.5, 4.5, 6.5);
    this.camera.lookAt(0, 0.8, 0);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2.0));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.container.innerHTML = "";
    this.container.appendChild(this.renderer.domElement);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xfff7e8, 0.7);
    this.scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xfff1dc, 1.2);
    dirLight.position.set(6, 10, 5);
    dirLight.castShadow = true;
    this.scene.add(dirLight);

    const blueFillLight = new THREE.PointLight(0x2a78a8, 1.5, 10);
    blueFillLight.position.set(-2, 2, -1);
    this.scene.add(blueFillLight);

    this.buildFactoryModels();
    this.attachControls();
    this.animate();
  }

  private buildFactoryModels(): void {
    this.modelGroup = new THREE.Group();

    // 1. Factory Floor Tile
    const floorGeo = new THREE.BoxGeometry(6.4, 0.15, 5.2);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x1f3024,
      roughness: 0.8,
      metalness: 0.2,
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.position.y = -0.075;
    floor.receiveShadow = true;
    this.modelGroup.add(floor);

    // Floor demarcation lines
    const lineMat = new THREE.MeshBasicMaterial({ color: 0xe8930c });
    const lineGeo = new THREE.BoxGeometry(5.8, 0.01, 0.04);
    const line1 = new THREE.Mesh(lineGeo, lineMat);
    line1.position.set(0, 0.01, 0.6);
    this.modelGroup.add(line1);

    // 2. CoolBot Cold Room Structure
    const chamberGroup = new THREE.Group();
    chamberGroup.position.set(-1.6, 0, -0.8);

    // Insulated PUF wall panels
    const wallMat = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      roughness: 0.4,
      metalness: 0.1,
    });
    const chamberBody = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.8, 2.0), wallMat);
    chamberBody.position.y = 0.9;
    chamberBody.castShadow = true;
    chamberGroup.add(chamberBody);

    // Cold room door with inspection window
    const doorMat = new THREE.MeshStandardMaterial({ color: 0x2a78a8, roughness: 0.3 });
    const door = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.5, 0.08), doorMat);
    door.position.set(0, 0.75, 1.01);
    chamberGroup.add(door);

    // Window glass
    const glassMat = new THREE.MeshStandardMaterial({
      color: 0x88ccff,
      roughness: 0.1,
      metalness: 0.9,
      transparent: true,
      opacity: 0.6,
    });
    const windowMesh = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.4, 0.1), glassMat);
    windowMesh.position.set(0, 1.1, 1.02);
    chamberGroup.add(windowMesh);

    // CoolBot AC unit mounted on side wall
    const acMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3 });
    const acUnit = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.45, 0.35), acMat);
    acUnit.position.set(1.12, 1.3, 0);
    chamberGroup.add(acUnit);

    // Rotating AC Fan blades
    const fanMat = new THREE.MeshBasicMaterial({ color: 0x141e16 });
    this.fanMesh = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.04, 0.02), fanMat);
    this.fanMesh.position.set(1.3, 1.3, 0);
    chamberGroup.add(this.fanMesh);

    this.modelGroup.add(chamberGroup);

    // 3. Processing & Packaging Table / Conveyor
    const conveyorGroup = new THREE.Group();
    conveyorGroup.position.set(1.2, 0, 0.2);

    const legMat = new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.7 });
    const tableTopMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.8, roughness: 0.2 });

    const tableTop = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.08, 2.6), tableTopMat);
    tableTop.position.y = 0.8;
    tableTop.castShadow = true;
    conveyorGroup.add(tableTop);

    // Legs
    for (const [x, z] of [
      [-0.5, -1.1],
      [0.5, -1.1],
      [-0.5, 1.1],
      [0.5, 1.1],
    ]) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.8), legMat);
      leg.position.set(x, 0.4, z);
      conveyorGroup.add(leg);
    }

    // Packaging Sealing Gantry
    const gantryMat = new THREE.MeshStandardMaterial({ color: 0xe8930c, roughness: 0.3 });
    const gantry = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.6, 0.15), gantryMat);
    gantry.position.set(0, 1.15, -0.2);
    conveyorGroup.add(gantry);

    this.modelGroup.add(conveyorGroup);

    // 4. Crates on Floor & Staging (Color-coded: Green fresh, Yellow near expiry, Red alert)
    const crateColors = [0x1e4d2b, 0x1e4d2b, 0xe8930c, 0xc85a32, 0x2a78a8];
    const cratePositions = [
      [-0.3, 0.15, 1.4],
      [-0.3, 0.42, 1.4],
      [0.2, 0.15, 1.4],
      [1.2, 0.95, 0.6],
      [1.2, 0.95, -0.7],
    ];

    cratePositions.forEach((pos, idx) => {
      const crateMat = new THREE.MeshStandardMaterial({
        color: crateColors[idx % crateColors.length],
        roughness: 0.5,
      });
      const crate = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.24, 0.32), crateMat);
      crate.position.set(pos[0], pos[1], pos[2]);
      crate.castShadow = true;
      this.modelGroup.add(crate);
    });

    this.scene.add(this.modelGroup);
  }

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

    // Touch support
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

    // Subtle gentle auto-rotation when user is not touching
    if (!this.isInteracting && this.modelGroup) {
      this.modelGroup.rotation.y += 0.003;
    }

    // Spin cooling fan
    if (this.fanMesh) {
      this.fanMesh.rotation.x += 0.25;
    }

    this.renderer.render(this.scene, this.camera);
  };

  public destroy(): void {
    if (this.animId !== null) {
      cancelAnimationFrame(this.animId);
    }
    this.renderer.dispose();
  }
}
