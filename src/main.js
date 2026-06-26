import './style.css';
import * as THREE from 'three';
import { buildArena } from './arena.js';
import { Player } from './player.js';
import { CameraController } from './camera.js';
import { Dummy } from './dummy.js';
import { Fireball, Blink, Nova } from './spell.js';
import { applyOutlines, ensureOutlines } from './outline.js';

const app = document.querySelector('#app');

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87a8c4);
scene.fog = new THREE.Fog(0x87a8c4, 30, 80);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 200);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
app.appendChild(renderer.domElement);

const ambient = new THREE.AmbientLight(0x8899bb, 0.45);
const sun = new THREE.DirectionalLight(0xfff0dd, 1.6);
sun.position.set(20, 30, 10);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.near = 1;
sun.shadow.camera.far = 80;
sun.shadow.camera.left = -35;
sun.shadow.camera.right = 35;
sun.shadow.camera.top = 35;
sun.shadow.camera.bottom = -35;
scene.add(ambient, sun);

// === MAP SELECTION (easy to swap) ===
// To use the old courtyard: import { buildWorld } from './world.js'; then const colliders = buildWorld(scene);
// Current:
const arena = buildArena(scene);
const colliders = arena.colliders;

const camCtrl = new CameraController(camera, renderer.domElement);
const player = new Player(scene, camCtrl);
const dummy = new Dummy(scene);

// Apply map-specific spawns for easy swapping
if (arena.playerStart) {
  player.mesh.position.copy(arena.playerStart);
}
if (arena.dummyStart) {
  dummy.mesh.position.copy(arena.dummyStart);
  const ds = arena.dummyStart;
  dummy.collider.x = ds.x;
  dummy.collider.y = ds.y - 0.9; // DUMMY_H / 2
  dummy.collider.z = ds.z;
}

const fireball = new Fireball(scene, player, camera, dummy, colliders, camCtrl);
const blink = new Blink(scene, player, camera, camCtrl);
const nova = new Nova(scene, player, dummy, camCtrl);

applyOutlines(scene);

const hud = document.createElement('div');
hud.id = 'hud';
hud.innerHTML = 'WASD · Double-tap dash · Space double-jump/wall · Q Fireball · E Blink · R Nova · Mouse aim · Esc pause';
app.appendChild(hud);

// Crosshair
const crosshair = document.createElement('div');
crosshair.id = 'crosshair';
crosshair.innerHTML = '<div class="dot"></div>';
app.appendChild(crosshair);

const dummyHud = document.createElement('div');
dummyHud.id = 'dummy-hud';
dummyHud.innerHTML = `
  <div id="dummy-label">DUMMY 100/100</div>
  <div id="dummy-bar-track"><div id="dummy-bar-fill"></div></div>
`;
app.appendChild(dummyHud);

const dummyLabel = document.getElementById('dummy-label');
const dummyBarFill = document.getElementById('dummy-bar-fill');

let kills = 0;
let lastDummyHealth = 100;
const scoreEl = document.createElement('div');
scoreEl.id = 'score';
scoreEl.textContent = 'KILLS: 0';
app.appendChild(scoreEl);

let paused = false;

const pauseOverlay = document.createElement('div');
pauseOverlay.id = 'pause-overlay';
pauseOverlay.hidden = true;
pauseOverlay.innerHTML = `
  <h1 id="pause-title">PAUSED</h1>
  <div id="pause-menu">
    <button type="button" class="pause-option" id="pause-resume">RESUME</button>
    <button type="button" class="pause-option" id="pause-quit">QUIT</button>
  </div>
`;
app.appendChild(pauseOverlay);

function pauseGame() {
  if (paused) return;
  paused = true;
  pauseOverlay.hidden = false;
  if (document.pointerLockElement) {
    document.exitPointerLock();
  }
}

function resumeGame() {
  if (!paused) return;
  paused = false;
  pauseOverlay.hidden = true;
  clock.getDelta();
  document.body.requestPointerLock();
}

document.getElementById('pause-resume').addEventListener('click', resumeGame);
document.getElementById('pause-quit').addEventListener('click', () => {
  location.reload();
});

window.addEventListener('keydown', (e) => {
  if (e.code === 'Escape') {
    e.preventDefault();
    if (paused) {
      resumeGame();
    } else {
      pauseGame();
    }
  }
});

// Catch browser-initiated pointer lock exit (e.g. pressing ESC while locked)
// so the pause menu opens on a single ESC press.
document.addEventListener('pointerlockchange', () => {
  if (!document.pointerLockElement && !paused) {
    pauseGame();
  }
});

const clock = new THREE.Clock();

function onResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}
window.addEventListener('resize', onResize);

function animate() {
  requestAnimationFrame(animate);

  if (paused) {
    ensureOutlines(scene);
    renderer.render(scene, camera);
    return;
  }

  const dt = Math.min(clock.getDelta(), 0.05);

  dummy.update(dt, colliders);
  player.update(dt, camCtrl, [...colliders, dummy.collider]);
  fireball.update(dt);
  blink.update(dt);
  nova.update(dt);
  camCtrl.update(player.mesh.position, dt);

  dummyLabel.textContent = `DUMMY ${Math.ceil(dummy.health)}/${dummy.maxHealth}`;
  dummyBarFill.style.width = `${(dummy.health / dummy.maxHealth) * 100}%`;

  if (lastDummyHealth > 0 && dummy.health <= 0) {
    kills++;
    scoreEl.textContent = `KILLS: ${kills}`;
  }
  lastDummyHealth = dummy.health;

  ensureOutlines(scene);
  renderer.render(scene, camera);
}

animate();
