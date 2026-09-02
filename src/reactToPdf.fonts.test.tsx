import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Browser } from 'puppeteer-core';
import type { FontsConfig } from './entities';
import { DocumentProvider, Stack, Typography } from './reactComponents';
import { reactToPdf } from './reactToPdf';
import { closeTestBrowser, launchTestBrowser } from './fixtures/browser';
import { isErrorObject, stringifyErrorObject } from './utils/error';

const MOCK_ASSETS_PATH = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  'fixtures',
  'mockAssets',
);

const CUSTOM_FONT_FAMILY = 'Pacifico';

/**
 * The `docx` source names an installed font, so only the browser source can
 * produce an `@font-face` rule.
 */
const CUSTOM_FONTS: FontsConfig = {
  [CUSTOM_FONT_FAMILY]: {
    fontFaces: [
      {
        fontWeight: '400',
        fontStyle: 'normal',
        sources: [
          {
            documentType: 'web',
            src: `/${CUSTOM_FONT_FAMILY}.ttf`,
            format: 'truetype',
          },
          {
            documentType: 'docx',
            src: 'Calibri',
            format: 'truetype',
          },
        ],
      },
    ],
  },
};

function CustomFontDocument() {
  return (
    <DocumentProvider>
      <Stack>
        <Typography as="p" fontFamily={CUSTOM_FONT_FAMILY}>
          The quick brown fox jumps over the lazy dog.
        </Typography>
      </Stack>
    </DocumentProvider>
  );
}

/**
 * The same document with its fonts declared once on the provider instead of
 * passed to every call that renders it.
 */
function DeclaredFontDocument() {
  return (
    <DocumentProvider fonts={CUSTOM_FONTS}>
      <Stack>
        <Typography as="p" fontFamily={CUSTOM_FONT_FAMILY}>
          The quick brown fox jumps over the lazy dog.
        </Typography>
      </Stack>
    </DocumentProvider>
  );
}

const expectPdfBytes = (result: unknown): Uint8Array => {
  if (isErrorObject(result)) {
    throw new Error(
      `Expected a PDF, received an error: ${stringifyErrorObject(result)}`,
    );
  }
  if (!(result instanceof Uint8Array)) {
    throw new TypeError('Expected a PDF, received a non-binary result.');
  }
  expect(new TextDecoder().decode(result.subarray(0, 5))).toBe('%PDF-');
  return result;
};

describe('reactToPdf with a fonts config', () => {
  let browser: Browser;

  beforeAll(async () => {
    browser = await launchTestBrowser();
  });

  afterAll(async () => {
    await closeTestBrowser(browser);
  });

  it('embeds a configured font without any page stylesheet', async () => {
    const bytes = expectPdfBytes(
      await reactToPdf(CustomFontDocument, {
        browser,
        publicDirectory: MOCK_ASSETS_PATH,
        fonts: CUSTOM_FONTS,
      }),
    );

    // The font is only embedded if the generated `@font-face` rule was
    // registered on the document, served from `publicDirectory` and applied.
    expect(new TextDecoder('latin1').decode(bytes)).toContain(
      CUSTOM_FONT_FAMILY,
    );
  });

  it('does not embed the font when no fonts are configured', async () => {
    const bytes = expectPdfBytes(
      await reactToPdf(CustomFontDocument, {
        browser,
        publicDirectory: MOCK_ASSETS_PATH,
      }),
    );

    expect(new TextDecoder('latin1').decode(bytes)).not.toContain(
      CUSTOM_FONT_FAMILY,
    );
  });

  it('embeds a font declared on DocumentProvider alone', async () => {
    const bytes = expectPdfBytes(
      await reactToPdf(DeclaredFontDocument, {
        browser,
        publicDirectory: MOCK_ASSETS_PATH,
      }),
    );

    expect(new TextDecoder('latin1').decode(bytes)).toContain(
      CUSTOM_FONT_FAMILY,
    );
  });
});
