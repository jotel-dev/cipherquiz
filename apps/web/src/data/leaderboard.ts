import type { Category } from '@cipherquiz/shared';
export interface LeaderboardEntry {
  name: string;
  initials: string;
  category: Category;
  score: number;
  rounds: number;
  week: boolean;
}
// Display fixtures only. No real wallet identities, private scores or player claims.
export const LEADERBOARD: LeaderboardEntry[] = [
  {
    name: 'Atlas',
    initials: 'AT',
    category: 'Geography',
    score: 98,
    rounds: 24,
    week: true,
  },
  {
    name: 'Ada',
    initials: 'AD',
    category: 'Mathematics',
    score: 96,
    rounds: 18,
    week: true,
  },
  {
    name: 'The Archivist',
    initials: 'TA',
    category: 'History',
    score: 94,
    rounds: 31,
    week: false,
  },
  {
    name: 'Curious George',
    initials: 'CG',
    category: 'General Knowledge',
    score: 92,
    rounds: 16,
    week: true,
  },
  {
    name: 'Meridian',
    initials: 'ME',
    category: 'Geography',
    score: 90,
    rounds: 12,
    week: false,
  },
  {
    name: 'Pi Society',
    initials: 'PS',
    category: 'Mathematics',
    score: 88,
    rounds: 22,
    week: true,
  },
  {
    name: 'Yesterday',
    initials: 'YE',
    category: 'History',
    score: 86,
    rounds: 14,
    week: true,
  },
  {
    name: 'Little Wonder',
    initials: 'LW',
    category: 'General Knowledge',
    score: 84,
    rounds: 19,
    week: false,
  },
];
