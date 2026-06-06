import * as THREE from 'three';

const STONE = 0x6b6b6b;
const DARK_STONE = 0x4a4a4a;
const MOSS = 0x5a6b4a;
const FLOOR = 0x3d3d3d;

function box(w, h, d, color, x, y, z, rx = 0, ry = 0) {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(w, h, d),
    new THREE.MeshLambertMaterial({ color })
  );
  mesh.position.set(x, y + h / 2, z);
  mesh.rotation.set(rx, ry, 0);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function addCollider(colliders, x, y, z, hw, hh, hd) {
  colliders.push({ x, y, z, hw, hh, hd });
}

export function buildWorld(scene) {
  const colliders = [];
  const group = new THREE.Group();

  // Main courtyard floor
  const floor = box(60, 0.5, 60, FLOOR, 0, -0.25, 0);
  group.add(floor);
  addCollider(colliders, 0, 0, 0, 30, 0.25, 30);

  // Outer broken walls
  const walls = [
    { w: 40, h: 6, d: 1.5, x: 0, z: -22, broken: true },
    { w: 1.5, h: 5, d: 30, x: -22, z: -5, broken: false },
    { w: 1.5, h: 4, d: 28, x: 22, z: 5, broken: true },
    { w: 25, h: 3, d: 1.5, x: -8, z: 22, broken: true },
  ];

  for (const w of walls) {
    const wall = box(w.w, w.h, w.d, STONE, w.x, 0, w.z);
    group.add(wall);
    addCollider(colliders, w.x, w.h / 2, w.z, w.w / 2, w.h / 2, w.d / 2);

    if (w.broken) {
      const chunk = box(w.w * 0.3, w.h * 0.4, w.d, DARK_STONE, w.x + w.w * 0.3, 0, w.z + 2);
      chunk.rotation.z = 0.3;
      group.add(chunk);
    }
  }

  // Corner pillars (some broken)
  const pillars = [
    { x: -18, z: -18, h: 10, broken: false },
    { x: 18, z: -18, h: 7, broken: true },
    { x: -18, z: 18, h: 8, broken: true },
    { x: 18, z: 18, h: 11, broken: false },
    { x: 0, z: -12, h: 9, broken: false },
    { x: -10, z: 0, h: 6, broken: true },
    { x: 10, z: 8, h: 5, broken: false },
  ];

  for (const p of pillars) {
    const pillar = box(2, p.h, 2, DARK_STONE, p.x, 0, p.z);
    group.add(pillar);
    addCollider(colliders, p.x, p.h / 2, p.z, 1, p.h / 2, 1);

    if (p.broken) {
      const top = box(2.5, 0.8, 2.5, STONE, p.x + 1.2, p.h - 1, p.z);
      top.rotation.z = 0.5;
      group.add(top);
    } else {
      const cap = box(2.6, 0.6, 2.6, MOSS, p.x, p.h, p.z);
      group.add(cap);
    }
  }

  // Elevated platforms
  const platforms = [
    { w: 8, h: 1, d: 8, x: -12, y: 3, z: -8 },
    { w: 6, h: 1, d: 10, x: 14, y: 4, z: -6 },
    { w: 10, h: 1, d: 6, x: 0, y: 5, z: 10 },
    { w: 5, h: 1, d: 5, x: -8, y: 7, z: 12 },
    { w: 4, h: 1, d: 4, x: 12, y: 6, z: 14 },
  ];

  for (const p of platforms) {
    const plat = box(p.w, p.h, p.d, MOSS, p.x, p.y, p.z);
    group.add(plat);
    addCollider(colliders, p.x, p.y + p.h / 2, p.z, p.w / 2, p.h / 2, p.d / 2);

    // Support rubble
    const rubble = box(1.5, p.y, 1.5, DARK_STONE, p.x - p.w * 0.3, 0, p.z);
    group.add(rubble);
    addCollider(colliders, p.x - p.w * 0.3, p.y / 2, p.z, 0.75, p.y / 2, 0.75);
  }

  // Ruined archway
  const archL = box(1.5, 7, 1.5, STONE, -4, 0, -15);
  const archR = box(1.5, 5, 1.5, STONE, 4, 0, -15);
  const archTop = box(10, 1, 1.5, DARK_STONE, 0, 6, -15);
  archTop.rotation.z = 0.08;
  group.add(archL, archR, archTop);
  addCollider(colliders, -4, 3.5, -15, 0.75, 3.5, 0.75);
  addCollider(colliders, 4, 2.5, -15, 0.75, 2.5, 0.75);

  // Scattered debris
  for (let i = 0; i < 12; i++) {
    const sx = (Math.random() - 0.5) * 50;
    const sz = (Math.random() - 0.5) * 50;
    const sh = 0.3 + Math.random() * 0.8;
    const debris = box(0.8 + Math.random(), sh, 0.8 + Math.random(), DARK_STONE, sx, 0, sz);
    debris.rotation.y = Math.random() * Math.PI;
    group.add(debris);
    addCollider(colliders, sx, sh / 2, sz, 0.5, sh / 2, 0.5);
  }

  scene.add(group);
  return colliders;
}
