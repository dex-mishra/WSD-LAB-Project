import * as THREE from "three";

/**
 * A single yellow ring/glow that marks the current focus object, per the
 * visual direction. It is reused (never recreated) to avoid GC churn.
 */
export class FocusRing {
  readonly mesh: THREE.Mesh;
  private box = new THREE.Box3();
  private size = new THREE.Vector3();
  private center = new THREE.Vector3();

  constructor() {
    const geo = new THREE.RingGeometry(0.9, 1.0, 48);
    const mat = new THREE.MeshBasicMaterial({
      color: 0xf4c542,
      transparent: true,
      opacity: 0.9,
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
    const radius = Math.max(this.size.x, this.size.z) * 0.7 + 0.2;
    this.mesh.scale.setScalar(radius);
    this.mesh.position.set(this.center.x, this.box.min.y + 0.03, this.center.z);
    this.mesh.visible = true;
  }

  hide(): void {
    this.mesh.visible = false;
  }
}
