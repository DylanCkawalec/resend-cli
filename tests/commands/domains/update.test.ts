import { describe, test, expect, spyOn, afterEach, mock, beforeEach } from 'bun:test';
import { ExitError, setNonInteractive, mockExitThrow } from '../../helpers';

const mockUpdate = mock(async () => ({
  data: { object: 'domain', id: 'test-domain-id' },
  error: null,
}));

mock.module('resend', () => ({
  Resend: class MockResend {
    constructor(public key: string) {}
    domains = { update: mockUpdate };
  },
}));

describe('domains update command', () => {
  const originalEnv = { ...process.env };
  const originalStdinIsTTY = process.stdin.isTTY;
  const originalStdoutIsTTY = process.stdout.isTTY;
  let logSpy: ReturnType<typeof spyOn>;
  let errorSpy: ReturnType<typeof spyOn>;
  let exitSpy: ReturnType<typeof spyOn>;
  let stderrSpy: ReturnType<typeof spyOn>;

  beforeEach(() => {
    process.env.RESEND_API_KEY = 're_test_key';
    mockUpdate.mockClear();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    Object.defineProperty(process.stdin, 'isTTY', { value: originalStdinIsTTY, writable: true });
    Object.defineProperty(process.stdout, 'isTTY', { value: originalStdoutIsTTY, writable: true });
    logSpy?.mockRestore();
    errorSpy?.mockRestore();
    exitSpy?.mockRestore();
    stderrSpy?.mockRestore();
  });

  test('calls SDK update with correct id', async () => {
    setNonInteractive();
    logSpy = spyOn(console, 'log').mockImplementation(() => {});
    stderrSpy = spyOn(process.stderr, 'write').mockImplementation(() => true);

    const { updateDomainCommand } = await import('../../../src/commands/domains/update');
    await updateDomainCommand.parseAsync(['test-domain-id', '--tls', 'enforced'], { from: 'user' });

    expect(mockUpdate).toHaveBeenCalledTimes(1);
    const args = mockUpdate.mock.calls[0][0] as any;
    expect(args.id).toBe('test-domain-id');
    expect(args.tls).toBe('enforced');
  });

  test('passes openTracking=true when --open-tracking is set', async () => {
    setNonInteractive();
    logSpy = spyOn(console, 'log').mockImplementation(() => {});
    stderrSpy = spyOn(process.stderr, 'write').mockImplementation(() => true);

    const { updateDomainCommand } = await import('../../../src/commands/domains/update');
    await updateDomainCommand.parseAsync(['test-domain-id', '--open-tracking'], { from: 'user' });

    const args = mockUpdate.mock.calls[0][0] as any;
    expect(args.openTracking).toBe(true);
  });

  test('passes openTracking=false when --no-open-tracking is set', async () => {
    setNonInteractive();
    logSpy = spyOn(console, 'log').mockImplementation(() => {});
    stderrSpy = spyOn(process.stderr, 'write').mockImplementation(() => true);

    const { updateDomainCommand } = await import('../../../src/commands/domains/update');
    await updateDomainCommand.parseAsync(['test-domain-id', '--no-open-tracking'], { from: 'user' });

    const args = mockUpdate.mock.calls[0][0] as any;
    expect(args.openTracking).toBe(false);
  });

  test('does not include tracking keys in payload when no tracking flags are passed', async () => {
    setNonInteractive();
    logSpy = spyOn(console, 'log').mockImplementation(() => {});
    stderrSpy = spyOn(process.stderr, 'write').mockImplementation(() => true);

    const { updateDomainCommand } = await import('../../../src/commands/domains/update');
    await updateDomainCommand.parseAsync(['test-domain-id', '--tls', 'enforced'], { from: 'user' });

    const args = mockUpdate.mock.calls[0][0] as any;
    expect(args.openTracking).toBeUndefined();
    expect(args.clickTracking).toBeUndefined();
  });

  test('passes clickTracking=true when --click-tracking is set', async () => {
    setNonInteractive();
    logSpy = spyOn(console, 'log').mockImplementation(() => {});
    stderrSpy = spyOn(process.stderr, 'write').mockImplementation(() => true);

    const { updateDomainCommand } = await import('../../../src/commands/domains/update');
    await updateDomainCommand.parseAsync(['test-domain-id', '--click-tracking'], { from: 'user' });

    const args = mockUpdate.mock.calls[0][0] as any;
    expect(args.clickTracking).toBe(true);
  });

  test('passes clickTracking=false when --no-click-tracking is set', async () => {
    setNonInteractive();
    logSpy = spyOn(console, 'log').mockImplementation(() => {});
    stderrSpy = spyOn(process.stderr, 'write').mockImplementation(() => true);

    const { updateDomainCommand } = await import('../../../src/commands/domains/update');
    await updateDomainCommand.parseAsync(['test-domain-id', '--no-click-tracking'], { from: 'user' });

    const args = mockUpdate.mock.calls[0][0] as any;
    expect(args.clickTracking).toBe(false);
  });

  test('errors with no_changes when no update flags are provided', async () => {
    setNonInteractive();
    errorSpy = spyOn(console, 'error').mockImplementation(() => {});
    exitSpy = mockExitThrow();

    const { updateDomainCommand } = await import('../../../src/commands/domains/update');
    try {
      await updateDomainCommand.parseAsync(['test-domain-id'], { from: 'user' });
      expect(true).toBe(false);
    } catch (err) {
      expect(err).toBeInstanceOf(ExitError);
      expect((err as ExitError).code).toBe(1);
    }

    const output = errorSpy.mock.calls.map((c) => c[0]).join(' ');
    expect(output).toContain('no_changes');
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  test('outputs domain JSON on success', async () => {
    setNonInteractive();
    logSpy = spyOn(console, 'log').mockImplementation(() => {});
    stderrSpy = spyOn(process.stderr, 'write').mockImplementation(() => true);

    const { updateDomainCommand } = await import('../../../src/commands/domains/update');
    await updateDomainCommand.parseAsync(['test-domain-id', '--tls', 'opportunistic'], { from: 'user' });

    const output = logSpy.mock.calls[0][0] as string;
    const parsed = JSON.parse(output);
    expect(parsed.object).toBe('domain');
    expect(parsed.id).toBe('test-domain-id');
  });

  test('errors with auth_error when no API key', async () => {
    setNonInteractive();
    delete process.env.RESEND_API_KEY;
    process.env.XDG_CONFIG_HOME = '/tmp/nonexistent-resend';
    errorSpy = spyOn(console, 'error').mockImplementation(() => {});
    exitSpy = mockExitThrow();

    const { updateDomainCommand } = await import('../../../src/commands/domains/update');
    try {
      await updateDomainCommand.parseAsync(['test-domain-id', '--tls', 'enforced'], { from: 'user' });
      expect(true).toBe(false);
    } catch (err) {
      expect(err).toBeInstanceOf(ExitError);
      expect((err as ExitError).code).toBe(1);
    }

    const output = errorSpy.mock.calls.map((c) => c[0]).join(' ');
    expect(output).toContain('auth_error');
  });

  test('errors with update_error when SDK returns an error', async () => {
    setNonInteractive();
    mockUpdate.mockResolvedValueOnce({ data: null, error: { message: 'Domain not found', name: 'not_found' } } as any);
    errorSpy = spyOn(console, 'error').mockImplementation(() => {});
    stderrSpy = spyOn(process.stderr, 'write').mockImplementation(() => true);
    exitSpy = mockExitThrow();

    const { updateDomainCommand } = await import('../../../src/commands/domains/update');
    try {
      await updateDomainCommand.parseAsync(['test-domain-id', '--tls', 'enforced'], { from: 'user' });
      expect(true).toBe(false);
    } catch (err) {
      expect(err).toBeInstanceOf(ExitError);
      expect((err as ExitError).code).toBe(1);
    }

    const output = errorSpy.mock.calls.map((c) => c[0]).join(' ');
    expect(output).toContain('update_error');
  });
});
