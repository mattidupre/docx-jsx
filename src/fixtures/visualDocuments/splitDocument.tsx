import {
  DocumentProvider,
  Split,
  Stack,
  TabSplit,
  Typography,
} from '../../reactComponents';
import { VISUAL_ENTRIES, VISUAL_PARAGRAPHS } from './visualText';

/**
 * `Split` (a two-cell row) and `TabSplit` (a right-aligned tab inside one
 * paragraph) side by side. They look nearly identical in CSS and are completely
 * different constructs in Word, which is exactly why they are worth a baseline.
 */
export function SplitDocument() {
  return (
    <DocumentProvider>
      <Stack>
        <h1>Split and TabSplit</h1>

        <h2>Split rows</h2>
        {VISUAL_ENTRIES.map(({ title, detail }) => (
          <Split
            key={`split_${title}`}
            left={<p>{title}</p>}
            right={<p>{detail}</p>}
          />
        ))}

        <h2>Split with prose</h2>
        <Split
          left={<p>{VISUAL_PARAGRAPHS[0]}</p>}
          right={<p>{VISUAL_PARAGRAPHS[2]}</p>}
        />

        <h2>TabSplit rows</h2>
        {VISUAL_ENTRIES.map(({ title, detail }) => (
          <TabSplit
            key={`tab_${title}`}
            left={<Typography fontWeight="bold">{title}</Typography>}
            right={detail}
          />
        ))}

        <h2>TabSplit as a heading</h2>
        <TabSplit as="h3" left="Chapter 1" right="Loomings" />
      </Stack>
    </DocumentProvider>
  );
}
