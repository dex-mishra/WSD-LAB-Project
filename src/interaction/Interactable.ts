import * as THREE from "three";
import type { SourceStatus } from "../simulation/types";

/**
 * Semantic metadata attached to any object the user can point at or select.
 * Stored on Object3D.userData under the `interactable` key.
 */
export interface InteractableMeta {
  id: string;
  title: string;
  /** Short lines shown in the info panel. Keep terse for VR comfort. */
  info: string[];
  assetType: string;
  zone: string;
  sourceStatus: SourceStatus;
  /** Optional action fired on select (e.g. toggle an intervention). */
  onSelect?: () => void;
}

export const INTERACT_KEY = "interactable";

export function makeInteractable(
  obj: THREE.Object3D,
  meta: InteractableMeta
): THREE.Object3D {
  obj.userData[INTERACT_KEY] = meta;
  return obj;
}

export function getInteractable(
  obj: THREE.Object3D | null
): { target: THREE.Object3D; meta: InteractableMeta } | null {
  let node: THREE.Object3D | null = obj;
  while (node) {
    const meta = node.userData[INTERACT_KEY] as InteractableMeta | undefined;
    if (meta) return { target: node, meta };
    node = node.parent;
  }
  return null;
}
