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

  // === MAIN FLOOR (expanded castle courtyard ~58x68) ===
  box(58, 0.6, 68, FLOOR, 0, -0.3, 0);
  addCollider(0, 0, 0, 29, 0.3, 34);

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

  // =====================================================
  // CASTLE THEME - NORTH END (second floor + bridge + door)
  // The existing courtyard pillars are the outer bailey.
  // A large stone gateway (door) leads from the inner castle area
  // out into the main pillar courtyard.
  // =====================================================

  const wallBaseZ = 24;
  const wallH = 7.8;

  // Main curtain wall segments (thick castle walls)
  // Left segment
  box(10.5, wallH, 3.8, STONE, -12.5, 0, wallBaseZ);
  addCollider(-12.5, wallH / 2, wallBaseZ, 5.25, wallH / 2, 1.9);

  // Right segment
  box(10.5, wallH, 3.8, STONE, 12.5, 0, wallBaseZ);
  addCollider(12.5, wallH / 2, wallBaseZ, 5.25, wallH / 2, 1.9);

  // Gateway / Door frame (the opening that leads out to the courtyard)
  // Tall side pillars framing the door
  box(2.4, 9.2, 4.5, DARK_STONE, -5, 0, wallBaseZ + 0.3);
  addCollider(-5, 4.6, wallBaseZ + 0.3, 1.2, 4.6, 2.25);

  box(2.4, 9.2, 4.5, DARK_STONE, 5, 0, wallBaseZ + 0.3);
  addCollider(5, 4.6, wallBaseZ + 0.3, 1.2, 4.6, 2.25);

  // Door lintel (top of the archway)
  box(12.5, 1.4, 4.8, STONE, 0, 8.3, wallBaseZ + 0.3);
  addCollider(0, 8.3 + 0.7, wallBaseZ + 0.3, 6.25, 0.7, 2.4);

  // Inner raised floor (castle inner bailey / hall)
  box(20, 0.9, 14, 0x52575f, 0, 0.45, 28.5);
  addCollider(0, 0.45 + 0.45, 28.5, 10, 0.45, 7);

  // === TOWERS (tall castle towers flanking the gate) ===
  const towerH = 11.5;

  // Left tower base + upper
  box(5.2, towerH, 5.2, STONE, -15, 0, wallBaseZ + 3.5);
  addCollider(-15, towerH / 2, wallBaseZ + 3.5, 2.6, towerH / 2, 2.6);

  box(5.8, 1.2, 5.8, DARK_STONE, -15, towerH - 0.4, wallBaseZ + 3.5);
  addCollider(-15, towerH - 0.4 + 0.6, wallBaseZ + 3.5, 2.9, 0.6, 2.9);

  // Right tower
  box(5.2, towerH, 5.2, STONE, 15, 0, wallBaseZ + 3.5);
  addCollider(15, towerH / 2, wallBaseZ + 3.5, 2.6, towerH / 2, 2.6);

  box(5.8, 1.2, 5.8, DARK_STONE, 15, towerH - 0.4, wallBaseZ + 3.5);
  addCollider(15, towerH - 0.4 + 0.6, wallBaseZ + 3.5, 2.9, 0.6, 2.9);

  // === SECOND FLOOR - Battlements on the wall ===
  const upperY = 7.2;

  // Left upper walkway (second floor) - thicker for solid feel
  box(8.5, 1.1, 4.2, STONE, -11.5, upperY - 0.1, wallBaseZ - 0.5);
  addCollider(-11.5, upperY + 0.55, wallBaseZ - 0.5, 4.25, 0.55, 2.1);

  // Right upper walkway
  box(8.5, 1.1, 4.2, STONE, 11.5, upperY - 0.1, wallBaseZ - 0.5);
  addCollider(11.5, upperY + 0.55, wallBaseZ - 0.5, 4.25, 0.55, 2.1);

  // Battlements / crenellations (low walls on upper level)
  box(8.8, 1.4, 0.75, DARK_STONE, -11.5, upperY + 1.1, wallBaseZ - 2.3);
  addCollider(-11.5, upperY + 1.1 + 0.7, wallBaseZ - 2.3, 4.4, 0.7, 0.375);

  box(8.8, 1.4, 0.75, DARK_STONE, 11.5, upperY + 1.1, wallBaseZ - 2.3);
  addCollider(11.5, upperY + 1.1 + 0.7, wallBaseZ - 2.3, 4.4, 0.7, 0.375);

  // Side battlements
  box(0.75, 1.4, 4.2, DARK_STONE, -16, upperY + 1.1, wallBaseZ - 0.5);
  addCollider(-16, upperY + 1.1 + 0.7, wallBaseZ - 0.5, 0.375, 0.7, 2.1);

  box(0.75, 1.4, 4.2, DARK_STONE, 16, upperY + 1.1, wallBaseZ - 0.5);
  addCollider(16, upperY + 1.1 + 0.7, wallBaseZ - 0.5, 0.375, 0.7, 2.1);

  // === BRIDGE (stone bridge connecting the two upper walkways / towers) ===
  const bridgeY = 7.6;
  const bridgeZ = wallBaseZ + 3;

  // Bridge deck - make it thicker for reliable walking
  box(19, 1.1, 2.6, STONE, 0, bridgeY, bridgeZ);
  addCollider(0, bridgeY + 0.55, bridgeZ, 9.5, 0.55, 1.3);

  // Bridge side railings - taller and thicker for solid barriers (prevents falling through sides)
  box(19, 1.4, 0.6, DARK_STONE, 0, bridgeY + 1.3, bridgeZ - 1.4);
  addCollider(0, bridgeY + 1.3 + 0.7, bridgeZ - 1.4, 9.5, 0.7, 0.3);

  box(19, 1.4, 0.6, DARK_STONE, 0, bridgeY + 1.3, bridgeZ + 1.4);
  addCollider(0, bridgeY + 1.3 + 0.7, bridgeZ + 1.4, 9.5, 0.7, 0.3);

  // Small pillars on the bridge for cover / style (also act as walls)
  box(1.6, 2.4, 1.6, DARK_STONE, -5.5, bridgeY + 0.4, bridgeZ);
  addCollider(-5.5, bridgeY + 0.4 + 1.2, bridgeZ, 0.8, 1.2, 0.8);

  box(1.6, 2.4, 1.6, DARK_STONE, 5.5, bridgeY + 0.4, bridgeZ);
  addCollider(5.5, bridgeY + 0.4 + 1.2, bridgeZ, 0.8, 1.2, 0.8);

  // === STAIRS to reach the second floor (near the door) ===
  // Right side stairs (from courtyard up to upper level)
  // More forgiving colliders + slight overlap so you don't fall through
  const stairStartX = 6.2;
  const stairStartZ = 18.5;
  for (let i = 0; i < 7; i++) {
    const sh = 0.75;
    const sw = 2.8;
    const sd = 1.4;
    const sx = stairStartX;
    const sy = i * (sh * 0.88);
    const sz = stairStartZ - i * 0.78;
    box(sw, sh, sd, STONE, sx, sy, sz);
    // Generous collider for reliable stair climbing
    addCollider(sx, sy + sh / 2 + 0.1, sz, sw / 2 + 0.2, sh / 2 + 0.15, sd / 2 + 0.2);
  }

  // Left side stairs
  const stairLeftX = -6.2;
  for (let i = 0; i < 7; i++) {
    const sh = 0.75;
    const sw = 2.8;
    const sd = 1.4;
    const sx = stairLeftX;
    const sy = i * (sh * 0.88);
    const sz = stairStartZ - i * 0.78;
    box(sw, sh, sd, STONE, sx, sy, sz);
    addCollider(sx, sy + sh / 2 + 0.1, sz, sw / 2 + 0.2, sh / 2 + 0.15, sd / 2 + 0.2);
  }

  // Inner support pillars / columns in the castle area
  box(1.5, 7, 1.5, DARK_STONE, -4.5, 0, 26);
  addCollider(-4.5, 3.5, 26, 0.75, 3.5, 0.75);

  box(1.5, 7, 1.5, DARK_STONE, 4.5, 0, 26);
  addCollider(4.5, 3.5, 26, 0.75, 3.5, 0.75);

  // =====================================================
  // CLOSE THE CASTLE + SIDE EXIT + 3 EXTERNAL SIDE TOWERS
  // =====================================================

  // Side walls to close the inner castle area (makes it feel like a proper keep)
  // West closing wall
  box(3.2, 7.5, 12, STONE, -15.5, 0, 27);
  addCollider(-15.5, 3.75, 27, 1.6, 3.75, 6);

  // East closing wall (with a deliberate opening/gap to get out to the side towers)
  // North segment of east wall
  box(3.2, 7.5, 5, STONE, 15.5, 0, 24);
  addCollider(15.5, 3.75, 24, 1.6, 3.75, 2.5);

  // South segment of east wall (gap between this and the north segment)
  box(3.2, 7.5, 5, STONE, 15.5, 0, 30);
  addCollider(15.5, 3.75, 30, 1.6, 3.75, 2.5);

  // The gap in the east wall is around x=15.5 , z~26-28 — this is the "opening to get out"

  // Small low wall / lip on the inner side of the opening (visual cue + minor cover)
  box(2.5, 1.2, 1.5, DARK_STONE, 14, 0, 27);
  addCollider(14, 0.6, 27, 1.25, 0.6, 0.75);

  // === THREE EXTERNAL SIDE TOWERS (outside the main arena) ===
  // Player exits through the east opening and can fight on these towers.
  // They are positioned outside the main enclosed area.

  const extTowerH = 10.0;

  // Side Tower 1 (closest to the exit, slightly forward)
  box(4.8, extTowerH, 4.8, STONE, 22, 0, 26);
  addCollider(22, extTowerH / 2, 26, 2.4, extTowerH / 2, 2.4);
  // Top platform (fightable surface)
  box(5.4, 1.0, 5.4, DARK_STONE, 22, extTowerH - 0.3, 26);
  addCollider(22, extTowerH - 0.3 + 0.5, 26, 2.7, 0.5, 2.7);

  // Side Tower 2 (further out, angled)
  box(4.5, extTowerH + 1.5, 4.5, STONE, 27, 0, 31);
  addCollider(27, (extTowerH + 1.5) / 2, 31, 2.25, (extTowerH + 1.5) / 2, 2.25);
  box(5.2, 1.0, 5.2, DARK_STONE, 27, extTowerH + 1.2, 31);
  addCollider(27, extTowerH + 1.2 + 0.5, 31, 2.6, 0.5, 2.6);

  // Side Tower 3 (more to the side, creates a triangle for fighting between them)
  box(4.2, extTowerH, 4.2, STONE, 20, 0, 35);
  addCollider(20, extTowerH / 2, 35, 2.1, extTowerH / 2, 2.1);
  box(4.8, 1.0, 4.8, DARK_STONE, 20, extTowerH - 0.3, 35);
  addCollider(20, extTowerH - 0.3 + 0.5, 35, 2.4, 0.5, 2.4);

  // Small low barriers near the external towers for cover while fighting
  box(2.8, 1.3, 1.2, STONE, 19, 0, 29);
  addCollider(19, 0.65, 29, 1.4, 0.65, 0.6);

  box(1.2, 1.3, 2.8, STONE, 25, 0, 33);
  addCollider(25, 0.65, 33, 0.6, 0.65, 1.4);

  // Some scattered rubble outside near the opening for parkour to the towers
  box(1.8, 0.6, 2.2, DARK_STONE, 17.5, 0, 28);
  addCollider(17.5, 0.3, 28, 0.9, 0.3, 1.1);

  box(2.2, 0.5, 1.6, STONE, 18.5, 0, 32);
  addCollider(18.5, 0.25, 32, 1.1, 0.25, 0.8);

  // Some upper-level cover elements near the bridge
  box(2, 1.9, 2, STONE, -8, upperY + 0.6, wallBaseZ + 1);
  addCollider(-8, upperY + 0.6 + 0.95, wallBaseZ + 1, 1, 0.95, 1);

  box(2, 1.9, 2, STONE, 8, upperY + 0.6, wallBaseZ + 1);
  addCollider(8, upperY + 0.6 + 0.95, wallBaseZ + 1, 1, 0.95, 1);

  scene.add(group);

  // Subtle fill light for atmosphere (doesn't affect colliders)
  const moodLight = new THREE.PointLight(0xffe9bb, 0.4, 35);
  moodLight.position.set(0, 9, 18);
  group.add(moodLight);

  return {
    colliders,
    // Starting positions: player near the door in the courtyard,
    // dummy in the main pillar area
    playerStart: new THREE.Vector3(0, 2.1, 14),
    dummyStart: new THREE.Vector3(-3, 2.0, -4),
  };
}
