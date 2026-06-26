import * as THREE from 'three';

const OUTLINE_SCALE = 1.06;
const OUTLINE_COLOR = 0x000000;

export function applyOutlines(root) {
  root.traverse((child) => {
    if (!child.isMesh || child.userData.isOutline || child.userData.hasOutline) return;
    if (!child.geometry) return;

    child.userData.hasOutline = true;
    child.geometry.computeBoundingSphere();

    const outline = new THREE.Mesh(
      child.geometry,
      new THREE.MeshBasicMaterial({
        color: OUTLINE_COLOR,
        side: THREE.BackSide,
      })
    );
    outline.scale.setScalar(OUTLINE_SCALE);
    outline.userData.isOutline = true;
    outline.raycast = () => {};
    child.add(outline);
  });
}

export function ensureOutlines(root) {
  applyOutlines(root);
}
