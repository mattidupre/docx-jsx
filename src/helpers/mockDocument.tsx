/* eslint-disable react/jsx-no-useless-fragment */

import { Document, Section, TextRun, Paragraph } from 'src/components';
import { TextProvider, useTextConfig } from 'src/context';
import { type FunctionComponent } from 'react';
import { vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

const componentElements = new Map<FunctionComponent, any>();

const createMockComponent = <TComponent extends FunctionComponent>(
  component: TComponent,
) =>
  vi.fn((...args: Parameters<TComponent>) => {
    // eslint-disable-next-line prefer-spread
    const value = component.apply(undefined, args);
    componentElements.set(component, value);
    return value;
  }) as unknown as TComponent;

const ColorString = createMockComponent(() => {
  return useTextConfig().color.toUpperCase();
});

const ComponentD = createMockComponent(() => {
  return (
    <>
      <TextRun>Component D 1</TextRun>
      <TextRun>Component D 2</TextRun>
    </>
  );
});

const ComponentB = createMockComponent(() => {
  return (
    <>
      <TextProvider options={{ color: 'red' }}>
        <Paragraph>
          <ColorString />
          <TextRun>COMPONENT 1</TextRun>
          <TextRun>{0}</TextRun>
        </Paragraph>
        <Paragraph>EXTRA</Paragraph>
      </TextProvider>
    </>
  );
});

const ComponentA = createMockComponent(() => {
  return (
    <>
      <Paragraph>NO TEXTRUN</Paragraph>
      <Paragraph text="WEIRD" />
      <ComponentB />
      <Paragraph text="WEIRD" />
      <Paragraph>
        <TextRun>THREE</TextRun>
        <ComponentD />
      </Paragraph>
    </>
  );
});

export const mockDocumentElement = (
  <Document>
    <Section>
      <ComponentA />
    </Section>
  </Document>
);

export const mockDocumentMarkup = renderToStaticMarkup(mockDocumentElement);
