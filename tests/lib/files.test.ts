import { describe, test, expect, spyOn, afterEach } from 'bun:test';
import { writeFileSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
import { expectExit1, mockExitThrow } from '../helpers';

const globalOpts = { json: false, apiKey: undefined };
const jsonOpts = { json: true, apiKey: undefined };

describe('readHtmlFile', () => {
  const tmpFile = join(import.meta.dir, 'tmp-test.html');
  let errorSpy: ReturnType<typeof spyOn> | undefined;
  let exitSpy: ReturnType<typeof spyOn> | undefined;

  afterEach(() => {
    errorSpy?.mockRestore();
    errorSpy = undefined;
    exitSpy?.mockRestore();
    exitSpy = undefined;
    try { unlinkSync(tmpFile); } catch { /* already removed */ }
  });

  test('reads file content and returns it as a string', () => {
    writeFileSync(tmpFile, '<h1>Hello</h1>', 'utf-8');
    const { readHtmlFile } = require('../../src/lib/files');
    const content = readHtmlFile(tmpFile, globalOpts);
    expect(content).toBe('<h1>Hello</h1>');
  });

  test('exits with file_read_error when file does not exist', async () => {
    errorSpy = spyOn(console, 'error').mockImplementation(() => {});
    exitSpy = mockExitThrow();

    const { readHtmlFile } = require('../../src/lib/files');
    await expectExit1(async () => readHtmlFile('/nonexistent/path/file.html', globalOpts));

    const output = errorSpy!.mock.calls.map((c) => c[0]).join(' ');
    expect(output).toContain('file_read_error');
  });

  test('outputs JSON error when json option is true', () => {
    errorSpy = spyOn(console, 'error').mockImplementation(() => {});
    exitSpy = spyOn(process, 'exit').mockImplementation((code?: number) => {
      throw new Error(`exit(${code})`);
    });

    const { readHtmlFile } = require('../../src/lib/files');
    try {
      readHtmlFile('/nonexistent/file.html', jsonOpts);
    } catch {
      // expected exit
    }

    const raw = errorSpy!.mock.calls.map((c) => c[0]).join(' ');
    const parsed = JSON.parse(raw);
    expect(parsed.error.code).toBe('file_read_error');
  });
});

describe('readFile', () => {
  const tmpFile = join(import.meta.dir, 'tmp-test.json');
  let errorSpy: ReturnType<typeof spyOn> | undefined;
  let exitSpy: ReturnType<typeof spyOn> | undefined;

  afterEach(() => {
    errorSpy?.mockRestore();
    errorSpy = undefined;
    exitSpy?.mockRestore();
    exitSpy = undefined;
    try { unlinkSync(tmpFile); } catch { /* already removed */ }
  });

  test('reads file content and returns it as a string', () => {
    writeFileSync(tmpFile, '[{"id":1}]', 'utf-8');
    const { readFile } = require('../../src/lib/files');
    const content = readFile(tmpFile, globalOpts);
    expect(content).toBe('[{"id":1}]');
  });

  test('exits with file_read_error when file does not exist', async () => {
    errorSpy = spyOn(console, 'error').mockImplementation(() => {});
    exitSpy = mockExitThrow();

    const { readFile } = require('../../src/lib/files');
    await expectExit1(async () => readFile('/nonexistent/path/data.json', globalOpts));

    const output = errorSpy!.mock.calls.map((c) => c[0]).join(' ');
    expect(output).toContain('file_read_error');
  });

  test('error message for readFile differs from readHtmlFile', () => {
    errorSpy = spyOn(console, 'error').mockImplementation(() => {});
    exitSpy = spyOn(process, 'exit').mockImplementation((code?: number) => {
      throw new Error(`exit(${code})`);
    });

    const { readFile } = require('../../src/lib/files');
    try {
      readFile('/no/file.json', jsonOpts);
    } catch { /* expected */ }

    const raw = errorSpy!.mock.calls.map((c) => c[0]).join(' ');
    const parsed = JSON.parse(raw);
    expect(parsed.error.message).toContain('Failed to read file:');
    expect(parsed.error.message).not.toContain('HTML');
  });
});
