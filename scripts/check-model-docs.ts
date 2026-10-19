import { mkdir, writeFile } from 'node:fs/promises';
const requested = ['gemini-3.8-flash', 'gemini-3.6-flash'];
const sources = {
 thinking: 'https://ai.google.dev/gemini-api/docs/thinking?hl=en',
 flash38: 'https://ai.google.dev/gemini-api/docs/models/gemini-3.8-flash?hl=en',
 flash36: 'https://ai.google.dev/gemini-api/docs/models/gemini-3.6-flash?hl=en',
 models: 'https://ai.google.dev/gemini-api/docs/models?hl=en',
 pricing: 'https://ai.google.dev/gemini-api/docs/pricing?hl=en',
 terms: 'https://ai.google.dev/gemini-api/terms?hl=en',
};
await mkdir('reports/model-docs', { recursive: true });
const results: Record<string, unknown> = {};
for (const [name, url] of Object.entries(sources)) {
 try {
  const response = await fetch(url, { signal: AbortSignal.timeout(20000) });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const html = await response.text();
  const text = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;|&#160;/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
  const modelIds = [...new Set(html.match(/gemini-[0-9][a-zA-Z0-9.-]*/g) ?? [])].sort();
  const needles = [...requested, 'Gemini 3.8', 'Gemini 3.6', 'Gemini 3.5', 'Gemini 3.1 Flash', 'Gemini 2.5 Flash', 'Unpaid Services', 'improve our products', 'thinkingLevel', 'temperature', 'minimal', 'human reviewers'];
  const excerpts = needles.map(needle => { const i = text.toLowerCase().indexOf(needle.toLowerCase()); return { needle, found: i >= 0, excerpt: i >= 0 ? text.slice(Math.max(0, i - 80), i + 2200) : null }; });
  results[name] = { url: response.url, retrievedAt: new Date().toISOString(), requested: Object.fromEntries(requested.map(m=>[m, html.includes(m)])), modelIds, excerpts };
  await writeFile(`reports/model-docs/${name}.html`, html);
  await writeFile(`reports/model-docs/${name}.txt`, text);
 } catch (error) {
  results[name] = { url, error: error instanceof Error ? error.message : 'Unknown failure' };
 }
}
await writeFile('reports/model-docs/summary.json', JSON.stringify(results, null, 2));
console.log(JSON.stringify(results, null, 2));
