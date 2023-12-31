import type { Meta, StoryObj } from '@storybook/react';
import { type ChangeEventHandler, useCallback, useRef } from 'react';
import {
  type MockVariants,
  createMockVariantsConfig,
  createMockPrefixesConfig,
} from '../fixtures';
import { Typography } from './Typography';
import { ContentProvider, type ContentProviderHandle } from './ContentProvider';
import type { Color } from 'src/entities';

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

function HandleComponent() {
  const handle = useRef() as ContentProviderHandle<MockVariants>;

  const defaultValue = mockVariants.title.color;
  const handleInputChange = useCallback<ChangeEventHandler<HTMLInputElement>>(
    ({ target: { value } }) => {
      if (/#[A-Za-z0-9]{6}/.test(value)) {
        handle.current!.setVariants!({
          title: {
            color: value.toLowerCase() as Color,
          },
        });
      }
    },
    [],
  );

  return (
    <ContentProvider<MockVariants>
      variants={mockVariants}
      prefixes={mockPrefixes}
      as="div"
      handle={handle}
      injectEnvironmentCss
    >
      <input defaultValue={defaultValue} onChange={handleInputChange} />
      <Typography as="h1" variant="title">
        {MOCK_TEXT}
      </Typography>
    </ContentProvider>
  );
}

export const Handle: Story = {
  render: () => <HandleComponent />,
};
