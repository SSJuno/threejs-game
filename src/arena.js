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

  // === MAIN FLOOR (larger ~40x46) ===
  box(40, 0.6, 46, FLOOR, 0, -0.3, 0);
  addCollider(0, 0, 0, 20, 0.3, 23);

  // === HEIGHT VARIATION - raised platforms for parkour ===
  // Left raised platform (bigger)
  box(7.5, 1.2, 8, 0x4a5540, -11.5, 0.6, -3);
  addCollider(-11.5, 0.6 + 0.6, -3, 3.75, 0.6, 4);

  // Right rear platform
  box(6.5, 1.4, 6.5, 0x4a5540, 11, 0.7, -9.5);
  addCollider(11, 0.7 + 0.7, -9.5, 3.25, 0.7, 3.25);

  // Forward step / ledge (bigger)
  box(4.5, 0.9, 4.5, 0x515151, -0.8, 0.45, 13);
  addCollider(-0.8, 0.45 + 0.45, 13, 2.25, 0.45, 2.25);

  // === INTACT TALL PILLARS (wall-jump / cover targets) - spread out ===
  const intact = [
    { x: -13.5, z: -11,  h: 11.5, w: 2.1 },
    { x: 12.5,  z: -9.5, h: 10.5, w: 2.2 },
    { x: -12.2, z: 10.5, h: 12,   w: 2.05 },
    { x: 11,    z: 11.5, h: 9.8,  w: 2.15 },
  ];
  for (const p of intact) {
    box(p.w, p.h, p.w, STONE, p.x, 0, p.z);
    addCollider(p.x, p.h / 2, p.z, p.w / 2, p.h / 2, p.w / 2);
    // Mossy cap
    box(p.w * 1.12, 0.48, p.w * 1.12, MOSS, p.x, p.h - 0.05, p.z);
  }

  // === BROKEN / COLLAPSED PILLARS (spread for larger map) ===
  // Broken pillar 1 (west-central)
  box(2.1, 3.6, 2.1, DARK_STONE, -4.2, 0, 1.2);
  addCollider(-4.2, 1.8, 1.2, 1.05, 1.8, 1.05);

  const bp1Top = box(2.3, 1.8, 2.15, STONE, -3.4, 4.3, 2);
  bp1Top.rotation.set(0.55, 0.25, -0.7);
  addCollider(-3.4, 4.3 + 0.9, 2, 1.12, 0.9, 1.08);

  box(1.35, 0.6, 1.55, DARK_STONE, -6.2, 0, 2.2);
  addCollider(-6.2, 0.3, 2.2, 0.675, 0.3, 0.775);
  box(1.15, 0.85, 1.4, STONE, -2.5, 0, -0.6);
  addCollider(-2.5, 0.425, -0.6, 0.575, 0.425, 0.7);

  // Broken pillar 2 (east)
  box(1.95, 3.0, 1.95, DARK_STONE, 7, 0, 4.8);
  addCollider(7, 1.5, 4.8, 0.975, 1.5, 0.975);

  const bp2Top = box(2.2, 1.6, 2.0, STONE, 8.8, 3.2, 5.5);
  bp2Top.rotation.set(-0.3, 0.8, 1.0);
  addCollider(8.8, 3.2 + 0.8, 5.5, 1.05, 0.8, 1.0);

  box(1.5, 0.55, 1.65, DARK_STONE, 5.5, 0, 3.0);
  addCollider(5.5, 0.275, 3.0, 0.75, 0.275, 0.825);

  // Broken pillar 3 (south, more destroyed)
  box(2.1, 4.5, 2.1, STONE, 1, 0, -13.5);
  addCollider(1, 2.25, -13.5, 1.05, 2.25, 1.05);

  const bp3Fallen = box(2.25, 1.65, 2.4, DARK_STONE, 3.8, 0.45, -12);
  bp3Fallen.rotation.set(0.15, -0.1, 1.25);
  addCollider(3.8, 0.45 + 0.825, -12, 1.1, 0.825, 1.2);

  box(1.3, 0.7, 1.9, STONE, -2.2, 0, -11.2);
  addCollider(-2.2, 0.35, -11.2, 0.65, 0.35, 0.95);

  // === CHOKE POINTS + COVER (low walls) - scaled for bigger arena ===
  // Vertical divider wall (longer, creates left/right paths + choke)
  box(1.5, 2.3, 14, STONE, -2.5, 0, 0.3);
  addCollider(-2.5, 1.15, 0.3, 0.75, 1.15, 7);

  // Horizontal cover wall (right side choke)
  box(9.5, 1.8, 1.4, DARK_STONE, 7.5, 0, -2.8);
  addCollider(7.5, 0.9, -2.8, 4.75, 0.9, 0.7);

  // Left perimeter cover (farther out)
  box(1.35, 1.7, 5.5, STONE, -16.5, 0, -0.8);
  addCollider(-16.5, 0.85, -0.8, 0.675, 0.85, 2.75);

  // Forward barrier / choke
  box(5, 1.5, 1.3, STONE, 1.2, 0, 8.5);
  addCollider(1.2, 0.75, 8.5, 2.5, 0.75, 0.65);

  // === PARKOUR STEPS + SCATTERED DEBRIS (larger map) ===
  // Climbable blocks
  box(2.8, 1.0, 2.6, 0x484848, -9, 0, 8.2);
  addCollider(-9, 0.5, 8.2, 1.4, 0.5, 1.3);

  box(2.2, 1.35, 2.4, 0x484848, 10, 0, 7.5);
  addCollider(10, 0.675, 7.5, 1.1, 0.675, 1.2);

  // Scattered rubble / small cover (all collidable)
  const rubble = [
    { w: 1.2, h: 0.5,  d: 1.35, x: -6.5, y: 0, z: -6.2 },
    { w: 1.5, h: 0.42, d: 0.9,  x: 8.5,  y: 0, z: 1.0 },
    { w: 0.9, h: 0.7,  d: 1.1,  x: -1.2, y: 0, z: -4.8 },
    { w: 1.25,h: 0.48, d: 1.55, x: 4.5,  y: 0, z: -13 },
    { w: 1.1, h: 0.6,  d: 1.0,  x: -14,  y: 0, z: 5.5 },
    { w: 1.6, h: 0.38, d: 1.1,  x: 14,   y: 0, z: 6.5 },
    { w: 1.0, h: 0.55, d: 1.3,  x: 2,    y: 0, z: 2.5 },
  ];
  for (const r of rubble) {
    const m = box(r.w, r.h, r.d, DARK_STONE, r.x, r.y, r.z);
    m.rotation.y = (Math.random() - 0.5) * 1.8;
    addCollider(r.x, r.y + r.h / 2, r.z, r.w / 2, r.h / 2, r.d / 2);
  }

  // A couple larger edge piles
  box(3.2, 0.75, 1.6, DARK_STONE, -13, 0, -16);
  addCollider(-13, 0.375, -16, 1.6, 0.375, 0.8);

  box(1.7, 1.1, 2.6, STONE, 15.5, 0, -5.5);
  addCollider(15.5, 0.55, -5.5, 0.85, 0.55, 1.3);

  scene.add(group);

  // Subtle fill light for atmosphere (doesn't affect colliders)
  const moodLight = new THREE.PointLight(0xffe9bb, 0.35, 30);
  moodLight.position.set(1, 7, -1);
  group.add(moodLight);

  return {
    colliders,
    // Good starting positions for the larger arena
    playerStart: new THREE.Vector3(-10, 2.1, -13),
    dummyStart: new THREE.Vector3(7, 2.0, 8),
  };
}
