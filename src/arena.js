import * as THREE from 'three';
import { createGradientMap } from './world.js';

const STONE = 0x6b6b6b;
const DARK_STONE = 0x4a4a4a;
const MOSS = 0x5a6b4a;
const FLOOR = 0x3d3d3d;

export function buildArena(scene) {
  const colliders = [];
  const group = new THREE.Group();
  const gradientMap = createGradientMap();

  function box(w, h, d, color, x, y, z, rx = 0, ry = 0, rz = 0) {
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(w, h, d),
      new THREE.MeshToonMaterial({ color, gradientMap })
    );
    mesh.position.set(x, y + h / 2, z);
    mesh.rotation.set(rx, ry, rz);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
    return mesh;
  }

  function addCollider(x, y, z, hw, hh, hd) {
    colliders.push({ x, y, z, hw, hh, hd });
  }

  // === MAIN FLOOR (compact 26x28) ===
  box(26, 0.6, 28, FLOOR, 0, -0.3, 0);
  addCollider(0, 0, 0, 13, 0.3, 14);

  // === HEIGHT VARIATION - raised platforms for parkour ===
  // Left raised platform
  box(5.2, 1.15, 5.8, 0x4a5540, -7.5, 0.575, -2);
  addCollider(-7.5, 0.575 + 0.575, -2, 2.6, 0.575, 2.9);

  // Right rear platform
  box(4.8, 1.35, 4.6, 0x4a5540, 7.2, 0.675, -6.2);
  addCollider(7.2, 0.675 + 0.675, -6.2, 2.4, 0.675, 2.3);

  // Small forward step / ledge
  box(3.4, 0.85, 3.4, 0x515151, -0.5, 0.425, 8.5);
  addCollider(-0.5, 0.425 + 0.425, 8.5, 1.7, 0.425, 1.7);

  // === INTACT TALL PILLARS (wall-jump / cover targets) ===
  const intact = [
    { x: -8.5, z: -7.2, h: 10.2, w: 1.95 },
    { x: 8.0,  z: -6.0, h: 9.4,  w: 2.05 },
    { x: -7.8, z: 6.8,  h: 10.8, w: 1.9  },
    { x: 7.0,  z: 7.5,  h: 8.6,  w: 2.1  },
  ];
  for (const p of intact) {
    box(p.w, p.h, p.w, STONE, p.x, 0, p.z);
    addCollider(p.x, p.h / 2, p.z, p.w / 2, p.h / 2, p.w / 2);
    // Mossy cap
    box(p.w * 1.12, 0.48, p.w * 1.12, MOSS, p.x, p.h - 0.05, p.z);
  }

  // === BROKEN / COLLAPSED PILLARS ===
  // Broken pillar 1 (west, near center)
  box(2.05, 3.4, 2.05, DARK_STONE, -2.8, 0, 0.8);
  addCollider(-2.8, 1.7, 0.8, 1.025, 1.7, 1.025);

  const bp1Top = box(2.25, 1.7, 2.1, STONE, -2.2, 4.1, 1.4);
  bp1Top.rotation.set(0.55, 0.25, -0.7);
  addCollider(-2.2, 4.1 + 0.85, 1.4, 1.1, 0.85, 1.05);

  box(1.3, 0.55, 1.5, DARK_STONE, -4.2, 0, 1.6);
  addCollider(-4.2, 0.275, 1.6, 0.65, 0.275, 0.75);
  box(1.1, 0.8, 1.35, STONE, -1.6, 0, -0.4);
  addCollider(-1.6, 0.4, -0.4, 0.55, 0.4, 0.675);

  // Broken pillar 2 (east)
  box(1.85, 2.8, 1.85, DARK_STONE, 4.5, 0, 3.2);
  addCollider(4.5, 1.4, 3.2, 0.925, 1.4, 0.925);

  const bp2Top = box(2.1, 1.5, 1.95, STONE, 5.6, 3.0, 3.8);
  bp2Top.rotation.set(-0.3, 0.8, 1.0);
  addCollider(5.6, 3.0 + 0.75, 3.8, 1.0, 0.75, 0.95);

  box(1.45, 0.5, 1.6, DARK_STONE, 3.6, 0, 2.0);
  addCollider(3.6, 0.25, 2.0, 0.725, 0.25, 0.8);

  // Broken pillar 3 (south, more destroyed)
  box(2.0, 4.2, 2.0, STONE, 0.5, 0, -8.8);
  addCollider(0.5, 2.1, -8.8, 1.0, 2.1, 1.0);

  const bp3Fallen = box(2.15, 1.55, 2.3, DARK_STONE, 2.4, 0.4, -7.8);
  bp3Fallen.rotation.set(0.15, -0.1, 1.25);
  addCollider(2.4, 0.4 + 0.775, -7.8, 1.05, 0.775, 1.15);

  box(1.2, 0.65, 1.8, STONE, -1.4, 0, -7.2);
  addCollider(-1.4, 0.325, -7.2, 0.6, 0.325, 0.9);

  // === CHOKE POINTS + COVER (low walls) ===
  // Vertical divider wall (creates left/right paths + choke)
  box(1.35, 2.15, 9.5, STONE, -1.6, 0, 0.2);
  addCollider(-1.6, 1.075, 0.2, 0.675, 1.075, 4.75);

  // Horizontal cover wall (right side choke)
  box(6.5, 1.65, 1.25, DARK_STONE, 4.8, 0, -1.8);
  addCollider(4.8, 0.825, -1.8, 3.25, 0.825, 0.625);

  // Left perimeter cover
  box(1.2, 1.55, 4.2, STONE, -10.8, 0, -0.5);
  addCollider(-10.8, 0.775, -0.5, 0.6, 0.775, 2.1);

  // Small forward barrier
  box(3.8, 1.4, 1.15, STONE, 0.8, 0, 5.6);
  addCollider(0.8, 0.7, 5.6, 1.9, 0.7, 0.575);

  // === PARKOUR STEPS + SCATTERED DEBRIS ===
  // Climbable blocks
  box(2.1, 0.95, 2.0, 0x484848, -5.8, 0, 5.5);
  addCollider(-5.8, 0.475, 5.5, 1.05, 0.475, 1.0);

  box(1.7, 1.25, 1.9, 0x484848, 6.5, 0, 5.0);
  addCollider(6.5, 0.625, 5.0, 0.85, 0.625, 0.95);

  // Scattered rubble / small cover (all collidable)
  const rubble = [
    { w: 1.0, h: 0.45, d: 1.15, x: -4.2, y: 0, z: -4.0 },
    { w: 1.25, h: 0.38, d: 0.75, x: 5.5, y: 0, z: 0.5 },
    { w: 0.75, h: 0.65, d: 0.95, x: -0.8, y: 0, z: -3.2 },
    { w: 1.05, h: 0.42, d: 1.3, x: 3.0, y: 0, z: -8.5 },
    { w: 0.9,  h: 0.55, d: 0.85, x: -9.0, y: 0, z: 3.8 },
    { w: 1.35, h: 0.32, d: 0.9,  x: 9.2, y: 0, z: 4.2 },
  ];
  for (const r of rubble) {
    const m = box(r.w, r.h, r.d, DARK_STONE, r.x, r.y, r.z);
    m.rotation.y = (Math.random() - 0.5) * 1.8;
    addCollider(r.x, r.y + r.h / 2, r.z, r.w / 2, r.h / 2, r.d / 2);
  }

  // A couple larger edge piles
  box(2.6, 0.7, 1.3, DARK_STONE, -8.5, 0, -10.5);
  addCollider(-8.5, 0.35, -10.5, 1.3, 0.35, 0.65);

  box(1.4, 1.0, 2.1, STONE, 10.5, 0, -3.5);
  addCollider(10.5, 0.5, -3.5, 0.7, 0.5, 1.05);

  scene.add(group);

  // Subtle fill light for atmosphere (doesn't affect colliders)
  const moodLight = new THREE.PointLight(0xffe9bb, 0.35, 30);
  moodLight.position.set(1, 7, -1);
  group.add(moodLight);

  return {
    colliders,
    // Good starting positions for fast movement testing
    playerStart: new THREE.Vector3(-6.5, 2.1, -8.5),
    dummyStart: new THREE.Vector3(4.5, 2.0, 5.0),
  };
}
