// Intelligent agent with A* heuristic search and knowledge base
import { adjacents, inBounds, CELL, PERCEPTION, getPerceptions } from './gameEngine.js';

// Knowledge base for the agent
export function createKB(size, entryPos) {
  return {
    safe: new Set([entryPos.join(',')]),
    unsafe: new Set(),
    possibleWumpus: new Set(),
    possiblePit: new Set(),
    visited: new Set([entryPos.join(',')]),
    size,
  };
}

export function updateKB(kb, pos, perceptions) {
  const key = pos.join(',');
  kb.visited.add(key);
  kb.safe.add(key);

  const adjs = adjacents(pos, kb.size);

  if (!perceptions.includes(PERCEPTION.STENCH) && !perceptions.includes(PERCEPTION.BREEZE)) {
    adjs.forEach(adj => {
      const adjKey = adj.join(',');
      kb.safe.add(adjKey);
      kb.possibleWumpus.delete(adjKey);
      kb.possiblePit.delete(adjKey);
    });
  }

  if (perceptions.includes(PERCEPTION.STENCH)) {
    adjs.forEach(adj => {
      const adjKey = adj.join(',');
      if (!kb.safe.has(adjKey)) kb.possibleWumpus.add(adjKey);
    });
  } else {
    // No stench means no wumpus adjacent
    adjs.forEach(adj => kb.possibleWumpus.delete(adj.join(',')));
  }

  if (perceptions.includes(PERCEPTION.BREEZE)) {
    adjs.forEach(adj => {
      const adjKey = adj.join(',');
      if (!kb.safe.has(adjKey)) kb.possiblePit.add(adjKey);
    });
  } else {
    adjs.forEach(adj => kb.possiblePit.delete(adj.join(',')));
  }

  if (perceptions.includes(PERCEPTION.SCREAM)) {
    kb.possibleWumpus.clear();
    // All previously stench-inferred cells are now safe from wumpus
  }

  return kb;
}

// Risk score for a cell (lower = safer)
export function riskScore(kb, pos) {
  const key = pos.join(',');
  if (kb.unsafe.has(key)) return 1000;
  if (kb.possibleWumpus.has(key) && kb.possiblePit.has(key)) return 200;
  if (kb.possibleWumpus.has(key)) return 100;
  if (kb.possiblePit.has(key)) return 50;
  if (!kb.safe.has(key)) return 10; // unknown
  return 0;
}

// Manhattan heuristic for A*
export function heuristic(a, b) {
  return Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]);
}

// Returns heuristic evaluation table for all neighbors of current position
export function computeHeuristicTable(gameState, kb) {
  const { agentPos, hasTreasure, entryPos, wumpusAlive, board, size } = gameState;
  const goal = hasTreasure ? entryPos : gameState.treasurePos;

  const neighbors = adjacents(agentPos, size).map(pos => {
    const cell = board[pos[0]][pos[1]];
    const key = pos.join(',');

    // Status basado SOLO en lo que el agente conoce (KB), no en el tablero real
    let status = 'unknown';
    if (kb.safe.has(key)) status = 'safe';
    if (kb.possiblePit.has(key)) status = 'possible-pit';
    if (kb.possibleWumpus.has(key)) status = 'possible-wumpus';
    if (kb.unsafe.has(key)) status = 'unsafe';
    // Solo revelar wumpus si el agente lo ha visto directamente (casilla visitada adyacente con hedor confirmado)
    if (wumpusAlive && cell.type === 'WUMPUS' && kb.visited.has(key)) status = 'wumpus';
    if (cell.type === 'PIT' && kb.visited.has(key)) status = 'pit';

    // El riesgo se basa únicamente en la KB del agente
    let risk = riskScore(kb, pos);

    const gCost = 1 + risk;
    const hCost = heuristic(pos, goal);
    const fCost = gCost + hCost;

    return { pos, key, gCost, hCost, fCost, risk, status, visited: kb.visited.has(key) };
  });

  const best = neighbors.reduce((a, b) => (a.fCost <= b.fCost ? a : b), neighbors[0] || null);

  return { neighbors, goal, agentPos, best };
}

// A* search from start to goal through known-safe cells
export function astar(start, goal, kb, board, wumpusAlive) {
  const key = p => p.join(',');
  const g = { [key(start)]: 0 };
  const f = { [key(start)]: heuristic(start, goal) };
  const open = [start];
  const cameFrom = {};
  const closed = new Set();

  while (open.length) {
    // Pick lowest f
    open.sort((a, b) => (f[key(a)] || Infinity) - (f[key(b)] || Infinity));
    const current = open.shift();
    const ck = key(current);

    if (ck === key(goal)) {
      return reconstructPath(cameFrom, current, key);
    }

    closed.add(ck);

    for (const neighbor of adjacents(current, kb.size)) {
      const nk = key(neighbor);
      if (closed.has(nk)) continue;

      const cell = board[neighbor[0]][neighbor[1]];
      if (cell.type === CELL.PIT) continue;
      if (wumpusAlive && cell.type === CELL.WUMPUS) continue;

      const risk = riskScore(kb, neighbor);
      const tentativeG = (g[ck] || 0) + 1 + risk;

      if (tentativeG < (g[nk] || Infinity)) {
        cameFrom[nk] = current;
        g[nk] = tentativeG;
        f[nk] = tentativeG + heuristic(neighbor, goal);
        if (!open.some(p => key(p) === nk)) open.push(neighbor);
      }
    }
  }

  return null; // no path
}

