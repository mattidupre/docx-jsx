import type { ComponentProps } from 'react';
import {
  DocumentProvider,
  Grid,
  GridItem,
  Stack,
  Typography,
} from '../../reactComponents';
import type { FontsConfig } from '../../entities';
import { VISUAL_PARAGRAPHS } from './visualText';

/**
 * Trimming and `capHeight` need the metrics of the font file, so the fixture
 * brings Merriweather from the mock assets. The face has no `docx` source, so
 * the DOCX embeds the file and its lines are set in the same font.
 */
export const TRIM_FONTS: FontsConfig = {
  Merriweather: {
    fontFaces: [
      {
        fontWeight: '400',
        fontStyle: 'normal',
        sources: [{ src: '/Merriweather-Regular.ttf', format: 'truetype' }],
      },
    ],
  },
};

/**
 * The margin that keeps trimmed 11pt text on an even 18pt rhythm: one line
 * less Merriweather's capitals (11 × 743 / 1000 = 8.173pt), so the baselines
 * of consecutive paragraphs are 18pt apart however long each one is.
 */
const RHYTHM = '9.827pt';

type TypographyProps = ComponentProps<typeof Typography>;

const Heading = (props: TypographyProps) => (
  <Typography as="p" fontWeight="normal" marginTop="0pt" {...props} />
);

const Body = (props: TypographyProps) => (
  <Typography as="p" marginTop="0pt" marginBottom={RHYTHM} {...props} />
);

/**
 * Trimmed text (`textBoxTrim`) and text sized by its capitals (`capHeight`).
 * The document's body text is trimmed, so a margin is the space between the
 * text of two paragraphs. The first page is an even rhythm of paragraphs under
 * a heading sized by its capitals; the second sets trimmed and untrimmed text
 * side by side, where the trimmed column starts at the top of its capitals and
 * the untrimmed one keeps the space its line box adds above and below.
 */
export function TrimDocument() {
  return (
    <DocumentProvider
      fonts={TRIM_FONTS}
      defaultTypography={{
        fontFamily: 'Merriweather',
        fontSize: '11pt',
        lineHeight: '18pt',
        textBoxTrim: 'both',
      }}
    >
      <Stack>
        <Heading capHeight="20pt" lineHeight="28pt" marginBottom="18pt">
          Trimmed rhythm
        </Heading>
        {VISUAL_PARAGRAPHS.map((text, index) => (
          <Body key={index}>{text}</Body>
        ))}
        <Heading capHeight="10pt" lineHeight="18pt" marginBottom="18pt">
          A smaller heading, then 18pt between the text of each paragraph
        </Heading>
        {VISUAL_PARAGRAPHS.slice(0, 3).map((text, index) => (
          <Body key={index} marginBottom="18pt">
            {text}
          </Body>
        ))}
      </Stack>
      <Stack>
        <Heading capHeight="14pt" lineHeight="24pt" marginBottom="18pt">
          Trimmed beside untrimmed
        </Heading>
        <Grid columnGap="0.375in">
          <GridItem size={6}>
            <Body>Trimmed to the capitals of its first line.</Body>
            <Body>{VISUAL_PARAGRAPHS[1]}</Body>
            <Body>{VISUAL_PARAGRAPHS[2]}</Body>
          </GridItem>
          <GridItem size={6}>
            <Body textBoxTrim="none" marginBottom="0pt">
              Untrimmed, with its whole line box.
            </Body>
            <Body textBoxTrim="none" marginBottom="0pt">
              {VISUAL_PARAGRAPHS[1]}
            </Body>
            <Body textBoxTrim="none" marginBottom="0pt">
              {VISUAL_PARAGRAPHS[2]}
            </Body>
          </GridItem>
        </Grid>
        <Body marginTop="18pt">
          Trimmed text after the grid, 18pt below its last row.
        </Body>
      </Stack>
    </DocumentProvider>
  );
}
