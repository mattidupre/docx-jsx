import type { StoryObj } from '@storybook/react';
import { MockDocument } from '../fixtures/mockDocument.js';
// @ts-expect-error
import mockStyleSheet from '../fixtures/mockPages.css?inline';
import { DocumentPreview } from './DocumentPreview.js';

const DocumentRoot = () => <MockDocument injectEnvironmentCss />;

const styleSheets: Array<string> = [mockStyleSheet];

const meta = {
  title: 'Mock Document',
};

export default meta;
type Story = StoryObj;

function Web() {
  return <DocumentRoot />;
}

export const DocumentWeb: Story = {
  render: () => <Web />,
};

export const Preview: Story = {
  render: () => (
    <DocumentPreview
      DocumentRoot={DocumentRoot}
      Loading={() => <h1>Loading</h1>}
      styleSheets={styleSheets}
    />
  ),
};
