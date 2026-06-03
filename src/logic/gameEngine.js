// Core game state and rules for Wumpus World

export const CELL = {
  EMPTY: 'EMPTY',
  WUMPUS: 'WUMPUS',
  PIT: 'PIT',
  TREASURE: 'TREASURE',
  ENTRY: 'ENTRY',
};

export const PERCEPTION = {
  STENCH: 'STENCH',     // adjacent to wumpus
  BREEZE: 'BREEZE',     // adjacent to pit
  GLITTER: 'GLITTER',   // treasure in current cell
  BUMP: 'BUMP',         // hit a wall
  SCREAM: 'SCREAM',     // wumpus was killed
};

export const DIRECTION = { NORTH: 'N', SOUTH: 'S', EAST: 'E', WEST: 'W' };

export function createBoard(size, elements) {
  // elements: { entry, wumpus, treasure, pits: [[r,c],...] }
  const cells = Array.from({ length: size }, () =>
    Array.from({ length: size }, () => ({ type: CELL.EMPTY }))
  );

  const set = (pos, type) => {
    if (pos && inBounds(pos, size)) cells[pos[0]][pos[1]] = { type };
  };

  set(elements.entry, CELL.ENTRY);
  set(elements.wumpus, CELL.WUMPUS);
  set(elements.treasure, CELL.TREASURE);
  (elements.pits || []).forEach(p => set(p, CELL.PIT));

  return cells;
}

export function inBounds([r, c], size) {
  return r >= 0 && r < size && c >= 0 && c < size;
}

export function adjacents([r, c], size) {
  return [
    [r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1],
  ].filter(p => inBounds(p, size));
}

export function getPerceptions(state) {
  const { board, agentPos, wumpusAlive, wumpusPos, hasTreasure, size } = state;
  const percs = [];
  const [r, c] = agentPos;

  adjacents([r, c], size).forEach(([ar, ac]) => {
    const cell = board[ar][ac];
    if (wumpusAlive && cell.type === CELL.WUMPUS) percs.push(PERCEPTION.STENCH);
    if (cell.type === CELL.PIT) percs.push(PERCEPTION.BREEZE);
  });

  if (!hasTreasure && board[r][c].type === CELL.TREASURE) {
    percs.push(PERCEPTION.GLITTER);
  }

  return [...new Set(percs)];
}

export function initGameState(size, elements) {
  const board = createBoard(size, elements);
  return {
    board,
    size,
    agentPos: elements.entry,
    wumpusAlive: true,
    wumpusPos: elements.wumpus,
    treasurePos: elements.treasure,
    entryPos: elements.entry,
    pits: elements.pits || [],
    hasTreasure: false,
    arrows: 1,
    lives: 2,
    status: 'playing', // playing | won | lost
    visitedCells: [elements.entry.join(',')],
    steps: [],
  };
}

