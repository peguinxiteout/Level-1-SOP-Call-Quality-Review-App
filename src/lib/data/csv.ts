/**
 * Thin fetch + Papa Parse wrapper for the CSVs under /data/output. Every ported
 * calculation in executiveStoryCalculations.ts reads values through
 * toNumberOrNaN, so rows are parsed as strings (header: true, no
 * dynamicTyping) - the calc module handles numeric coercion itself.
 */
import Papa from 'papaparse';

export class CsvNotFoundError extends Error {
  readonly path: string;

  constructor(path: string) {
    super(`CSV not found: ${path}`);
    this.name = 'CsvNotFoundError';
    this.path = path;
  }
}

/**
 * True if `text` looks like an HTML document rather than CSV. Guards against
 * the dev server's SPA history-fallback middleware, which answers a request
 * for a path that doesn't match any real static file with HTTP 200 and
 * `index.html` - not a 404 - so a missing/mistyped per-call path is
 * otherwise indistinguishable from a real 200 and gets silently parsed as
 * garbage CSV rows instead of failing.
 */
function looksLikeHtml(text: string): boolean {
  return /^\s*(<!doctype html|<html)/i.test(text);
}

/** Fetches and parses a CSV. Throws CsvNotFoundError on a 404, or on a 200 that isn't actually CSV (see looksLikeHtml). */
export async function fetchCsv<T = Record<string, unknown>>(path: string): Promise<T[]> {
  const response = await fetch(path);
  if (response.status === 404) {
    throw new CsvNotFoundError(path);
  }
  if (!response.ok) {
    throw new Error(`Failed to fetch ${path}: ${response.status} ${response.statusText}`);
  }
  const contentType = response.headers.get('content-type') ?? '';
  const text = await response.text();
  if (contentType.includes('html') || looksLikeHtml(text)) {
    throw new CsvNotFoundError(path);
  }
  if (!text.trim()) {
    return [];
  }
  const result = Papa.parse<T>(text, {
    header: true,
    skipEmptyLines: true,
  });
  return result.data;
}

/** Like fetchCsv, but resolves to `[]` instead of throwing on a 404 or empty file. */
export async function fetchCsvOrEmpty<T = Record<string, unknown>>(path: string): Promise<T[]> {
  try {
    return await fetchCsv<T>(path);
  } catch (error) {
    if (error instanceof CsvNotFoundError) return [];
    throw error;
  }
}
