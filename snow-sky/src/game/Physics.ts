import { CONFIG } from '../config';
import { InputState } from './Input';
import { LevelRuntime } from './Level';
import { TileType } from './Tilemap';

export interface PhysicsEvents {
  jumped: boolean;
  chargedJump: boolean;
  wallJumped: boolean;
  landed: boolean;
  landSpeed: number;
  hoverActivated: boolean;
  hoverDeactivated: boolean;
  energyRechargedFlash: boolean;
  crystalCollected: boolean;
  crystalX: number;
  crystalY: number;
  springBounced: boolean;
  springX: number;
  springY: number;
  blockShattered: boolean;
  blockX: number;
  blockY: number;
  checkpointReached: boolean;
  goldenCollected: boolean;
  boostRingHit: boolean;
  boostRingX: number;
  boostRingY: number;
  keyCollected: boolean;
  keyX: number;
  keyY: number;
  died: boolean;
  goalReached: boolean;
}

export interface PlayerKinematics {
  x: number; // centro horizontal nos pés
  y: number; // base dos pés
  vx: number;
  vy: number;
  width: number;
  height: number;
  facing: 1 | -1;

  onGround: boolean;
  onIce: boolean;
  onBlackIce: boolean;
  onSoftSnow: boolean;
  onSlope: boolean;
  wallDir: -1 | 0 | 1;
  wallIsIce: boolean;

  isHovering: boolean;
  hoverEnergy: number;
  wallStamina: number;
  coyoteFrames: number;
}

export function createEmptyEvents(): PhysicsEvents {
  return {
    jumped: false,
    chargedJump: false,
    wallJumped: false,
    landed: false,
    landSpeed: 0,
    hoverActivated: false,
    hoverDeactivated: false,
    energyRechargedFlash: false,
    crystalCollected: false,
    crystalX: 0,
    crystalY: 0,
    springBounced: false,
    springX: 0,
    springY: 0,
    blockShattered: false,
    blockX: 0,
    blockY: 0,
    checkpointReached: false,
    goldenCollected: false,
    boostRingHit: false,
    boostRingX: 0,
    boostRingY: 0,
    keyCollected: false,
    keyX: 0,
    keyY: 0,
    died: false,
    goalReached: false,
  };
}

export function approach(current: number, target: number, maxDelta: number): number {
  if (current < target) return Math.min(target, current + maxDelta);
  if (current > target) return Math.max(target, current - maxDelta);
  return target;
}

