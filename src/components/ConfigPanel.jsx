import { useState } from 'react';
import { generateRandomBoard } from '../logic/agent.js';

const TOOLS = [
  { id: 'entry', label: '🚪 Entrada/Salida', single: true },
  { id: 'wumpus', label: '👹 Wumpus', single: true },
  { id: 'treasure', label: '💎 Tesoro', single: true },
  { id: 'pit', label: '🕳️ Pozo', single: false },
  { id: 'erase', label: '🗑️ Borrar', single: false },
];

export default function ConfigPanel({ onStart, onResume, running, gameStarted, onStop, onReset, speed, onSpeedChange }) {
  const [size, setSize] = useState(5);
  const [mode, setMode] = useState('auto'); // auto | manual
  const [selectedTool, setSelectedTool] = useState('entry');
  const [elements, setElements] = useState({ entry: null, wumpus: null, treasure: null, pits: [] });
  const [error, setError] = useState('');

  const handleCellClick = (r, c) => {
    if (mode !== 'manual') return;
    const tool = TOOLS.find(t => t.id === selectedTool);
    setElements(prev => {
      const next = { ...prev, pits: [...prev.pits] };
      if (selectedTool === 'erase') {
        if (next.entry?.join(',') === [r, c].join(',')) next.entry = null;
        if (next.wumpus?.join(',') === [r, c].join(',')) next.wumpus = null;
        if (next.treasure?.join(',') === [r, c].join(',')) next.treasure = null;
        next.pits = next.pits.filter(p => p.join(',') !== [r, c].join(','));
      } else if (tool?.single) {
        // Remove from pits if present
        next.pits = next.pits.filter(p => p.join(',') !== [r, c].join(','));
        next[selectedTool] = [r, c];
      } else if (selectedTool === 'pit') {
        if (!next.pits.some(p => p.join(',') === [r, c].join(','))) {
          // Remove from other elements
          if (next.entry?.join(',') === [r, c].join(',')) next.entry = null;
          if (next.wumpus?.join(',') === [r, c].join(',')) next.wumpus = null;
          if (next.treasure?.join(',') === [r, c].join(',')) next.treasure = null;
          next.pits.push([r, c]);
        }
      }
      return next;
    });
  };

  const handleStart = () => {
    setError('');
    if (mode === 'auto') {
      const auto = generateRandomBoard(size);
      onStart(size, auto, null);
    } else {
      if (!elements.entry) return setError('Coloca la casilla de Entrada/Salida.');
      if (!elements.wumpus) return setError('Coloca el Wumpus.');
      if (!elements.treasure) return setError('Coloca el Tesoro.');
      if (elements.pits.length === 0) return setError('Coloca al menos un Pozo.');
      onStart(size, elements, handleCellClick);
    }
  };

  // Build a preview grid for manual mode
  const previewGrid = mode === 'manual' ? buildPreview(size, elements) : null;

  return (
    <div className="config-panel">
      <h2>⚙️ Configuración</h2>

      <label>
        Tamaño del tablero:
        <select value={size} onChange={e => { setSize(+e.target.value); setElements({ entry: null, wumpus: null, treasure: null, pits: [] }); }}>
          {[4, 5, 6, 7, 8].map(n => <option key={n} value={n}>{n}×{n}</option>)}
        </select>
      </label>

      <label>
        Modo de colocación:
        <select value={mode} onChange={e => { setMode(e.target.value); setElements({ entry: null, wumpus: null, treasure: null, pits: [] }); }}>
          <option value="auto">Automático (aleatorio)</option>
          <option value="manual">Manual (diseñador)</option>
        </select>
      </label>

      {mode === 'manual' && (
        <div className="manual-config">
          <div className="tool-palette">
            {TOOLS.map(t => (
              <button
                key={t.id}
                className={`tool-btn ${selectedTool === t.id ? 'active' : ''}`}
                onClick={() => setSelectedTool(t.id)}
              >
                {t.label}
              </button>
            ))}
          </div>
          <p className="tool-hint">Haz clic en las casillas del tablero de vista previa para colocar elementos.</p>
          <div className="preview-grid" style={{ gridTemplateColumns: `repeat(${size}, 1fr)` }}>
            {previewGrid.map((row, r) =>
              row.map((cell, c) => (
                <div
                  key={`${r}-${c}`}
                  className={`preview-cell ${cell ? 'has-content' : ''}`}
                  onClick={() => handleCellClick(r, c)}
                >
                  <span className="cell-coord">{r},{c}</span>
                  <span>{cell}</span>
                </div>
              ))
            )}
          </div>
          <div className="element-status">
            <span className={elements.entry ? 'ok' : 'missing'}>🚪 Entrada: {elements.entry ? `(${elements.entry.join(',')})` : 'Sin colocar'}</span>
            <span className={elements.wumpus ? 'ok' : 'missing'}>👹 Wumpus: {elements.wumpus ? `(${elements.wumpus.join(',')})` : 'Sin colocar'}</span>
            <span className={elements.treasure ? 'ok' : 'missing'}>💎 Tesoro: {elements.treasure ? `(${elements.treasure.join(',')})` : 'Sin colocar'}</span>
            <span className={elements.pits.length > 0 ? 'ok' : 'missing'}>🕳️ Pozos: {elements.pits.length}</span>
          </div>
        </div>
      )}

      <label>
        Velocidad de simulación:
        <input type="range" min="100" max="2000" step="100" value={speed}
          onChange={e => onSpeedChange(+e.target.value)} />
        <span>{speed}ms por paso</span>
      </label>

      {error && <p className="error-msg">{error}</p>}

      <div className="action-buttons">
        {running
          ? <button className="btn-stop" onClick={onStop}>⏸ Pausar</button>
          : gameStarted
            ? <button className="btn-resume" onClick={onResume}>▶ Reanudar</button>
            : <button className="btn-start" onClick={handleStart}>▶ Iniciar Simulación</button>
        }
        <button className="btn-reset" onClick={onReset}>↺ Reiniciar</button>
      </div>
    </div>
  );
}

function buildPreview(size, elements) {
  const grid = Array.from({ length: size }, () => Array(size).fill(''));
  const place = (pos, icon) => { if (pos && pos[0] < size && pos[1] < size) grid[pos[0]][pos[1]] = icon; };
  place(elements.entry, '🚪');
  place(elements.wumpus, '👹');
  place(elements.treasure, '💎');
  (elements.pits || []).forEach(p => place(p, '🕳️'));
  return grid;
}
