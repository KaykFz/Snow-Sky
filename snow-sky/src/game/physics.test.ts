import test from 'node:test';
import assert from 'node:assert/strict';
import { CONFIG } from '../config';
import { LEVELS, LevelRuntime } from './Level';
import { Player } from './Player';
import { stepPlayerPhysics } from './Physics';
import { InputState } from './Input';

function makeInput(overrides: Partial<InputState> = {}): InputState {
  return {
    moveX: 0,
    moveY: 0,
    jumpHeld: false,
    jumpJustPressed: false,
    jumpJustReleased: false,
    jumpBufferFrames: 0,
    hoverHeld: false,
    hoverJustPressed: false,
    hoverToggledOn: false,
    grabHeld: false,
    restartJustPressed: false,
    pauseJustPressed: false,
    muteJustPressed: false,
    confirmJustPressed: false,
    ...overrides,
  };
}

import { CUTSCENES, getCutsceneAfterLevel, getCutsceneBeforeLevel } from './Cutscenes';

test('All 10 levels across 3 worlds initialize cleanly with valid spawn, goal, checkpoints, T/D lock pairing, and golden snowflake', () => {
  assert.equal(LEVELS.length, 10);
  const worlds = new Set(LEVELS.map((l) => l.world));
  assert.deepEqual([...worlds].sort(), [1, 2, 3]);

  for (const def of LEVELS) {
    // Todas as linhas ASCII da fase têm o mesmo comprimento
    const rowWidth = def.ascii[0]?.length ?? 0;
    assert.ok(rowWidth >= 40, `Level ${def.id} width >= 40`);
    for (let r = 0; r < def.ascii.length; r++) {
      assert.equal(
        def.ascii[r].length,
        rowWidth,
        `Level ${def.id} row ${r} matches width ${rowWidth}`
      );
    }

    const runtime = new LevelRuntime(def);
    assert.ok(runtime.spawnX > 0 && runtime.spawnX < runtime.widthPx, `Level ${def.id} spawnX valid`);
    assert.ok(runtime.spawnY > 0 && runtime.spawnY < runtime.heightPx, `Level ${def.id} spawnY valid`);
    assert.ok(runtime.goalX > runtime.spawnX, `Level ${def.id} goalX is ahead of spawnX`);
    assert.ok(runtime.goldenFlake !== null, `Level ${def.id} has a golden snowflake`);
    assert.ok(runtime.checkpoints.length >= 1, `Level ${def.id} has at least 1 checkpoint`);

    // Se a fase tem Portões Cristalinos (D), deve ter Chave Estelar (T) para abri-los
    if (runtime.gates.length > 0) {
      assert.ok(runtime.starKeys.length > 0, `Level ${def.id} with D gates has at least one T Star Key`);
    }

    // Verifica que o ponto de spawn não está dentro de um bloco sólido ou espinho
    const spawnTx = Math.floor(runtime.spawnX / CONFIG.TILE_SIZE);
    const spawnTy = Math.floor((runtime.spawnY - 4) / CONFIG.TILE_SIZE);
    const tileAtBody = runtime.tilemap.getTile(spawnTx, spawnTy);
    assert.equal(runtime.tilemap.isSolidBlock(tileAtBody), false, `Level ${def.id} spawn is open`);
    assert.equal(runtime.tilemap.isHazard(tileAtBody), false, `Level ${def.id} spawn is safe`);
  }
});

