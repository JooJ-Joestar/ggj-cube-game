import {
  Engine,
  Scene,
  ArcRotateCamera,
  Vector3,
  MeshBuilder,
  StandardMaterial,
  Color3,
  HemisphericLight,
  PointerEventTypes,
  LinesMesh
} from "babylonjs";
import { Obstacle } from "./models/Obstacle";
import { Player } from "./models/Player";
import { PlayerCtl } from "./controls/PlayerCtl";
import { ColorCube } from "./models/ColorCube";
import { GameUI, PlayerMode } from "./ui/gameUI";
import { colyseusConnection, MatchStatusCode } from "./connection";
import { PlayerFactory } from "./factory/PlayerFactory";
import { PaletteColor, colorToPaletteId } from "./drawingTemplates/palette";

export function createScene(canvas: HTMLCanvasElement): Scene {
  const engine = new Engine(canvas, true, { preserveDrawingBuffer: true, stencil: true });
  const scene = new Scene(engine);

  const camera = new ArcRotateCamera("camera", Math.PI / 2, Math.PI / 6, 36, Vector3.Zero(), scene);
  camera.attachControl(canvas, true);

  const light = new HemisphericLight("hemisphericLight", new Vector3(0, 1, 0), scene);
  light.intensity = 0.95;

  const ground = MeshBuilder.CreateGround(
    "ground",
    { width: 6000, height: 6000, subdivisions: 2 },
    scene
  );
  const groundMaterial = new StandardMaterial("groundMat", scene);
  groundMaterial.diffuseColor = Color3.White();
  groundMaterial.specularColor = new Color3(0.1, 0.1, 0.1);
  ground.material = groundMaterial;
  const gridExtent = 2500;
  const gridSquareSize = 1;
  const gridSquareOffset = gridSquareSize / 2;
  const gridLines: Vector3[][] = [];
  for (let i = -gridExtent; i <= gridExtent; i += gridSquareSize) {
    gridLines.push([
      new Vector3(i + gridSquareOffset, 0.01, -gridExtent + gridSquareOffset),
      new Vector3(i + gridSquareOffset, 0.01, gridExtent + gridSquareOffset)
    ]);
  }
  for (let i = -gridExtent; i <= gridExtent; i += gridSquareSize) {
    gridLines.push([
      new Vector3(-gridExtent + gridSquareOffset, 0.01, i + gridSquareOffset),
      new Vector3(gridExtent + gridSquareOffset, 0.01, i + gridSquareOffset)
    ]);
  }
  const gridOverlay = MeshBuilder.CreateLineSystem(
    "gridOverlay",
    { lines: gridLines, updatable: false },
    scene
  ) as LinesMesh;
  gridOverlay.color = new Color3(0.75, 0.75, 0.75);
  gridOverlay.isPickable = false;
  gridOverlay.renderingGroupId = 0;

  const obstacles: Obstacle[] = [];
  // obstacles.push(new Obstacle(scene, new Vector3(3, 0, 3)));
  // obstacles.push(new Obstacle(scene, new Vector3(-4, 0, -1)));

  const playerFactory = new PlayerFactory(scene);
  const player = new PlayerCtl(playerFactory, obstacles);
  player.applySpawnClass(process.env.DEFAULT_SPAWN_CLASS || "none");
  camera.setTarget(player.mesh.position);
  const cameraOffset = camera.position.subtract(player.mesh.position);
  const ui = new GameUI(scene, colyseusConnection);
  ui.attachPlayerMesh(player.mesh);
  const placedCubes = new Map<string, { cube: ColorCube; colorId: PaletteColor }>();
  let pendingPlacement: { position: Vector3; color: Color3 } | null = null;
  let pendingRemoval: { position: Vector3 } | null = null;
  const gridKey = (position: Vector3) => `${position.x},${position.z}`;
  const remotePlayers = new Map<string, Player>();
  let localPlayerId = "";
  let currentMode: PlayerMode = ui.getMode();
  let matchPaused = colyseusConnection.isMatchPaused();
  const getEnvNumber = (raw: string | undefined, fallback: number) => {
    if (raw === undefined) {
      return fallback;
    }
    const match = String(raw).match(/-?\d+(\.\d+)?/);
    if (!match) {
      return fallback;
    }
    const parsed = Number(match[0]);
    return Number.isFinite(parsed) ? parsed : fallback;
  };

  let lastQuickAttackAt = 0;
  let nextQuickAttackReadyAt = 0;
  let quickAttackEnabled = true;
  const scoutSpecialCooldownMs = getEnvNumber(
    process.env.SCOUT_SPECIAL_COOLDOWN_MS,
    5000
  );
  let nextSpecialReadyAt = 0;
  let specialReady = true;
  const soldierSpecialCooldownMs = getEnvNumber(
    process.env.SOLDIER_SPECIAL_COOLDOWN_MS,
    4000
  );
  const soldierSpecialSpeed = getEnvNumber(process.env.SOLDIER_SPECIAL_SPEED, 30);
  const soldierSpecialDistance = getEnvNumber(process.env.SOLDIER_SPECIAL_DISTANCE, 30);
  const soldierSpecialExplosionSize = getEnvNumber(
    process.env.SOLDIER_SPECIAL_EXPLOSION_SIZE,
    5
  );
  const soldierSpecialDamage = getEnvNumber(process.env.SOLDIER_SPECIAL_DAMAGE, 90);
  const getRandomSpawnPosition = () => {
    const range = 2;
    const x = Math.round((Math.random() * 2 - 1) * range);
    const z = Math.round((Math.random() * 2 - 1) * range);
    return new Vector3(x, player.mesh.position.y, z);
  };
  player.setPosition(getRandomSpawnPosition());
  const projectiles: Array<{
    mesh: any;
    direction: Vector3;
    remaining: number;
    speed: number;
    ownerId: string;
    type: "quick" | "soldier";
    explosionSize?: number;
    damage?: number;
  }> = [];
  const debris: Array<{ mesh: any; velocity: Vector3; remainingMs: number }> = [];
  const spawnQuickAttack = (
    position: Vector3,
    direction: Vector3,
    distance: number,
    speed: number,
    ownerId: string
  ) => {
    const size = 0.5;
    const attack = MeshBuilder.CreateBox("quickAttack", { size }, scene);
    attack.position = position.clone();
    attack.position.y = size / 2;
    attack.renderingGroupId = 1;
    projectiles.push({
      mesh: attack,
      direction,
      remaining: distance,
      speed,
      ownerId,
      type: "quick"
    });
  };

  const spawnSoldierSpecial = (
    position: Vector3,
    direction: Vector3,
    distance: number,
    speed: number,
    ownerId: string,
    explosionSize: number,
    damage: number
  ) => {
    const size = 0.75;
    const attack = MeshBuilder.CreateBox("soldierSpecial", { size }, scene);
    attack.position = position.clone();
    attack.position.y = size / 2;
    const material = new StandardMaterial("soldierSpecialMat", scene);
    material.diffuseColor = new Color3(1, 0, 0);
    attack.material = material;
    attack.renderingGroupId = 1;
    projectiles.push({
      mesh: attack,
      direction,
      remaining: distance,
      speed,
      ownerId,
      type: "soldier",
      explosionSize,
      damage
    });
  };

  const spawnExplosionDebris = (center: Vector3, count = 12) => {
    for (let i = 0; i < count; i++) {
      const shard = MeshBuilder.CreateBox(`debris-${i}`, { size: 0.25 }, scene);
      shard.position = center.clone();
      shard.position.y += 0.25;
      const mat = new StandardMaterial(`debris-mat-${i}`, scene);
      mat.diffuseColor = new Color3(1, 0.5, 0.1);
      shard.material = mat;
      shard.renderingGroupId = 1;
      const velocity = new Vector3(
        (Math.random() * 2 - 1) * 6,
        Math.random() * 6 + 4,
        (Math.random() * 2 - 1) * 6
      );
      debris.push({ mesh: shard, velocity, remainingMs: 1000 });
    }
  };

  const triggerExplosion = (
    center: Vector3,
    ownerId: string,
    explosionSize: number,
    damage: number
  ) => {
    const size = Math.max(0.1, explosionSize);
    const explosion = MeshBuilder.CreateBox("explosion", { size }, scene);
    explosion.position = center.clone();
    explosion.position.y = size / 2;
    const mat = new StandardMaterial("explosionMat", scene);
    mat.diffuseColor = new Color3(1, 0.2, 0);
    mat.alpha = 0.3;
    explosion.material = mat;
    explosion.renderingGroupId = 1;
    setTimeout(() => explosion.dispose(), 200);
    spawnExplosionDebris(center);

    if (ownerId && ownerId !== localPlayerId) {
      const half = size / 2;
      const pos = player.mesh.position;
      if (
        Math.abs(pos.x - center.x) <= half &&
        Math.abs(pos.y - center.y) <= half &&
        Math.abs(pos.z - center.z) <= half &&
        !player.isInvincible()
      ) {
        const applied = player.applyDamage(damage);
        if (applied > 0) {
          ui.updatePlayerHealth(localPlayerId, player.getHealth(), 100);
          colyseusConnection.sendPlayerHealthUpdate({
            id: localPlayerId,
            health: player.getHealth()
          });
          colyseusConnection.sendPlayerHit({ id: localPlayerId });
          colyseusConnection.sendAddPlayerScore({
            id: ownerId,
            amount: applied
          });
          if (player.getDamageCooldownTime() > 0) {
            player.setInvincibleForSeconds(player.getDamageCooldownTime());
          }
          if (player.getHealth() <= 0) {
            colyseusConnection.sendRespawn({ id: localPlayerId });
          }
        }
      }
    }
  };

  const spawnRemotePlayer = (id: string, className?: string) => {
    if (remotePlayers.has(id)) {
      return remotePlayers.get(id) ?? null;
    }
    const remote = new Player(playerFactory, id, false);
    if (className) {
      remote.setClassColor(className);
    }
    remote.setPosition(getRandomSpawnPosition());
    remotePlayers.set(id, remote);
    return remote;
  };

  colyseusConnection.onRemotePlayerJoined(({ id, name, health, className }) => {
    if (id === colyseusConnection.getPlayerId()) {
      return;
    }
    const remote = spawnRemotePlayer(id, className);
    if (remote) {
      ui.attachRemotePlayerLabel(id, name, remote.mesh);
      ui.attachPlayerHealthBar(id, remote.mesh, 100);
      if (typeof health === "number") {
        ui.updatePlayerHealth(id, health, 100);
      }
    }
  });

  colyseusConnection.onPlayerClassChanged(({ id, className }) => {
    const remote = remotePlayers.get(id);
    if (!remote) {
      return;
    }
    remote.setClassColor(className);
  });

  colyseusConnection.onRemotePlayerMoved(({ id, position }) => {
    const remote = remotePlayers.get(id);
    if (!remote) {
      return;
    }
    remote.setPosition(new Vector3(position.x, position.y, position.z));
  });

  colyseusConnection.onRemotePlayerLeft((id) => {
    const remote = remotePlayers.get(id);
    if (!remote) {
      return;
    }
    remote.mesh.dispose();
    remotePlayers.delete(id);
    ui.removeRemotePlayerLabel(id);
    ui.removePlayerHealthBar(id);
  });

  colyseusConnection.onRemoteQuickAttack((payload) => {
    const direction = new Vector3(
      payload.direction.x,
      payload.direction.y,
      payload.direction.z
    );
    if (direction.lengthSquared() < 0.0001) {
      direction.copyFromFloats(0, 0, 1);
    }
    direction.normalize();
    const origin = new Vector3(payload.position.x, payload.position.y, payload.position.z);
    const distance = payload.distance ?? player.getQuickAttackDistance();
    const speed = payload.speed ?? player.getQuickAttackSpeed();
    spawnQuickAttack(origin, direction, distance, speed, payload.id);
  });

  colyseusConnection.onSoldierSpecial((payload) => {
    const direction = new Vector3(
      payload.direction.x,
      payload.direction.y,
      payload.direction.z
    );
    if (direction.lengthSquared() < 0.0001) {
      direction.copyFromFloats(0, 0, 1);
    }
    direction.normalize();
    const origin = new Vector3(payload.position.x, payload.position.y, payload.position.z);
    spawnSoldierSpecial(
      origin,
      direction,
      payload.distance ?? soldierSpecialDistance,
      payload.speed ?? soldierSpecialSpeed,
      payload.id,
      payload.explosionSize ?? soldierSpecialExplosionSize,
      payload.damage ?? soldierSpecialDamage
    );
  });

  colyseusConnection.onCubePlaced((payload) => {
    if (payload.id === localPlayerId) {
      return;
    }
    const position = new Vector3(payload.position.x, payload.position.y, payload.position.z);
    const key = gridKey(position);
    const existing = placedCubes.get(key);
    if (existing) {
      existing.cube.mesh.dispose();
    }
    const color = new Color3(payload.color.r, payload.color.g, payload.color.b);
    const colorId = colorToPaletteId(color);
    const cube = new ColorCube(scene, position, color);
    placedCubes.set(key, { cube, colorId });
  });

  colyseusConnection.onCubeRemoved((payload) => {
    if (payload.id === localPlayerId) {
      return;
    }
    const position = new Vector3(payload.position.x, payload.position.y, payload.position.z);
    const key = gridKey(position);
    const existing = placedCubes.get(key);
    if (existing) {
      existing.cube.mesh.dispose();
      placedCubes.delete(key);
    }
  });

  colyseusConnection.onPlacedCubes(({ cubes }) => {
    cubes.forEach((cubeInfo) => {
      const position = new Vector3(
        cubeInfo.position.x,
        cubeInfo.position.y,
        cubeInfo.position.z
      );
      const key = gridKey(position);
      const existing = placedCubes.get(key);
      if (existing) {
        existing.cube.mesh.dispose();
      }
    const color = new Color3(cubeInfo.color.r, cubeInfo.color.g, cubeInfo.color.b);
    const colorId = colorToPaletteId(color);
    const cube = new ColorCube(scene, position, color);
    placedCubes.set(key, { cube, colorId });
  });
  });

  colyseusConnection.onMatchStatusChange((status) => {
    const paused = status === MatchStatusCode.Pause;
    matchPaused = paused;
    if (paused) {
      player.stopMovement();
      pendingPlacement = null;
      pendingRemoval = null;
    }
  });

  colyseusConnection.onPlayerHealthUpdate(({ id, health }) => {
    if (id === localPlayerId) {
      player.setHealth(health);
    }
    ui.updatePlayerHealth(id, health, 100);
  });

  colyseusConnection.onPlayerRespawn(({ id, health }) => {
    if (id === localPlayerId) {
      player.setHealth(health);
      player.setInvincibleForSeconds(player.getDamageCooldownTime());
      player.setPosition(getRandomSpawnPosition());
    } else {
      const remote = remotePlayers.get(id);
      if (remote) {
        remote.setPosition(getRandomSpawnPosition());
      }
    }
    ui.updatePlayerHealth(id, health, 100);
  });

  colyseusConnection.onPlayerHit(({ id }) => {
    if (id === localPlayerId) {
      player.setInvincibleForSeconds(player.getDamageCooldownTime());
      return;
    }
    const remote = remotePlayers.get(id);
    if (remote) {
      remote.setInvincibleForSeconds(remote.getDamageCooldownTime());
    }
  });

  const positionMatches = (posA: Vector3, posB: Vector3, tolerance = 0.05) =>
    Math.abs(posA.x - posB.x) < tolerance && Math.abs(posA.z - posB.z) < tolerance;

  const hasCubeAt = (x: number, z: number) => placedCubes.has(`${x},${z}`);
  const getColorAt = (x: number, z: number) => placedCubes.get(`${x},${z}`)?.colorId;
  const removeCubeAt = (position: Vector3) => {
    const key = gridKey(position);
    const existing = placedCubes.get(key);
    if (!existing) {
      return;
    }
    existing.cube.mesh.dispose();
    placedCubes.delete(key);
    colyseusConnection.sendRemoveCube({
      position: { x: position.x, y: position.y, z: position.z }
    });
  };
  player.setDrawingAccess({ getColorAt, hasCubeAt, removeCubeAt });

  player.setDestinationCallback((position) => {
    if (!pendingPlacement) {
      if (!pendingRemoval) {
        return;
      }
      if (!positionMatches(position, pendingRemoval.position)) {
        return;
      }
      removeCubeAt(pendingRemoval.position);
      pendingRemoval = null;
      return;
    }
    if (!positionMatches(position, pendingPlacement.position)) {
      return;
    }
    const key = gridKey(pendingPlacement.position);
    const existing = placedCubes.get(key);
    if (existing) {
      existing.cube.mesh.dispose();
    }
    const cube = new ColorCube(scene, pendingPlacement.position, pendingPlacement.color);
    const colorId = colorToPaletteId(pendingPlacement.color);
    placedCubes.set(key, { cube, colorId });
    const matched = player.checkDrawingsAt(pendingPlacement.position);
    if (matched && matched !== "redbull") {
      colyseusConnection.sendPlayerClass({ className: player.getCurrentClass() });
    }
    colyseusConnection.sendPlaceCube({
      position: {
        x: pendingPlacement.position.x,
        y: pendingPlacement.position.y,
        z: pendingPlacement.position.z
      },
      color: {
        r: pendingPlacement.color.r,
        g: pendingPlacement.color.g,
        b: pendingPlacement.color.b
      }
    });
    pendingPlacement = null;
  });
  ui.onModeChange = (mode) => {
    currentMode = mode;
  };
  ui.onQuickAttack = () => {
    if (matchPaused) {
      return;
    }
    const now = performance.now();
    const cooldown = player.getQuickAttackCooldownMs();
    if (now - lastQuickAttackAt < cooldown) {
      return;
    }
    lastQuickAttackAt = now;
    nextQuickAttackReadyAt = now + cooldown;
    quickAttackEnabled = cooldown <= 0;
    ui.setQuickAttackEnabled(quickAttackEnabled);
    player.setDamageCooldownTime(0);
    const direction = player.getFacingDirection();
    direction.y = 0;
    if (direction.lengthSquared() < 0.0001) {
      direction.copyFromFloats(0, 0, 1);
    }
    direction.normalize();
    const distance = player.getQuickAttackDistance();
    const speed = player.getQuickAttackSpeed();
    const origin = player.mesh.position.clone();
    if (localPlayerId) {
      spawnQuickAttack(origin, direction, distance, speed, localPlayerId);
    }
    colyseusConnection.sendQuickAttack({
      position: { x: origin.x, y: origin.y, z: origin.z },
      direction: { x: direction.x, y: direction.y, z: direction.z },
      speed,
      distance
    });
  };
  const startSpecialCooldown = (cooldownMs: number) => {
    const now = performance.now();
    if (cooldownMs <= 0) {
      specialReady = true;
      ui.setSpecialEnabled(true);
      return true;
    }
    if (!specialReady && now < nextSpecialReadyAt) {
      return false;
    }
    specialReady = false;
    nextSpecialReadyAt = now + cooldownMs;
    ui.setSpecialEnabled(false);
    return true;
  };
  ui.onSpecial = () => {
    if (matchPaused) {
      return;
    }
    if (!specialReady) {
      return;
    }
    const className = player.getCurrentClass();
    const direction = player.getFacingDirection();
    direction.y = 0;
    if (direction.lengthSquared() < 0.0001) {
      direction.copyFromFloats(0, 0, 1);
    }
    direction.normalize();
    const origin = player.mesh.position.clone();
    if (className === "scout") {
      if (!startSpecialCooldown(scoutSpecialCooldownMs)) {
        return;
      }
      const multipliers = player.getScoutSpecialMultipliers();
      const distance = player.getQuickAttackDistance() * multipliers.distance;
      const speed = player.getQuickAttackSpeed() * multipliers.speed;
      if (localPlayerId) {
        spawnQuickAttack(origin, direction, distance, speed, localPlayerId);
      }
      colyseusConnection.sendQuickAttack({
        position: { x: origin.x, y: origin.y, z: origin.z },
        direction: { x: direction.x, y: direction.y, z: direction.z },
        speed,
        distance
      });
      return;
    }

    if (className === "soldier") {
      if (!startSpecialCooldown(soldierSpecialCooldownMs)) {
        return;
      }
      if (localPlayerId) {
        spawnSoldierSpecial(
          origin,
          direction,
          soldierSpecialDistance,
          soldierSpecialSpeed,
          localPlayerId,
          soldierSpecialExplosionSize,
          soldierSpecialDamage
        );
      }
      colyseusConnection.sendSoldierSpecial({
        position: { x: origin.x, y: origin.y, z: origin.z },
        direction: { x: direction.x, y: direction.y, z: direction.z },
        speed: soldierSpecialSpeed,
        distance: soldierSpecialDistance,
        explosionSize: soldierSpecialExplosionSize,
        damage: soldierSpecialDamage
      });
    }
  };

  scene.onPointerObservable.add((pointerInfo) => {
    if ((pointerInfo as any).skipOnPointerObservable) {
      return;
    }
    if (matchPaused) {
      return;
    }
    if (pointerInfo.type === PointerEventTypes.POINTERDOWN) {
      const pick = scene.pick(scene.pointerX, scene.pointerY, (mesh) => mesh === ground);
      if (pick && pick.hit && pick.pickedPoint) {
        const snapped = new Vector3(
          Math.round(pick.pickedPoint.x),
          0,
          Math.round(pick.pickedPoint.z)
        );
        if (currentMode === "move") {
          player.setTarget(snapped);
        } else if (currentMode === "place") {
          const selectedColor = ui.getSelectedColor();
          pendingRemoval = null;
          pendingPlacement = { position: snapped, color: selectedColor };
          player.setTarget(snapped);
        } else if (currentMode === "remove") {
          pendingPlacement = null;
          pendingRemoval = { position: snapped };
          player.setTarget(snapped);
        }
      }
    }
  });

  engine.runRenderLoop(() => {
    const deltaSeconds = engine.getDeltaTime() / 1000;
    const now = performance.now();
    camera.setTarget(player.mesh.position);
    player.update(deltaSeconds);
    player.updateInvincibility();
    for (const remote of remotePlayers.values()) {
      remote.updateInvincibility();
    }
    if (!quickAttackEnabled && now >= nextQuickAttackReadyAt) {
      quickAttackEnabled = true;
      ui.setQuickAttackEnabled(true);
    }
    if (!specialReady && now >= nextSpecialReadyAt) {
      specialReady = true;
      ui.setSpecialEnabled(true);
    }
    if (projectiles.length) {
      for (let i = projectiles.length - 1; i >= 0; i--) {
        const projectile = projectiles[i];
        const step = Math.min(projectile.speed * deltaSeconds, projectile.remaining);
        projectile.mesh.position.addInPlace(projectile.direction.scale(step));
        projectile.remaining -= step;
        if (projectile.type === "soldier" && projectile.ownerId === localPlayerId) {
          let hitRemote = false;
          for (const remote of remotePlayers.values()) {
            if (projectile.mesh.intersectsMesh(remote.mesh, false)) {
              hitRemote = true;
              break;
            }
          }
          if (hitRemote) {
            triggerExplosion(
              projectile.mesh.position.clone(),
              projectile.ownerId,
              projectile.explosionSize ?? soldierSpecialExplosionSize,
              projectile.damage ?? soldierSpecialDamage
            );
            projectile.mesh.dispose();
            projectiles.splice(i, 1);
            continue;
          }
        }
        if (projectile.ownerId && projectile.ownerId !== localPlayerId) {
          if (
            projectile.type === "soldier" &&
            projectile.mesh.intersectsMesh(player.mesh, false)
          ) {
            triggerExplosion(
              projectile.mesh.position.clone(),
              projectile.ownerId,
              projectile.explosionSize ?? soldierSpecialExplosionSize,
              projectile.damage ?? soldierSpecialDamage
            );
            projectile.mesh.dispose();
            projectiles.splice(i, 1);
            continue;
          }
          if (
            projectile.type === "quick" &&
            !player.isInvincible() &&
            projectile.mesh.intersectsMesh(player.mesh, false)
          ) {
            const damage = player.getQuickAttackDamage();
            const applied = player.applyDamage(damage);
            if (applied > 0) {
              ui.updatePlayerHealth(localPlayerId, player.getHealth(), 100);
              colyseusConnection.sendPlayerHealthUpdate({
                id: localPlayerId,
                health: player.getHealth()
              });
              colyseusConnection.sendPlayerHit({ id: localPlayerId });
              colyseusConnection.sendAddPlayerScore({
                id: projectile.ownerId,
                amount: applied
              });
              if (player.getDamageCooldownTime() > 0) {
                player.setInvincibleForSeconds(player.getDamageCooldownTime());
              }
              if (player.getHealth() <= 0) {
                colyseusConnection.sendRespawn({ id: localPlayerId });
              }
            }
            projectile.mesh.dispose();
            projectiles.splice(i, 1);
            continue;
          }
        }
        if (projectile.remaining <= 0) {
          if (projectile.type === "soldier") {
            triggerExplosion(
              projectile.mesh.position.clone(),
              projectile.ownerId,
              projectile.explosionSize ?? soldierSpecialExplosionSize,
              projectile.damage ?? soldierSpecialDamage
            );
          }
          projectile.mesh.dispose();
          projectiles.splice(i, 1);
        }
      }
    }
    if (debris.length) {
      for (let i = debris.length - 1; i >= 0; i--) {
        const shard = debris[i];
        shard.remainingMs -= engine.getDeltaTime();
        shard.mesh.position.addInPlace(shard.velocity.scale(deltaSeconds));
        shard.velocity.y -= 9.8 * deltaSeconds;
        if (shard.remainingMs <= 0) {
          shard.mesh.dispose();
          debris.splice(i, 1);
        }
      }
    }
    colyseusConnection.sendPlayerMovement({
      x: player.mesh.position.x,
      y: player.mesh.position.y,
      z: player.mesh.position.z
    });
    ui.updateDebugInfo(colyseusConnection, {
      x: player.mesh.position.x,
      z: player.mesh.position.z
    });
    camera.position = player.mesh.position.add(cameraOffset);
    scene.render();
  });

  window.addEventListener("resize", () => engine.resize());

  colyseusConnection.connect().then(() => {
    localPlayerId = colyseusConnection.getPlayerId();
    player.setId(localPlayerId);
    player.setInvincibleForSeconds(player.getDamageCooldownTime());
    ui.attachPlayerHealthBar(localPlayerId, player.mesh, 100);
    ui.updatePlayerHealth(localPlayerId, player.getHealth(), 100);
    colyseusConnection.sendPlayerClass({ className: player.getCurrentClass() });
  });
  return scene;
}
