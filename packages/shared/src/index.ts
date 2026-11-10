export const DISCLAIMER =
  'This project is not audited, endorsed or operated by Zama. Use at your own risk.';

export const CATEGORIES = [
  'Mathematics',
  'Geography',
  'History',
  'General Knowledge',
] as const;
export type Category = (typeof CATEGORIES)[number];

export interface HealthResponse {
  status: 'ok' | 'unavailable';
  service: 'cipherquiz-api';
}
