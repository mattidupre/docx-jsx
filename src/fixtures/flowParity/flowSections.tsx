import { Stack } from '../../reactComponents';
import { VISUAL_PARAGRAPHS } from '../visualDocuments/visualText';
import { MARGIN, P } from './shared';

/** S1-S5: line wrapping, line height, paragraph spacing and flow across pages. */
export function FlowSections() {
  return (
    <>
      <Stack margin={MARGIN}>
        <P>S1 wrap, line-height normal</P>
        {VISUAL_PARAGRAPHS.map((text, index) => (
          <P key={index}>{text}</P>
        ))}
      </Stack>
      <Stack margin={MARGIN}>
        <P lineHeight="1.5">S2 wrap, line-height 1.5</P>
        {VISUAL_PARAGRAPHS.map((text, index) => (
          <P key={index} lineHeight="1.5">
            {text}
          </P>
        ))}
      </Stack>
      <Stack margin={MARGIN}>
        <P lineHeight="18pt">S3 line-height 18pt</P>
        {VISUAL_PARAGRAPHS.map((text, index) => (
          <P key={index} lineHeight="18pt">
            {text}
          </P>
        ))}
      </Stack>
      <Stack margin={MARGIN}>
        <P lineHeight="18pt">S4 spacing, 12pt before and after</P>
        {['A', 'B', 'C', 'D', 'E'].map((letter) => (
          <P
            key={letter}
            lineHeight="18pt"
            marginTop="12pt"
            marginBottom="12pt"
          >
            {`Spacing ${letter}`}
          </P>
        ))}
        <P lineHeight="18pt" marginBottom="24pt">
          Spacing F after 24pt
        </P>
        <P lineHeight="18pt" marginTop="6pt">
          Spacing G before 6pt
        </P>
      </Stack>
      <Stack margin={MARGIN}>
        <P lineHeight="18pt">
          S5 flow across pages, 10pt before each paragraph
        </P>
        {Array.from({ length: 5 }, (_, round) =>
          VISUAL_PARAGRAPHS.map((text, index) => (
            <P key={`${round}-${index}`} lineHeight="18pt" marginTop="10pt">
              {`[${round}.${index}] ${text}`}
            </P>
          )),
        )}
      </Stack>
    </>
  );
}
