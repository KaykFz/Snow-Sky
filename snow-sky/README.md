# SNOW SKY — Precision Hoverboard Platformer

Um platformer 2D de precisão estilo *Celeste* desenvolvido em **Vite + TypeScript + HTML5 Canvas 2D (320x180 pixelated)** e áudio procedural via **Web Audio API**.

## 1. Controles

| Ação | Teclado / Mouse | Gamepad |
| :--- | :--- | :--- |
| **Mover / Escalar** | `WASD` ou `Setas` | Analógico Esquerdo / D-Pad |
| **Pular / Wall Jump** | `Espaço`, `J` ou `Z` | Botão `A` / `B` (Sul / Leste) |
| **Modo Hoverboard** | `Shift`, `E`, `K`, `L`, `C`, `X` ou `Clique Direito` *(Segurar ou Alternar nas Opções)* | `X`, `RT`, `LT`, `RB` ou `LB` |
| **Reiniciar Fase** | `R` | `Y` / `Select` |
| **Pausar** | `P` ou `Esc` | `Start` |
| **Mudo (Mute)** | `M` | — |

## 2. Como Criar ou Editar Fases (`src/game/Level.ts`)

As fases são matrizes ASCII fáceis de editar no arquivo `src/game/Level.ts` (array `LEVELS`). Cada caractere representa um tile `8x8`:

- `.` : Ar vazio
- `#` : Pedra / Terra coberta de neve
- `=` : Gelo escorregadio azul brilhante (acelera o hover e recarrega energia rápido)
- `~` : Neve macia (freia fortemente o hoverboard)
- `I` : Parede de gelo vertical (permite subir pela parede em alta velocidade com o hover)
- `/` e `\` : Rampas de gelo de 45° (dão boost de velocidade ao descer no hover)
- `-` : Plataforma de madeira atravessável por baixo
- `^`, `v`, `<`, `>` : Espinhos direcionais
- `S` : Ponto de spawn inicial da Maya
- `K` : Checkpoint intermediário (lanterna de gelo)
- `C` : Cristal verde flutuante (recarrega energia de hover e stamina no ar)
- `M` : Mola de neve (lança para cima e recarrega energia)
- `B` : Bloco de gelo quebrável (só cede quando atingido em alta velocidade no hover)
- `F` : Plataforma instável que cai após pisar
- `G` : Floco de Neve Dourado (colecionável opcional da fase)
- `E` : Marco Boreal de chegada da fase

## 3. Como Ajustar a Física (`src/config.ts`)

Todas as variáveis de *game feel* estão centralizadas em `src/config.ts`:
- `CONFIG.NORMAL`: Velocidade de corrida, aceleração, gravidade, redução de gravidade no ápice (`APEX_GRAVITY_MULT`), stamina de parede e impulsos de wall-jump.
- `CONFIG.HOVER`: Atrito quase zero no gelo (`ICE_FRICTION`), aceleração em rampas (`SLOPE_DOWN_BOOST`), conversão de velocidade horizontal em Salto Carregado (`SPEED_TO_VERTICAL_BONUS` e `SPEED_TO_HORIZONTAL_BOOST`), subida em paredes de gelo (`ICE_WALL_CLIMB_FACTOR`) e taxas de dreno/recarga de energia.
- `CONFIG.FEEL`: Janelas de *Coyote Time* (`COYOTE_FRAMES`), *Jump Buffering* (`JUMP_BUFFER_FRAMES`), correção de quina (`CORNER_CORRECTION_PX`) e *Hit-stop*.
- `CONFIG.HAIR`: Quantidade de segmentos, comprimento, rigidez e influência do vento no cabelo da Maya.