test('Hover mode builds higher speed on ice than normal running and converts speed into a Charged Hover Jump', () => {
  const level = new LevelRuntime(LEVELS[0]);
  const playerNormal = new Player(level.spawnX, level.spawnY);
  playerNormal.onGround = true;
  playerNormal.onIce = true;

  const playerHover = new Player(level.spawnX, level.spawnY);
  playerHover.onGround = true;
  playerHover.onIce = true;

  // Simula 35 frames acelerando para a direita
  for (let i = 0; i < 35; i++) {
    stepPlayerPhysics(
      playerNormal,
      makeInput({ moveX: 1 }),
      level,
      CONFIG.FIXED_DT
    );
    playerNormal.onGround = true;
    playerNormal.onIce = true;

    stepPlayerPhysics(
      playerHover,
      makeInput({ moveX: 1, hoverHeld: true }),
      level,
      CONFIG.FIXED_DT
    );
    playerHover.onGround = true;
    playerHover.onIce = true;
  }

  assert.ok(
    playerHover.vx > playerNormal.vx * 1.4,
    `Hover speed on ice (${playerHover.vx}) should exceed normal run speed (${playerNormal.vx})`
  );

  // Executa pulo nos dois modos
  const normalJumpRes = stepPlayerPhysics(
    playerNormal,
    makeInput({ moveX: 1, jumpJustPressed: true, jumpBufferFrames: 6, jumpHeld: true }),
    level,
    CONFIG.FIXED_DT
  );
  const hoverJumpRes = stepPlayerPhysics(
    playerHover,
    makeInput({
      moveX: 1,
      hoverHeld: true,
      jumpJustPressed: true,
      jumpBufferFrames: 6,
      jumpHeld: true,
    }),
    level,
    CONFIG.FIXED_DT
  );

  assert.equal(normalJumpRes.events.jumped, true);
  assert.equal(hoverJumpRes.events.jumped, true);
  assert.equal(hoverJumpRes.events.chargedJump, true);
  assert.ok(
    playerHover.vy < playerNormal.vy,
    `Charged hover jump vertical impulse (${playerHover.vy}) is stronger than normal jump (${playerNormal.vy})`
  );
});

test('Breakable ice block only shatters when hit at high hover speed', () => {
  const level = new LevelRuntime(LEVELS[4]); // Fase 5: Fúria Quebra-Gelo
  assert.ok(level.breakables.length > 0);
  const targetBlock = level.breakables[0];

  const player = new Player(targetBlock.x - 6, targetBlock.y + 8);
  player.onGround = true;
  player.vx = 50; // Velocidade baixa (modo normal)
  player.isHovering = false;

  const slowHit = stepPlayerPhysics(
    player,
    makeInput({ moveX: 1 }),
    level,
    CONFIG.FIXED_DT
  );
  assert.equal(slowHit.events.blockShattered, false);
  assert.equal(targetBlock.broken, false);

  // Agora em alta velocidade no Hover
  player.x = targetBlock.x - 5;
  player.vx = CONFIG.HOVER.BREAK_BLOCK_MIN_SPEED + 25;
  player.isHovering = true;

  const fastHit = stepPlayerPhysics(
    player,
    makeInput({ moveX: 1, hoverHeld: true }),
    level,
    CONFIG.FIXED_DT
  );
  assert.equal(fastHit.events.blockShattered, true);
  assert.equal(targetBlock.broken, true);
});

test('Maya Verlet hair chain updates and changes color when hover energy depletes and recharges', () => {
  const player = new Player(40, 100);
  player.flashFrames = 0;
  assert.equal(player.hair.length, CONFIG.HAIR.SEGMENTS);
  assert.equal(player.getHairColor().main, CONFIG.PALETTE.HAIR_CHARGED);

  // Simula energia zerada
  player.hoverEnergy = 0;
  assert.equal(player.getHairColor().main, CONFIG.PALETTE.HAIR_DEPLETED);

  // Simula flash branco na recarga
  player.flashFrames = 4;
  assert.equal(player.getHairColor().main, CONFIG.PALETTE.HAIR_FLASH);

  // Verifica que os nós do cabelo se movem quando Maya desliza rápido
  const initialTailX = player.hair[player.hair.length - 1].x;
  player.vx = 150;
  player.isHovering = true;
  for (let i = 0; i < 10; i++) {
    player.x += 2.5;
    player.updateHair(CONFIG.FIXED_DT, -15);
  }
  assert.notEqual(player.hair[player.hair.length - 1].x, initialTailX);
});

test('Green energy crystal bounces Maya upward while hovering and restores hover energy', () => {
  const level = new LevelRuntime(LEVELS[0]);
  assert.ok(level.crystals.length > 0, 'Level 1 has green crystals');
  const crystal = level.crystals[0];

  const player = new Player(crystal.x, crystal.y + playerHeightCenterOffset());
  player.isHovering = true;
  player.hoverEnergy = 25;
  player.vy = 40;
  player.vx = 90;

  const res = stepPlayerPhysics(
    player,
    makeInput({ moveX: 1, hoverHeld: true, jumpHeld: true }),
    level,
    CONFIG.FIXED_DT
  );

  assert.equal(res.events.crystalCollected, true);
  assert.equal(res.events.jumped, true);
  assert.equal(res.events.chargedJump, true);
  assert.equal(player.hoverEnergy, CONFIG.HOVER.MAX_ENERGY);
  assert.ok(player.vy <= CONFIG.HOVER.CRYSTAL_BOUNCE_VY, `Expected upward crystal bounce vy (${player.vy})`);
});