export function stepPlayerPhysics(
  p: PlayerKinematics,
  input: InputState,
  level: LevelRuntime,
  dt: number
): { events: PhysicsEvents; consumeJumpBuffer: boolean } {
  const events = createEmptyEvents();
  let consumeJumpBuffer = false;
  const wasOnGround = p.onGround;
  const wasHovering = p.isHovering;
  const wasOnSlope = p.onSlope;
  const prevSlopeTile = wasOnSlope
    ? level.tilemap.getTile(
        Math.floor(p.x / CONFIG.TILE_SIZE),
        Math.floor((p.y - 1) / CONFIG.TILE_SIZE)
      )
    : TileType.EMPTY;
  const prevEnergyDepleted = p.hoverEnergy <= 0.5;

  // 1. Gerenciamento de Energia e Estado de Hover
  if (p.onGround) {
    const rechargeRate = p.onIce
      ? CONFIG.HOVER.ICE_RECHARGE_RATE
      : CONFIG.HOVER.GROUND_RECHARGE_RATE;
    p.hoverEnergy = Math.min(CONFIG.HOVER.MAX_ENERGY, p.hoverEnergy + rechargeRate * dt);
    p.wallStamina = CONFIG.NORMAL.WALL_STAMINA_MAX;
    p.coyoteFrames = CONFIG.FEEL.COYOTE_FRAMES;
    if (prevEnergyDepleted && p.hoverEnergy > 20) {
      events.energyRechargedFlash = true;
    }
  } else if (p.coyoteFrames > 0) {
    p.coyoteFrames--;
  }

  const wantsHover = input.hoverHeld && p.hoverEnergy > 0;
  if (wantsHover && !p.isHovering) {
    p.isHovering = true;
    events.hoverActivated = true;
    // Ao ligar o hover com direção pressionada, garante um impulso inicial mínimo
    if (input.moveX !== 0 && Math.abs(p.vx) < 42) {
      p.vx = input.moveX * 52;
    }
  } else if (!wantsHover && p.isHovering) {
    p.isHovering = false;
    events.hoverDeactivated = true;
  }

  if (input.moveX !== 0) {
    p.facing = input.moveX > 0 ? 1 : -1;
  }

  // 2. Zonas de Vento
  for (const wz of level.windZones) {
    if (
      p.x >= wz.x &&
      p.x <= wz.x + wz.width &&
      p.y - p.height / 2 >= wz.y &&
      p.y - p.height / 2 <= wz.y + wz.height
    ) {
      const mult = p.isHovering
        ? CONFIG.OBJECTS.WIND_ACCEL_HOVER / 180
        : CONFIG.OBJECTS.WIND_ACCEL_NORMAL / 180;
      p.vx += wz.vx * mult * dt;
      p.vy += wz.vy * mult * dt;
    }
  }

  // 3. Movimento Horizontal e Vertical (Modo Hover vs Modo Normal)
  if (p.isHovering) {
    // Drena energia se estiver no ar ou subindo parede
    if (!p.onGround) {
      const drain =
        p.wallDir !== 0 && p.wallIsIce
          ? CONFIG.HOVER.WALL_DRAIN_RATE
          : CONFIG.HOVER.AIR_DRAIN_RATE;
      p.hoverEnergy = Math.max(0, p.hoverEnergy - drain * dt);
      if (p.hoverEnergy <= 0) {
        p.isHovering = false;
        events.hoverDeactivated = true;
      }
    }

    // Movimento Horizontal no Hover (Momentum alto, quase sem atrito no gelo e gelo negro)
    if (p.onGround) {
      const maxSpd = p.onBlackIce
        ? CONFIG.HOVER.MAX_SPEED_BLACK_ICE
        : p.onIce
        ? CONFIG.HOVER.MAX_SPEED_ICE
        : CONFIG.HOVER.MAX_SPEED_NORMAL;
      const accel = p.onBlackIce
        ? CONFIG.HOVER.BLACK_ICE_ACCEL
        : p.onIce
        ? CONFIG.HOVER.ICE_ACCEL
        : CONFIG.HOVER.BASE_ACCEL;

      if (input.moveX !== 0) {
        const turning = Math.sign(p.vx) !== 0 && Math.sign(p.vx) !== input.moveX;
        const effAccel = turning ? CONFIG.HOVER.TURN_ACCEL : accel;
        if (Math.abs(p.vx) <= maxSpd || turning) {
          p.vx = approach(p.vx, input.moveX * maxSpd, effAccel * dt);
        }
      } else {
        const friction = p.onSoftSnow
          ? CONFIG.HOVER.SNOW_FRICTION
          : p.onBlackIce
          ? CONFIG.HOVER.BLACK_ICE_FRICTION
          : p.onIce
          ? CONFIG.HOVER.ICE_FRICTION
          : CONFIG.HOVER.NORMAL_FRICTION;
        p.vx = approach(p.vx, 0, friction * dt);
      }

      if (p.onSoftSnow) {
        p.vx = approach(p.vx, input.moveX * 36, CONFIG.HOVER.SNOW_FRICTION * dt);
      }
    } else {
      // No ar com Hover: conserva momentum com controle responsivo para curvas e encadeamentos
      if (input.moveX !== 0) {
        const turning = Math.sign(p.vx) !== 0 && Math.sign(p.vx) !== input.moveX;
        const airAccel = turning ? CONFIG.HOVER.TURN_ACCEL : CONFIG.HOVER.AIR_ACCEL;
        const target = input.moveX * Math.max(Math.abs(p.vx), CONFIG.HOVER.MAX_SPEED_NORMAL);
        p.vx = approach(p.vx, target, airAccel * dt);
      } else {
        p.vx = approach(p.vx, 0, CONFIG.HOVER.AIR_DRAG * dt);
      }
    }

    // COM HOVER ATIVO: NÃO escala e NÃO gruda em nenhuma parede (obriga tirar o Hover para escalar!)
    if (!p.onGround && p.wallDir !== 0) {
      const slideMax =
        input.moveY > 0
          ? CONFIG.NORMAL.FAST_FALL_SPEED
          : CONFIG.HOVER.WALL_SLIDE_SPEED;
      p.vy = approach(p.vy, slideMax, CONFIG.NORMAL.GRAVITY * dt);
    } else if (!p.onGround) {
      // Gravidade mais leve no ar durante o hover para encadear saltos e cristais
      const isApex = Math.abs(p.vy) < CONFIG.NORMAL.APEX_THRESHOLD;
      const grav = CONFIG.NORMAL.GRAVITY * (isApex ? 0.42 : 0.78);
      p.vy = approach(p.vy, CONFIG.NORMAL.MAX_FALL_SPEED, grav * dt);
    }
  } else {
    // MODO NORMAL (A pé — Precisão estilo Celeste, escalada tática e controle de terreno)
    let accel: number;
    if (p.onGround) {
      if (p.onBlackIce) {
        accel =
          input.moveX !== 0
            ? CONFIG.NORMAL.BLACK_ICE_FOOT_ACCEL
            : CONFIG.NORMAL.BLACK_ICE_FOOT_DECEL;
      } else if (p.onIce) {
        accel =
          input.moveX !== 0
            ? CONFIG.NORMAL.ICE_FOOT_ACCEL
            : CONFIG.NORMAL.ICE_FOOT_DECEL;
      } else {
        accel =
          input.moveX !== 0
            ? CONFIG.NORMAL.RUN_ACCEL
            : CONFIG.NORMAL.RUN_DECEL;
      }
    } else {
      accel =
        input.moveX !== 0
          ? CONFIG.NORMAL.AIR_ACCEL
          : CONFIG.NORMAL.AIR_DECEL;
    }

    p.vx = approach(p.vx, input.moveX * CONFIG.NORMAL.MAX_RUN_SPEED, accel * dt);

    // Parede e Escalada Exclusivas do Modo Normal (Sem Hover!)
    if (!p.onGround && p.wallDir !== 0 && p.wallStamina > 0) {
      const iceMult = p.wallIsIce ? CONFIG.NORMAL.WALL_ICE_STAMINA_MULT : 1;
      if (input.moveY < 0) {
        // Escalando parede para cima
        p.vy = CONFIG.NORMAL.WALL_CLIMB_SPEED;
        p.wallStamina = Math.max(
          0,
          p.wallStamina - CONFIG.NORMAL.WALL_STAMINA_DRAIN_CLIMB * iceMult * dt
        );

        // Ledge-Vault suave ao alcançar o topo de uma beirada escalando
        const wallCheckTx = Math.floor(
          (p.x + p.wallDir * (p.width / 2 + 2)) / CONFIG.TILE_SIZE
        );
        const chestTy = Math.floor((p.y - p.height + 2) / CONFIG.TILE_SIZE);
        const footTy = Math.floor((p.y - 2) / CONFIG.TILE_SIZE);
        const chestSolid = level.tilemap.isSolidBlock(
          level.tilemap.getTile(wallCheckTx, chestTy)
        );
        const footSolid = level.tilemap.isSolidBlock(
          level.tilemap.getTile(wallCheckTx, footTy)
        );
        if (!chestSolid && footSolid) {
          p.vy = Math.min(p.vy, -82);
          p.x += p.wallDir * 1.5;
        }
      } else if (input.moveY > 0 && input.grabHeld) {
        // Descida controlada segurando a parede
        p.vy = CONFIG.NORMAL.WALL_CLIMB_DOWN_SPEED;
      } else if (input.grabHeld) {
        // Segura firme na parede (ou desliza bem devagar no gelo vertical)
        const holdTargetVy = p.wallIsIce ? CONFIG.NORMAL.WALL_SLIDE_SPEED * 0.35 : 0;
        p.vy = approach(p.vy, holdTargetVy, 560 * dt);
        p.wallStamina = Math.max(
          0,
          p.wallStamina - CONFIG.NORMAL.WALL_STAMINA_DRAIN_HOLD * iceMult * dt
        );
      } else {
        const isApex = Math.abs(p.vy) < CONFIG.NORMAL.APEX_THRESHOLD;
        const grav =
          CONFIG.NORMAL.GRAVITY * (isApex ? CONFIG.NORMAL.APEX_GRAVITY_MULT : 1);
        p.vy = approach(p.vy, CONFIG.NORMAL.MAX_FALL_SPEED, grav * dt);
      }
    } else if (!p.onGround) {
      const isApex =
        Math.abs(p.vy) < CONFIG.NORMAL.APEX_THRESHOLD && input.jumpHeld;
      const grav =
        CONFIG.NORMAL.GRAVITY * (isApex ? CONFIG.NORMAL.APEX_GRAVITY_MULT : 1);
      const maxFall =
        input.moveY > 0
          ? CONFIG.NORMAL.FAST_FALL_SPEED
          : CONFIG.NORMAL.MAX_FALL_SPEED;
      p.vy = approach(p.vy, maxFall, grav * dt);
    }
  }

  // 4. Pulo (Coyote Time + Jump Buffering + Pulo de Hover Carregado + Wall Jump)
  const wantsJump = input.jumpBufferFrames > 0 || input.jumpJustPressed;
  if (wantsJump) {
    if (p.onGround || p.coyoteFrames > 0) {
      // Pulo do chão / coyote
      p.onGround = false;
      p.coyoteFrames = 0;
      consumeJumpBuffer = true;
      events.jumped = true;

      if (p.isHovering) {
        const absVx = Math.abs(p.vx);
        const vyBonus = Math.min(38, absVx * CONFIG.HOVER.SPEED_TO_VERTICAL_BONUS);
        p.vy = Math.max(
          CONFIG.HOVER.MAX_CHARGED_JUMP_VY,
          CONFIG.HOVER.BASE_JUMP_SPEED - vyBonus
        );

        // Converte velocidade horizontal em impulso longo (Salto Carregado)
        if (absVx >= CONFIG.HOVER.CHARGED_SPEED_THRESHOLD) {
          p.vx *= CONFIG.HOVER.SPEED_TO_HORIZONTAL_BOOST;
          events.chargedJump = true;
        } else if (input.moveX !== 0) {
          p.vx = input.moveX * Math.max(absVx * 1.1, 108);
        }
        p.hoverEnergy = Math.max(0, p.hoverEnergy - CONFIG.HOVER.JUMP_ENERGY_COST);
      } else {
        p.vy = CONFIG.NORMAL.JUMP_SPEED;
      }
    } else if (p.wallDir !== 0 && !p.isHovering) {
      // Wall Jump / Climb-Hop EXCLUSIVOS sem Hover!
      consumeJumpBuffer = true;
      events.jumped = true;
      events.wallJumped = true;
      const awayDir = -p.wallDir as -1 | 1;

      if (
        (input.moveX === p.wallDir || input.moveY < 0) &&
        p.wallStamina >= CONFIG.NORMAL.WALL_STAMINA_JUMP_COST
      ) {
        // Climb-Hop vertical na mesma parede estilo Celeste
        p.vx = p.wallDir * 24;
        p.vy = CONFIG.NORMAL.WALL_JUMP_VSPEED * 0.92;
        p.wallStamina = Math.max(
          0,
          p.wallStamina - CONFIG.NORMAL.WALL_STAMINA_JUMP_COST
        );
      } else {
        // Wall Jump afastando da parede
        p.facing = awayDir;
        p.vx = awayDir * CONFIG.NORMAL.WALL_JUMP_HSPEED;
        p.vy = CONFIG.NORMAL.WALL_JUMP_VSPEED;
        p.wallStamina = Math.max(
          0,
          p.wallStamina - CONFIG.NORMAL.WALL_STAMINA_JUMP_COST * 0.65
        );
      }
      p.wallDir = 0;
    }
  }

  // Corte variável do pulo ao soltar o botão cedo
  if (input.jumpJustReleased && p.vy < -45) {
    p.vy *= CONFIG.NORMAL.JUMP_CUT_MULTIPLIER;
  }

  // Atualiza pass-through anti-esmagamento dos Blocos de Modo ('H' e 'N')
  const mbHalfW = p.width / 2;
  const mbLeft = p.x - mbHalfW;
  const mbRight = p.x + mbHalfW;
  const mbTop = p.y - p.height + 1;
  const mbBottom = p.y - 1;
  for (const mb of level.modeBlocks) {
    const overlaps =
      mbRight > mb.x &&
      mbLeft < mb.x + mb.width &&
      mbBottom > mb.y &&
      mbTop < mb.y + mb.height;
    const isActiveNow =
      (mb.requiredMode === 'hover' && p.isHovering) ||
      (mb.requiredMode === 'normal' && !p.isHovering);
    const wasActiveBefore =
      (mb.requiredMode === 'hover' && wasHovering) ||
      (mb.requiredMode === 'normal' && !wasHovering);
    if (overlaps && (!isActiveNow || !wasActiveBefore)) {
      mb.passingThrough = true;
    } else if (!overlaps) {
      mb.passingThrough = false;
    }
  }

  // 5. Sub-passos de Colisão X e Y separada (sem tunneling em alta velocidade)
  const totalDx = p.vx * dt;
  const totalDy = p.vy * dt;
  const dist = Math.hypot(totalDx, totalDy);
  const steps = Math.max(1, Math.min(CONFIG.MAX_SUBSTEPS, Math.ceil(dist / 3.5)));
  const stepDx = totalDx / steps;
  const stepDy = totalDy / steps;

  p.onGround = false;
  p.onIce = false;
  p.onBlackIce = false;
  p.onSoftSnow = false;
  p.onSlope = false;
  p.wallDir = 0;
  p.wallIsIce = false;

  for (let s = 0; s < steps; s++) {
    // --- EIXO X ---
    p.x += stepDx;
    resolveHorizontalCollision(p, level, events);

    // --- EIXO Y ---
    const prevBottom = p.y;
    p.y += stepDy;
    resolveVerticalCollision(p, prevBottom, level, dt / steps, events);

    if (events.died) break;
  }

  // Verifica se aterrissou ou decolou no topo de uma rampa de esqui ('/')
  if (!wasOnGround && p.onGround) {
    events.landed = true;
    events.landSpeed = Math.abs(totalDy / dt);
  } else if (
    wasOnGround &&
    wasOnSlope &&
    !p.onGround &&
    p.isHovering &&
    !events.jumped
  ) {
    const launchedRight =
      prevSlopeTile === TileType.RAMP_UP_R &&
      p.vx >= CONFIG.HOVER.RAMP_LAUNCH_MIN_SPEED;
    const launchedLeft =
      prevSlopeTile === TileType.RAMP_DOWN_R &&
      p.vx <= -CONFIG.HOVER.RAMP_LAUNCH_MIN_SPEED;
    if (launchedRight || launchedLeft) {
      p.vy = Math.min(
        p.vy,
        -Math.abs(p.vx) * CONFIG.HOVER.RAMP_LAUNCH_VY_FACTOR
      );
      p.coyoteFrames = CONFIG.FEEL.COYOTE_FRAMES;
      events.chargedJump = true;
    }
  }

  // 6. Interações com Objetos do Nível (Cristais, Molas, Checkpoints, Floco Dourado, Chegada)
  checkObjectInteractions(p, input, level, events);

  // Caiu no abismo fora da tela
  if (p.y > level.heightPx + 14) {
    events.died = true;
  }

  return { events, consumeJumpBuffer };
}

