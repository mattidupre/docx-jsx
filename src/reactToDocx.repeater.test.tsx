import type { ReactElement } from 'react';
import { describe, expect, it } from 'vitest';
import { reactToHtml } from './lib/reactToHtml';
import { reactToDocx } from './reactToDocx';
import {
  DocumentProvider,
  Stack,
  Repeater,
  Typography,
  Table,
  TableRow,
  TableCell,
  List,
  ListItem,
  BreakAvoid,
  Grid,
  GridItem,
  Split,
} from './reactComponents';
import {
  attribute,
  childrenOf,
  findAll,
  inspectDocx,
  tagNameOf,
  textOf,
} from './fixtures/docxInspect';

const items = [
  { id: 'one', text: 'First' },
  { id: 'two', text: 'Second' },
];
const document = (content: ReactElement) => {
  function RepeaterDocument() {
    return (
      <DocumentProvider>
        <Stack>{content}</Stack>
      </DocumentProvider>
    );
  }
  return RepeaterDocument;
};
const blocks = (
  <Repeater name="updates" items={items} getKey={(item) => item.id}>
    {(item, index) => (
      <Typography as="p">
        {index + 1}: {item.text}
      </Typography>
    )}
  </Repeater>
);

const repeatedRows = (span = 1) => (
  <Table columnWidths={[2, 1]}>
    <TableRow header>
      <TableCell>Label</TableCell>
      <TableCell>Value</TableCell>
    </TableRow>
    <Repeater name="rows" mode="rows" items={items} getKey={(item) => item.id}>
      {(item) => (
        <TableRow keepTogether>
          <TableCell rowSpan={span}>{item.text}</TableCell>
          <TableCell>Value</TableCell>
        </TableRow>
      )}
    </Repeater>
  </Table>
);

