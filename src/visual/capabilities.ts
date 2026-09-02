import { execFile } from 'node:child_process';
import { existsSync } from 'node:fs';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

export type Capability = {
  readonly available: boolean;
  readonly reason: string;
};

export const PDFTOPPM_PATH = '/opt/homebrew/bin/pdftoppm';

const WORD_PATH = '/Applications/Microsoft Word.app';

/**
 * Tier 2: poppler's `pdftoppm`, used as a second, independent PDF rasteriser.
 * Agreeing with pdfjs on page count and page size is evidence the PDF is
 * well-formed rather than merely readable by the library that wrote it.
 *
 * Baselines are tied to the renderer that produced them (pdfjs and poppler
 * differ by 2-5% on the same PDF), so this tier asserts structure, not pixels.
 */
export const probePdftoppm = (): Capability =>
  existsSync(PDFTOPPM_PATH)
    ? { available: true, reason: `poppler pdftoppm found at ${PDFTOPPM_PATH}` }
    : {
        available: false,
        reason: `poppler (pdftoppm) not installed at ${PDFTOPPM_PATH}`,
      };

/**
 * Tier 3: rasterising a DOCX through Word itself. Kept because it is the only
 * way to see what Word actually does with the emitted file, and because the
 * reason it is unavailable is worth stating out loud rather than rediscovering.
 *
 * Word is only usable if (a) it is installed, (b) Apple Events are permitted
 * (TCC; failure is error -1743) and (c) the build implements the Microsoft Word
 * Suite AppleScript commands. On Word 16.112.2 step (c) fails: property reads
 * answer normally, but every Word Suite *command* returns -1708 ("doesn't
 * understand the ... message"), so `save as` cannot be driven and there is no
 * Word tier. Callers `describe.skipIf` on this and print {@link Capability.reason}.
 *
 * Every `osascript` call gets a hard timeout so a modal Word dialog cannot
 * wedge the test run.
 */
export const probeWord = async (): Promise<Capability> => {
  if (!existsSync(WORD_PATH)) {
    return { available: false, reason: 'Microsoft Word is not installed' };
  }
  const runAppleScript = (script: string) =>
    execFileAsync('/usr/bin/osascript', ['-e', script], { timeout: 10_000 });
  const describeError = (error: unknown): string => {
    if (error instanceof Error) {
      const { stderr } = error as Error & { readonly stderr?: string };
      return (stderr ?? error.message).trim();
    }
    return String(error);
  };
  try {
    await runAppleScript('tell application id "com.microsoft.Word" to get version');
  } catch (error) {
    const message = describeError(error);
    return {
      available: false,
      reason: message.includes('-1743')
        ? 'Apple Events to Word are not authorised (TCC -1743). Grant automation access in System Settings > Privacy & Security > Automation.'
        : `Word did not answer Apple Events: ${message}`,
    };
  }
  try {
    // A Word Suite command that is a harmless no-op when its precondition
    // fails. -1708 means the command is not implemented at all.
    await runAppleScript(
      'tell application id "com.microsoft.Word" to close print preview active document',
    );
    return { available: true, reason: 'Word Suite commands are implemented' };
  } catch (error) {
    const message = describeError(error);
    if (message.includes('-1708')) {
      return {
        available: false,
        reason:
          'This Microsoft Word build does not implement Word Suite AppleScript commands (-1708); docx -> pdf via Word is impossible.',
      };
    }
    // Any other error means the command WAS handled (for example "not in print
    // preview"), which is exactly what this probe is testing for.
    return { available: true, reason: 'Word Suite commands are implemented' };
  }
};
