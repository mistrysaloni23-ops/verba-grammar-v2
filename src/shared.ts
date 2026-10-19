export type Mode = 'correct' | 'natural';
export const MAX_CHARS = 4000;
export const DEBOUNCE_MS = 2500;
export const example = "I was trying to explain him about the problem but he didn't understood what I am saying and that's why the things got more complicated.";
export function wordCount(text: string) { return text.trim().match(/\S+/gu)?.length ?? 0; }
export function cacheKey(text: string, mode: Mode) { return JSON.stringify([mode, text]); }
export type Correction = { text: string; source: string; mode: Mode; elapsedMs: number };

export function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