describe('Repeater', () => {
  it('loops typed items and indexes in every React rendering context', () => {
    for (const target of ['web', 'pdf', 'docx'] as const) {
      const html = reactToHtml(document(blocks), target);
      expect(html).toContain('1: First');
      expect(html).toContain('2: Second');
      expect(html.indexOf('First')).toBeLessThan(html.indexOf('Second'));
    }
  });

  it('renders real rows in tbody, with a separate fixed header', () => {
    const html = reactToHtml(document(repeatedRows()), 'web');
    const body = html.split('<tbody>')[1].split('</tbody>')[0];
    expect(body.match(/<tr\b/g)).toHaveLength(2);
    expect(body).not.toContain('<div');
    expect(html).toContain('<thead><tr');
  });

  it('writes native block repeating sections in DOCX and DOTX', async () => {
    for (const fileType of ['docx', 'dotx'] as const) {
      const archive = await inspectDocx(
        await reactToDocx(document(blocks), { fileType }),
      );
      expect(findAll(archive.document, 'w15:repeatingSection')).toHaveLength(1);
      expect(
        findAll(archive.document, 'w15:repeatingSectionItem'),
      ).toHaveLength(2);
      const controls = findAll(archive.document, 'w:sdt');
      const content = findAll(controls[0], 'w:sdtContent')[0];
      expect(childrenOf(content).map(tagNameOf)).toEqual(['w:sdt', 'w:sdt']);
      expect(textOf(controls[1])).toBe('1: First');
      expect(textOf(controls[2])).toBe('2: Second');
      expect(attribute(findAll(controls[0], 'w:tag')[0], 'w:val')).toBe(
        'updates',
      );
      const ids = findAll(archive.document, 'w:id').map((node) =>
        attribute(node, 'w:val'),
      );
      expect(new Set(ids).size).toBe(ids.length);
    }
  });

  it('wraps only body rows and retains grid widths and fixed headers', async () => {
    const archive = await inspectDocx(
      await reactToDocx(document(repeatedRows()), {}),
    );
    const table = findAll(archive.document, 'w:tbl')[0];
    expect(childrenOf(table).map(tagNameOf)).toEqual([
      'w:tblPr',
      'w:tblGrid',
      'w:tr',
      'w:sdt',
    ]);
    expect(findAll(table, 'w:tr')).toHaveLength(3);
    expect(findAll(table, 'w:tblHeader')).toHaveLength(1);
    expect(
      findAll(table, 'w:gridCol').map((node) => attribute(node, 'w:w')),
    ).toEqual(['7200', '3600']);
    expect(findAll(table, 'w15:repeatingSectionItem')).toHaveLength(2);
    expect(findAll(table, 'w:cantSplit')).toHaveLength(3);
  });

  it('supports nested block and row loops without leaking row metadata into nested tables', async () => {
    const nested = (
      <Repeater name="outer" items={items} getKey={(item) => item.id}>
        {(item) => (
          <>
            <Typography as="h2">{item.text}</Typography>
            <Table>
              <Repeater
                name="innerRows"
                mode="rows"
                items={[item]}
                getKey={(row) => row.id}
              >
                {(row) => (
                  <TableRow>
                    <TableCell>
                      <Repeater
                        name="cell"
                        items={[row]}
                        getKey={(cell) => cell.id}
                      >
                        {(cell) => (
                          <>
                            <Typography as="p">{cell.text}</Typography>
                            <Table>
                              <TableRow>
                                <TableCell>Nested table</TableCell>
                              </TableRow>
                            </Table>
                          </>
                        )}
                      </Repeater>
                    </TableCell>
                  </TableRow>
                )}
              </Repeater>
            </Table>
          </>
        )}
      </Repeater>
    );
    const archive = await inspectDocx(await reactToDocx(document(nested), {}));
    expect(findAll(archive.document, 'w15:repeatingSection')).toHaveLength(5);
    expect(findAll(archive.document, 'w15:repeatingSectionItem')).toHaveLength(
      6,
    );
    const ids = findAll(archive.document, 'w:id').map((node) =>
      attribute(node, 'w:val'),
    );
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('preserves lists and layout blocks inside repeated items', async () => {
    const archive = await inspectDocx(
      await reactToDocx(
        document(
          <Repeater name="layouts" items={[1]} getKey={(item) => item}>
            {() => (
              <>
                <BreakAvoid>
                  <List>
                    <ListItem>List item</ListItem>
                  </List>
                </BreakAvoid>
                <Grid columnGap="12pt">
                  <GridItem size={12}>
                    <Repeater
                      name="gridContent"
                      items={[1]}
                      getKey={(item) => item}
                    >
                      {() => <Typography as="p">Grid content</Typography>}
                    </Repeater>
                  </GridItem>
                </Grid>
                <Split
                  left={
                    <Repeater
                      name="splitContent"
                      items={[1]}
                      getKey={(item) => item}
                    >
                      {() => <Typography as="p">Split content</Typography>}
                    </Repeater>
                  }
                  right={<Typography as="p">Right</Typography>}
                />
              </>
            )}
          </Repeater>,
        ),
        {},
      ),
    );
    expect(textOf(archive.document)).toContain(
      'List itemGrid contentSplit contentRight',
    );
    expect(findAll(archive.document, 'w:numPr')).toHaveLength(1);
    expect(findAll(archive.document, 'w15:repeatingSection')).toHaveLength(3);
  });

  it('preserves paragraph styling, quote spacing, and keep rules through controls', async () => {
    const wrap = (content: ReactElement) =>
      document(
        <Typography as="blockquote">
          <BreakAvoid>{content}</BreakAvoid>
        </Typography>,
      );
    const repeated = (
      <Repeater
        name="styled"
        items={items}
        getKey={(item) => item.id}
        fontWeight="bold"
        color="#123456"
      >
        {(item) => <Typography as="p">{item.text}</Typography>}
      </Repeater>
    );
    const plain = (
      <Typography as="div" fontWeight="bold" color="#123456">
        {items.map((item) => (
          <Typography key={item.id} as="p">
            {item.text}
          </Typography>
        ))}
      </Typography>
    );
    const repeatedArchive = await inspectDocx(
      await reactToDocx(wrap(repeated), {}),
    );
    const plainArchive = await inspectDocx(await reactToDocx(wrap(plain), {}));
    expect(findAll(repeatedArchive.document, 'w:p')).toEqual(
      findAll(plainArchive.document, 'w:p'),
    );
    expect(
      findAll(repeatedArchive.document, 'w:color').map((node) =>
        attribute(node, 'w:val'),
      ),
    ).toEqual(['123456', '123456']);
  });

  it('nests row controls in their parent item', async () => {
    const archive = await inspectDocx(
      await reactToDocx(
        document(
          <Table>
            <Repeater
              name="groups"
              mode="rows"
              items={items}
              getKey={(item) => item.id}
            >
              {(group) => (
                <Repeater
                  name="children"
                  mode="rows"
                  items={items}
                  getKey={(item) => item.id}
                >
                  {(item) => (
                    <TableRow>
                      <TableCell>
                        {group.text}: {item.text}
                      </TableCell>
                    </TableRow>
                  )}
                </Repeater>
              )}
            </Repeater>
          </Table>,
        ),
        {},
      ),
    );
    expect(findAll(archive.document, 'w15:repeatingSection')).toHaveLength(3);
    expect(findAll(archive.document, 'w15:repeatingSectionItem')).toHaveLength(
      6,
    );
    expect(findAll(archive.document, 'w:tr')).toHaveLength(4);
  });

  it('resolves nested Split widths against the cell through block and row controls', async () => {
    const split = (
      <Split
        left={<Typography as="p">Left</Typography>}
        right={<Typography as="p">Right</Typography>}
      />
    );
    for (const mode of ['plain', 'blocks', 'rows'] as const) {
      const row = (
        <TableRow>
          <TableCell>
            {mode === 'blocks' ? (
              <Repeater name="blocks" items={[1]} getKey={(item) => item}>
                {() => split}
              </Repeater>
            ) : (
              split
            )}
          </TableCell>
          <TableCell>Other</TableCell>
        </TableRow>
      );
      const root = document(
        <Table columnWidths={[1, 1]}>
          {mode === 'rows' ? (
            <Repeater
              name="rows"
              mode="rows"
              items={[1]}
              getKey={(item) => item}
            >
              {() => row}
            </Repeater>
          ) : (
            row
          )}
        </Table>,
      );
      const archive = await inspectDocx(await reactToDocx(root, {}));
      const nested = findAll(archive.document, 'w:tbl')[1];
      expect(
        findAll(nested, 'w:gridCol').map((node) => attribute(node, 'w:w')),
      ).toEqual(['2700', '2700']);
    }
  });

  it('resolves a repeated top-level Split against its own section width', async () => {
    const archive = await inspectDocx(
      await reactToDocx(
        () => (
          <DocumentProvider>
            <Stack>
              <Typography as="p">First section</Typography>
            </Stack>
            <Stack margin={{ left: '2in', right: '2in' }}>
              <Repeater name="narrow" items={[1]} getKey={(item) => item}>
                {() => (
                  <Split
                    left={<Typography as="p">Left</Typography>}
                    right={<Typography as="p">Right</Typography>}
                  />
                )}
              </Repeater>
            </Stack>
          </DocumentProvider>
        ),
        {},
      ),
    );
    expect(
      findAll(archive.document, 'w:gridCol').map((node) =>
        attribute(node, 'w:w'),
      ),
    ).toEqual(['3240', '3240']);
  });

  it('keeps the required cell-ending paragraph minimal after a block repeater', async () => {
    const archive = await inspectDocx(
      await reactToDocx(
        document(
          <Table>
            <TableRow>
              <TableCell>{blocks}</TableCell>
            </TableRow>
          </Table>,
        ),
        {},
      ),
    );
    const cell = findAll(archive.document, 'w:tc')[0];
    const tail = childrenOf(cell).at(-1);
    if (!tail) throw new Error('Missing cell ending paragraph');
    expect(tagNameOf(tail)).toBe('w:p');
    const spacing = findAll(tail, 'w:spacing')[0];
    expect(attribute(spacing, 'w:line')).toBe('1');
    expect(attribute(spacing, 'w:lineRule')).toBe('exact');
    expect(attribute(spacing, 'w:after')).toBe('0');
    expect(attribute(spacing, 'w:before')).toBe('0');
  });

  it('preserves bare and inline text and omits null items', async () => {
    const root = document(
      <Repeater name="text" items={[0, 1, 2]} getKey={(item) => item}>
        {(item) =>
          item === 0 ? null : item === 1 ? (
            'Bare text'
          ) : (
            <Typography as="span" fontWeight="bold">
              Inline text
            </Typography>
          )
        }
      </Repeater>,
    );
    const html = reactToHtml(root, 'web');
    expect(html).toContain('Bare text');
    expect(html).toContain('Inline text');
    const archive = await inspectDocx(
      await reactToDocx(root, { fileType: 'dotx' }),
    );
    expect(textOf(archive.document)).toBe('Bare textInline text');
    expect(findAll(archive.document, 'w15:repeatingSectionItem')).toHaveLength(
      2,
    );
    expect(findAll(archive.document, 'w:b')).toHaveLength(1);
    await expect(
      reactToDocx(
        document(
          <Repeater name="fragment" items={[1]} getKey={(item) => item}>
            {() => <></>}
          </Repeater>,
        ),
        {},
      ),
    ).rejects.toThrow('Repeater items must render content');
  });

  it('rejects row spans that cross item boundaries', async () => {
    await expect(reactToDocx(document(repeatedRows(2)), {})).rejects.toThrow(
      'rowSpan cannot cross',
    );
  });

  it('accepts row spans wholly within a multi-row item', async () => {
    const archive = await inspectDocx(
      await reactToDocx(
        document(
          <Table>
            <Repeater
              name="multi"
              mode="rows"
              items={items}
              getKey={(item) => item.id}
            >
              {(item) => (
                <>
                  <TableRow>
                    <TableCell rowSpan={2}>{item.text}</TableCell>
                    <TableCell>A</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>B</TableCell>
                  </TableRow>
                </>
              )}
            </Repeater>
          </Table>,
        ),
        {},
      ),
    );
    expect(findAll(archive.document, 'w:tr')).toHaveLength(4);
    expect(findAll(archive.document, 'w:vMerge')).toHaveLength(4);
    expect(findAll(archive.document, 'w15:repeatingSectionItem')).toHaveLength(
      2,
    );
  });

  it('supports repeats in headers and footers', async () => {
    const archive = await inspectDocx(
      await reactToDocx(
        () => (
          <DocumentProvider>
            <Stack
              layouts={{
                first: { header: blocks, footer: blocks },
                subsequent: {},
              }}
            >
              <Typography as="p">Body</Typography>
            </Stack>
          </DocumentProvider>
        ),
        {},
      ),
    );
    expect(findAll(archive.headers[0], 'w15:repeatingSection')).toHaveLength(1);
    expect(findAll(archive.footers[0], 'w15:repeatingSection')).toHaveLength(1);
  });

  it('retains a starter control for an empty collection in every context and Word format', async () => {
    for (const mode of ['blocks', 'rows'] as const) {
      const empty = (
        <Repeater
          name="starter"
          mode={mode}
          items={[]}
          getKey={() => {
            throw new Error('No data key should be requested');
          }}
          emptyItem={() =>
            mode === 'rows' ? (
              <TableRow>
                <TableCell>[Starter]</TableCell>
              </TableRow>
            ) : (
              <Typography as="p">[Starter]</Typography>
            )
          }
        >
          {() => {
            throw new Error('No data item should be rendered');
          }}
        </Repeater>
      );
      const root = document(mode === 'rows' ? <Table>{empty}</Table> : empty);
      for (const target of ['web', 'pdf', 'docx'] as const) {
        const html = reactToHtml(root, target);
        expect(html).toContain('[Starter]');
        if (mode === 'rows') {
          const body = html.split('<tbody>')[1].split('</tbody>')[0];
          expect(body).not.toContain('<div');
          expect(body.match(/<tr\b/g)).toHaveLength(1);
        }
      }
      for (const fileType of ['docx', 'dotx'] as const) {
        const archive = await inspectDocx(
          await reactToDocx(root, { fileType }),
        );
        expect(textOf(archive.document)).toBe('[Starter]');
        expect(findAll(archive.document, 'w15:repeatingSection')).toHaveLength(
          1,
        );
        expect(
          findAll(archive.document, 'w15:repeatingSectionItem'),
        ).toHaveLength(1);
        expect(findAll(archive.document, 'w:sdt')).toHaveLength(2);
        if (mode === 'rows')
          expect(findAll(archive.document, 'w:tr')).toHaveLength(1);
      }
    }
  });

  it('does not render the fallback when items are present', async () => {
    const root = document(
      <Repeater
        name="populated"
        items={items}
        getKey={(item) => item.id}
        emptyItem={() => {
          throw new Error('Fallback should not be called');
        }}
      >
        {(item) => <Typography as="p">{item.text}</Typography>}
      </Repeater>,
    );
    expect(reactToHtml(root, 'web')).toContain('First');
    const archive = await inspectDocx(
      await reactToDocx(root, { fileType: 'dotx' }),
    );
    expect(findAll(archive.document, 'w15:repeatingSectionItem')).toHaveLength(
      2,
    );
    expect(textOf(archive.document)).toBe('FirstSecond');
  });

  it('renders an empty collection as nothing and rejects ambiguous keys or placement', async () => {
    const empty = document(
      <Repeater name="empty" items={[]} getKey={() => 'key'}>
        {() => <Typography as="p">Unused</Typography>}
      </Repeater>,
    );
    expect(reactToHtml(empty, 'web')).not.toContain('Unused');
    expect(
      findAll(
        (await inspectDocx(await reactToDocx(empty, {}))).document,
        'w:sdt',
      ),
    ).toHaveLength(0);
    expect(() =>
      reactToHtml(
        document(
          <Repeater name="duplicate" items={items} getKey={() => 'same'}>
            {(item) => <Typography as="p">{item.text}</Typography>}
          </Repeater>,
        ),
        'web',
      ),
    ).toThrow('duplicate key');
    expect(() =>
      reactToHtml(
        document(
          <Repeater
            name="rows"
            mode="rows"
            items={items}
            getKey={(item) => item.id}
          >
            {() => <TableRow />}
          </Repeater>,
        ),
        'web',
      ),
    ).toThrow('inside the body of Table');
    await expect(
      reactToDocx(document(<Grid columnGap="12pt">{blocks}</Grid>), {}),
    ).rejects.toThrow('inside a GridItem');
  });
});
