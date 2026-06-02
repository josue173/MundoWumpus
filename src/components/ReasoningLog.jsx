import { useEffect, useRef } from 'react';

const PERCEPTION_LABELS = {
  STENCH: '💨 Hedor',
  BREEZE: '🌬️ Viento',
  GLITTER: '✨ Brillo (tesoro)',
  BUMP: '🧱 Choque con pared',
  SCREAM: '😱 Grito (Wumpus muerto)',
};

const ACTION_LABELS = {
  MOVE: dir => `Mover → ${dirLabel(dir)}`,
  SHOOT: dir => `Disparar flecha → ${dirLabel(dir)}`,
};

function dirLabel(d) {
  return { N: 'Norte', S: 'Sur', E: 'Este', W: 'Oeste' }[d] || d;
}

export default function ReasoningLog({ steps }) {
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [steps]);

  if (!steps || steps.length === 0) {
    return (
      <div className="reasoning-log empty">
        <p>El log de razonamiento aparecerá aquí cuando el agente comience a moverse.</p>
      </div>
    );
  }

  return (
    <div className="reasoning-log">
      {steps.map((step, i) => (
        <div key={i} className={`step-entry ${step.action?.type === 'SHOOT' ? 'step-shoot' : ''}`}>
          <div className="step-header">
            <span className="step-num">Paso {i + 1}</span>
            <span className="step-pos">
              Casilla: ({step.pos?.[0]},{step.pos?.[1]})
              {step.newPos && step.newPos.join(',') !== step.pos?.join(',') &&
                ` → (${step.newPos[0]},${step.newPos[1]})`
              }
            </span>
            <span className="step-action">
              {step.action && (ACTION_LABELS[step.action.type]?.(step.action.dir) || step.action.type)}
            </span>
          </div>

          <div className="step-perceptions">
            <strong>Percepción:</strong>{' '}
            {step.perceptions && step.perceptions.length > 0
              ? step.perceptions.map(p => PERCEPTION_LABELS[p] || p).join(', ')
              : 'Ninguna'}
          </div>

          <div className="step-conclusion">
            <strong>Conclusión:</strong> {step.conclusion || '—'}
          </div>

          <div className="step-decision">
            <strong>Decisión:</strong> {step.decision || '—'}
          </div>
        </div>
      ))}
      <div ref={endRef} />
    </div>
  );
}
