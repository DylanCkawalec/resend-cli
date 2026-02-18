import { Command } from '@commander-js/extra-typings';
import { requireClient } from '../../lib/client';
import { createSpinner } from '../../lib/spinner';
import { outputError, outputResult, errorMessage } from '../../lib/output';
import { isInteractive } from '../../lib/tty';
import { renderDnsRecordsTable, statusIndicator } from './utils';

export const getDomainCommand = new Command('get')
  .description('Retrieve a domain with its DNS records and current verification status')
  .argument('<id>', 'Domain ID')
  .addHelpText(
    'after',
    `
Global options (defined on root):
  --api-key <key>  API key (or set RESEND_API_KEY env var)
  --json           Force JSON output (also auto-enabled when stdout is piped)

Output (--json or piped):
  Full domain object including records array and current status.

Domain status values: not_started | pending | verified | failed | temporary_failure

Errors (exit code 1):
  {"error":{"message":"<message>","code":"<code>"}}
  Codes: auth_error | fetch_error

Examples:
  $ resend domains get 4dd369bc-aa82-4ff3-97de-514ae3000ee0
  $ resend domains get 4dd369bc-aa82-4ff3-97de-514ae3000ee0 --json`
  )
  .action(async (id, _opts, cmd) => {
    const globalOpts = cmd.optsWithGlobals() as { apiKey?: string; json?: boolean };

    const resend = requireClient(globalOpts);

    const spinner = createSpinner('Fetching domain...', 'braille');

    try {
      const { data, error } = await resend.domains.get(id);

      if (error) {
        spinner.fail('Failed to fetch domain');
        outputError({ message: error.message, code: 'fetch_error' }, { json: globalOpts.json });
      }

      spinner.stop('Domain fetched');

      if (!globalOpts.json && isInteractive()) {
        console.log(`\n${data!.name} — ${statusIndicator(data!.status)}`);
        console.log(`ID: ${data!.id}`);
        console.log(`Region: ${data!.region}`);
        console.log(`Created: ${data!.created_at}`);
        if (data!.records.length > 0) {
          console.log('\nDNS Records:');
          console.log(renderDnsRecordsTable(data!.records, data!.name));
        }
      } else {
        outputResult(data, { json: globalOpts.json });
      }
    } catch (err) {
      spinner.fail('Failed to fetch domain');
      outputError(
        { message: errorMessage(err, 'Unknown error'), code: 'fetch_error' },
        { json: globalOpts.json }
      );
    }
  });
