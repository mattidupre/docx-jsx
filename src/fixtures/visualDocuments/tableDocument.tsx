import {
  DocumentProvider,
  Stack,
  Table,
  TableCell,
  TableRow,
  Typography,
} from '../../reactComponents';
import { VISUAL_ENTRIES } from './visualText';

/**
 * Light enough to read black text on in every target, and dark enough that a
 * missing `w:shd` or `background-color` shows up as moved pixels.
 */
const ZEBRA_BACKGROUND = '#eeeeee';

const CHAPTERS: ReadonlyArray<string> = [
  'Loomings',
  'The Carpet-Bag',
  'The Spouter-Inn',
  'The Counterpane',
  'Breakfast',
  'The Street',
  'The Chapel',
  'The Pulpit',
  'The Sermon',
  'A Bosom Friend',
];

/**
 * Long enough that the table cannot fit on the page it starts, so both the
 * DOCX header repetition and the pagedjs row-splitting rules are exercised.
 */
const LONG_TABLE_ROW_COUNT = 30;

const LONG_TABLE_ROWS = Array.from(
  { length: LONG_TABLE_ROW_COUNT },
  (_value, index) => ({
    number: index + 1,
    title: CHAPTERS[index % CHAPTERS.length],
    page: (index + 1) * 7,
  }),
);

/**
 * Data tables: borders, column widths, spans, per-cell alignment and a zebra
 * fill, followed by a table long enough to cross a page. Word repeats the
 * header row of the long table and pagedjs cannot, which is the one place the
 * targets are meant to differ.
 */
export function TableDocument() {
  return (
    <DocumentProvider>
      <Stack>
        <h1>Tables</h1>

        <h2>Borders, spans and alignment</h2>
        <Table columnWidths={[3, 2, 1]} cellPadding="6px">
          <TableRow header fontWeight="bold">
            <TableCell>Post</TableCell>
            <TableCell align="center">Station</TableCell>
            <TableCell align="right">Year</TableCell>
          </TableRow>
          <TableRow>
            <TableCell colSpan={3} align="center" background={ZEBRA_BACKGROUND}>
              <Typography fontStyle="italic">Atlantic crossings</Typography>
            </TableCell>
          </TableRow>
          {VISUAL_ENTRIES.map(({ title, detail }, index) => (
            <TableRow key={title}>
              <TableCell
                {...(index % 2 === 1 && { background: ZEBRA_BACKGROUND })}
              >
                {title}
              </TableCell>
              <TableCell
                align="center"
                {...(index % 2 === 1 && { background: ZEBRA_BACKGROUND })}
              >
                {detail}
              </TableCell>
              <TableCell
                align="right"
                {...(index % 2 === 1 && { background: ZEBRA_BACKGROUND })}
              >
                {1841 + index}
              </TableCell>
            </TableRow>
          ))}
        </Table>

        <h2>Row spans and vertical alignment</h2>
        <Table columnWidths={['1.5in', '2in', '2in']} borders={{ size: '2px' }}>
          <TableRow header fontWeight="bold">
            <TableCell>Watch</TableCell>
            <TableCell>Duty</TableCell>
            <TableCell>Relief</TableCell>
          </TableRow>
          <TableRow height="0.6in">
            <TableCell rowSpan={2} verticalAlign="middle">
              First
            </TableCell>
            <TableCell verticalAlign="top">Masthead</TableCell>
            <TableCell verticalAlign="bottom">Queequeg</TableCell>
          </TableRow>
          <TableRow height="0.6in">
            <TableCell verticalAlign="top">Try-works</TableCell>
            <TableCell verticalAlign="bottom">Tashtego</TableCell>
          </TableRow>
        </Table>

        <h2>Borderless, half width, centred</h2>
        <Table borders={false} width={50} align="center" cellPadding="2px">
          <TableRow>
            <TableCell>Length</TableCell>
            <TableCell align="right">143 ft</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>Beam</TableCell>
            <TableCell align="right">27 ft</TableCell>
          </TableRow>
        </Table>

        <h2>A table that crosses a page</h2>
        <Table columnWidths={[1, 6, 2]} cellPadding="3px">
          <TableRow header fontWeight="bold">
            <TableCell align="right">No.</TableCell>
            <TableCell>Chapter</TableCell>
            <TableCell align="right">Page</TableCell>
          </TableRow>
          {LONG_TABLE_ROWS.map(({ number, title, page }) => (
            <TableRow key={number}>
              <TableCell align="right">{number}</TableCell>
              <TableCell>{title}</TableCell>
              <TableCell align="right">{page}</TableCell>
            </TableRow>
          ))}
        </Table>
      </Stack>
    </DocumentProvider>
  );
}
