import { Stack } from '../../reactComponents';
import { VISUAL_PARAGRAPHS } from '../visualDocuments/visualText';
import { MARGIN, P } from './shared';

/**
 * Prose in Merriweather, which Word does not ship: its lines break the same
 * way in Word as in the PDF only if the DOCX embedded the font file.
 */
export function EmbedSections() {
  return (
    <Stack margin={MARGIN}>
      <P fontFamily="Merriweather" lineHeight="18pt">
        E1 embedded Merriweather
      </P>
      {VISUAL_PARAGRAPHS.map((text, index) => (
        <P key={index} fontFamily="Merriweather" lineHeight="18pt">
          {text}
        </P>
      ))}
    </Stack>
  );
}
