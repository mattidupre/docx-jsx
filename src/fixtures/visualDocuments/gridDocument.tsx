import {
  DocumentProvider,
  Grid,
  GridItem,
  Stack,
  Typography,
} from '../../reactComponents';
import { VISUAL_PARAGRAPHS } from './visualText';

const TWELVE_COLUMNS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] as const;

/** Sizes that do not divide the grid evenly, so rows have to wrap. */
const WRAPPING_SIZES = [6, 3, 3, 6, 7, 5] as const;

/**
 * The 12 column grid: a full row of single columns, a row set that has to wrap,
 * and a narrower grid whose `columnCount` is not the default. The DOCX target
 * expresses all of this as borderless tables, so column widths and row breaks
 * are the interesting pixels.
 */
export function GridDocument() {
  return (
    <DocumentProvider>
      <Stack>
        <h1>Grid</h1>

        <h2>Twelve equal columns</h2>
        <Grid columnGap="0.25in">
          {TWELVE_COLUMNS.map((column) => (
            <GridItem key={`equal_${column}`} size={1}>
              <p>{column}</p>
            </GridItem>
          ))}
        </Grid>

        <h2>Wrapping rows</h2>
        <Grid columnGap="0.25in">
          {WRAPPING_SIZES.map((size, index) => (
            <GridItem key={`wrapping_${index}`} size={size}>
              <p>{`Item ${index + 1}: ${size}`}</p>
            </GridItem>
          ))}
        </Grid>

        <h2>Four column grid</h2>
        <Grid columnGap="0.25in" columnCount={4}>
          {[1, 2, 3, 4, 2, 2].map((size, index) => (
            <GridItem key={`four_${index}`} size={size}>
              <Typography as="p">{`Span ${size}`}</Typography>
            </GridItem>
          ))}
        </Grid>

        <h2>Grid with prose</h2>
        <Grid columnGap="0.25in">
          <GridItem size={7}>
            <p>{VISUAL_PARAGRAPHS[0]}</p>
          </GridItem>
          <GridItem size={5}>
            <p>{VISUAL_PARAGRAPHS[3]}</p>
          </GridItem>
        </Grid>
      </Stack>
    </DocumentProvider>
  );
}
