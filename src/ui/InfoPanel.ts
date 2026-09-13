import * as THREE from "three";
import { makeTextTexture } from "../app/builders";
import type { InteractableMeta } from "../interaction/Interactable";

/**
 * A world-space rounded panel that shows the selected object's title, zone,
 * source status, and short info lines. Faces the camera (billboard) so text is
 * always readable. Not glued to the camera (no flat HUD in VR).
 */
export class InfoPanel {
  readonly group = new THREE.Group();
  private mesh: THREE.Mesh;
  private material: THREE.MeshBasicMaterial;

  constructor() {
    this.material = new THREE.MeshBasicMaterial({
      transparent: true,
      depthWrite: false,
    });
    this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1.0), this.material);
    this.mesh.renderOrder = 5;
    this.group.add(this.mesh);
  }

  showFor(meta: InteractableMeta, worldPos: THREE.Vector3): void {
    const lines = [
      meta.title,
      `zone: ${meta.zone}`,
      ...meta.info,
      `[${meta.sourceStatus}]`,
    ];
    const bg =
      meta.sourceStatus === "SOURCE"
        ? "rgba(46,125,50,0.94)"
        : meta.sourceStatus === "INFERENCE"
        ? "rgba(42,120,168,0.94)"
        : "rgba(23,50,77,0.94)";
    const tex = makeTextTexture(lines.join("\n"), {
      bg,
      fg: "#F7F5EE",
      fontSize: 40,
      width: 640,
      height: 400,
      align: "left",
      padding: 40,
    });
    const old = this.material.map;
    this.material.map = tex;
    this.material.needsUpdate = true;
    old?.dispose();
    this.group.position.copy(worldPos);
    this.group.visible = true;
  }

  faceCamera(camera: THREE.Camera): void {
    if (!this.group.visible) return;
    this.group.quaternion.copy(camera.quaternion);
  }

  hide(): void {
    this.group.visible = false;
  }
}
