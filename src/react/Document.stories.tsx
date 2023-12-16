import type { Meta, StoryObj } from '@storybook/react';
import { useEffect, useMemo } from 'react';
import { MockDocument } from '../fixtures/mockDocument.js';
// @ts-expect-error
import mockStyleSheet from '../fixtures/mockPages.css?inline';
import { documentStyleCss } from '../style.js';
import { Preview } from './Preview.js';

const createStyleSheet = () => {
  const styleSheet = new CSSStyleSheet();
  styleSheet.replaceSync([mockStyleSheet, documentStyleCss].join('\n'));
  return styleSheet;
};

const meta: Meta<typeof Preview> = {
  component: Preview,
};

export default meta;
type Story = StoryObj<typeof Preview>;

export const DocumentWeb: Story = {
  render: () => {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useEffect(() => {
      const styleSheet = createStyleSheet();
      document.adoptedStyleSheets.push(styleSheet);
      return () => {
        document.adoptedStyleSheets.splice(
          document.adoptedStyleSheets.indexOf(styleSheet, 1),
        );
      };
    }, []);
    return <MockDocument />;
  },
};

export const DocumentPreview: Story = {
  render: () => {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const styleSheet = useMemo(() => createStyleSheet(), []);
    return (
      <Preview styleSheets={[styleSheet]}>
        <MockDocument />
      </Preview>
    );
  },
};
