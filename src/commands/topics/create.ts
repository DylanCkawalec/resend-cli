import { Command, Option } from '@commander-js/extra-typings';
import * as p from '@clack/prompts';
import type { GlobalOpts } from '../../lib/client';
import { requireClient } from '../../lib/client';
import { cancelAndExit } from '../../lib/prompts';
import { createSpinner } from '../../lib/spinner';
import { outputError, outputResult, errorMessage } from '../../lib/output';
import { isInteractive } from '../../lib/tty';

export const createTopicCommand = new Command('create')
  .description('Create a new topic for subscription management')
  .option('--name <name>', 'Topic name (required)')
  .option('--description <description>', 'Description shown to contacts when managing subscriptions')
  .addOption(
    new Option('--default-subscription <mode>', 'Default subscription state for contacts')
      .choices(['opt_in', 'opt_out'] as const)
      .default('opt_in' as const)
  )
  .addHelpText(
    'after',
    `
Topics enable fine-grained subscription management. Contacts can opt in or out of
individual topics. Broadcasts can target only contacts opted into a specific topic.

Example topics: "Product Updates", "Security Alerts", "Weekly Digest".

--default-subscription controls what happens for contacts with no explicit subscription:
  opt_in   Contacts receive broadcasts unless they explicitly opt out (default)
  opt_out  Contacts do NOT receive broadcasts unless they explicitly opt in

Non-interactive: --name is required.

Global options (defined on root):
  --api-key <key>  API key (or set RESEND_API_KEY env var)
  --json           Force JSON output (also auto-enabled when stdout is piped)

Output (--json or piped):
  {"id":"<uuid>"}

Errors (exit code 1):
  {"error":{"message":"<message>","code":"<code>"}}
  Codes: auth_error | missing_name | create_error

Examples:
  $ resend topics create --name "Product Updates"
  $ resend topics create --name "Weekly Digest" --default-subscription opt_out
  $ resend topics create --name "Security Alerts" --description "Critical security notices" --json`
  )
  .action(async (opts, cmd) => {
    const globalOpts = cmd.optsWithGlobals() as GlobalOpts;
    const resend = requireClient(globalOpts);

    let name = opts.name;

    if (!name) {
      if (!isInteractive()) {
        outputError({ message: 'Missing --name flag.', code: 'missing_name' }, { json: globalOpts.json });
      }
      const result = await p.text({
        message: 'Topic name',
        placeholder: 'Product Updates',
        validate: (v) => (!v ? 'Name is required' : undefined),
      });
      if (p.isCancel(result)) cancelAndExit('Cancelled.');
      name = result;
    }

    const spinner = createSpinner('Creating topic...');

    try {
      const { data, error } = await resend.topics.create({
        name: name!,
        defaultSubscription: opts.defaultSubscription,
        ...(opts.description && { description: opts.description }),
      });

      if (error) {
        spinner.fail('Failed to create topic');
        outputError({ message: error.message, code: 'create_error' }, { json: globalOpts.json });
      }

      spinner.stop('Topic created');

      if (!globalOpts.json && isInteractive()) {
        const d = data!;
        console.log(`\nTopic created: ${d.id}`);
      } else {
        outputResult(data!, { json: globalOpts.json });
      }
    } catch (err) {
      spinner.fail('Failed to create topic');
      outputError({ message: errorMessage(err, 'Unknown error'), code: 'create_error' }, { json: globalOpts.json });
    }
  });
