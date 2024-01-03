import type { Meta, StoryObj } from '@storybook/react';
import {
  createMockVariantsConfig,
  createMockPrefixesConfig,
} from '../fixtures';
import { Typography } from './Typography';
import { ContentProvider } from './ContentProvider';

const mockVariants = createMockVariantsConfig();
const mockPrefixes = createMockPrefixesConfig();

const meta: Meta<typeof Typography> = {
  component: Typography,
};

export default meta;

type Story = StoryObj<typeof Typography>;

const MOCK_TEXT = "The quick brown fox jumped over the lazy dog's head.";

export const Heading: Story = {
  decorators: [
    (Story) => (
      <ContentProvider
        variants={mockVariants}
        prefixes={mockPrefixes}
        injectEnvironmentCss
      >
        <Story />
      </ContentProvider>
    ),
  ],
  render: () => (
    <Typography as="h1" color="#ff0000">
      {MOCK_TEXT}
    </Typography>
  ),
};
