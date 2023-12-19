import type { StoryObj } from '@storybook/react';
import { useEffect, useMemo } from 'react';
import { MockDocument } from '../fixtures/mockDocument.js';
// @ts-expect-error
import mockStyleSheet from '../fixtures/mockPages.css?inline';
import { usePreview } from './usePreview.js';

const createMockDocument = () => <MockDocument />;

const createStyleSheet = (...cssStrings: ReadonlyArray<string>) => {
  const styleSheet = new CSSStyleSheet();
  styleSheet.replaceSync([cssStrings].join('\n'));
  return styleSheet;
};

const meta = {
  title: 'Mock Document',
};

export default meta;
type Story = StoryObj;

function Web() {
  useEffect(() => {
    const styleSheet = createStyleSheet(mockStyleSheet);
    document.adoptedStyleSheets.push(styleSheet);
    return () => {
      document.adoptedStyleSheets.splice(
        document.adoptedStyleSheets.indexOf(styleSheet, 1),
      );
    };
  }, []);
  return <MockDocument injectEnvironmentCss />;
}

export const DocumentWeb: Story = {
  render: () => <Web />,
};

function Preview() {
  const styleSheets = useMemo(() => [createStyleSheet(mockStyleSheet)], []);
  const { previewElRef } = usePreview(createMockDocument, { styleSheets });
  return <div ref={previewElRef} />;
}

export const DocumentPreview: Story = {
  render: () => <Preview />,
};