function playerHeightCenterOffset(): number {
  return CONFIG.PLAYER_HEIGHT / 2;
}

test('Maya GameMaker jelly spring stretches on jump and oscillates smoothly back toward 1:1', () => {
  const level = new LevelRuntime(LEVELS[0]);
  const player = new Player(level.spawnX, level.spawnY);
  player.onGround = true;

  // Simula alguns frames parada para estabilizar o respawn shimmer
  const particlesStub = {
    ambientWindX: 0,
    emitChargedJumpBurst: () => {},
    emitDustBurst: () => {},
    emitHoverTrail: () => {},
    spawnGhost: () => {},
    emitWallChips: () => {},
    emitIceBlockShatter: () => {},
    spawnShockwave: () => {},
    emitDeathExplosion: () => {},
    emitRespawnShimmer: () => {},
  } as unknown as import('./Particles').ParticleSystem;

  for (let i = 0; i < 40; i++) {
    player.update(CONFIG.FIXED_DT, makeInput(), level, particlesStub);
  }

  // Pulo deve esticar verticalmente (scaleY > 1, scaleX < 1)
  player.update(
    CONFIG.FIXED_DT,
    makeInput({ jumpJustPressed: true, jumpBufferFrames: 6, jumpHeld: true }),
    level,
    particlesStub
  );
  assert.ok(player.scaleY > 1.08, `Expected vertical jelly stretch on jump (${player.scaleY})`);
  assert.ok(player.scaleX < 0.92, `Expected horizontal jelly squeeze on jump (${player.scaleX})`);

  // Após vários frames, a mola oscila e estabiliza perto de 1.0
  for (let i = 0; i < 45; i++) {
    player.update(CONFIG.FIXED_DT, makeInput({ jumpHeld: true }), level, particlesStub);
  }
  assert.ok(Math.abs(player.scaleX - 1) < 0.08, `Expected jelly scaleX to settle near 1 (${player.scaleX})`);
  assert.ok(Math.abs(player.scaleY - 1) < 0.08, `Expected jelly scaleY to settle near 1 (${player.scaleY})`);
});

test('Boost Ring (R) launches Maya forward and upward while restoring full hover energy', () => {
  const level = new LevelRuntime(LEVELS[0]);
  assert.ok(level.boostRings.length > 0, 'Level 1 has a Boost Ring');
  const ring = level.boostRings[0];

  const player = new Player(ring.x, ring.y + playerHeightCenterOffset());
  player.hoverEnergy = 10;
  player.vx = 40;
  player.vy = 20;

  const res = stepPlayerPhysics(
    player,
    makeInput({ moveX: 1, hoverHeld: true }),
    level,
    CONFIG.FIXED_DT
  );

  assert.equal(res.events.boostRingHit, true);
  assert.equal(player.isHovering, true);
  assert.equal(player.hoverEnergy, CONFIG.HOVER.MAX_ENERGY);
  assert.ok(player.vx >= CONFIG.OBJECTS.BOOST_RING_VX, `Expected boost vx (${player.vx})`);
  assert.ok(player.vy <= CONFIG.OBJECTS.BOOST_RING_VY, `Expected boost vy (${player.vy})`);
});

test('Star Key (T) unlocks Crystal Gates (D) and resets properly before checkpoints', () => {
  const level = new LevelRuntime(LEVELS[3]); // Fase 4: Portões da Cidade Antiga
  assert.ok(level.starKeys.length > 0 && level.gates.length > 0);
  const gate = level.gates[level.gates.length - 1];
  const key = level.starKeys[0];

  // Bloqueado antes da chave
  const player = new Player(gate.x - 5, gate.y + 8);
  player.vx = 90;
  stepPlayerPhysics(player, makeInput({ moveX: 1 }), level, CONFIG.FIXED_DT);
  assert.equal(gate.unlocked, false);
  assert.ok(player.x <= gate.x, 'Locked gate stops player horizontally');

  // Coleta a Chave Estelar
  player.x = key.x;
  player.y = key.y + playerHeightCenterOffset();
  const keyRes = stepPlayerPhysics(player, makeInput(), level, CONFIG.FIXED_DT);
  assert.equal(keyRes.events.keyCollected, true);
  assert.equal(gate.unlocked, true);

  // Agora atravessa o portão destravado livremente em múltiplos frames
  player.x = gate.x - 2;
  player.y = gate.y + 8;
  player.vx = 100;
  for (let i = 0; i < 10; i++) {
    stepPlayerPhysics(player, makeInput({ moveX: 1 }), level, CONFIG.FIXED_DT);
  }
  assert.ok(player.x >= gate.x + gate.width, `Player passes freely through unlocked gate (x=${player.x}, gateEnd=${gate.x + gate.width})`);
});

