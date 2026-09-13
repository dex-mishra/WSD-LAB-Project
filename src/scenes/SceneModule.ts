import * as THREE from "three";
import type { EngineSnapshot, ScenarioEngine } from "../simulation/ScenarioEngine";
import type { SceneKey } from "../app/palette";

/**
 * A scene module owns a THREE.Group of everything in one environment and
 * subscribes to the scenario engine to reflect state. Scenes never own
 * simulation state; they read from the snapshot.
 */
export abstract class SceneModule {
  readonly group = new THREE.Group();
  abstract readonly key: SceneKey;
  protected unsub: () => void;

  constructor(protected engine: ScenarioEngine) {
    this.build();
    this.unsub = engine.subscribe((snap) => this.onSnapshot(snap));
  }

  /** Construct static + interactive geometry once. */
  protected abstract build(): void;

  /** Reflect a new scenario snapshot in the scene. */
  protected abstract onSnapshot(snap: EngineSnapshot): void;

  /** Per-frame update (animations, gentle motion). Default: no-op. */
  update(_dt: number): void {}

  dispose(): void {
    this.unsub();
  }
}