function resolveHorizontalCollision(
  p: PlayerKinematics,
  level: LevelRuntime,
  events: PhysicsEvents
): void {
  const S = CONFIG.TILE_SIZE;
  const halfW = p.width / 2;
  const left = p.x - halfW;
  const right = p.x + halfW;
  const top = p.y - p.height + 1;
  const bottom = p.y - 1;

  // Blocos de Gelo Quebráveis
  const impactSpeed = Math.abs(p.vx);
  let shatteredAny = false;
  for (const b of level.breakables) {
    if (b.broken) continue;
    if (
      right > b.x &&
      left < b.x + b.width &&
      bottom > b.y &&
      top < b.y + b.height
    ) {
      if (p.isHovering && impactSpeed >= CONFIG.HOVER.BREAK_BLOCK_MIN_SPEED) {
        b.broken = true;
        shatteredAny = true;
        events.blockShattered = true;
        events.blockX = b.x;
        events.blockY = b.y;
      } else {
        if (p.vx > 0) {
          p.x = b.x - halfW;
          p.wallDir = 1;
        } else if (p.vx < 0) {
          p.x = b.x + b.width + halfW;
          p.wallDir = -1;
        }
        p.vx = 0;
      }
    }
  }
  if (shatteredAny) {
    p.vx *= 0.92;
  }

  // Portões Cristalinos Selados ('D' - sólidos até coletar a Chave Estelar 'T')
  for (const g of level.gates) {
    if (g.unlocked) continue;
    if (
      right > g.x &&
      left < g.x + g.width &&
      bottom > g.y &&
      top < g.y + g.height
    ) {
      if (p.vx > 0) {
        p.x = g.x - halfW;
        p.wallDir = 1;
      } else if (p.vx < 0) {
        p.x = g.x + g.width + halfW;
        p.wallDir = -1;
      }
      p.vx = 0;
    }
  }

  // Blocos Alternados por Modo ('H' = Hover / 'N' = Normal)
  for (const mb of level.modeBlocks) {
    const isSolid =
      !mb.passingThrough &&
      ((mb.requiredMode === 'hover' && p.isHovering) ||
        (mb.requiredMode === 'normal' && !p.isHovering));
    if (!isSolid) continue;
    if (
      right > mb.x &&
      left < mb.x + mb.width &&
      bottom > mb.y &&
      top < mb.y + mb.height
    ) {
      if (p.vx > 0) {
        p.x = mb.x - halfW;
        p.wallDir = 1;
      } else if (p.vx < 0) {
        p.x = mb.x + mb.width + halfW;
        p.wallDir = -1;
      }
      p.vx = 0;
    }
  }

  const startTy = Math.floor(top / S);
  const endTy = Math.floor(bottom / S);
  const checkTx = p.vx >= 0 ? Math.floor((p.x + halfW) / S) : Math.floor((p.x - halfW) / S);

  for (let ty = startTy; ty <= endTy; ty++) {
    const tile = level.tilemap.getTile(checkTx, ty);

    if (level.tilemap.isHazard(tile)) {
      events.died = true;
      return;
    }

    // Se os pés estão entrando em uma rampa, ignora colisão de parede lateral
    if (level.tilemap.isRamp(tile)) {
      continue;
    }

    if (level.tilemap.isSolidBlock(tile)) {
      // Se o tile exatamente acima na frente é uma rampa ou vazio e os pés estão próximos do topo, faz step-up suave
      const footDiff = p.y - ty * S;
      const tileAbove = level.tilemap.getTile(checkTx, ty - 1);
      if (
        footDiff > 0 &&
        (footDiff <= CONFIG.FEEL.CORNER_CORRECTION_PX ||
          (level.tilemap.isRamp(tileAbove) && footDiff <= S)) &&
        !level.tilemap.isSolidBlock(tileAbove)
      ) {
        p.y = ty * S;
        continue;
      }

      if (p.vx > 0) {
        p.x = checkTx * S - halfW;
        p.wallDir = 1;
        p.wallIsIce =
          tile === TileType.ICE_WALL ||
          tile === TileType.ICE ||
          tile === TileType.BLACK_ICE;
        p.vx = 0;
      } else if (p.vx < 0) {
        p.x = (checkTx + 1) * S + halfW;
        p.wallDir = -1;
        p.wallIsIce =
          tile === TileType.ICE_WALL ||
          tile === TileType.ICE ||
          tile === TileType.BLACK_ICE;
        p.vx = 0;
      }
      break;
    }
  }

  // Também detecta parede adjacente mesmo com vx === 0 para escalada/walljump (inclusive ModeBlocks e VanishPlatforms)
  if (p.wallDir === 0) {
    const midTy = Math.floor((p.y - p.height / 2) / S);
    const rightTile = level.tilemap.getTile(Math.floor((p.x + halfW + 1) / S), midTy);
    const leftTile = level.tilemap.getTile(Math.floor((p.x - halfW - 1) / S), midTy);
    if (level.tilemap.isSolidBlock(rightTile)) {
      p.wallDir = 1;
      p.wallIsIce =
        rightTile === TileType.ICE_WALL ||
        rightTile === TileType.ICE ||
        rightTile === TileType.BLACK_ICE;
    } else if (level.tilemap.isSolidBlock(leftTile)) {
      p.wallDir = -1;
      p.wallIsIce =
        leftTile === TileType.ICE_WALL ||
        leftTile === TileType.ICE ||
        leftTile === TileType.BLACK_ICE;
    } else {
      const midY = p.y - p.height / 2;
      for (const mb of level.modeBlocks) {
        const isSolid =
          !mb.passingThrough &&
          ((mb.requiredMode === 'hover' && p.isHovering) ||
            (mb.requiredMode === 'normal' && !p.isHovering));
        if (!isSolid || midY < mb.y || midY > mb.y + mb.height) continue;
        if (Math.abs(p.x + halfW - mb.x) <= 1.5) {
          p.wallDir = 1;
          break;
        }
        if (Math.abs(p.x - halfW - (mb.x + mb.width)) <= 1.5) {
          p.wallDir = -1;
          break;
        }
      }
      if (p.wallDir === 0 && !p.isHovering) {
        for (const vp of level.vanishPlatforms) {
          if (vp.state === 'gone' || midY < vp.y || midY > vp.y + vp.height) continue;
          if (Math.abs(p.x + halfW - vp.x) <= 1.5) {
            p.wallDir = 1;
            if (vp.state === 'idle') {
              vp.state = 'warning';
              vp.timer = CONFIG.OBJECTS.VANISH_DELAY;
            }
            break;
          }
          if (Math.abs(p.x - halfW - (vp.x + vp.width)) <= 1.5) {
            p.wallDir = -1;
            if (vp.state === 'idle') {
              vp.state = 'warning';
              vp.timer = CONFIG.OBJECTS.VANISH_DELAY;
            }
            break;
          }
        }
      }
    }
  }
}

