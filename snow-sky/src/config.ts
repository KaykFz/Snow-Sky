/**
 * HOVERLINE — Calibração de Física, Movimento, Hover, Cabelo e Paleta
 * Todas as constantes de game feel centralizadas para ajuste rápido.
 */

export const CONFIG = {
  // Resolução interna nativa (Pixel Art estilo Celeste)
  CANVAS_WIDTH: 320,
  CANVAS_HEIGHT: 180,
  TILE_SIZE: 8,
  FIXED_DT: 1 / 60,
  MAX_SUBSTEPS: 4,

  // Hitbox da Maya (pequena e justa para plataforma de precisão)
  PLAYER_WIDTH: 8,
  PLAYER_HEIGHT: 12,

  // Modo Normal (A pé - Precisão)
  NORMAL: {
    MAX_RUN_SPEED: 68,          // px/s
    RUN_ACCEL: 580,             // px/s² no chão
    RUN_DECEL: 720,             // freio rápido no chão
    AIR_ACCEL: 420,             // controle total no ar
    AIR_DECEL: 380,
    JUMP_SPEED: -142,           // impulso vertical do pulo normal
    JUMP_CUT_MULTIPLIER: 0.45,  // corte de velocidade ao soltar botão de pulo cedo
    APEX_THRESHOLD: 22,         // |vy| abaixo disso ativa gravidade reduzida no ápice
    APEX_GRAVITY_MULT: 0.52,    // gravidade reduzida no topo do pulo (hang time)
    GRAVITY: 430,               // px/s²
    MAX_FALL_SPEED: 165,        // velocidade terminal de queda
    FAST_FALL_SPEED: 210,       // segurando para baixo
    WALL_SLIDE_SPEED: 36,       // velocidade deslizando na parede
    WALL_CLIMB_SPEED: -56,      // subindo parede a pé (sem hover)
    WALL_CLIMB_DOWN_SPEED: 62,  // descendo parede controlado a pé
    WALL_STAMINA_MAX: 120,      // stamina máxima de escalada a pé
    WALL_STAMINA_DRAIN_HOLD: 14,// gasto por segundo segurando parado
    WALL_STAMINA_DRAIN_CLIMB: 28,// gasto por segundo escalando
    WALL_ICE_STAMINA_MULT: 1.35,// gelo drena mais stamina ao escalar
    WALL_STAMINA_JUMP_COST: 20, // gasto ao dar wall jump neutro
    WALL_JUMP_HSPEED: 94,       // impulso horizontal do wall jump
    WALL_JUMP_VSPEED: -140,     // impulso vertical do wall jump
    ICE_FOOT_ACCEL: 320,        // controle moderado a pé no gelo
    ICE_FOOT_DECEL: 210,        // leve escorregão ao parar no gelo a pé
    BLACK_ICE_FOOT_ACCEL: 240,  // controle reduzido no gelo negro
    BLACK_ICE_FOOT_DECEL: 65,   // escorregão forte até mesmo a pé
  },

  // Modo Hover (Hoverboard de Neve - Momentum, Controle Ágil e Salto em Cristais)
  HOVER: {
    BASE_ACCEL: 255,            // aceleração em superfícies normais
    ICE_ACCEL: 370,             // aceleração rápida em gelo brilhante
    BLACK_ICE_ACCEL: 435,       // aceleração explosiva no gelo negro
    AIR_ACCEL: 315,             // controle ágil de trajetória no ar
    NORMAL_FRICTION: 38,        // perde velocidade gradualmente em pedra/terra
    ICE_FRICTION: 6,            // quase zero atrito no gelo!
    BLACK_ICE_FRICTION: 1.5,    // atrito quase nulo no gelo negro
    SNOW_FRICTION: 280,         // neve macia freia fortemente o hover
    AIR_DRAG: 9,                // conserva momentum no ar
    MAX_SPEED_NORMAL: 122,      // velocidade máxima em solo comum
    MAX_SPEED_ICE: 185,         // velocidade máxima no gelo / rampas
    MAX_SPEED_BLACK_ICE: 205,   // velocidade máxima no gelo negro
    SLOPE_DOWN_BOOST: 265,      // ganho de velocidade descendo rampas de gelo
    SLOPE_UP_DRAG: 110,         // perda suave subindo rampa
    TURN_ACCEL: 350,            // curvas e contra-esterço responsivos

    // Pulo Carregado de Hover (converte velocidade horizontal em impulso)
    BASE_JUMP_SPEED: -148,
    SPEED_TO_VERTICAL_BONUS: 0.22, // até +38 de altura extra em alta velocidade
    SPEED_TO_HORIZONTAL_BOOST: 1.14, // multiplica vx no salto carregado
    MAX_CHARGED_JUMP_VY: -184,
    CHARGED_SPEED_THRESHOLD: 95, // velocidade a partir da qual o pulo conta como "Carregado"
    CRYSTAL_BOUNCE_VY: -158,     // quique automático ao tocar cristal verde com hover
    CRYSTAL_BOUNCE_JUMP_VY: -184,// quique turbinado segurando pulo

    // Hover NUNCA escala nem segura paredes (obriga tirar o hover para escalar!)
    WALL_SLIDE_SPEED: 88,       // desliza rápido se encostar na parede com hover ativo
    ICE_WALL_CLIMB_FACTOR: 0.92,
    ICE_WALL_MIN_CLIMB_SPEED: -118,
    ICE_WALL_GRAVITY: 135,
    NORMAL_WALL_SLIDE_SPEED: 88,
    WALL_HOVER_JUMP_VX: 138,
    WALL_HOVER_JUMP_VY: -158,

    // Energia do Hover
    MAX_ENERGY: 100,
    AIR_DRAIN_RATE: 22,         // gasta energia suavemente no ar (~4.5s contínuos)
    WALL_DRAIN_RATE: 18,        // gasta energia subindo parede de gelo
    GROUND_RECHARGE_RATE: 190,  // recarrega rápido ao tocar no chão
    ICE_RECHARGE_RATE: 320,     // recarrega quase instantaneamente no gelo
    JUMP_ENERGY_COST: 10,       // pequeno custo ao impulsionar pulo de hover no ar

    // Quebra de blocos de gelo & Rampa Ski-Jump
    BREAK_BLOCK_MIN_SPEED: 105, // velocidade mínima para estilhaçar blocos de gelo
    RAMP_LAUNCH_MIN_SPEED: 82,  // velocidade mínima para decolar no topo de uma rampa '/'
    RAMP_LAUNCH_VY_FACTOR: 0.56,// converte velocidade horizontal em arco de voo ao sair de '/'
  },

  // Regras de Game Feel (Estilo Celeste)
  FEEL: {
    COYOTE_FRAMES: 6,           // ~0.10s de tolerância após sair da borda
    JUMP_BUFFER_FRAMES: 6,      // ~0.10s de buffer antes de tocar o chão
    CORNER_CORRECTION_PX: 4,    // pixels de correção de quina no teto e bordas
    HITSTOP_LIGHT_FRAMES: 2,    // cristais, molas
    HITSTOP_HEAVY_FRAMES: 4,    // quebrar bloco de gelo, morte
    DEATH_RESPAWN_FRAMES: 36,   // 0.6s total entre morte e respawn!
  },

  // Simulação do Cabelo Cacheado Volumoso (Cadeia Verlet clássica estilo Celeste)
  HAIR: {
    SEGMENTS: 7,
    SEGMENT_LENGTH: 1.9,
    STIFFNESS: 0.78,
    DAMPING: 0.84,
    GRAVITY: 36,
    WIND_INFLUENCE: 0.45,
    SIZES: [4, 4, 3, 3, 2, 2, 1], // cachos expressivos proporcionais à cabeça
  },

  // Objetos de Fase
  OBJECTS: {
    SPRING_VY: -195,
    SPRING_VX_BOOST: 135,
    CRYSTAL_RESPAWN_SECONDS: 1.6,
    FALLING_PLATFORM_DELAY: 0.38, // tempo tremendo antes de cair
    FALLING_PLATFORM_RESPAWN: 3.0,
    WIND_ACCEL_HOVER: 280,
    WIND_ACCEL_NORMAL: 95,
    BOOST_RING_VX: 182,
    BOOST_RING_VY: -115,
    BOOST_RING_COOLDOWN: 0.85,
    VANISH_DELAY: 0.55,
    VANISH_RESPAWN: 2.4,
  },

  // Paleta SNOW SKY (Inspirada em arte pixel indie Steam / GameMaker)
  PALETTE: {
    BG_DEEP_NIGHT: '#151e33',
    BG_MIDNIGHT: '#243454',
    BG_HORIZON: '#374c73',
    CLOUD_LIGHT: '#a7bdd9',
    CLOUD_MID: '#6c82a6',
    CLOUD_DARK: '#324261',
    BG_MOUNTAIN_FAR: '#4a3d70',
    BG_MOUNTAIN_MID: '#6b5399',
    BG_MOUNTAIN_LIGHT: '#957bc4',
    BG_MOUNTAIN_TEAL: '#14b8a6',
    BG_MOUNTAIN_TEAL_LIGHT: '#5eead4',
    BG_MOUNTAIN_NEAR: '#1c3156',
    BG_RUINS: '#1f2d4a',

    AURORA_CYAN: '#2dd4bf',
    AURORA_VIOLET: '#818cf8',

    TILE_OUTLINE: '#0b101d',
    STONE_DARK: '#1f293d',
    STONE_MID: '#33415c',
    STONE_LIGHT: '#4f6282',
    SNOW_TOP: '#ffffff',
    SNOW_MID: '#e0f2fe',
    SNOW_SHADOW: '#93c5fd',

    ICE_DARK: '#0369a1',
    ICE_MID: '#0ea5e9',
    ICE_BRIGHT: '#38bdf8',
    ICE_HIGHLIGHT: '#e0f2fe',

    SOFT_SNOW_MAIN: '#f1f5f9',
    SOFT_SNOW_SHADE: '#94a3b8',

    WOOD_DARK: '#5c2d16',
    WOOD_LIGHT: '#9a4d22',

    SPIKE_METAL: '#94a3b8',
    SPIKE_TIP: '#f43f5e',

    // Protagonista Maya (Design SNOW SKY estilo Celeste: sombras profundas e outline consistente)
    MAYA_OUTLINE: '#0b101d',
    MAYA_SKIN: '#b86a42',
    MAYA_SKIN_SHADOW: '#7c3c20',
    MAYA_SKIN_HIGHLIGHT: '#d98c64',
    MAYA_BLUSH: '#e07a5f',
    MAYA_JACKET: '#38bdf8',
    MAYA_JACKET_LIGHT: '#7dd3fc',
    MAYA_JACKET_SHADE: '#0284c7',
    MAYA_JACKET_DEEP: '#075985',
    MAYA_PACK: '#7b5491',
    MAYA_PACK_DARK: '#4a2c5a',
    MAYA_PACK_LIGHT: '#a67ec2',
    MAYA_PANTS: '#1e293b',
    MAYA_PANTS_DARK: '#0f172a',
    MAYA_SCARF: '#f59e0b',
    MAYA_SCARF_BLUE: '#1d4ed8',
    MAYA_SCARF_BLUE_LIGHT: '#3b82f6',
    MAYA_BOOTS: '#64748b',
    MAYA_BOOTS_DARK: '#334155',

    // Cabelo cacheado castanho-escuro com sombras profundas + indicadores de estado
    HAIR_CURL_DARK: '#1c0b0e',
    HAIR_CURL_MID: '#4a2218',
    HAIR_CURL_LIGHT: '#7d4128',
    HAIR_CHARGED: '#e11d74',      // Brilho de estado ativo/carregado (compatível com testes)
    HAIR_CHARGED_SHADE: '#9f1239',
    HAIR_DEPLETED: '#38bdf8',     // Azul-ciano quando sem energia de hover
    HAIR_DEPLETED_SHADE: '#0284c7',
    HAIR_FLASH: '#ffffff',        // Flash branco na recarga

    // Hoverboard SNOW SKY & Objetos
    BOARD_BODY: '#e0f2fe',
    BOARD_ACCENT: '#2dd4bf',
    BOARD_PAD: '#0284c7',
    BOARD_GLOW: '#22d3ee',
    CRYSTAL_GREEN: '#10b981',
    CRYSTAL_BRIGHT: '#6ee7b7',
    GOLDEN_FLAKE: '#fbbf24',
    GOLDEN_GLOW: '#fef08a',
    BLACK_ICE_DARK: '#090f24',
    BLACK_ICE_MID: '#172554',
    BLACK_ICE_GLOW: '#67e8f9',
    VANISH_DARK: '#4c1d95',
    VANISH_MID: '#8b5cf6',
    VANISH_BRIGHT: '#ddd6fe',
    MODE_HOVER_BODY: '#06b6d4',
    MODE_HOVER_LIGHT: '#a5f3fc',
    MODE_NORMAL_BODY: '#d97706',
    MODE_NORMAL_LIGHT: '#fde68a',
  },
};

export type HoverControlMode = 'hold' | 'toggle';

export interface GameSettings {
  hoverMode: HoverControlMode;
  musicVolume: number; // 0 to 1
  sfxVolume: number;   // 0 to 1
  muted: boolean;
  screenShake: boolean;
}

export const DEFAULT_SETTINGS: GameSettings = {
  hoverMode: 'hold',
  musicVolume: 0.7,
  sfxVolume: 0.8,
  muted: false,
  screenShake: true,
};
