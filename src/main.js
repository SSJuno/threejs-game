import './style.css';
import * as THREE from 'three';
import { availableMaps } from './mapRegistry.js';
import { Player } from './player.js';
import { CameraController } from './camera.js';
import { Dummy } from './dummy.js';
import { Fireball, Blink, Nova, IcePillar } from './spell.js';
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

// === MAP SELECTION SYSTEM ===
// Uses mapRegistry.js for easy extension. 
// 'ruins' = original arena map (unchanged)
// 'fantasy' = new crystalline map
// Current map loaded from sessionStorage or defaults to 'ruins' (index 0).
// IMPORTANT: The original map (arena.js) is NEVER modified.
let selectedMapIndex = 0;
try {
  const saved = sessionStorage.getItem('selectedMapIndex');
  if (saved !== null) {
    selectedMapIndex = Math.max(0, Math.min(parseInt(saved, 10), availableMaps.length - 1));
  }
} catch (e) {}

const currentMap = availableMaps[selectedMapIndex] || availableMaps[0];
const arenaData = currentMap.builder(scene);
let colliders = arenaData.colliders;

const camCtrl = new CameraController(camera, renderer.domElement);
const player = new Player(scene, camCtrl);
const dummy = new Dummy(scene);

// Apply map-specific spawns for easy swapping
if (arenaData.playerStart) {
  player.mesh.position.copy(arenaData.playerStart);
}
if (arenaData.dummyStart) {
  dummy.mesh.position.copy(arenaData.dummyStart);
  const ds = arenaData.dummyStart;
  dummy.collider.x = ds.x;
  dummy.collider.y = ds.y - 0.9; // DUMMY_H / 2
  dummy.collider.z = ds.z;
}

const fireball = new Fireball(scene, player, camera, dummy, colliders, camCtrl);
const blink = new Blink(scene, player, camera, camCtrl);
const nova = new Nova(scene, player, dummy, camCtrl);

// Ice Pillar (hold E to aim, release to cast rising ice pillar that slows)
const icePillar = new IcePillar(scene, player, camera, dummy, colliders, camCtrl);

applyOutlines(scene);

const hud = document.createElement('div');
hud.id = 'hud';
hud.innerHTML = 'WASD · Double-tap dash · Space double-jump/wall · Q Fireball · Hold E: Ice Pillar · Shift: Blink · R Nova · Mouse aim · Esc pause';
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

// === Ability UI (bottom left for Q, bottom right for E) ===
// Clean minimal slots as requested. Cooldowns will be updated by the ability classes.
const abilitiesContainer = document.createElement('div');
abilitiesContainer.id = 'abilities-ui';
abilitiesContainer.innerHTML = `
  <div id="ability-q" class="ability-slot">
    <div class="ability-header">
      <span class="ability-key">Q</span>
      <span class="ability-name">Fireball</span>
    </div>
    <div class="ability-cd-track"><div id="q-cd-fill" class="ability-cd-fill"></div></div>
    <div class="ability-cooldown-text" id="q-cd-text"></div>
  </div>
  <div id="ability-e" class="ability-slot">
    <div class="ability-header">
      <span class="ability-name">Ice Pillar</span>
      <span class="ability-key">E (hold)</span>
    </div>
    <div class="ability-cd-track"><div id="e-cd-fill" class="ability-cd-fill" style="background:#88ccff;"></div></div>
    <div class="ability-cooldown-text" id="e-cd-text"></div>
  </div>
`;
app.appendChild(abilitiesContainer);

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

// Add "Select Map" button to pause menu
const selectMapBtn = document.createElement('button');
selectMapBtn.type = 'button';
selectMapBtn.className = 'pause-option';
selectMapBtn.textContent = 'SELECT MAP';
selectMapBtn.style.marginTop = '12px';
document.getElementById('pause-menu').appendChild(selectMapBtn);

// Simple map selection overlay (easy to extend)
const mapSelectOverlay = document.createElement('div');
mapSelectOverlay.id = 'map-select-overlay';
mapSelectOverlay.style.cssText = 'position:fixed; inset:0; background:rgba(10,15,35,0.85); display:none; align-items:center; justify-content:center; z-index:200; flex-direction:column;';
mapSelectOverlay.innerHTML = `
  <h2 style="color:#e8f0ff; font-size:32px; margin-bottom:20px;">Select Map</h2>
  <div id="map-buttons" style="display:flex; flex-direction:column; gap:12px;"></div>
  <button id="map-back" style="margin-top:24px; background:transparent; border:1px solid #78aaff; color:#c8d8f0; padding:8px 24px; cursor:pointer;">BACK</button>
`;
app.appendChild(mapSelectOverlay);

selectMapBtn.addEventListener('click', () => {
  pauseOverlay.hidden = true;
  showMapSelect();
});

function showMapSelect() {
  const buttonsContainer = document.getElementById('map-buttons');
  buttonsContainer.innerHTML = '';
  availableMaps.forEach((map, idx) => {
    const btn = document.createElement('button');
    btn.textContent = map.name + (idx === selectedMapIndex ? ' (current)' : '');
    btn.style.cssText = 'background:transparent; border:1px solid #78aaff; color:#c8d8f0; padding:12px 48px; font-size:18px; cursor:pointer;';
    btn.addEventListener('click', () => {
      if (idx !== selectedMapIndex) {
        sessionStorage.setItem('selectedMapIndex', idx);
        location.reload();
      } else {
        hideMapSelect();
        pauseOverlay.hidden = false;
      }
    });
    buttonsContainer.appendChild(btn);
  });
  mapSelectOverlay.style.display = 'flex';
  document.getElementById('map-back').onclick = () => {
    hideMapSelect();
    pauseOverlay.hidden = false;
  };
}

function hideMapSelect() {
  mapSelectOverlay.style.display = 'none';
}

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
  icePillar.update(dt);  // Ice Pillar (hold E)
  camCtrl.update(player.mesh.position, dt);

  // Call optional map-specific update (e.g. rain on fantasy map)
  if (arenaData.update) {
    arenaData.update(dt);
  }

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
