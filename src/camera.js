import * as THREE from 'three';

const MIN_PITCH = -0.3;
const MAX_PITCH = 1.2;
const DISTANCE = 8;
const HEIGHT_OFFSET = 1.5;
const SMOOTH = 12;

export class CameraController {
  constructor(camera, domElement) {
    this.camera = camera;
    this.yaw = 0;
    this.pitch = 0.3;
    this.dragging = false;
    this.prevX = 0;
    this.prevY = 0;
    this._target = new THREE.Vector3();

    domElement.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return;
      this.dragging = true;
      this.prevX = e.clientX;
      this.prevY = e.clientY;
    });

    window.addEventListener('mouseup', () => {
      this.dragging = false;
    });

    window.addEventListener('mousemove', (e) => {
      if (!this.dragging) return;
      const dx = e.clientX - this.prevX;
      const dy = e.clientY - this.prevY;
      this.prevX = e.clientX;
      this.prevY = e.clientY;
      this.yaw -= dx * 0.005;
      this.pitch = THREE.MathUtils.clamp(this.pitch - dy * 0.005, MIN_PITCH, MAX_PITCH);
    });

    domElement.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  getForward() {
    return new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
  }

  getRight() {
    return new THREE.Vector3(Math.cos(this.yaw), 0, -Math.sin(this.yaw));
  }

  update(playerPos, dt) {
    const offset = new THREE.Vector3(
      Math.sin(this.yaw) * Math.cos(this.pitch) * DISTANCE,
      Math.sin(this.pitch) * DISTANCE + HEIGHT_OFFSET,
      Math.cos(this.yaw) * Math.cos(this.pitch) * DISTANCE
    );

    this._target.copy(playerPos).add(new THREE.Vector3(0, HEIGHT_OFFSET * 0.5, 0));
    const desired = playerPos.clone().add(offset);

    this.camera.position.lerp(desired, 1 - Math.exp(-SMOOTH * dt));
    this.camera.lookAt(this._target);
  }
}
