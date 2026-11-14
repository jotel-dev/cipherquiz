import { createContext, useContext, useState, type ReactNode } from 'react';
import { completeRound, type PracticeRound, type RoundConfig } from './model';

interface GameState {
  config: RoundConfig | null;
  history: PracticeRound[];
  playerName: string;
  start: (config: RoundConfig) => void;
  finish: (answers: (number | null)[]) => void;
  abandon: () => void;
  clearHistory: () => void;
  setPlayerName: (name: string) => void;
}
const Context = createContext<GameState | null>(null);
export function GameProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<RoundConfig | null>(null);
  const [history, setHistory] = useState<PracticeRound[]>([]);
  const [playerName, setPlayerName] = useState('Curious mind');
  const value: GameState = {
    config,
    history,
    playerName,
    setPlayerName,
    start: setConfig,
    finish: (answers) => {
      if (config) {
        const round = completeRound(config, answers);
        setHistory((previous) => [round, ...previous]);
        setConfig(null);
      }
    },
    abandon: () => setConfig(null),
    clearHistory: () => setHistory([]),
  };
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useGame() {
  const context = useContext(Context);
  if (!context) throw new Error('GameProvider is required');
  return context;
}
