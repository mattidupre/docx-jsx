import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import type { FontMetrics, FontsConfig } from '../entities';
import { DocumentProvider, Stack } from '../reactComponents';
import { reactToHtml } from './reactToHtml';
import { resolveDocumentFonts, resolveFontMetrics } from './documentFonts';

const MOCK_ASSETS_PATH = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  'fixtures',
  'mockAssets',
);

const MERRIWEATHER_METRICS: FontMetrics = {
  unitsPerEm: 1000,
  ascent: 984,
  descent: -273,
  lineGap: 0,
  capHeight: 743,
};

const fontsWith = (src: string, metrics?: FontMetrics): FontsConfig => ({
  Merriweather: {
    fontFaces: [
      {
        fontWeight: '400',
        sources: [
          { documentType: 'pdf', src, format: 'truetype' },
          { documentType: 'docx', src: 'Cambria', format: 'truetype' },
        ],
        ...(metrics && { metrics }),
      },
    ],
  },
});

const metricsOf = (fonts: undefined | FontsConfig) =>
  fonts?.['Merriweather'].fontFaces[0].metrics;

describe('resolveFontMetrics', () => {
  it('reads the metrics of a face from its font file', async () => {
    const fonts = await resolveFontMetrics(
      fontsWith('/Merriweather-Regular.ttf'),
      { publicDirectory: MOCK_ASSETS_PATH },
    );

    expect(metricsOf(fonts)).toEqual(MERRIWEATHER_METRICS);
    // Plain data, so the config still travels as JSON.
    expect(JSON.parse(JSON.stringify(fonts))).toEqual(fonts);
  });

  it('keeps metrics a face declares', async () => {
    const declared = { ...MERRIWEATHER_METRICS, capHeight: 700 };
    const fonts = await resolveFontMetrics(
      fontsWith('/missing.ttf', declared),
      {
        publicDirectory: MOCK_ASSETS_PATH,
      },
    );

    expect(metricsOf(fonts)).toEqual(declared);
  });

  it('leaves a face whose file cannot be found without metrics', async () => {
    const fonts = await resolveFontMetrics(fontsWith('/missing.ttf'), {
      publicDirectory: MOCK_ASSETS_PATH,
    });

    expect(metricsOf(fonts)).toBe(undefined);
  });
});

describe('resolveDocumentFonts', () => {
  const html = reactToHtml(
    () => (
      <DocumentProvider fonts={fontsWith('/Merriweather-Regular.ttf')}>
        <Stack>
          <p>Body</p>
        </Stack>
      </DocumentProvider>
    ),
    'pdf',
  );

  it('reads the fonts declared on the document', async () => {
    const fonts = await resolveDocumentFonts(html, {
      publicDirectory: MOCK_ASSETS_PATH,
    });

    expect(metricsOf(fonts)).toEqual(MERRIWEATHER_METRICS);
  });

  it('prefers the fonts the call gives', async () => {
    const fonts = await resolveDocumentFonts(html, {
      fonts: fontsWith('/missing.ttf'),
      publicDirectory: MOCK_ASSETS_PATH,
    });

    expect(metricsOf(fonts)).toBe(undefined);
  });
});