test('Ski-Jump up-ramp (/) launches Maya skyward when exiting top edge at hover speed', () => {
  const level = new LevelRuntime(LEVELS[0]);
  // Posiciona Maya exatamente no último pixel do topo da rampa '/' em Level 1 (col 26, row 15)
  const rampX = 26 * CONFIG.TILE_SIZE + 7;
  const rampY = 15 * CONFIG.TILE_SIZE + 1;
  const player = new Player(rampX, rampY);
  player.onGround = true;
  player.onSlope = true;
  player.isHovering = true;
  player.vx = 140;
  player.vy = 0;

  let launched = false;
  let minVy = 0;
  for (let i = 0; i < 4; i++) {
    const res = stepPlayerPhysics(
      player,
      makeInput({ moveX: 1, hoverHeld: true }),
      level,
      CONFIG.FIXED_DT
    );
    if (res.events.chargedJump) launched = true;
    minVy = Math.min(minVy, player.vy);
  }

  assert.equal(launched, true);
  assert.ok(minVy < -50, `Expected upward ski-jump launch vy (${minVy})`);
});

test('All 5 story cutscenes have valid speakers, non-empty Portuguese lines, and expected level hooks', () => {
  const all = Object.values(CUTSCENES);
  assert.equal(all.length, 5);
  for (const cs of all) {
    assert.ok(cs.lines.length >= 3, `Cutscene ${cs.id} has >= 3 lines`);
    for (const line of cs.lines) {
      assert.ok(line.text.trim().length > 10, `Cutscene ${cs.id} line has text`);
    }
  }
  assert.equal(getCutsceneBeforeLevel(1)?.id, 'prologue');
  assert.equal(getCutsceneBeforeLevel(4)?.id, 'world2_ruins');
  assert.equal(getCutsceneBeforeLevel(7)?.id, 'world2_winds');
  assert.equal(getCutsceneBeforeLevel(8)?.id, 'world3_peak');
  assert.equal(getCutsceneAfterLevel(10)?.id, 'epilogue');
});

test('Maya exposes input buffer, coyote window, charged-hover readiness, and 4-frame stride progression', () => {
  const level = new LevelRuntime(LEVELS[0]);
  const particlesStub = {
    ambientWindX: 0,
    emitChargedJumpBurst: () => {},
    emitDustBurst: () => {},
    emitHoverTrail: () => {},
    spawnGhost: () => {},
    emitWallChips: () => {},
    emitIceBlockShatter: () => {},
    spawnShockwave: () => {},
    emitDeathExplosion: () => {},
    emitRespawnShimmer: () => {},
  } as unknown as import('./Particles').ParticleSystem;

  const player = new Player(level.spawnX, level.spawnY);
  player.onGround = true;

  // 1) Caminhada normal avança o ciclo de 4 quadros sem zerar antes do tempo
  let maxDist = 0;
  for (let i = 0; i < 20; i++) {
    player.update(CONFIG.FIXED_DT, makeInput({ moveX: 1 }), level, particlesStub);
    maxDist = Math.max(maxDist, player.runCycleDist);
  }
  assert.ok(maxDist > 0.5, `Expected walk runCycleDist to advance (${maxDist})`);

  // 2) No ar com jumpBufferFrames > 0 ativa indicador visual nos pés e consome ao tocar o chão
  player.y = level.spawnY - 24;
  player.onGround = false;
  player.coyoteFrames = 0;
  player.vy = 20;
  player.update(
    CONFIG.FIXED_DT,
    makeInput({ jumpJustPressed: true, jumpBufferFrames: 5 }),
    level,
    particlesStub
  );
  assert.equal(player.jumpBufferVisualFrames, 5);

  // 3) Coyote time ativo fora do chão expõe coyoteVisualFrames
  player.y = level.spawnY - 24;
  player.coyoteFrames = 4;
  player.onGround = false;
  player.update(CONFIG.FIXED_DT, makeInput({ moveX: 1 }), level, particlesStub);
  assert.ok(player.coyoteVisualFrames > 0);

  // 4) Hover em alta velocidade ativa indicador de Dash / Salto Carregado pronto
  player.onGround = true;
  player.isHovering = true;
  player.vx = CONFIG.HOVER.CHARGED_SPEED_THRESHOLD + 20;
  player.update(CONFIG.FIXED_DT, makeInput({ moveX: 1, hoverHeld: true }), level, particlesStub);
  assert.equal(player.isDashOrChargedReady, true);
});

