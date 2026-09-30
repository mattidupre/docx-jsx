import { Stack } from '../../reactComponents';
import { VISUAL_PARAGRAPHS } from '../visualDocuments/visualText';
import { MARGIN, P } from './shared';

type TypographyProps = Parameters<typeof P>[0];

/**
 * A trimmed paragraph: 12pt Arial on an 18pt line, its box cut to the cap
 * height of its first line and the baseline of its last.
 */
const T = (props: TypographyProps) => (
  <P lineHeight="18pt" textBoxTrim="both" {...props} />
);

/**
 * The margin that keeps a trimmed text on an even 18pt rhythm: one line less
 * Arial's 12pt capitals (12 × 1467 / 2048 = 8.5957pt). The DOCX writes it as
 * no spacing at all.
 */
const RHYTHM = '9.4043pt';

/**
 * U1-U4: trimmed text (`textBoxTrim: 'both'`). Word cannot trim, so the DOCX
 * moves the trimmed space into the paragraph spacing and the PDF places the
 * first line of a page where Word draws it (`trim` rules of the `word`
 * profile). The baselines of both should agree line for line.
 */
export function TrimSections() {
  return (
    <>
      <Stack margin={MARGIN}>
        <T marginBottom={RHYTHM}>U1 trimmed, even rhythm across pages</T>
        {Array.from({ length: 3 }, (_, round) =>
          VISUAL_PARAGRAPHS.map((text, index) => (
            <T key={`${round}-${index}`} marginBottom={RHYTHM}>
              {`[${round}.${index}] ${text}`}
            </T>
          )),
        )}
      </Stack>
      <Stack margin={MARGIN}>
        <T marginTop="24pt" marginBottom="12pt">
          U2 trimmed, 24pt above the first, 12pt between
        </T>
        <T capHeight="14pt" lineHeight="24pt" marginBottom="12pt">
          U2 heading with 14pt capitals
        </T>
        {VISUAL_PARAGRAPHS.map((text, index) => (
          <T key={index} marginBottom="12pt">
            {text}
          </T>
        ))}
      </Stack>
      <Stack margin={MARGIN}>
        <T marginBottom="10pt">U3 trimmed and untrimmed, 10pt between</T>
        {VISUAL_PARAGRAPHS.map((text, index) =>
          index % 2 === 0 ? (
            <T key={index} marginBottom="10pt">
              {text}
            </T>
          ) : (
            <P key={index} lineHeight="18pt" marginBottom="10pt">
              {text}
            </P>
          ),
        )}
      </Stack>
      <Stack margin={MARGIN}>
        <T marginBottom={RHYTHM}>
          U4 trimmed, filling to the bottom of the page
        </T>
        {Array.from({ length: 40 }, (_, index) => (
          <T key={index} marginBottom={RHYTHM}>
            {`U4 line ${index + 1}`}
          </T>
        ))}
      </Stack>
    </>
  );
}
