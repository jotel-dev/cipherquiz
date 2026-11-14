import type { Category } from '@cipherquiz/shared';
import { QUESTIONS } from '../data/questions';

export interface RoundConfig {
  category: Category;
  stake: number;
  seconds: number;
}
export interface PracticeRound extends RoundConfig {
  id: string;
  answers: (number | null)[];
  completedAt: string;
  score: number;
  totalReturn: number;
}
export const TIERS = [
  { score: '10 / 10', multiplier: 2, label: 'The perfect round' },
  { score: '8–9 / 10', multiplier: 1.5, label: 'A brilliant effort' },
  { score: '7 / 10', multiplier: 1.2, label: 'Nicely played' },
  { score: '0–6 / 10', multiplier: 0, label: 'Another round?' },
] as const;
export function getMultiplier(score: number): number {
  return score === 10 ? 2 : score >= 8 ? 1.5 : score === 7 ? 1.2 : 0;
}
export function scoreAnswers(
  category: Category,
  answers: readonly (number | null)[],
): number {
  return QUESTIONS[category].reduce(
    (score, question, index) =>
      score + Number(answers[index] === question.answer),
    0,
  );
}
export function completeRound(
  config: RoundConfig,
  answers: (number | null)[],
): PracticeRound {
  if (
    answers.length !== 10 ||
    answers.some(
      (answer) =>
        answer !== null &&
        (!Number.isInteger(answer) || answer < 0 || answer > 3),
    )
  )
    throw new Error('A round requires ten valid answers or skips.');
  if (![10, 25, 50].includes(config.stake))
    throw new Error('Choose a valid practice stake.');
  const score = scoreAnswers(config.category, answers);
  return {
    ...config,
    id: crypto.randomUUID(),
    answers: [...answers],
    completedAt: new Date().toISOString(),
    score,
    totalReturn: config.stake * getMultiplier(score),
  };
}
