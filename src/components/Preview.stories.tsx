import type { Meta, StoryObj } from '@storybook/react';
import { Preview } from './Preview.js';
import { mockDocument } from '../fixtures/mockDocument.js';

const meta: Meta<typeof Preview> = {
  component: Preview,
};

export default meta;
type Story = StoryObj<typeof Preview>;

export const Primary: Story = {
  render: () => {
    return <Preview pageClassName="preview__page">{mockDocument}</Preview>;
  },
};