test('Hover active prevents wall climbing and wall jumping, forcing player to drop hover to climb', () => {
  const level = new LevelRuntime(LEVELS[2]); // Fase 3: Escalada Cristalina
  // Usa uma parede sólida 'I' ou '#' na fase; garante uma posição em frente à coluna de parede
  // Coluna 15, rows 10..18 na Fase 3 tem parede '#'/'I'. Vamos testar em uma parede sintética do tilemap:
  const wallTx = 15;
  const wallTy = 13;
  const wallLeftPx = wallTx * CONFIG.TILE_SIZE;

  // 1) Com Hover ativo encostado na parede no ar: NÃO sobe e NÃO faz wall jump!
  const hoverPlayer = new Player(wallLeftPx - CONFIG.PLAYER_WIDTH / 2, (wallTy + 1) * CONFIG.TILE_SIZE);
  hoverPlayer.onGround = false;
  hoverPlayer.isHovering = true;
  hoverPlayer.hoverEnergy = 100;
  hoverPlayer.wallDir = 1;
  hoverPlayer.wallIsIce = true;
  hoverPlayer.vy = 0;

  const hoverClimbRes = stepPlayerPhysics(
    hoverPlayer,
    makeInput({ moveX: 1, moveY: -1, hoverHeld: true, jumpJustPressed: true, jumpBufferFrames: 5 }),
    level,
    CONFIG.FIXED_DT
  );
  assert.equal(hoverClimbRes.events.wallJumped, false, 'Wall jump must NOT trigger while hovering');
  assert.ok(hoverPlayer.vy >= 0, `Hovering player should slide down instead of climbing (vy=${hoverPlayer.vy})`);

  // 2) Sem Hover encostado na parede no ar: escala para cima e faz wall jump!
  const footPlayer = new Player(wallLeftPx - CONFIG.PLAYER_WIDTH / 2, (wallTy + 1) * CONFIG.TILE_SIZE);
  footPlayer.onGround = false;
  footPlayer.isHovering = false;
  footPlayer.wallDir = 1;
  footPlayer.vy = 0;

  stepPlayerPhysics(
    footPlayer,
    makeInput({ moveX: 1, moveY: -1, hoverHeld: false, grabHeld: true }),
    level,
    CONFIG.FIXED_DT
  );
  assert.ok(footPlayer.vy < 0, `On-foot player should climb upward on wall (vy=${footPlayer.vy})`);

  footPlayer.wallDir = 1;
  const wallJumpRes = stepPlayerPhysics(
    footPlayer,
    makeInput({ moveX: -1, hoverHeld: false, jumpJustPressed: true, jumpBufferFrames: 5 }),
    level,
    CONFIG.FIXED_DT
  );
  assert.equal(wallJumpRes.events.wallJumped, true, 'On-foot player can wall-jump when hover is off');
  assert.ok(footPlayer.vx < 0, `Wall jump pushes away from wall (vx=${footPlayer.vx})`);
});

test('Vanishing platforms (V) warn on step, disappear after delay, stop colliding, and respawn', () => {
  const level = new LevelRuntime(LEVELS[5]); // Fase 6 tem plataformas 'V'
  assert.ok(level.vanishPlatforms.length > 0, 'Level 6 has vanishing platforms');
  const vp = level.vanishPlatforms[0];
  assert.equal(vp.state, 'idle');

  const player = new Player(vp.x + 4, vp.y);
  player.vy = 10;
  stepPlayerPhysics(player, makeInput(), level, CONFIG.FIXED_DT);

  assert.equal(vp.state, 'warning');
  assert.equal(player.onGround, true);

  // Avança tempo até desaparecer
  level.update(CONFIG.OBJECTS.VANISH_DELAY + 0.05);
  assert.equal(vp.state, 'gone');

  // Jogador não se apoia mais na plataforma enquanto 'gone'
  player.y = vp.y - 1;
  player.vy = 20;
  player.onGround = false;
  stepPlayerPhysics(player, makeInput(), level, CONFIG.FIXED_DT);
  assert.equal(player.onGround, false);

  // Avança tempo de respawn
  level.update(CONFIG.OBJECTS.VANISH_RESPAWN + 0.05);
  assert.equal(vp.state, 'idle');
});

