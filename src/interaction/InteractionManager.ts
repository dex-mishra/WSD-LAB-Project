import * as THREE from "three";
import { getInteractable, type InteractableMeta } from "./Interactable";
import { InfoPanel } from "../ui/InfoPanel";
import { FocusRing } from "./FocusRing";
import type { SceneModule } from "../scenes/SceneModule";
import type { Hud } from "../ui/Hud";

/**
 * Handles pointing/selection for both desktop pointer and XR controllers.
 * A subtle target ray shows the current aim; a yellow focus ring highlights
 * the object under the ray; selecting shows the world-space info panel.
 */
export class InteractionManager {
  private raycaster = new THREE.Raycaster();
  private pointer = new THREE.Vector2();
  private controllers: THREE.XRTargetRaySpace[] = [];
  private rays: THREE.Line[] = [];
  private focus = new FocusRing();
  private panel: InfoPanel;
  private active: SceneModule | null = null;
  private hud: Hud | null = null;

  private tmpMatrix = new THREE.Matrix4();
  private hovered: { target: THREE.Object3D; meta: InteractableMeta } | null = null;
  private usePointer = true; // desktop pointer aim until XR controller connects

  constructor(
    private renderer: THREE.WebGLRenderer,
    private scene: THREE.Scene,
    private camera: THREE.PerspectiveCamera,
    private rig: THREE.Group
  ) {
    this.panel = new InfoPanel();
    this.scene.add(this.panel.group);
    this.scene.add(this.focus.mesh);
    this.panel.hide();

    this.setupControllers();

    // Desktop pointer
    renderer.domElement.addEventListener("pointermove", (e) => {
      this.pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
      this.pointer.y = -(e.clientY / window.innerHeight) * 2 + 1;
    });
    renderer.domElement.addEventListener("click", () => {
      if (!this.renderer.xr.isPresenting) this.trySelect();
    });
  }

  registerHud(hud: Hud): void {
    this.hud = hud;
  }

  setActiveScene(scene: SceneModule): void {
    this.active = scene;
    this.panel.hide();
    this.focus.hide();
  }

  private setupControllers(): void {
    const rayGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0, -5),
    ]);
    for (let i = 0; i < 2; i++) {
      const controller = this.renderer.xr.getController(i);
      controller.addEventListener("selectstart", () => {
        this.usePointer = false;
        this.trySelectFromController(controller);
      });
      controller.addEventListener("connected", () => {
        this.usePointer = false;
      });
      this.rig.add(controller);

      const rayMat = new THREE.LineBasicMaterial({
        color: 0xf4c542,
        transparent: true,
        opacity: 0.6,
      });
      const ray = new THREE.Line(rayGeo, rayMat);
      ray.scale.z = 5;
      controller.add(ray);
      this.controllers.push(controller);
      this.rays.push(ray);
    }
  }

  update(): void {
    let hit: { target: THREE.Object3D; meta: InteractableMeta } | null = null;

    if (this.renderer.xr.isPresenting && this.controllers.length) {
      // Use first controller as the primary aim.
      const controller = this.controllers[0];
      this.tmpMatrix.identity().extractRotation(controller.matrixWorld);
      this.raycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld);
      this.raycaster.ray.direction.set(0, 0, -1).applyMatrix4(this.tmpMatrix);
      hit = this.pick();
    } else if (this.usePointer) {
      this.raycaster.setFromCamera(this.pointer, this.camera);
      hit = this.pick();
    }

    if (hit) {
      this.hovered = hit;
      this.focus.showFor(hit.target);
    } else {
      this.hovered = null;
      this.focus.hide();
    }
    this.panel.faceCamera(this.camera);
  }

  private pick(): { target: THREE.Object3D; meta: InteractableMeta } | null {
    if (!this.active) return null;
    const intersects = this.raycaster.intersectObjects(
      this.active.group.children,
      true
    );
    for (const hit of intersects) {
      const found = getInteractable(hit.object);
      if (found) return found;
    }
    return null;
  }

  private trySelect(): void {
    if (!this.hovered) {
      this.panel.hide();
      return;
    }
    this.select(this.hovered.meta, this.hovered.target);
  }

  private trySelectFromController(controller: THREE.XRTargetRaySpace): void {
    this.tmpMatrix.identity().extractRotation(controller.matrixWorld);
    this.raycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld);
    this.raycaster.ray.direction.set(0, 0, -1).applyMatrix4(this.tmpMatrix);
    const hit = this.pick();
    if (hit) this.select(hit.meta, hit.target);
  }

  private select(meta: InteractableMeta, target: THREE.Object3D): void {
    meta.onSelect?.();
    const pos = new THREE.Vector3();
    target.getWorldPosition(pos);
    pos.y += 1.4;
    this.panel.showFor(meta, pos);
    this.hud?.flashInfo(`${meta.title} · ${meta.zone}`);
  }
}
