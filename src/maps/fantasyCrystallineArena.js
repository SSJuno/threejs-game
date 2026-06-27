import * as THREE from 'three';
import { createGradientMap } from '../world.js';

const STONE = 0x888888;
const DARK_STONE = 0x555555;
const FLOOR_COLOR = 0x777777;
const TEAL = 0x40e0d0;
const PURPLE = 0x9932cc;
const PINK = 0xff69b4;

export function buildFantasyCrystallineArena(scene) {
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

  // Circular stone tile floor
  const floorRadius = 22;
  const floor = new THREE.Mesh(
    new THREE.CylinderGeometry(floorRadius, floorRadius, 0.5, 32),
    new THREE.MeshToonMaterial({ color: FLOOR_COLOR, gradientMap })
  );
  floor.position.y = 0.25;
  group.add(floor);
  // Approx AABB collider for the circle (square bounding for simplicity, movement friendly)
  addCollider(0, 0.25, 0, floorRadius, 0.25, floorRadius);

  // Brown leaf debris on the ground for fantasy feel (scattered on floor)
  const leafColor = 0x8B4513; // brown
  const numLeaves = 25;
  for (let i = 0; i < numLeaves; i++) {
    const angle = Math.random() * Math.PI * 2;
    const r = Math.random() * (floorRadius - 2);
    const lx = Math.cos(angle) * r;
    const lz = Math.sin(angle) * r;
    const lw = 0.6 + Math.random() * 0.8;
    const lh = 0.05;
    const ld = 0.4 + Math.random() * 0.6;
    const leaf = box(lw, lh, ld, leafColor, lx, 0.28, lz, Math.random() * 0.5, Math.random() * Math.PI * 2, Math.random() * 0.5);
    // Small random tilt to look natural
    leaf.rotation.x += (Math.random() - 0.5) * 1.2;
    leaf.rotation.z += (Math.random() - 0.5) * 1.2;
    // No collider for leaves to keep movement clean
  }

  // Raised circular edge / rim with stairs access
  const rim = new THREE.Mesh(
    new THREE.CylinderGeometry(23.5, 23.5, 1.8, 32),
    new THREE.MeshToonMaterial({ color: STONE, gradientMap })
  );
  rim.position.y = 1.15;
  group.add(rim);
  addCollider(0, 1.15, 0, 23.5, 0.9, 23.5);

  // Stairs at 4 cardinal directions for raised edge access
  const stairDirs = [
    { x: 0, z: -1, baseZ: -20 },
    { x: 1, z: 0, baseX: 20 },
    { x: 0, z: 1, baseZ: 20 },
    { x: -1, z: 0, baseX: -20 },
  ];

  stairDirs.forEach((dir, idx) => {
    for (let s = 0; s < 5; s++) {
      const sh = 0.35;
      const sw = 5;
      const sd = 1.6;
      let sx = dir.baseX || 0;
      let sz = dir.baseZ || 0;
      if (dir.x === 0) {
        sz += dir.z * s * 1.0;
      } else {
        sx += dir.x * s * 1.0;
      }
      const sy = s * sh;
      box(sw, sh, sd, STONE, sx, sy, sz);
      addCollider(sx, sy + sh / 2, sz, sw / 2, sh / 2, sd / 2);
    }
  });

  // Classical-style pillars around the perimeter
  const pillarCount = 8;
  const pillarR = 19.5;
  for (let i = 0; i < pillarCount; i++) {
    const angle = (i / pillarCount) * Math.PI * 2;
    const px = Math.cos(angle) * pillarR;
    const pz = Math.sin(angle) * pillarR;

    // Base
    cylinder(1.3, 0.8, STONE, px, 0, pz);
    addCollider(px, 0.4, pz, 1.3, 0.4, 1.3);

    // Shaft
    cylinder(0.85, 5.5, DARK_STONE, px, 0.8, pz);
    addCollider(px, 3.55, pz, 0.85, 2.75, 0.85);

    // Capital
    box(2.1, 0.7, 2.1, STONE, px, 6.3, pz);
    addCollider(px, 6.65, pz, 1.05, 0.35, 1.05);
  }

  function cylinder(r, h, color, x, y, z) {
    const mesh = new THREE.Mesh(
      new THREE.CylinderGeometry(r, r, h, 16),
      new THREE.MeshToonMaterial({ color, gradientMap })
    );
    mesh.position.set(x, y + h / 2, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
    return mesh;
  }

  // Colorful organic crystalline arches (teal, purple, pink) between pillars
  const archColors = [TEAL, PURPLE, PINK];
  for (let i = 0; i < pillarCount; i += 2) { // every other for spacing
    const angle = (i / pillarCount) * Math.PI * 2;
    const midAngle = angle + (Math.PI * 2 / pillarCount);
    const ax = Math.cos(midAngle) * (pillarR * 0.92);
    const az = Math.sin(midAngle) * (pillarR * 0.92);
    const color = archColors[(i / 2) % 3];

    // Arch using torus segment for organic curve
    const arch = new THREE.Mesh(
      new THREE.TorusGeometry(3.8, 0.55, 6, 14, Math.PI * 0.95),
      new THREE.MeshToonMaterial({ color, gradientMap })
    );
    arch.position.set(ax, 5.5, az);
    arch.rotation.y = midAngle + Math.PI / 2;
    arch.rotation.z = Math.PI / 2;
    group.add(arch);

    // Add simple AABB collider approx for the arch (not blocking movement too much)
    addCollider(ax, 5.2, az, 3.5, 1.5, 0.8);
  }

  // Several pillars in the middle area for cover and parkour
  // Increased height significantly for immersive jumping and parkour
  const midPillars = [
    { x: -7, z: -7, h: 10 },
    { x: 7, z: -7, h: 10 },
    { x: -7, z: 7, h: 10 },
    { x: 7, z: 7, h: 10 },
    { x: -4, z: 0, h: 9 },
    { x: 4, z: 0, h: 9 },
    { x: 0, z: -4, h: 9 },
    { x: 0, z: 4, h: 9 },
  ];

  midPillars.forEach((p) => {
    cylinder(1.4, p.h, STONE, p.x, 0, p.z);
    addCollider(p.x, p.h / 2, p.z, 1.4, p.h / 2, 1.4);
    // Top for standing / parkour
    addCollider(p.x, p.h - 0.1, p.z, 1.5, 0.2, 1.5);
  });

  // One large central cracked pillar with holes/gaps
  // Increased height for fun jumping and climbing
  const cx = 0;
  const cz = 0;
  const ch = 14;
  const cW = 2.2;
  const gap = 1.6;

  // 4 vertical sections with central gaps for jumping through / climbing
  const crackParts = [
    { dx: -gap / 2, dz: -gap / 2 },
    { dx: gap / 2, dz: -gap / 2 },
    { dx: -gap / 2, dz: gap / 2 },
    { dx: gap / 2, dz: gap / 2 },
  ];

  crackParts.forEach((part) => {
    const px = cx + part.dx;
    const pz = cz + part.dz;
    box(cW, ch, cW, DARK_STONE, px, 0, pz);
    addCollider(px, ch / 2, pz, cW / 2, ch / 2, cW / 2);
    // Top surface for climbing
    addCollider(px, ch - 0.1, pz, cW / 2 + 0.3, 0.2, cW / 2 + 0.3);
  });

  // Add some extra small crystal details around center for flavor
  for (let i = 0; i < 4; i++) {
    const angle = i * Math.PI / 2;
    const cx2 = Math.cos(angle) * 5;
    const cz2 = Math.sin(angle) * 5;
    const small = cylinder(0.6, 2.2, archColors[i % 3], cx2, 0, cz2);
    addCollider(cx2, 1.1, cz2, 0.6, 1.1, 0.6);
  }

  scene.add(group);

  // === Rain effect for immersive fantasy atmosphere (raining dummy) ===
  // Particles fall from above, respawn when hitting ground level
  const rainCount = 300;
  const rainGeometry = new THREE.BufferGeometry();
  const rainPositions = new Float32Array(rainCount * 3);
  const rainVelocities = new Float32Array(rainCount); // y velocity

  for (let i = 0; i < rainCount; i++) {
    const i3 = i * 3;
    rainPositions[i3] = (Math.random() - 0.5) * floorRadius * 1.8; // x
    rainPositions[i3 + 1] = 15 + Math.random() * 10; // y high
    rainPositions[i3 + 2] = (Math.random() - 0.5) * floorRadius * 1.8; // z
    rainVelocities[i] = 8 + Math.random() * 6; // fall speed
  }

  rainGeometry.setAttribute('position', new THREE.BufferAttribute(rainPositions, 3));
  const rainMaterial = new THREE.PointsMaterial({
    color: 0xaaddff,
    size: 0.08,
    transparent: true,
    opacity: 0.6,
  });
  const rain = new THREE.Points(rainGeometry, rainMaterial);
  group.add(rain);

  // Rain update function (called from main animate)
  function updateRain(dt) {
    const pos = rain.geometry.attributes.position;
    const arr = pos.array;
    for (let i = 0; i < rainCount; i++) {
      const i3 = i * 3;
      arr[i3 + 1] -= rainVelocities[i] * dt;
      // Respawn if below ground
      if (arr[i3 + 1] < 0.1) {
        arr[i3 + 1] = 15 + Math.random() * 10;
        // keep x/z within area
        const angle = Math.random() * Math.PI * 2;
        const r = Math.random() * floorRadius * 0.9;
        arr[i3] = Math.cos(angle) * r;
        arr[i3 + 2] = Math.sin(angle) * r;
      }
    }
    pos.needsUpdate = true;
  }

  return {
    colliders,
    playerStart: new THREE.Vector3(0, 2.1, -12),
    dummyStart: new THREE.Vector3(0, 2.1, 6),
    update: updateRain,  // optional for maps with animated elements like rain
  };
}
