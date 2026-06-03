import { useState, useEffect, useRef, useCallback } from 'react';
import Board from './components/Board.jsx';
import ConfigPanel from './components/ConfigPanel.jsx';
import ReasoningLog from './components/ReasoningLog.jsx';
import HeuristicPanel from './components/HeuristicPanel.jsx';
import StatusBar from './components/StatusBar.jsx';
import { initGameState, applyAction } from './logic/gameEngine.js';
import { createKB, decideAction, computeHeuristicTable } from './logic/agent.js';
import './App.css';

export default function App() {
  const [gameState, setGameState] = useState(null);
  const [kb, setKb] = useState(null);
  const [running, setRunning] = useState(false);
  const [speed, setSpeed] = useState(1000);
  const [activeTab, setActiveTab] = useState('reasoning'); // 'reasoning' | 'heuristic'
  const [heuristicHistory, setHeuristicHistory] = useState([]);
  const intervalRef = useRef(null);
  const gameStateRef = useRef(null);
  const kbRef = useRef(null);

  gameStateRef.current = gameState;
  kbRef.current = kb;

  const handleStart = useCallback((size, elements) => {
    const state = initGameState(size, elements);
    const knowledge = createKB(size, elements.entry);
    setGameState(state);
    setKb(knowledge);
    setHeuristicHistory([]);
    setRunning(true);
  }, []);

  const handleStop = useCallback(() => setRunning(false), []);
  const handleResume = useCallback(() => setRunning(true), []);

  const handleReset = useCallback(() => {
    setRunning(false);
    setGameState(null);
    setKb(null);
    setHeuristicHistory([]);
    clearInterval(intervalRef.current);
  }, []);

  const stepAgent = useCallback(() => {
    const state = gameStateRef.current;
    const knowledge = kbRef.current;
    if (!state || !knowledge || state.status !== 'playing') {
      setRunning(false);
      return;
    }

    const action = decideAction(state, knowledge);
    const newState = applyAction(state, action);
    setGameState(newState);
    setKb({ ...knowledge });

    if (action.type === 'MOVE') {
      const snapshot = computeHeuristicTable(state, knowledge);
      setHeuristicHistory(prev => [...prev, { ...snapshot, stepIndex: prev.length, actionType: 'MOVE' }]);
    } else if (action.type === 'SHOOT') {
      const dirNames = { N: 'Norte', S: 'Sur', E: 'Este', W: 'Oeste' };
      setHeuristicHistory(prev => [...prev, {
        actionType: 'SHOOT',
        dir: action.dir,
        dirName: dirNames[action.dir] || action.dir,
        agentPos: state.agentPos,
        stepIndex: prev.length,
      }]);
    }

    if (newState.status !== 'playing') {
      setRunning(false);
    }
  }, []);

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(stepAgent, speed);
    } else {
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  }, [running, speed, stepAgent]);

  return (
    <div className="app">
      <header className="app-header">
        <h1>🌍 Mundo de Wumpus</h1>
      </header>

      <div className="app-body">
        <aside className="sidebar">
          <ConfigPanel
            onStart={handleStart}
            onResume={handleResume}
            running={running}
            gameStarted={!!gameState && gameState.status === 'playing'}
            onStop={handleStop}
            onReset={handleReset}
            speed={speed}
            onSpeedChange={setSpeed}
          />
        </aside>

        <main className="main-area">
          {gameState ? (
            <>
              <StatusBar gameState={gameState} />
              <Board
                gameState={gameState}
                kb={kb}
                designMode={false}
              />
              {gameState.status !== 'playing' && (
                <div className={`game-result ${gameState.status}`}>
                  <p>
                    {gameState.status === 'won'
                      ? '🏆 ¡El agente encontró el tesoro y escapó con éxito!'
                      : '💀 El agente perdió todas sus vidas. Juego terminado.'}
                  </p>
                  <button className="btn-reset" onClick={handleReset}>Jugar de nuevo</button>
                </div>
              )}
            </>
          ) : (
            <div className="welcome">
              <div className="welcome-card">
                <h2>Bienvenido al Mundo de Wumpus</h2>
                <p>Configura el tablero a la izquierda y presiona <strong>Iniciar Simulación</strong>.</p>
                <div className="welcome-rules">
                  <h3>Reglas del juego</h3>
                  <ul>
                    <li>🧑‍🚀 El agente debe encontrar el tesoro 💎 y regresar a la entrada 🚪</li>
                    <li>👹 El Wumpus devora al agente si están en la misma casilla</li>
                    <li>🕳️ Los pozos matan al agente si cae en ellos</li>
                    <li>💨 El hedor indica que el Wumpus está adyacente</li>
                    <li>🌬️ El viento indica que hay un pozo adyacente</li>
                    <li>❤️ El agente tiene 2 vidas y 1 flecha</li>
                    <li>🏹 La flecha puede matar al Wumpus desde distancia</li>
                  </ul>
                  <h3>Heurística (A*)</h3>
                  <ul>
                    <li>El agente mantiene una <em>base de conocimiento</em> de casillas seguras y peligrosas</li>
                    <li>Usa A* con puntuación de riesgo para planificar el camino óptimo</li>
                    <li>Riesgo por Wumpus posible: +100 | Riesgo por Pozo posible: +50 | Desconocido: +10</li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </main>

        {gameState && (
          <aside className="log-panel">
            <div className="log-tabs">
              <button
                className={`log-tab ${activeTab === 'reasoning' ? 'active' : ''}`}
                onClick={() => setActiveTab('reasoning')}
              >
                📋 Razonamiento
              </button>
              <button
                className={`log-tab ${activeTab === 'heuristic' ? 'active' : ''}`}
                onClick={() => setActiveTab('heuristic')}
              >
                🔢 Cálculo A*
              </button>
            </div>

            {activeTab === 'reasoning' && (
              <>
                <p className="heuristic-info">
                  Heurística: <strong>A* con puntuación de riesgo</strong><br />
                  f(n) = g(n) + h(n) | h = distancia Manhattan al objetivo<br />
                  g = costo acumulado + penalización por riesgo de casilla
                </p>
                <ReasoningLog steps={gameState.steps} />
              </>
            )}

            {activeTab === 'heuristic' && (
              <HeuristicPanel gameState={gameState} kb={kb} history={heuristicHistory} />
            )}
          </aside>
        )}
      </div>
    </div>
  );
}
