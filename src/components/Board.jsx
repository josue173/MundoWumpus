import { CELL, adjacents, PERCEPTION, getPerceptions } from '../logic/gameEngine.js';

const ICONS = {
  agent: '🧑‍🚀',
  wumpus: '👹',
  treasure: '💎',
  pit: '🕳️',
  entry: '🚪',
  stench: '💨',
  breeze: '🌬️',
  dead_wumpus: '💀',
};

export default function Board({ gameState, kb, designMode, onCellClick, selectedTool }) {
  const { board, size, agentPos, wumpusAlive, wumpusPos, hasTreasure, entryPos, pits, visitedCells } = gameState;

  const perceptions = !designMode ? getPerceptions(gameState) : [];

  return (
    <div className="board-wrapper">
      <div
        className="board"
        style={{ gridTemplateColumns: `repeat(${size}, 1fr)` }}
      >
        {board.map((row, r) =>
          row.map((cell, c) => {
            const isAgent = agentPos[0] === r && agentPos[1] === c;
            const isVisited = visitedCells.includes([r, c].join(','));
            const key = [r, c].join(',');

            const adjCells = adjacents([r, c], size);
            const hasStench = !designMode && wumpusAlive && adjCells.some(([ar, ac]) => board[ar][ac].type === CELL.WUMPUS);
            const hasBreeze = !designMode && adjCells.some(([ar, ac]) => board[ar][ac].type === CELL.PIT);

            const isKbSafe = kb && kb.safe.has(key);
            const isKbPossibleWumpus = kb && kb.possibleWumpus.has(key);
            const isKbPossiblePit = kb && kb.possiblePit.has(key);

            let cellClass = 'cell';
            if (designMode) cellClass += ' cell-design';
            else if (isVisited) cellClass += ' cell-visited';
            else cellClass += ' cell-unknown';

            if (isKbPossibleWumpus && !isVisited) cellClass += ' cell-danger-wumpus';
            if (isKbPossiblePit && !isVisited) cellClass += ' cell-danger-pit';
            if (isKbSafe && !isVisited && !designMode) cellClass += ' cell-safe';

            return (
              <div
                key={`${r}-${c}`}
                className={cellClass}
                onClick={() => designMode && onCellClick && onCellClick(r, c)}
                title={designMode ? `(${r},${c})` : undefined}
              >
                <span className="cell-coord">{r},{c}</span>
                <div className="cell-content">
                  {cell.type === CELL.ENTRY && <span title="Entrada/Salida">{ICONS.entry}</span>}
                  {cell.type === CELL.PIT && <span title="Pozo">{ICONS.pit}</span>}
                  {cell.type === CELL.TREASURE && !hasTreasure && <span title="Tesoro">{ICONS.treasure}</span>}
                  {cell.type === CELL.WUMPUS && wumpusAlive && <span title="Wumpus">{ICONS.wumpus}</span>}
                  {cell.type === CELL.WUMPUS && !wumpusAlive && <span title="Wumpus muerto">{ICONS.dead_wumpus}</span>}
                  {isAgent && (
                    <span className="agent-icon" title={`Agente${hasTreasure ? ' (con tesoro)' : ''}`}>
                      {hasTreasure ? '🧑‍🚀💎' : ICONS.agent}
                    </span>
                  )}
                </div>
                {!designMode && (
                  <div className="cell-perceptions">
                    {hasStench && <span title="Hedor">{ICONS.stench}</span>}
                    {hasBreeze && <span title="Viento">{ICONS.breeze}</span>}
                  </div>
                )}
                {designMode && selectedTool && (
                  <div className="cell-tool-hint" />
                )}
              </div>
            );
          })
        )}
      </div>
      <div className="board-legend">
        <span>{ICONS.entry} Entrada/Salida</span>
        <span>{ICONS.wumpus} Wumpus</span>
        <span>{ICONS.treasure} Tesoro</span>
        <span>{ICONS.pit} Pozo</span>
        <span>{ICONS.stench} Hedor</span>
        <span>{ICONS.breeze} Viento</span>
        <span className="legend-safe">■ Casilla segura (KB)</span>
        <span className="legend-wumpus">■ Posible Wumpus</span>
        <span className="legend-pit">■ Posible Pozo</span>
      </div>
    </div>
  );
}
