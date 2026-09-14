import * as THREE from "three";
import { VRButton } from "three/examples/jsm/webxr/VRButton.js";
import { PALETTE, SCENE_ORDER, type SceneKey } from "./palette";
import { ScenarioEngine } from "../simulation/ScenarioEngine";
import { InteractionManager } from "../interaction/InteractionManager";
import { DesktopControls } from "./DesktopControls";
import { Dashboard } from "../ui/Dashboard";
import { Hud } from "../ui/Hud";
import type { SceneModule } from "../scenes/SceneModule";
import { FarmReceivingScene } from "../scenes/farmReceiving/FarmReceivingScene";
import { ProcessingPackagingScene } from "../scenes/processingPackaging/ProcessingPackagingScene";
import { InventoryColdChainScene } from "../scenes/inventoryColdChain/InventoryColdChainScene";
import { DispatchMarketScene } from "../scenes/dispatchMarket/DispatchMarketScene";

/**
 * App wires the renderer, camera rig, XR, lighting, scenes, interaction, and
 * UI together. It owns the single render loop driven by setAnimationLoop so the
 * XR session controls frame timing when immersive.
 */
export class App {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly camera: THREE.PerspectiveCamera;
  /** Rig holds the camera + controllers so we can move/recenter the user. */
  readonly rig = new THREE.Group();

  readonly engine = new ScenarioEngine();
  readonly interaction: InteractionManager;
  readonly dashboard: Dashboard;
  readonly desktop: DesktopControls;
  private readonly hud: Hud;

  private scenes: Record<SceneKey, SceneModule>;
  private activeKey: SceneKey = "farmReceiving";
  private sunLight!: THREE.DirectionalLight;
  private hemiLight!: THREE.HemisphereLight;
  private readonly clock = new THREE.Clock();

  private startPos = new THREE.Vector3(0, 0, 6);