function resolveVerticalCollision(
  p: PlayerKinematics,
  prevBottom: number,
  level: LevelRuntime,
  stepDt: number,
  events: PhysicsEvents
): void {
  const S = CONFIG.TILE_SIZE;
  const halfW = p.width / 2;

  // 1. Verifica Rampas de Gelo ('/' e '\') nos pés da Maya
  const centerTx = Math.floor(p.x / S);
  const footTy = Math.floor((p.y - 1) / S);
  for (let ty = footTy - 1; ty <= footTy + 1; ty++) {
    const t = level.tilemap.getTile(centerTx, ty);
    if (level.tilemap.isRamp(t) && p.vy >= 0) {
      const rampY = level.tilemap.getRampFloorY(centerTx, ty, p.x);
      if (rampY !== null && p.y >= rampY - 3 && p.y <= (ty + 1) * S + 4) {
        p.y = rampY;
        p.vy = 0;
        p.onGround = true;
        p.onIce = true;
        p.onSlope = true;

        // Aceleração nas rampas de gelo descendentes e manutenção fluida em subidas ('/')!
        if (p.isHovering) {
          if (t === TileType.RAMP_DOWN_R) {
            if (p.vx >= 0) p.vx += CONFIG.HOVER.SLOPE_DOWN_BOOST * stepDt;
            else p.vx -= CONFIG.HOVER.SLOPE_UP_DRAG * 0.25 * stepDt;
          } else if (t === TileType.RAMP_UP_R) {
            if (p.vx <= 0) p.vx -= CONFIG.HOVER.SLOPE_DOWN_BOOST * stepDt;
            else p.vx -= CONFIG.HOVER.SLOPE_UP_DRAG * 0.2 * stepDt;
          }
        }
        return;
      }
    }
  }

  // 2. Plataformas que caem
  if (p.vy >= 0) {
    for (const f of level.fallingPlatforms) {
      if (f.state === 'respawning' || f.state === 'falling') continue;
      if (
        p.x + halfW > f.x &&
        p.x - halfW < f.x + f.width &&
        prevBottom <= f.y + 3 &&
        p.y >= f.y
      ) {
        p.y = f.y;
        p.vy = 0;
        p.onGround = true;
        p.onIce = true;
        if (f.state === 'idle') {
          f.state = 'shaking';
          f.timer = CONFIG.OBJECTS.FALLING_PLATFORM_DELAY;
        }
        return;
      }
    }
  }

  // 2a. Plataformas que Desaparecem ('V')
  if (p.vy >= 0) {
    for (const vp of level.vanishPlatforms) {
      if (vp.state === 'gone') continue;
      if (
        p.x + halfW > vp.x &&
        p.x - halfW < vp.x + vp.width &&
        prevBottom <= vp.y + 3 &&
        p.y >= vp.y
      ) {
        p.y = vp.y;
        p.vy = 0;
        p.onGround = true;
        if (vp.state === 'idle') {
          vp.state = 'warning';
          vp.timer = CONFIG.OBJECTS.VANISH_DELAY;
        }
        return;
      }
    }
  }

  // 2b. Portões Cristalinos Selados ('D') no eixo vertical
  for (const g of level.gates) {
    if (g.unlocked) continue;
    if (p.x + halfW > g.x && p.x - halfW < g.x + g.width) {
      if (p.vy >= 0 && prevBottom <= g.y + 3 && p.y >= g.y) {
        p.y = g.y;
        p.vy = 0;
        p.onGround = true;
        return;
      }
      if (p.vy < 0 && p.y - p.height < g.y + g.height && p.y > g.y) {
        p.y = g.y + g.height + p.height;
        p.vy = 0;
        return;
      }
    }
  }

  // 2c. Blocos Alternados por Modo ('H' / 'N') no eixo vertical
  for (const mb of level.modeBlocks) {
    const isSolid =
      !mb.passingThrough &&
      ((mb.requiredMode === 'hover' && p.isHovering) ||
        (mb.requiredMode === 'normal' && !p.isHovering));
    if (!isSolid) continue;
    if (p.x + halfW > mb.x && p.x - halfW < mb.x + mb.width) {
      if (p.vy >= 0 && prevBottom <= mb.y + 3 && p.y >= mb.y) {
        p.y = mb.y;
        p.vy = 0;
        p.onGround = true;
        if (mb.requiredMode === 'hover') p.onIce = true;
        return;
      }
      if (p.vy < 0 && p.y - p.height < mb.y + mb.height && p.y > mb.y) {
        p.y = mb.y + mb.height + p.height;
        p.vy = 0;
        return;
      }
    }
  }

  const leftTx = Math.floor((p.x - halfW + 1) / S);
  const rightTx = Math.floor((p.x + halfW - 1) / S);

  if (p.vy >= 0) {
    // Caindo / Pisando no chão
    const bottomTy = Math.floor(p.y / S);
    for (let tx = leftTx; tx <= rightTx; tx++) {
      const tile = level.tilemap.getTile(tx, bottomTy);

      if (level.tilemap.isHazard(tile)) {
        events.died = true;
        return;
      }

      if (level.tilemap.isRamp(tile) && tx === Math.floor(p.x / S)) {
        const rampY = level.tilemap.getRampFloorY(tx, bottomTy, p.x);
        if (rampY !== null && p.y >= rampY) {
          p.y = rampY;
          p.vy = 0;
          p.onGround = true;
          p.onIce = true;
          p.onSlope = true;
          return;
        }
      }

      if (level.tilemap.isSolidBlock(tile)) {
        p.y = bottomTy * S;
        p.vy = 0;
        p.onGround = true;
        if (tile === TileType.ICE || tile === TileType.ICE_WALL) p.onIce = true;
        if (tile === TileType.BLACK_ICE) {
          p.onIce = true;
          p.onBlackIce = true;
        }
        if (tile === TileType.SOFT_SNOW) p.onSoftSnow = true;
        return;
      }

      // Plataforma de madeira atravessável por baixo
      if (tile === TileType.WOOD_PLAT && prevBottom <= bottomTy * S + 2) {
        p.y = bottomTy * S;
        p.vy = 0;
        p.onGround = true;
        return;
      }
    }
  } else {
    // Subindo / Batendo a cabeça no teto (com Corner Correction estilo Celeste!)
    const topY = p.y - p.height;
    const topTy = Math.floor(topY / S);

    for (let tx = leftTx; tx <= rightTx; tx++) {
      const tile = level.tilemap.getTile(tx, topTy);
      if (level.tilemap.isHazard(tile)) {
        events.died = true;
        return;
      }
      if (level.tilemap.isSolidBlock(tile)) {
        // Tenta Corner Correction horizontal de até 4 pixels se apenas a quina bateu
        const clearLeft = !level.tilemap.isSolidBlock(
          level.tilemap.getTile(Math.floor((p.x - halfW - CONFIG.FEEL.CORNER_CORRECTION_PX) / S), topTy)
        );
        const clearRight = !level.tilemap.isSolidBlock(
          level.tilemap.getTile(Math.floor((p.x + halfW + CONFIG.FEEL.CORNER_CORRECTION_PX) / S), topTy)
        );

        if (clearRight && !clearLeft) {
          p.x += 2;
          return;
        } else if (clearLeft && !clearRight) {
          p.x -= 2;
          return;
        }

        p.y = (topTy + 1) * S + p.height;
        p.vy = 0;
        return;
      }
    }
  }
}

