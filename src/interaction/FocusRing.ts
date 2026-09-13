import * as THREE from "three";

/**
 * A single yellow ring/glow that marks the current focus object, per the
 * visual direction. It is reused (never recreated) to avoid GC churn.
 * Now includes a subtle pulsing animation for visual polish.
 */
export class FocusRing {
  readonly mesh: THREE.Mesh;
  private box = new THREE.Box3();
  private size = new THREE.Vector3();
  private center = new THREE.Vector3();
  private baseScale = 1;
  private elapsed = 0;

  constructor() {
    const geo = new THREE.RingGeometry(0.78, 1.0, 64);
    const mat = new THREE.MeshBasicMaterial({
      color: 0xf4c542,
      transparent: true,
      opacity: 0.85,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    this.mesh = new THREE.Mesh(geo, mat);
    this.mesh.rotation.x = -Math.PI / 2;
    this.mesh.visible = false;
    this.mesh.renderOrder = 3;
  }

  showFor(target: THREE.Object3D): void {
    this.box.setFromObject(target);
    if (this.box.isEmpty()) {
      this.mesh.visible = false;
      return;
    }
    this.box.getSize(this.size);
    this.box.getCenter(this.center);
    this.baseScale = Math.max(this.size.x, this.size.z) * 0.7 + 0.3;
    this.mesh.scale.setScalar(this.baseScale);
    this.mesh.position.set(this.center.x, this.box.min.y + 0.04, this.center.z);
    this.mesh.visible = true;
  }

  /** Call each frame with delta time for gentle pulse effect. */
  update(dt: number): void {
    if (!this.mesh.visible) return;
    this.elapsed += dt;
    const pulse = 1 + Math.sin(this.elapsed * 3.0) * 0.06;
    this.mesh.scale.setScalar(this.baseScale * pulse);
    const mat = this.mesh.material as THREE.MeshBasicMaterial;
    mat.opacity = 0.7 + Math.sin(this.elapsed * 3.0) * 0.15;
  }

  hide(): void {
    this.mesh.visible = false;
    this.elapsed = 0;
  }
}
