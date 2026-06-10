import * as THREE from 'three';

const GRAVITY = -28;
const DUMMY_H = 1.8;
const DUMMY_R = 0.35;
const BODY_COLOR = 0xcc2222;
const HIT_FLASH = 0.15;
const SPAWN = { x: 8, y: 2, z: 0 };
const KNOCKDOWN_TIME = 0.5;
const WAIT_TIME = 1.5;
const FADE_TIME = 0.5;

export class Dummy {
  constructor(scene) {
    this.scene = scene;
    this.maxHealth = 100;
    this.health = 100;
    this.velocity = new THREE.Vector3();
    this.hitFlash = 0;
    this.deathState = 'alive';
    this.deathTimer = 0;

    this.mesh = new THREE.Group();
    this.bodyMat = new THREE.MeshLambertMaterial({
      color: BODY_COLOR,
      transparent: true,
      opacity: 1,
    });
    this.headMat = new THREE.MeshLambertMaterial({
      color: BODY_COLOR,
      transparent: true,
      opacity: 1,
    });

    const body = new THREE.Mesh(
      new THREE.BoxGeometry(0.7, 1.0, 0.4),
      this.bodyMat
    );
    body.position.y = -1.3;
    body.castShadow = true;

    const head = new THREE.Mesh(
      new THREE.BoxGeometry(0.45, 0.45, 0.45),
      this.headMat
    );
    head.position.y = -0.5;
    head.castShadow = true;

    this.mesh.add(body, head);
    this.mesh.position.set(SPAWN.x, SPAWN.y, SPAWN.z);
    scene.add(this.mesh);

    this.collider = {
      x: SPAWN.x,
      y: SPAWN.y - DUMMY_H / 2,
      z: SPAWN.z,
      hw: 0.35,
      hh: DUMMY_H / 2,
      hd: 0.2,
    };
  }

  takeDamage(amount) {
    if (this.deathState !== 'alive') return;

    this.health = Math.max(0, this.health - amount);
    if (this.health <= 0) {
      this.health = 0;
      this.startDeath();
      return;
    }

    this.hitFlash = HIT_FLASH;
    this.bodyMat.color.setHex(0xffffff);
    this.headMat.color.setHex(0xffffff);
  }

  knockup(force) {
    if (this.deathState !== 'alive') return;
    this.velocity.y = force;
  }

  startDeath() {
    this.deathState = 'knockdown';
    this.deathTimer = 0;
    this.velocity.set(0, 0, 0);
    this.hitFlash = 0;
    this.bodyMat.color.setHex(BODY_COLOR);
    this.headMat.color.setHex(BODY_COLOR);
  }

  updateDeath(dt, colliders) {
    this.deathTimer += dt;
    this.resolveFloor(colliders);

    if (this.deathState === 'knockdown') {
      const t = Math.min(this.deathTimer / KNOCKDOWN_TIME, 1);
      this.mesh.rotation.x = THREE.MathUtils.lerp(0, Math.PI / 2, t);
      if (this.deathTimer >= KNOCKDOWN_TIME) {
        this.deathState = 'wait';
        this.deathTimer = 0;
      }
    } else if (this.deathState === 'wait') {
      if (this.deathTimer >= WAIT_TIME) {
        this.deathState = 'fade';
        this.deathTimer = 0;
      }
    } else if (this.deathState === 'fade') {
      const opacity = 1 - Math.min(this.deathTimer / FADE_TIME, 1);
      this.bodyMat.opacity = opacity;
      this.headMat.opacity = opacity;
      if (this.deathTimer >= FADE_TIME) {
        this.completeRespawn();
      }
    }
  }

  completeRespawn() {
    this.mesh.position.set(SPAWN.x, SPAWN.y, SPAWN.z);
    this.mesh.rotation.set(0, 0, 0);
    this.velocity.set(0, 0, 0);
    this.health = this.maxHealth;
    this.hitFlash = 0;
    this.deathState = 'alive';
    this.deathTimer = 0;
    this.bodyMat.color.setHex(BODY_COLOR);
    this.headMat.color.setHex(BODY_COLOR);
    this.bodyMat.opacity = 1;
    this.headMat.opacity = 1;
  }

  update(dt, colliders) {
    if (this.deathState !== 'alive') {
      this.updateDeath(dt, colliders);
      const pos = this.mesh.position;
      this.collider.x = pos.x;
      this.collider.y = pos.y - DUMMY_H / 2;
      this.collider.z = pos.z;
      return;
    }

    if (this.hitFlash > 0) {
      this.hitFlash -= dt;
      if (this.hitFlash <= 0) {
        this.bodyMat.color.setHex(BODY_COLOR);
        this.headMat.color.setHex(BODY_COLOR);
      }
    }

    this.velocity.y += GRAVITY * dt;
    this.mesh.position.x += this.velocity.x * dt;
    this.mesh.position.y += this.velocity.y * dt;
    this.mesh.position.z += this.velocity.z * dt;

    this.resolveFloor(colliders);

    if (this.mesh.position.y < -8) {
      this.reset();
    }

    const pos = this.mesh.position;
    this.collider.x = pos.x;
    this.collider.y = pos.y - DUMMY_H / 2;
    this.collider.z = pos.z;
  }

  resolveFloor(colliders) {
    const pos = this.mesh.position;
    const feet = pos.y - DUMMY_H;
    let bestY = -Infinity;

    for (const c of colliders) {
      const isFloor = c.hh < c.hw && c.hh < c.hd;
      if (!isFloor) continue;

      const dx = Math.abs(pos.x - c.x);
      const dz = Math.abs(pos.z - c.z);
      if (dx > c.hw + DUMMY_R || dz > c.hd + DUMMY_R) continue;

      const top = c.y + c.hh;
      if (this.velocity.y <= 0 && feet <= top + 0.3 && feet >= top - 0.3) {
        if (top > bestY) bestY = top;
      }
    }

    if (bestY > -Infinity) {
      pos.y = bestY + DUMMY_H;
      this.velocity.y = 0;
    }
  }

  reset() {
    this.completeRespawn();
  }
}
