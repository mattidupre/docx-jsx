import type { Meta, StoryObj } from '@storybook/react-vite';
import { createMockPrefixesConfig } from '../fixtures';
import { MOCK_IMAGE_DATA_URL } from '../fixtures/mockImage';
import { ContentProvider } from './ContentProvider';
import { Image } from './Image';

const mockPrefixes = createMockPrefixesConfig();

const meta: Meta<typeof Image> = {
  component: Image,
  decorators: [
    (Story) => (
      <ContentProvider prefixes={mockPrefixes} injectEnvironmentCss>
        <Story />
      </ContentProvider>
    ),
  ],
};

export default meta;

type Story = StoryObj<typeof Image>;

/** The omitted axis is `auto`, so the browser keeps the aspect ratio. */
export const WidthOnly: Story = {
  render: () => (
    <Image src={MOCK_IMAGE_DATA_URL} alt="Colour swatch" width="2in" />
  ),
};

export const Aligned: Story = {
  render: () => (
    <>
      <Image
        src={MOCK_IMAGE_DATA_URL}
        alt="Colour swatch, left"
        width="1.5in"
        align="left"
      />
      <Image
        src={MOCK_IMAGE_DATA_URL}
        alt="Colour swatch, centred"
        width="1.5in"
        align="center"
      />
      <Image
        src={MOCK_IMAGE_DATA_URL}
        alt="Colour swatch, right"
        width="1.5in"
        align="right"
      />
    </>
  ),
};
