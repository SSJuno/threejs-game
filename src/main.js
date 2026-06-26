import './style.css';
import * as THREE from 'three';
import { buildWorld } from './world.js';
import { Player } from './player.js';
import { CameraController } from './camera.js';
import { Dummy } from './dummy.js';
import { Fireball } from './spell.js';
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

const colliders = buildWorld(scene);
const player = new Player(scene);
const dummy = new Dummy(scene);
const camCtrl = new CameraController(camera, renderer.domElement);
const fireball = new Fireball(scene, player, camera, dummy);

applyOutlines(scene);

const hud = document.createElement('div');
hud.id = 'hud';
hud.innerHTML = 'WASD move · Double-tap direction to dash · Space jump (x2) · Drag mouse to rotate camera';
app.appendChild(hud);

const dummyHud = document.createElement('div');
dummyHud.id = 'dummy-hud';
dummyHud.innerHTML = `
  <div id="dummy-label">DUMMY 100/100</div>
  <div id="dummy-bar-track"><div id="dummy-bar-fill"></div></div>
`;
app.appendChild(dummyHud);

const dummyLabel = document.getElementById('dummy-label');
const dummyBarFill = document.getElementById('dummy-bar-fill');

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
  if (e.code === 'Escape' && !paused) {
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
  camCtrl.update(player.mesh.position, dt);

  dummyLabel.textContent = `DUMMY ${Math.ceil(dummy.health)}/${dummy.maxHealth}`;
  dummyBarFill.style.width = `${(dummy.health / dummy.maxHealth) * 100}%`;

  ensureOutlines(scene);
  renderer.render(scene, camera);
}

animate();
