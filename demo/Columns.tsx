import {
  DocumentProvider,
  BreakAvoid,
  Break,
  Stack,
} from '../src/reactComponents';
import { LoremIpsum } from './lib/LoremIpsum';

export function Document() {
  return (
    <DocumentProvider>
      <Stack>
        <h1>Two Columns</h1>
      </Stack>
      <Stack columns={{ columnCount: 2, columnGap: '0.5in' }} continuous>
        <LoremIpsum />
        <LoremIpsum />
        <LoremIpsum />
        <LoremIpsum />
        <LoremIpsum />
      </Stack>
      <Stack>
        <h1>Three Columns</h1>
      </Stack>
      <Stack columns={{ columnCount: 3, columnGap: '0.5in' }} continuous>
        <LoremIpsum />
        <LoremIpsum />
        <LoremIpsum />
        <LoremIpsum />
        <LoremIpsum />
        <LoremIpsum />
        <LoremIpsum />
        <LoremIpsum />
      </Stack>
      <Stack>
        <h1>Breaks</h1>
      </Stack>
      <Stack columns={{ columnCount: 3, columnGap: '0.5in' }} continuous>
        <BreakAvoid>
          <p>{'<BreakAvoid>'}</p>
          <LoremIpsum />
          <LoremIpsum />
          <LoremIpsum />
          <p>{'</ BreakAvoid>'}</p>
        </BreakAvoid>
        <LoremIpsum />
        <p>{'<Break />'}</p>
        <Break />
        <LoremIpsum />
      </Stack>
    </DocumentProvider>
  );
}
