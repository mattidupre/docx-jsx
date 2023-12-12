import type { Meta, StoryObj } from '@storybook/react';
import { Preview } from './Preview.js';
import { mockDocument } from '../fixtures/mockDocument.js';
// @ts-ignore
import mockStyleSheet from '../fixtures/mockPages.css?inline';
import { useEffect, useMemo } from 'react';

const createStyleSheet = () => {
  const styleSheet = new CSSStyleSheet();
  styleSheet.replaceSync([mockStyleSheet].join('\n'));
  return styleSheet;
};

const meta: Meta<typeof Preview> = {
  component: Preview,
};

export default meta;
type Story = StoryObj<typeof Preview>;

export const DocumentWeb: Story = {
  render: () => {
    useEffect(() => {
      const styleSheet = createStyleSheet();
      document.adoptedStyleSheets.push(styleSheet);
      return () => {
        document.adoptedStyleSheets.splice(
          document.adoptedStyleSheets.indexOf(styleSheet, 1),
        );
      };
    }, []);
    return mockDocument;
  },
};

export const DocumentPreview: Story = {
  render: () => {
    const styleSheet = useMemo(() => createStyleSheet(), []);
    return <Preview styleSheets={[styleSheet]}>{mockDocument}</Preview>;
  },
};
