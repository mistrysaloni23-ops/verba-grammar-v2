import { PROMPTS } from './prompts.ts';
import type { Mode } from '../src/shared.ts';

export class ApiError extends Error {
  status: number;
  code: string;
  retryAfter?: number;

  constructor(status: number, code: string, message: string, retryAfter?: number) {
    super(message);
    this.status = status;
    this.code = code;
    this.retryAfter = retryAfter;
  }
}

function invalidResponse(): never {
  throw new ApiError(502, 'INVALID_RESPONSE', 'The editor returned an unexpected response. Please try again.');
}

export function extractText(data: unknown, inputLength: number): string {
  if (!data || typeof data !== 'object') return invalidResponse();
  const candidates = (data as { candidates?: unknown }).candidates;
  if (!Array.isArray(candidates)) return invalidResponse();
  const candidate = candidates[0];
  if (!candidate || candidate.finishReason !== 'STOP' || !Array.isArray(candidate.content?.parts)) {
    return invalidResponse();
  }

  let output = '';
  for (const part of candidate.content.parts) {
    if (!part || typeof part !== 'object') return invalidResponse();
    if (part.thought === true) continue;
    if (typeof part.text !== 'string') return invalidResponse();
    output += part.text;
  }
  output = output.trim();
  if (!output || output.length > Math.max(1000, inputLength * 4) || output.startsWith('```')) {
    return invalidResponse();
  }
  return output;
}

function checkCancellation(signal?: AbortSignal) {
  if (signal?.aborted) {
    throw new ApiError(499, 'CANCELLED', 'This correction was canceled.');
  }
}

export async function generate(
  text: string,
  mode: Mode,
  key: string,
  model: string,
  reserve: () => Promise<void>,
  fetcher: typeof fetch = fetch,
  signal?: AbortSignal,
): Promise<string> {
  // Every outbound attempt consumes a reservation, including the single retry.
  for (let attempt = 0; attempt < 2; attempt++) {
    checkCancellation(signal);
    await reserve();
    checkCancellation(signal);
    const attemptSignal = AbortSignal.any([
      AbortSignal.timeout(12000),
      ...(signal ? [signal] : []),
    ]);

    let response: Response;
    try {
      response = await fetcher(
        `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
          signal: attemptSignal,
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: PROMPTS[mode] }] },
            contents: [{ role: 'user', parts: [{ text: JSON.stringify({ writing_to_edit: text }) }] }],
            generationConfig: { temperature: 0.15, maxOutputTokens: 4096 },
          }),
        },
      );
    } catch {
      checkCancellation(signal);
      throw new ApiError(504, 'TIMEOUT', 'The editor took too long to respond. Please try again in a moment.');
    }

    if (response.status === 503 && attempt === 0) {
      await response.body?.cancel();
      await new Promise(resolve => setTimeout(resolve, 350));
      continue;
    }
    if (response.status === 429) {
      throw new ApiError(429, 'QUOTA', 'Our free AI allowance is temporarily busy or exhausted. Please try again later.', 60);
    }
    if (response.status === 401 || response.status === 403) {
      throw new ApiError(503, 'API_KEY', 'The editor is not configured correctly. Please try again later.');
    }
    if (response.status === 400 || response.status === 404) {
      throw new ApiError(503, 'MODEL_CONFIG', 'The configured AI model is unavailable. Please try again later.');
    }
    if (!response.ok) {
      throw new ApiError(503, 'UNAVAILABLE', 'The AI editor is temporarily unavailable. Please try again soon.');
    }

    try {
      const data: unknown = await response.json();
      checkCancellation(signal);
      return extractText(data, text.length);
    } catch (error) {
      if (error instanceof ApiError) throw error;
      checkCancellation(signal);
      if (attemptSignal.aborted) {
        throw new ApiError(504, 'TIMEOUT', 'The editor took too long to respond. Please try again in a moment.');
      }
      return invalidResponse();
    }
  }
  throw new ApiError(503, 'UNAVAILABLE', 'The AI editor is temporarily unavailable.');
}
