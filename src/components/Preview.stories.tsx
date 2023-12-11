import type { Meta, StoryObj } from '@storybook/react';
import { Preview } from './Preview.js';
import { mockDocument } from '../fixtures/mockDocument.js';
// @ts-ignore
import mockStyleSheet from '../fixtures/mockPages.css?inline';

const styleSheet = new CSSStyleSheet();
styleSheet.replaceSync([mockStyleSheet].join('\n'));

const meta: Meta<typeof Preview> = {
  component: Preview,
};

export default meta;
type Story = StoryObj<typeof Preview>;

export const Document: Story = {
  render: () => {
    return <Preview styleSheets={[styleSheet]}>{mockDocument}</Preview>;
  },
};
