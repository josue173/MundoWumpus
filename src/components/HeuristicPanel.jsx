import { useEffect, useRef } from 'react';
import { computeHeuristicTable } from '../logic/agent.js';

const DIR_LABEL = { N: '⬆ Norte', S: '⬇ Sur', E: '➡ Este', W: '⬅ Oeste' };

const DIR_FROM = ([r1, c1], [r2, c2]) => {
  if (r2 < r1) return 'N';
  if (r2 > r1) return 'S';
  if (c2 > c1) return 'E';
  return 'W';
};

const STATUS_LABEL = {
  safe:             { label: 'Segura',           color: '#00c47a', bg: '#0d2b1e' },
  unknown:          { label: 'Desconocida',       color: '#9090b0', bg: '#1e2130' },
  'possible-pit':   { label: 'Posible Pozo',      color: '#ffaa00', bg: '#1a1500' },
  'possible-wumpus':{ label: 'Posible Wumpus',    color: '#ff6b6b', bg: '#2b0d0d' },
  unsafe:           { label: 'Peligrosa',         color: '#ff4d4d', bg: '#2b0000' },
  pit:              { label: '🕳️ Pozo',           color: '#ff4d4d', bg: '#2b0000' },
  wumpus:           { label: '👹 Wumpus',         color: '#ff4d4d', bg: '#2b0000' },
};

const RISK_LABELS = {
  0:    'Confirmada segura (+0)',
  10:   'Desconocida (+10)',
  50:   'Posible Pozo (+50)',
  100:  'Posible Wumpus (+100)',
  200:  'Posible Wumpus + Pozo (+200)',
  1000: 'Confirmada peligrosa (+1000)',
};

function StepTable({ snapshot, stepNumber, isLatest }) {
  const { neighbors, goal, agentPos, best } = snapshot;

  return (
    <div className={`hp-step-block ${isLatest ? 'hp-step-latest' : ''}`}>
      <div className="hp-step-header">
        <span className="hp-step-num">Paso {stepNumber}</span>
        <span className="hp-step-info">
          Agente: <strong>({agentPos[0]},{agentPos[1]})</strong>
          &nbsp;→&nbsp; Objetivo: <strong>({goal[0]},{goal[1]})</strong>
        </span>
        {isLatest && <span className="hp-step-latest-tag">● Actual</span>}
      </div>

      <div className="hp-formula-inline">
        <span className="hp-f">f</span>=<span className="hp-g">g</span>+<span className="hp-h">h</span>
        <span className="hp-formula-sep">|</span>
        <span className="hp-g">g</span>=1+riesgo
        <span className="hp-formula-sep">|</span>
        <span className="hp-h">h</span>=Manhattan
      </div>

      <div className="hp-table-wrap">
        <table className="hp-table">
          <thead>
            <tr>
              <th>Dir.</th>
              <th>Casilla</th>
              <th>Conocimiento</th>
              <th className="hp-col-g" title="Costo acumulado + riesgo">g(n)</th>
              <th className="hp-col-h" title="Distancia Manhattan al objetivo">h(n)</th>
              <th className="hp-col-f" title="Costo total estimado">f(n)</th>
            </tr>
          </thead>
          <tbody>
            {neighbors.map(n => {
              const dir = DIR_FROM(agentPos, n.pos);
              const st = STATUS_LABEL[n.status] || STATUS_LABEL.unknown;
              const isBest = best && n.key === best.key;
              return (
                <tr key={n.key} className={isBest ? 'hp-row-best' : ''}>
                  <td className="hp-dir">{DIR_LABEL[dir]}</td>
                  <td className="hp-pos">({n.pos[0]},{n.pos[1]})</td>
                  <td>
                    <span className="hp-status-badge" style={{ color: st.color, background: st.bg }}>
                      {st.label}
                    </span>
                  </td>
                  <td className="hp-col-g hp-num" title={`1 paso + ${RISK_LABELS[n.risk] || n.risk}`}>
                    {n.gCost}
                  </td>
                  <td className="hp-col-h hp-num">{n.hCost}</td>
                  <td className="hp-col-f hp-num">
                    {n.fCost}
                    {isBest && <span className="hp-best-tag">✓</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {best && (
        <div className="hp-conclusion-inline">
          ✅ Elige <strong>({best.pos[0]},{best.pos[1]})</strong> — {DIR_LABEL[DIR_FROM(agentPos, best.pos)]} —
          {' '}<span className="hp-f">f={best.fCost}</span>{' '}
          (<span className="hp-g">g={best.gCost}</span> + <span className="hp-h">h={best.hCost}</span>)
          {' '}· <span className="hp-risk-tag">{RISK_LABELS[best.risk] || `+${best.risk}`}</span>
        </div>
      )}
    </div>
  );
}

export default function HeuristicPanel({ gameState, kb, history = [] }) {
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history.length]);

  if (!gameState || !kb) {
    return (
      <div className="heuristic-panel empty">
        <p>Inicia la simulación para ver los cálculos en tiempo real.</p>
      </div>
    );
  }

  return (
    <div className="heuristic-panel">
      {history.length === 0 && (
        <div className="hp-empty-history">
          El agente aún no ha dado ningún paso.
        </div>
      )}

      {history.map((snapshot, i) => (
        <StepTable
          key={i}
          snapshot={snapshot}
          stepNumber={i + 1}
          isLatest={i === history.length - 1}
        />
      ))}

      <div ref={bottomRef} />

      {/* Legend */}
      <details className="hp-legend">
        <summary>📖 Tabla de penalizaciones de riesgo</summary>
        <ul>
          {Object.entries(RISK_LABELS).map(([v, label]) => (
            <li key={v}><code>+{v}</code> — {label}</li>
          ))}
        </ul>
      </details>
    </div>
  );
}
