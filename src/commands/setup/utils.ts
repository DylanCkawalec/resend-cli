import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname } from 'node:path';

/**
 * Read an existing JSON config, apply `merge`, write back.
 * Creates the parent directory if it doesn't exist.
 * If the file doesn't exist, starts from {}.
 * Callers wrap in try/catch and call outputError on failure.
 */
export function mergeJsonConfig(
  filePath: string,
  merge: (existing: Record<string, unknown>) => Record<string, unknown>,
): void {
  let existing: Record<string, unknown> = {};
  if (existsSync(filePath)) {
    try {
      existing = JSON.parse(readFileSync(filePath, 'utf8')) as Record<string, unknown>;
    } catch {
      // Malformed JSON — start fresh rather than error
      existing = {};
    }
  }
  const updated = merge(existing);
  mkdirSync(dirname(filePath), { recursive: true });
  writeFileSync(filePath, JSON.stringify(updated, null, 2) + '\n', 'utf8');
}