function checkObjectInteractions(
  p: PlayerKinematics,
  input: InputState,
  level: LevelRuntime,
  events: PhysicsEvents
): void {
  const centerX = p.x;
  const centerY = p.y - p.height / 2;

  // 1. Cristais Verdes de Energia (recarregam energia; com Hover ativo fazem Maya quicar no ar!)
  const crystalRadius = p.isHovering || input.hoverHeld ? 10.5 : 9.5;
  for (const c of level.crystals) {
    if (!c.active) continue;
    if (Math.hypot(centerX - c.x, centerY - c.y) <= crystalRadius) {
      c.active = false;
      c.respawnTimer = CONFIG.OBJECTS.CRYSTAL_RESPAWN_SECONDS;
      p.hoverEnergy = CONFIG.HOVER.MAX_ENERGY;
      p.wallStamina = CONFIG.NORMAL.WALL_STAMINA_MAX;
      events.crystalCollected = true;
      events.energyRechargedFlash = true;
      events.crystalX = c.x;
      events.crystalY = c.y;

      if (p.isHovering || input.hoverHeld) {
        p.isHovering = true;
        const boostJump = input.jumpHeld || input.jumpBufferFrames > 0;
        p.vy = boostJump
          ? CONFIG.HOVER.CRYSTAL_BOUNCE_JUMP_VY
          : CONFIG.HOVER.CRYSTAL_BOUNCE_VY;
        p.onGround = false;
        p.coyoteFrames = 0;
        if (input.moveX !== 0) {
          const minSpeed = 115;
          if (Math.sign(p.vx) !== input.moveX || Math.abs(p.vx) < minSpeed) {
            p.vx = approach(p.vx, input.moveX * 135, 180);
          }
        }
        events.jumped = true;
        events.chargedJump = true;
      }
    }
  }

  // 2. Molas de Neve
  for (const s of level.springs) {
    if (
      p.x + p.width / 2 >= s.x &&
      p.x - p.width / 2 <= s.x + 8 &&
      p.y >= s.y &&
      p.y <= s.y + 9
    ) {
      s.animTimer = 0.28;
      p.vy = CONFIG.OBJECTS.SPRING_VY;
      p.onGround = false;
      p.hoverEnergy = CONFIG.HOVER.MAX_ENERGY;
      if (p.isHovering && Math.abs(p.vx) < CONFIG.OBJECTS.SPRING_VX_BOOST) {
        p.vx = p.facing * CONFIG.OBJECTS.SPRING_VX_BOOST;
      }
      events.springBounced = true;
      events.energyRechargedFlash = true;
      events.springX = s.x + 4;
      events.springY = s.y + 4;
    }
  }

  // 3. Anéis Boreais de Impulso ('R') — turbo direcional no ar + recarga de hover!
  for (const r of level.boostRings) {
    if (r.cooldown > 0) continue;
    if (Math.hypot(centerX - r.x, centerY - r.y) <= 12) {
      r.cooldown = CONFIG.OBJECTS.BOOST_RING_COOLDOWN;
      r.pulseTimer = 0.4;
      const dir = input.moveX !== 0 ? input.moveX : p.facing;
      p.facing = dir > 0 ? 1 : -1;
      p.isHovering = true;
      p.hoverEnergy = CONFIG.HOVER.MAX_ENERGY;
      p.wallStamina = CONFIG.NORMAL.WALL_STAMINA_MAX;
      p.vx = dir * Math.max(Math.abs(p.vx), CONFIG.OBJECTS.BOOST_RING_VX);
      p.vy = CONFIG.OBJECTS.BOOST_RING_VY;
      p.onGround = false;
      p.coyoteFrames = 0;
      events.boostRingHit = true;
      events.boostRingX = r.x;
      events.boostRingY = r.y;
      events.energyRechargedFlash = true;
      events.chargedJump = true;
    }
  }

  // 4. Chaves Estelares ('T') — destravam todos os Portões Cristalinos ('D')
  for (const k of level.starKeys) {
    if (k.collected) continue;
    if (Math.hypot(centerX - k.x, centerY - k.y) <= 11) {
      k.collected = true;
      level.unlockAllGates();
      p.hoverEnergy = CONFIG.HOVER.MAX_ENERGY;
      events.keyCollected = true;
      events.keyX = k.x;
      events.keyY = k.y;
      events.energyRechargedFlash = true;
    }
  }

  // 5. Checkpoints
  for (const cp of level.checkpoints) {
    if (!cp.activated && Math.hypot(centerX - cp.x, p.y - cp.y) <= 12) {
      cp.activated = true;
      level.spawnX = cp.x;
      level.spawnY = cp.y;
      events.checkpointReached = true;
    }
  }

  // 6. Floco de Neve Dourado (Colecionável Opcional)
  if (level.goldenFlake && !level.goldenFlake.collected) {
    if (
      Math.hypot(centerX - level.goldenFlake.x, centerY - level.goldenFlake.y) <= 10
    ) {
      level.goldenFlake.collected = true;
      events.goldenCollected = true;
    }
  }

  // 7. Portal / Marco de Chegada ('E')
  if (Math.hypot(centerX - level.goalX, p.y - level.goalY) <= 12) {
    events.goalReached = true;
  }
}
