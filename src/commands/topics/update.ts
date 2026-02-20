import { Command } from '@commander-js/extra-typings';
import type { GlobalOpts } from '../../lib/client';
import { requireClient } from '../../lib/client';
import { createSpinner } from '../../lib/spinner';
import { outputError, outputResult, errorMessage } from '../../lib/output';
import { isInteractive } from '../../lib/tty';

export const updateTopicCommand = new Command('update')
  .description("Update a topic's name or description")
  .argument('<id>', 'Topic UUID')
  .option('--name <name>', 'New topic name')
  .option('--description <description>', 'New description shown to contacts')
  .addHelpText(
    'after',
    `
At least one of --name or --description must be provided to update the topic.

Note: --default-subscription cannot be changed after creation.
To change the default subscription, delete the topic and recreate it.

Global options (defined on root):
  --api-key <key>  API key (or set RESEND_API_KEY env var)
  --json           Force JSON output (also auto-enabled when stdout is piped)

Output (--json or piped):
  {"id":"<uuid>"}

Errors (exit code 1):
  {"error":{"message":"<message>","code":"<code>"}}
  Codes: auth_error | no_changes | update_error

Examples:
  $ resend topics update 78261eea-8f8b-4381-83c6-79fa7120f1cf --name "Security Alerts"
  $ resend topics update 78261eea-8f8b-4381-83c6-79fa7120f1cf --description "Critical notices" --json`
  )
  .action(async (id, opts, cmd) => {
    const globalOpts = cmd.optsWithGlobals() as GlobalOpts;
    const resend = requireClient(globalOpts);

    if (!opts.name && !opts.description) {
      outputError(
        { message: 'Provide at least one option to update: --name or --description.', code: 'no_changes' },
        { json: globalOpts.json }
      );
    }

    const spinner = createSpinner('Updating topic...');

    try {
      const { data, error } = await resend.topics.update({
        id,
        ...(opts.name && { name: opts.name }),
        ...(opts.description && { description: opts.description }),
      });

      if (error) {
        spinner.fail('Failed to update topic');
        outputError({ message: error.message, code: 'update_error' }, { json: globalOpts.json });
      }

      spinner.stop('Topic updated');

      if (!globalOpts.json && isInteractive()) {
        console.log(`Topic updated: ${id}`);
      } else {
        outputResult(data!, { json: globalOpts.json });
      }
    } catch (err) {
      spinner.fail('Failed to update topic');
      outputError({ message: errorMessage(err, 'Unknown error'), code: 'update_error' }, { json: globalOpts.json });
    }
  });
