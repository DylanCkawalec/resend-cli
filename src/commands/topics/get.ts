import { Command } from '@commander-js/extra-typings';
import type { GlobalOpts } from '../../lib/client';
import { requireClient } from '../../lib/client';
import { createSpinner } from '../../lib/spinner';
import { outputError, outputResult, errorMessage } from '../../lib/output';
import { isInteractive } from '../../lib/tty';

export const getTopicCommand = new Command('get')
  .description('Retrieve a topic by ID')
  .argument('<id>', 'Topic UUID')
  .addHelpText(
    'after',
    `
Global options (defined on root):
  --api-key <key>  API key (or set RESEND_API_KEY env var)
  --json           Force JSON output (also auto-enabled when stdout is piped)

Output (--json or piped):
  {"id":"<uuid>","name":"<name>","description":"<desc>","default_subscription":"opt_in|opt_out","created_at":"<iso-date>"}

Errors (exit code 1):
  {"error":{"message":"<message>","code":"<code>"}}
  Codes: auth_error | fetch_error

Examples:
  $ resend topics get 78261eea-8f8b-4381-83c6-79fa7120f1cf
  $ resend topics get 78261eea-8f8b-4381-83c6-79fa7120f1cf --json`
  )
  .action(async (id, _opts, cmd) => {
    const globalOpts = cmd.optsWithGlobals() as GlobalOpts;
    const resend = requireClient(globalOpts);

    const spinner = createSpinner('Fetching topic...');

    try {
      const { data, error } = await resend.topics.get(id);

      if (error) {
        spinner.fail('Failed to fetch topic');
        outputError({ message: error.message, code: 'fetch_error' }, { json: globalOpts.json });
      }

      spinner.stop('Topic fetched');

      if (!globalOpts.json && isInteractive()) {
        const d = data!;
        console.log(`\n${d.name}`);
        console.log(`ID: ${d.id}`);
        if (d.description) console.log(`Description: ${d.description}`);
        console.log(`Default subscription: ${d.default_subscription}`);
        console.log(`Created: ${d.created_at}`);
      } else {
        outputResult(data!, { json: globalOpts.json });
      }
    } catch (err) {
      spinner.fail('Failed to fetch topic');
      outputError({ message: errorMessage(err, 'Unknown error'), code: 'fetch_error' }, { json: globalOpts.json });
    }
  });
