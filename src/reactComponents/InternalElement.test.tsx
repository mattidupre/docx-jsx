import type { ReactElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { DocumentType } from '../entities';
import { InternalEnvironmentProvider } from './InternalEnvironmentProvider';
import { ContentProvider } from './ContentProvider';
import { DocumentProvider } from './DocumentProvider';
import { Break } from './Break';
import { Grid, GridItem } from './Grid';
import { Split } from './Split';
import { Stack } from './Stack';
import { Typography } from './Typography';

const renderMarkup = (element: ReactElement, documentType: DocumentType) =>
  renderToStaticMarkup(
    <InternalEnvironmentProvider documentType={documentType}>
      {element}
    </InternalEnvironmentProvider>,
  );

const classNamesOf = (markup: string): ReadonlyArray<string> =>
  [...markup.matchAll(/class="([^"]*)"/g)].flatMap(([, value]) =>
    value.split(/\s+/),
  );

describe('the element class name', () => {
  it('marks every library element with its element type', () => {
    const markup = renderMarkup(
      <DocumentProvider>
        <Stack>
          <Typography as="p">Body</Typography>
          <Break />
          <Split
            left={<Typography as="p">Left</Typography>}
            right={<Typography as="p">Right</Typography>}
          />
          <Grid columnGap="0.25in">
            <GridItem size={12}>
              <Typography as="p">Cell</Typography>
            </GridItem>
          </Grid>
        </Stack>
      </DocumentProvider>,
      'pdf',
    );

    const classNames = classNamesOf(markup);
    for (const elementType of [
      'stack',
      'content',
      'htmltag',
      'break',
      'split',
      'grid-container',
      'grid-item',
    ]) {
      expect(classNames, elementType).toContain(
        `matti-docs-element-${elementType}`,
      );
    }
  });

  it('marks elements in the web target too', () => {
    const markup = renderMarkup(
      <DocumentProvider>
        <Stack>
          <Typography as="p">Body</Typography>
        </Stack>
      </DocumentProvider>,
      'web',
    );

    expect(classNamesOf(markup)).toContain('matti-docs-element-htmltag');
  });

  it('honours a configured elementClassName prefix', () => {
    const markup = renderMarkup(
      <DocumentProvider prefixes={{ elementClassName: 'custom-el' }}>
        <Stack>
          <Typography as="p">Body</Typography>
        </Stack>
      </DocumentProvider>,
      'pdf',
    );

    const classNames = classNamesOf(markup);
    expect(classNames).toContain('custom-el-htmltag');
    expect(classNames).not.toContain('matti-docs-element-htmltag');
  });

  it('keeps the author class and the variant class alongside it', () => {
    const markup = renderMarkup(
      <ContentProvider variants={{ mockTextVariant: { fontWeight: 'bold' } }}>
        <Typography as="p" className="author" variant="mockTextVariant">
          Body
        </Typography>
      </ContentProvider>,
      'pdf',
    );

    expect(classNamesOf(markup)).toEqual([
      'author',
      'matti-docs-element-htmltag',
      'matti-docs-variant-mock-text-variant',
    ]);
  });
});