test('Black Ice (Z) sets onBlackIce and preserves higher momentum than regular stone/ice', () => {
  const level = new LevelRuntime(LEVELS[5]); // Fase 6 tem Gelo Negro ('Z')
  // Localiza um tile 'Z' no nível
  let blackIceTx = -1;
  let blackIceTy = -1;
  for (let ty = 0; ty < level.tilemap.height; ty++) {
    for (let tx = 0; tx < level.tilemap.width; tx++) {
      if (level.def.ascii[ty][tx] === 'Z') {
        blackIceTx = tx;
        blackIceTy = ty;
        break;
      }
    }
    if (blackIceTx !== -1) break;
  }
  assert.ok(blackIceTx !== -1 && blackIceTy !== -1, 'Level 6 contains Black Ice tiles');

  const pBlack = new Player((blackIceTx + 0.5) * CONFIG.TILE_SIZE, blackIceTy * CONFIG.TILE_SIZE);
  pBlack.vx = 110;
  pBlack.vy = 10;
  stepPlayerPhysics(pBlack, makeInput(), level, CONFIG.FIXED_DT);
  assert.equal(pBlack.onGround, true);
  assert.equal(pBlack.onBlackIce, true);

  // Compara desaceleração a pé: Gelo Negro desliza muito mais que solo de pedra
  const pStone = new Player(level.spawnX, level.spawnY);
  pStone.onGround = true;
  pStone.vx = 110;
  const vxBeforeBlack = pBlack.vx;
  stepPlayerPhysics(pBlack, makeInput(), level, CONFIG.FIXED_DT);
  stepPlayerPhysics(pStone, makeInput(), level, CONFIG.FIXED_DT);
  assert.ok(
    pBlack.vx > pStone.vx && vxBeforeBlack - pBlack.vx < 110 - pStone.vx,
    `Black ice retains more momentum on foot (${pBlack.vx} vs stone ${pStone.vx})`
  );
});

test('Mode-Toggle Blocks (H/N) match current hover state and avoid crushing when overlapping', () => {
  const level = new LevelRuntime(LEVELS[8]); // Fase 9 tem blocos H e N
  const hoverBlock = level.modeBlocks.find((m) => m.requiredMode === 'hover');
  const normalBlock = level.modeBlocks.find((m) => m.requiredMode === 'normal');
  assert.ok(hoverBlock && normalBlock, 'Level 9 has both H and N mode blocks');

  // 1) Bloco 'H' é sólido apenas com Hover ativo
  const pHover = new Player(hoverBlock.x + 4, hoverBlock.y);
  pHover.isHovering = true;
  pHover.vy = 15;
  stepPlayerPhysics(pHover, makeInput({ hoverHeld: true }), level, CONFIG.FIXED_DT);
  assert.equal(pHover.onGround, true, 'H block supports Maya while hovering');

  pHover.y = hoverBlock.y;
  pHover.vy = 15;
  pHover.onGround = false;
  stepPlayerPhysics(pHover, makeInput({ hoverHeld: false }), level, CONFIG.FIXED_DT);
  assert.equal(pHover.onGround, false, 'H block lets Maya fall through when hover is off');

  // 2) Bloco 'N' é sólido apenas no Modo Normal (sem Hover) + anti-esmagamento ao ativar hover dentro
  const pNormal = new Player(normalBlock.x + 4, normalBlock.y);
  pNormal.isHovering = false;
  pNormal.vy = 15;
  stepPlayerPhysics(pNormal, makeInput({ hoverHeld: false }), level, CONFIG.FIXED_DT);
  assert.equal(pNormal.onGround, true, 'N block supports Maya in Normal mode');

  // Posiciona dentro do bloco N em modo Hover -> ativa passingThrough; ao soltar hover ainda dentro, não esmaga!
  pNormal.x = normalBlock.x + normalBlock.width / 2;
  pNormal.y = normalBlock.y + normalBlock.height;
  pNormal.isHovering = true;
  stepPlayerPhysics(pNormal, makeInput({ hoverHeld: false }), level, CONFIG.FIXED_DT);
  assert.equal(normalBlock.passingThrough, true, 'Overlapping block stays passingThrough until player exits');
});


