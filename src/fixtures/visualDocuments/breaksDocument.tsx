import { Break, BreakAvoid, DocumentProvider, Stack } from '../../reactComponents';
import { VISUAL_PARAGRAPHS } from './visualText';

const Prose = ({ count }: { count: number }) => (
  <>
    {VISUAL_PARAGRAPHS.slice(0, count).map((paragraph, index) => (
      <p key={`prose_${index}`}>{paragraph}</p>
    ))}
  </>
);

/**
 * Explicit breaks and keep-together groups. Page count is the assertion that
 * matters here: a regression in break handling shows up as a page appearing or
 * disappearing long before it shows up as moved pixels.
 */
export function BreaksDocument() {
  return (
    <DocumentProvider>
      <Stack>
        <h1>Explicit break</h1>
        <Prose count={2} />
        <Break />
        <h2>After the break</h2>
        <Prose count={2} />
      </Stack>
      <Stack>
        <h1>Keep together</h1>
        <Prose count={3} />
        <BreakAvoid>
          <h2>This group may not be split</h2>
          <Prose count={3} />
        </BreakAvoid>
        <BreakAvoid after>
          <h2>This group keeps with the next</h2>
          <Prose count={1} />
        </BreakAvoid>
        <BreakAvoid>
          <h2>Which is this one</h2>
          <Prose count={1} />
        </BreakAvoid>
      </Stack>
    </DocumentProvider>
  );
}
