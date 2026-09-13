import * as THREE from "three";

/**
 * Desktop (non-XR) fallback controls: WASD/arrow movement on the ground plane
 * plus click-drag look. Smooth locomotion is opt-in and speed limited to stay
 * comfortable; there is no forced camera movement or head bob.
 *
 * Movement is applied to the rig, matching the XR model where the rig is the
 * user's play space.
 */
export class DesktopControls {
  private keys = new Set<string>();
  private yaw = 0;
  private pitch = 0;
  private dragging = false;
  private lastX = 0;
  private lastY = 0;
  private speed = 3.2; // metres/second, comfortable default

  private readonly forward = new THREE.Vector3();
  private readonly right = new THREE.Vector3();
  private readonly move = new THREE.Vector3();

  constructor(
    private camera: THREE.PerspectiveCamera,
    private rig: THREE.Group,
    dom: HTMLElement
  ) {
    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
    dom.addEventListener("pointerdown", this.onPointerDown);
    window.addEventListener("pointerup", this.onPointerUp);
    window.addEventListener("pointermove", this.onPointerMove);
    dom.addEventListener("contextmenu", (e) => e.preventDefault());
    dom.addEventListener(
      "wheel",
      (e) => {
        e.preventDefault();
        const zoomStep = Math.sign(e.deltaY) * 0.8;
        this.forward.set(Math.sin(this.yaw), 0, Math.cos(this.yaw));
        this.rig.position.addScaledVector(this.forward, zoomStep);
      },
      { passive: false }
    );
  }

  reset(pos: THREE.Vector3): void {
    this.yaw = 0;
    this.pitch = 0;
    this.rig.position.copy(pos);
    this.camera.rotation.set(0, 0, 0);
  }

  setLook(yaw: number, pitch = 0): void {
    this.yaw = yaw;
    this.pitch = pitch;
    this.rig.rotation.y = this.yaw;
    this.camera.rotation.x = this.pitch;
  }

  private onKeyDown = (e: KeyboardEvent) => {
    this.keys.add(e.key.toLowerCase());
  };
  private onKeyUp = (e: KeyboardEvent) => {
    this.keys.delete(e.key.toLowerCase());
  };

  private onPointerDown = (e: PointerEvent) => {
    // Left click (0) or Right click (2) drag = rotate camera
    if (e.button !== 0 && e.button !== 2) return;
    this.dragging = true;
    this.lastX = e.clientX;
    this.lastY = e.clientY;
    try {
      (e.target as HTMLElement)?.setPointerCapture(e.pointerId);
    } catch {}
  };

  private onPointerUp = (e: PointerEvent) => {
    this.dragging = false;
    try {
      (e.target as HTMLElement)?.releasePointerCapture(e.pointerId);
    } catch {}
  };

  private onPointerMove = (e: PointerEvent) => {
    if (!this.dragging) return;
    const dx = e.clientX - this.lastX;
    const dy = e.clientY - this.lastY;
    this.lastX = e.clientX;
    this.lastY = e.clientY;
    this.yaw -= dx * 0.004;
    this.pitch -= dy * 0.004;
    const lim = Math.PI / 2 - 0.05;
    this.pitch = Math.max(-lim, Math.min(lim, this.pitch));
  };

  update(dt: number): void {
    // Keyboard rotation with Q and E
    const rotSpeed = 1.8; // radians / sec
    if (this.keys.has("q")) this.yaw += rotSpeed * dt;
    if (this.keys.has("e")) this.yaw -= rotSpeed * dt;

    // Apply look to the camera (pitch) and rig (yaw) so movement stays planar.
    this.rig.rotation.y = this.yaw;
    this.camera.rotation.x = this.pitch;

    this.move.set(0, 0, 0);
    if (this.keys.has("w") || this.keys.has("arrowup")) this.move.z -= 1;
    if (this.keys.has("s") || this.keys.has("arrowdown")) this.move.z += 1;
    if (this.keys.has("a") || this.keys.has("arrowleft")) this.move.x -= 1;
    if (this.keys.has("d") || this.keys.has("arrowright")) this.move.x += 1;

    if (this.move.lengthSq() === 0) return;
    this.move.normalize();

    // Direction relative to current yaw.
    this.forward.set(Math.sin(this.yaw), 0, Math.cos(this.yaw));
    this.right.set(Math.cos(this.yaw), 0, -Math.sin(this.yaw));

    const step = this.speed * dt * (this.keys.has("shift") ? 1.8 : 1);
    this.rig.position.addScaledVector(this.forward, this.move.z * step);
    this.rig.position.addScaledVector(this.right, this.move.x * step);
  }
}
