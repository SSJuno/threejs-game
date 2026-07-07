import * as THREE from 'three';

const MIN_PITCH = -0.3;
const MAX_PITCH = 1.2;
const DISTANCE = 8;
const HEIGHT_OFFSET = 1.5;
const ARM_SMOOTH = 10;
const ARM_OFFSET = 0.3;

export class CameraController {
  constructor(camera, domElement, colliders) {
    this.camera = camera;
    this.colliders = colliders;
    this.yaw = 0;
    this.pitch = 0.3;
    this._target = new THREE.Vector3();
    this._origin = new THREE.Vector3();
    this._offset = new THREE.Vector3();
    this._desired = new THREE.Vector3();
    this._springTarget = new THREE.Vector3();
    this._direction = new THREE.Vector3();
    this._hitPoint = new THREE.Vector3();
    this._box = new THREE.Box3();
    this._boxMin = new THREE.Vector3();
    this._boxMax = new THREE.Vector3();
    this._raycaster = new THREE.Raycaster();
    this.shake = 0;
    this.shakeDecay = 12;

    document.addEventListener('click', () => {
      document.body.requestPointerLock();
    });

    document.addEventListener('mousemove', (e) => {
      if (!document.pointerLockElement) return;
      this.yaw -= e.movementX * 0.002;
      this.pitch = THREE.MathUtils.clamp(
        this.pitch + e.movementY * 0.002,
        MIN_PITCH,
        MAX_PITCH
      );
    });

    domElement.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  addShake(amount) {
    this.shake = Math.min(1.2, this.shake + amount);
  }

  getForward() {
    return new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
  }

  getRight() {
    return new THREE.Vector3(Math.cos(this.yaw), 0, -Math.sin(this.yaw));
  }

  _resolveSpringArm(origin, desired) {
    this._direction.subVectors(desired, origin);
    const armLength = this._direction.length();
    if (armLength < 0.001) {
      this._springTarget.copy(desired);
      return;
    }
    this._direction.divideScalar(armLength);

    this._raycaster.set(origin, this._direction);
    this._raycaster.near = 0;
    this._raycaster.far = DISTANCE;

    let closestDist = DISTANCE;
    let blocked = false;

    for (const c of this.colliders) {
      this._boxMin.set(c.x - c.hw, c.y - c.hh, c.z - c.hd);
      this._boxMax.set(c.x + c.hw, c.y + c.hh, c.z + c.hd);
      this._box.set(this._boxMin, this._boxMax);

      const hit = this._raycaster.ray.intersectBox(this._box, this._hitPoint);
      if (!hit) continue;

      const dist = origin.distanceTo(hit);
      if (dist > 0.01 && dist < closestDist) {
        closestDist = dist;
        blocked = true;
        this._springTarget.copy(hit).addScaledVector(this._direction, -ARM_OFFSET);
      }
    }

    if (!blocked) {
      this._springTarget.copy(desired);
    }
  }

  update(playerPos, dt) {
    this._offset.set(
      Math.sin(this.yaw) * Math.cos(this.pitch) * DISTANCE,
      Math.sin(this.pitch) * DISTANCE + HEIGHT_OFFSET,
      Math.cos(this.yaw) * Math.cos(this.pitch) * DISTANCE
    );

    this._target.copy(playerPos).add(new THREE.Vector3(0, HEIGHT_OFFSET * 0.5, 0));
    this._origin.copy(playerPos);
    this._desired.copy(playerPos).add(this._offset);

    if (this.shake > 0.001) {
      const s = this.shake * 0.18;
      this._desired.x += (Math.random() - 0.5) * s;
      this._desired.y += (Math.random() - 0.5) * s * 0.6;
      this._desired.z += (Math.random() - 0.5) * s;
      this._target.x += (Math.random() - 0.5) * s * 0.5;
      this._target.z += (Math.random() - 0.5) * s * 0.5;
      this.shake = Math.max(0, this.shake - this.shakeDecay * dt);
    }

    this._resolveSpringArm(this._origin, this._desired);
    this.camera.position.lerp(this._springTarget, 1 - Math.exp(-ARM_SMOOTH * dt));
    this.camera.lookAt(this._target);
  }
}