function reconstructPath(cameFrom, current, key) {
  const path = [current];
  while (cameFrom[key(current)]) {
    current = cameFrom[key(current)];
    path.unshift(current);
  }
  return path; // includes start
}

// Decide next action for the agent
export function decideAction(gameState, kb) {
  const { agentPos, hasTreasure, entryPos, wumpusAlive, wumpusPos, arrows, board, size } = gameState;

  const perceptions = getPerceptions(gameState);
  updateKB(kb, agentPos, perceptions);

  // If has treasure, go home
  const goal = hasTreasure ? entryPos : findBestGoal(gameState, kb);

  if (!goal) {
    // No goal found, explore unknown safe adj
    return { type: 'MOVE', dir: exploreFallback(agentPos, kb, board, size, wumpusAlive) };
  }

  // Consider shooting if wumpus is in line of sight and we have arrows.
  // The agent only decides to shoot ~50% of the time to add unpredictability.
  if (!hasTreasure && wumpusAlive && arrows > 0 && Math.random() < 0.5) {
    const shootDir = canShoot(agentPos, wumpusPos, size);
    if (shootDir && kb.possibleWumpus.size <= 2) {
      return { type: 'SHOOT', dir: shootDir };
    }
  }

  const path = astar(agentPos, goal, kb, board, wumpusAlive);
  if (!path || path.length < 2) {
    // Try fallback: move to any safe unvisited
    return { type: 'MOVE', dir: exploreFallback(agentPos, kb, board, size, wumpusAlive) };
  }

  const next = path[1];
  const dir = getDir(agentPos, next);
  return { type: 'MOVE', dir };
}

function findBestGoal(gameState, kb) {
  const { treasurePos, agentPos, size } = gameState;

  // If treasure is known safe or we've identified it
  if (kb.safe.has(treasurePos.join(',')) || !kb.possibleWumpus.has(treasurePos.join(',')) && !kb.possiblePit.has(treasurePos.join(','))) {
    return treasurePos;
  }

  // Find nearest unvisited safe cell to explore
  let best = null;
  let bestDist = Infinity;
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const key = [r, c].join(',');
      if (!kb.visited.has(key) && kb.safe.has(key)) {
        const d = heuristic(agentPos, [r, c]);
        if (d < bestDist) {
          bestDist = d;
          best = [r, c];
        }
      }
    }
  }
  return best || treasurePos;
}

function exploreFallback(pos, kb, board, size, wumpusAlive) {
  const dirs = ['N', 'S', 'E', 'W'];
  const offsets = { N: [-1, 0], S: [1, 0], E: [0, 1], W: [0, -1] };

  // Prefer safe unvisited
  for (const dir of dirs) {
    const next = [pos[0] + offsets[dir][0], pos[1] + offsets[dir][1]];
    if (!inBounds(next, size)) continue;
    const k = next.join(',');
    const cell = board[next[0]][next[1]];
    if (cell.type === CELL.PIT) continue;
    if (wumpusAlive && cell.type === CELL.WUMPUS) continue;
    if (kb.safe.has(k) && !kb.visited.has(k)) return dir;
  }
  // Then safe visited
  for (const dir of dirs) {
    const next = [pos[0] + offsets[dir][0], pos[1] + offsets[dir][1]];
    if (!inBounds(next, size)) continue;
    const k = next.join(',');
    const cell = board[next[0]][next[1]];
    if (cell.type === CELL.PIT) continue;
    if (wumpusAlive && cell.type === CELL.WUMPUS) continue;
    if (kb.safe.has(k)) return dir;
  }
  // Any non-dangerous
  return dirs[0];
}

function canShoot(from, target, size) {
  if (from[0] === target[0]) return target[1] > from[1] ? 'E' : 'W';
  if (from[1] === target[1]) return target[0] > from[0] ? 'S' : 'N';
  return null;
}

function getDir([r1, c1], [r2, c2]) {
  if (r2 < r1) return 'N';
  if (r2 > r1) return 'S';
  if (c2 < c1) return 'W';
  if (c2 > c1) return 'E';
  return 'N';
}

export function generateRandomBoard(size) {
  const positions = [];
  for (let r = 0; r < size; r++)
    for (let c = 0; c < size; c++)
      positions.push([r, c]);

  const shuffle = arr => [...arr].sort(() => Math.random() - 0.5);
  const avail = shuffle(positions);

  const entry = avail.shift();
  const wumpus = avail.find(p => p.join(',') !== entry.join(','));
  const treasure = avail.find(p => p.join(',') !== entry.join(',') && p.join(',') !== wumpus.join(','));

  const remaining = avail.filter(p =>
    p.join(',') !== entry.join(',') &&
    p.join(',') !== wumpus.join(',') &&
    p.join(',') !== treasure.join(',')
  );

  const pitCount = Math.max(1, Math.floor(size * size * 0.15));
  const pits = remaining.slice(0, pitCount);

  return { entry, wumpus, treasure, pits };
}