export function applyAction(state, action) {
  // Returns { newState, logEntry }
  let s = deepClone(state);
  let log = { action, pos: s.agentPos, perceptions: [], conclusion: '', decision: '' };

  if (action.type === 'MOVE') {
    const next = movePos(s.agentPos, action.dir);
    if (!inBounds(next, s.size)) {
      log.conclusion = 'Choqué con la pared.';
      log.decision = 'Permanecer en posición actual.';
      log.perceptions = [PERCEPTION.BUMP];
    } else {
      const cell = s.board[next[0]][next[1]];
      s.agentPos = next;
      if (!s.visitedCells.includes(next.join(','))) {
        s.visitedCells.push(next.join(','));
      }
      log.perceptions = getPerceptions(s);

      if (s.wumpusAlive && cell.type === CELL.WUMPUS) {
        s.lives--;
        log.conclusion = '¡Encontré al Wumpus! Perdí una vida.';
        if (s.lives <= 0) {
          s.status = 'lost';
          log.decision = 'Sin vidas restantes. Juego terminado.';
        } else {
          // Respawn wumpus at unvisited cell
          s.agentPos = s.entryPos;
          const newWumpusPos = findUnvisitedCell(s);
          if (newWumpusPos) {
            s.board[s.wumpusPos[0]][s.wumpusPos[1]] = { type: CELL.EMPTY };
            s.board[newWumpusPos[0]][newWumpusPos[1]] = { type: CELL.WUMPUS };
            s.wumpusPos = newWumpusPos;
          }
          log.decision = 'Regresé a la entrada. El Wumpus se movió.';
        }
      } else if (cell.type === CELL.PIT) {
        s.lives--;
        log.conclusion = '¡Caí en un pozo! Perdí una vida.';
        if (s.lives <= 0) {
          s.status = 'lost';
          log.decision = 'Sin vidas restantes. Juego terminado.';
        } else {
          s.agentPos = s.entryPos;
          log.decision = 'Regresé a la entrada.';
        }
      } else if (!s.hasTreasure && cell.type === CELL.TREASURE) {
        s.hasTreasure = true;
        s.board[next[0]][next[1]] = { type: CELL.EMPTY };
        log.conclusion = '¡Encontré el tesoro! Lo recogí.';
        log.decision = 'Recogí el tesoro. Ahora debo regresar a la entrada.';
      } else {
        log.conclusion = perceptionsConclusion(log.perceptions);
        const dirNames = { N: 'Norte', S: 'Sur', E: 'Este', W: 'Oeste' };
        log.decision = `Moverse hacia el ${dirNames[action.dir] || action.dir}.`;
      }

      // Win condition
      if (s.hasTreasure && s.agentPos[0] === s.entryPos[0] && s.agentPos[1] === s.entryPos[1]) {
        s.status = 'won';
        log.conclusion = '¡Llegué a la salida con el tesoro!';
        log.decision = 'Misión completada con éxito.';
      }
    }
  } else if (action.type === 'SHOOT') {
    if (s.arrows <= 0) {
      log.conclusion = 'No tengo flechas disponibles.';
      log.decision = 'Acción cancelada.';
    } else {
      s.arrows--;
      const hit = arrowHitsWumpus(s, action.dir);
      if (hit) {
        s.wumpusAlive = false;
        log.perceptions = [PERCEPTION.SCREAM];
        log.conclusion = '¡La flecha mató al Wumpus! Escuché un grito.';
        log.decision = 'El camino hacia el tesoro está más seguro ahora.';
      } else {
        log.conclusion = 'La flecha no alcanzó al Wumpus.';
        log.decision = 'Debo continuar con cautela.';
      }
    }
  }

  if (!log.conclusion) {
    log.perceptions = getPerceptions(s);
    log.conclusion = perceptionsConclusion(log.perceptions);
    log.decision = 'Evaluando próximo movimiento con heurística A*.';
  }

  s.steps = [...s.steps, { ...log, pos: [...state.agentPos], newPos: [...s.agentPos] }];
  return s;
}

function perceptionsConclusion(percs) {
  if (!percs.length) return 'Sin percepciones. La casilla y sus adyacentes parecen seguras.';
  const msgs = [];
  if (percs.includes(PERCEPTION.STENCH)) msgs.push('Hedor detectado → Wumpus en casilla adyacente.');
  if (percs.includes(PERCEPTION.BREEZE)) msgs.push('Viento detectado → Pozo en casilla adyacente.');
  if (percs.includes(PERCEPTION.GLITTER)) msgs.push('Brillo detectado → El tesoro está aquí.');
  if (percs.includes(PERCEPTION.SCREAM)) msgs.push('Grito escuchado → El Wumpus fue eliminado.');
  if (percs.includes(PERCEPTION.BUMP)) msgs.push('Choque con la pared.');
  return msgs.join(' ');
}

function movePos([r, c], dir) {
  if (dir === 'N') return [r - 1, c];
  if (dir === 'S') return [r + 1, c];
  if (dir === 'E') return [r, c + 1];
  if (dir === 'W') return [r, c - 1];
  return [r, c];
}

function arrowHitsWumpus(state, dir) {
  let pos = [...state.agentPos];
  for (let i = 0; i < state.size; i++) {
    pos = movePos(pos, dir);
    if (!inBounds(pos, state.size)) break;
    if (state.wumpusAlive && pos[0] === state.wumpusPos[0] && pos[1] === state.wumpusPos[1]) {
      return true;
    }
  }
  return false;
}

function findUnvisitedCell(state) {
  for (let r = 0; r < state.size; r++) {
    for (let c = 0; c < state.size; c++) {
      const key = [r, c].join(',');
      if (!state.visitedCells.includes(key) && state.board[r][c].type === CELL.EMPTY) {
        return [r, c];
      }
    }
  }
  return null;
}

function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}
