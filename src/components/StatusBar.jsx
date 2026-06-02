export default function StatusBar({ gameState }) {
  if (!gameState) return null;

  const { lives, arrows, hasTreasure, status, steps, wumpusAlive } = gameState;

  const statusText = {
    playing: '🎮 En juego',
    won: '🏆 ¡Victoria! El agente completó la misión.',
    lost: '💀 Derrota. El agente perdió todas sus vidas.',
  }[status] || '';

  return (
    <div className={`status-bar status-${status}`}>
      <div className="status-item">
        <span className="status-label">Estado</span>
        <span className="status-value">{statusText}</span>
      </div>
      <div className="status-item">
        <span className="status-label">❤️ Vidas</span>
        <span className="status-value">{'❤️'.repeat(lives)}{'🖤'.repeat(2 - lives)}</span>
      </div>
      <div className="status-item">
        <span className="status-label">🏹 Flechas</span>
        <span className="status-value">{arrows}</span>
      </div>
      <div className="status-item">
        <span className="status-label">💎 Tesoro</span>
        <span className="status-value">{hasTreasure ? '✅ Recogido' : '❌ No recogido'}</span>
      </div>
      <div className="status-item">
        <span className="status-label">👹 Wumpus</span>
        <span className="status-value">{wumpusAlive ? '😤 Vivo' : '💀 Muerto'}</span>
      </div>
      <div className="status-item">
        <span className="status-label">👣 Pasos</span>
        <span className="status-value">{steps?.length || 0}</span>
      </div>
    </div>
  );
}
