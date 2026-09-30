import { DocumentProvider, Stack, Typography } from '../../reactComponents';
import type { FontFace, FontsConfig } from '../../entities';
import { VISUAL_PARAGRAPHS } from './visualText';

const regularFace = (file: string): FontFace => ({
  fontWeight: '400',
  fontStyle: 'normal',
  sources: [{ src: `/${file}`, format: 'truetype' }],
});

/**
 * Fonts Word does not ship, with no `docx` source: the DOCX embeds their
 * files, so it sets the text in them wherever it is opened.
 */
export const EMBEDDED_FONTS: FontsConfig = {
  Merriweather: { fontFaces: [regularFace('Merriweather-Regular.ttf')] },
  Pacifico: { fontFaces: [regularFace('Pacifico.ttf')] },
  Sevillana: { fontFaces: [regularFace('Sevillana.ttf')] },
};

const FAMILIES = ['Merriweather', 'Pacifico', 'Sevillana'] as const;

/**
 * Text in three embedded fonts and in the default serif, one paragraph each,
 * then a paragraph that changes font mid-line. Every font has to look
 * different from the default, in the PDF and (where it reads them) the DOCX.
 */
export function EmbeddedFontsDocument() {
  return (
    <DocumentProvider fonts={EMBEDDED_FONTS}>
      <Stack>
        <h1>Embedded fonts</h1>
        <Typography as="p">
          {`Default serif: ${VISUAL_PARAGRAPHS[0]}`}
        </Typography>
        {FAMILIES.map((fontFamily, index) => (
          <Typography key={fontFamily} as="p" fontFamily={fontFamily}>
            {`${fontFamily}: ${VISUAL_PARAGRAPHS[index + 1]}`}
          </Typography>
        ))}
        <Typography as="p">
          Mixed in one line:{' '}
          <Typography fontFamily="Merriweather">Merriweather</Typography>,{' '}
          <Typography fontFamily="Pacifico">Pacifico</Typography>,{' '}
          <Typography fontFamily="Sevillana">Sevillana</Typography> and back to
          the default serif.
        </Typography>
      </Stack>
    </DocumentProvider>
  );
}
