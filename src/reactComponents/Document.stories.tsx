import type { StoryObj } from '@storybook/react';
import { MockDocument } from '../fixtures/mockDocument';
import { createStyleString } from '../lib/styles';
import {
  createMockPrefixesConfig,
  createMockVariantsConfig,
} from '../fixtures';
import { PageTemplate } from '../lib/dom/pageTemplate';
import { Pager } from '../utils/pager';
import { useInjectStyleSheets } from './useInjectStyleSheets';
import { Preview } from './Preview';

const DocumentRoot = () => <MockDocument />;

const styleSheetString = `
@media screen {
  .preview__page {
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
  render: function Story() {
    const { isStyleSheetsLoaded } = useInjectStyleSheets([
      createStyleString({
        variants: createMockVariantsConfig(),
        prefixes: createMockPrefixesConfig(),
      }),
      styleSheetString,
      Pager.BASE_STYLE,
      PageTemplate.outerStyle,
      PageTemplate.innerStyle,
    ]);

    console.log(isStyleSheetsLoaded);

    return (
      <Preview
        DocumentRoot={DocumentRoot}
        isLoading={!isStyleSheetsLoaded}
        Loading={() => <h1>Loading</h1>}
      />
    );
  },
};
