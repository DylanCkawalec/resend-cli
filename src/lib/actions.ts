import type { Resend } from 'resend';
import type { GlobalOpts } from './client';
import { requireClient } from './client';
import { confirmDelete } from './prompts';
import { withSpinner } from './spinner';
import { outputResult } from './output';
import { isInteractive } from './tty';

/**
 * Shared pattern for all delete commands:
 *   requireClient → confirmDelete (if needed) → withSpinner → if/else output
 */
export async function runDelete(
  id: string,
  skipConfirm: boolean,
  config: {
    confirmMessage: string;
    spinner: { loading: string; success: string; fail: string };
    object: string;
    successMsg: string;
    sdkCall: (resend: Resend) => Promise<{ data: unknown; error: { message: string } | null }>;
  },
  globalOpts: GlobalOpts,
): Promise<void> {
  const resend = requireClient(globalOpts);
  if (!skipConfirm) await confirmDelete(id, config.confirmMessage, globalOpts);
  await withSpinner(config.spinner, () => config.sdkCall(resend), 'delete_error', globalOpts);
  if (!globalOpts.json && isInteractive()) {
    console.log(config.successMsg);
  } else {
    outputResult({ object: config.object, id, deleted: true }, { json: globalOpts.json });
  }
}

/**
 * Shared pattern for all list commands:
 *   requireClient → withSpinner → if/else output
 *
 * Callers pass pagination opts (if any) via the sdkCall closure.
 * The onInteractive callback handles table rendering and pagination hints.
 */
export async function runList<T>(
  config: {
    spinner: { loading: string; success: string; fail: string };
    sdkCall: (resend: Resend) => Promise<{ data: T | null; error: { message: string } | null }>;
    onInteractive: (result: T) => void;
  },
  globalOpts: GlobalOpts,
): Promise<void> {
  const resend = requireClient(globalOpts);
  const result = await withSpinner(
    config.spinner,
    () => config.sdkCall(resend),
    'list_error',
    globalOpts,
  );
  if (!globalOpts.json && isInteractive()) {
    config.onInteractive(result);
  } else {
    outputResult(result, { json: globalOpts.json });
  }
}