  constructor(container: HTMLElement, onOpenMobileApp?: () => void) {
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: "high-performance",
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2.0));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;
    this.renderer.xr.enabled = true;
    container.appendChild(this.renderer.domElement);

    this.scene.background = new THREE.Color(0x9fc3dd);
    this.scene.fog = new THREE.Fog(0x9fc3dd, 25, 90);

    this.camera = new THREE.PerspectiveCamera(
      65,
      window.innerWidth / window.innerHeight,
      0.05,
      500
    );
    this.camera.position.set(0, 1.6, 0);
    this.rig.add(this.camera);
    this.rig.position.copy(this.startPos);
    this.scene.add(this.rig);

    this.setupLights();
    this.setupXR();

    // Scenes
    this.scenes = {
      farmReceiving: new FarmReceivingScene(this.engine),
      processingPackaging: new ProcessingPackagingScene(this.engine),
      inventoryColdChain: new InventoryColdChainScene(this.engine),
      dispatchMarket: new DispatchMarketScene(this.engine),
    };
    for (const key of SCENE_ORDER) {
      const group = this.scenes[key].group;
      group.visible = false;
      this.scene.add(group);
    }

    // Interaction + controls + UI
    this.interaction = new InteractionManager(
      this.renderer,
      this.scene,
      this.camera,
      this.rig
    );
    this.desktop = new DesktopControls(this.camera, this.rig, this.renderer.domElement);
    this.dashboard = new Dashboard(this.engine);
    this.scene.add(this.dashboard.group);
    // Positioned in front outside the rooms, parallel to screen
    this.dashboard.group.position.set(-6.8, 1.35, 5.8);
    this.dashboard.group.rotation.y = 0;

    this.hud = new Hud({
      engine: this.engine,
      onSelectScene: (k) => this.showScene(k),
      onReset: () => this.reset(),
      getActiveScene: () => this.activeKey,
      onOpenMobileApp,
    });
    this.interaction.registerHud(this.hud);

    this.showScene("farmReceiving");
    window.addEventListener("resize", this.onResize);
  }

  private setupLights(): void {
    this.hemiLight = new THREE.HemisphereLight(0xdfeeff, 0x556b5a, 0.9);
    this.scene.add(this.hemiLight);

    this.sunLight = new THREE.DirectionalLight(0xfff2df, 1.4);
    this.sunLight.position.set(14, 22, 10);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.set(4096, 4096);
    const c = this.sunLight.shadow.camera;
    c.near = 1;
    c.far = 80;
    c.left = -30;
    c.right = 30;
    c.top = 30;
    c.bottom = -30;
    this.sunLight.shadow.bias = -0.0002;
    this.sunLight.shadow.normalBias = 0.02;
    this.scene.add(this.sunLight);
    this.scene.add(this.sunLight.target);

    // Soft fill light from below/front to reduce harsh flat shadows
    const fillLight = new THREE.DirectionalLight(0xc8ddf0, 0.3);
    fillLight.position.set(-6, 2, 12);
    this.scene.add(fillLight);

    const ambient = new THREE.AmbientLight(0xffffff, 0.2);
    this.scene.add(ambient);
  }

  private setupXR(): void {
    // local-floor preferred; three requests it and falls back internally.
    this.renderer.xr.setReferenceSpaceType("local-floor");
    const btn = VRButton.createButton(this.renderer);
    btn.classList.add("vr-button");
    // Hide the "VR NOT SUPPORTED" button on desktop to avoid clutter.
    // It becomes visible automatically if VR is available.
    btn.style.display = "none";
    const nav = navigator as Navigator & {
      xr?: { isSessionSupported(mode: string): Promise<boolean> };
    };
    if (nav.xr) {
      nav.xr.isSessionSupported("immersive-vr").then((ok) => {
        if (ok) btn.style.display = "";
      }).catch(() => {});
    }
    document.body.appendChild(btn);
  }

  /** Adjust lighting mood per scene (cooler for cold chain, warmer for farm). */
  private applySceneMood(key: SceneKey): void {
    switch (key) {
      case "inventoryColdChain":
        this.sunLight.color.setHex(0xd6e6ff);
        this.hemiLight.color.setHex(0xcfe2ff);
        this.scene.background = new THREE.Color(0x7f9bb3);
        break;
      case "processingPackaging":
        this.sunLight.color.setHex(0xffffff);
        this.hemiLight.color.setHex(0xeef2f6);
        this.scene.background = new THREE.Color(0xb9c6cf);
        break;
      case "dispatchMarket":
        this.sunLight.color.setHex(0xffe7c4);
        this.hemiLight.color.setHex(0xf0e2cf);
        this.scene.background = new THREE.Color(0xc8d6c9);
        break;
      case "farmReceiving":
      default:
        this.sunLight.color.setHex(0xfff2df);
        this.hemiLight.color.setHex(0xdfeeff);
        this.scene.background = new THREE.Color(0x9fc3dd);
        break;
    }
    if (this.scene.fog instanceof THREE.Fog) {
      this.scene.fog.color.copy(this.scene.background as THREE.Color);
    }
  }

  showScene(key: SceneKey): void {
    for (const k of SCENE_ORDER) {
      this.scenes[k].group.visible = k === key;
    }
    this.activeKey = key;
    this.applySceneMood(key);
    this.interaction.setActiveScene(this.scenes[key]);
    this.hud.setActiveScene(key);
    // Recenter the user near the scene entry.
    this.reset();
  }

  reset(): void {
    this.rig.position.copy(this.startPos);
    this.rig.rotation.set(0, 0, 0);
    this.desktop.reset(this.startPos);
  }

  start(): void {
    this.renderer.setAnimationLoop(this.tick);
  }

  private tick = (): void => {
    const dt = this.clock.getDelta();
    // Desktop controls only affect the rig when not presenting in XR.
    if (!this.renderer.xr.isPresenting) {
      this.desktop.update(dt);
    }
    this.scenes[this.activeKey].update(dt);
    this.dashboard.update();
    this.interaction.update(dt);
    this.renderer.render(this.scene, this.camera);
  };

  private onResize = (): void => {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  };
}

// Re-export for main.ts convenience.
export { PALETTE };
