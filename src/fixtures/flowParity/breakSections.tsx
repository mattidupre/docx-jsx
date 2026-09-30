import { Stack, Typography } from '../../reactComponents';
import { MARGIN, P } from './shared';

const THREE_LINES =
  'Three line paragraph that is long enough to wrap onto a second line and then onto a third line as well, which is what the widow and orphan rules need to act upon here in both targets for this probe.';

const HEADING_BODY =
  'body line one of the section under the heading, wrapping onto a second line so there is more than one line here.';

const Fillers = ({ count, tag }: { count: number; tag: string }) =>
  Array.from({ length: count }, (_, index) => (
    <P key={index} lineHeight="18pt">
      {`${tag} filler ${index + 1}`}
    </P>
  ));

/** T1-T6: widows, orphans, margins at a break and headings near a page bottom. */
export function BreakSections() {
  return (
    <>
      <Stack margin={MARGIN}>
        <P lineHeight="18pt">T1 widow: two lines fit with 9pt to spare</P>
        <Fillers count={32} tag="T1" />
        <P lineHeight="18pt" marginTop="9pt">
          {`T1 TEST ${THREE_LINES}`}
        </P>
        <P lineHeight="18pt">T1 after</P>
      </Stack>
      <Stack margin={MARGIN}>
        <P lineHeight="18pt">T2 orphan: one line fits with 5pt to spare</P>
        <Fillers count={33} tag="T2" />
        <P lineHeight="18pt" marginTop="13pt">
          {`T2 TEST ${THREE_LINES}`}
        </P>
        <P lineHeight="18pt">T2 after</P>
      </Stack>
      <Stack margin={MARGIN}>
        <P lineHeight="18pt">
          T3 natural break before a paragraph with 24pt before
        </P>
        <Fillers count={34} tag="T3" />
        <P lineHeight="18pt" marginTop="24pt">
          T3 TEST pushed to the next page
        </P>
        <P lineHeight="18pt">T3 after</P>
      </Stack>
      <Stack margin={MARGIN}>
        <P lineHeight="18pt" marginTop="24pt">
          T4 TEST first paragraph of a stack with 24pt before
        </P>
      </Stack>
      <Stack margin={MARGIN}>
        <P lineHeight="18pt">T5 plain heading near the page bottom</P>
        <Fillers count={32} tag="T5" />
        <Typography as="h2" fontFamily="Arial" lineHeight="24pt">
          T5 TEST heading
        </Typography>
        <P lineHeight="18pt">{`T5 ${HEADING_BODY}`}</P>
      </Stack>
      <Stack margin={MARGIN}>
        <P lineHeight="18pt">
          T6 heading with breakAfter avoid near the page bottom
        </P>
        <Fillers count={32} tag="T6" />
        <Typography
          as="h2"
          fontFamily="Arial"
          lineHeight="24pt"
          breakAfter="avoid"
        >
          T6 TEST heading
        </Typography>
        <P lineHeight="18pt">{`T6 ${HEADING_BODY}`}</P>
      </Stack>
    </>
  );
}
