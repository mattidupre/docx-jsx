import type { StoryObj } from '@storybook/react';
import { MockDocument } from '../fixtures/mockDocument';
import { Preview } from './Preview';

const DocumentRoot = () => <MockDocument injectEnvironmentCss />;

const styleSheetString = `
@media screen {
  .page {
    margin: 0.5in;
    box-shadow: 0px 2px 6px rgba(0, 0, 0, 0.25);
    margin-left: auto;
    margin-right: auto;
    background-color: white;
  }
}
`;

const meta = {
  title: 'React Components/Document',
};

export default meta;

type Story = StoryObj;

function Web() {
  return <DocumentRoot />;
}

export const WebDocument: Story = {
  render: () => <Web />,
};

export const PreviewDocument: Story = {
  render: () => (
    <Preview
      DocumentRoot={DocumentRoot}
      Loading={() => <h1>Loading</h1>}
      styleSheets={[styleSheetString]}
    />
  ),
};
