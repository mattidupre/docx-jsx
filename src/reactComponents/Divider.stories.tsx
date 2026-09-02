import type { Meta, StoryObj } from '@storybook/react-vite';
import { createMockPrefixesConfig } from '../fixtures';
import { ContentProvider } from './ContentProvider';
import { Divider } from './Divider';
import { Spacer } from './Spacer';
import { Typography } from './Typography';

const mockPrefixes = createMockPrefixesConfig();

const meta: Meta<typeof Divider> = {
  component: Divider,
  decorators: [
    (Story) => (
      <ContentProvider prefixes={mockPrefixes} injectEnvironmentCss>
        <Story />
      </ContentProvider>
    ),
  ],
};

export default meta;

type Story = StoryObj<typeof Divider>;

export const Rules: Story = {
  render: () => (
    <>
      <Typography as="p">Above the default rule.</Typography>
      <Divider />
      <Typography as="p">Between the rules.</Typography>
      <Divider color="#cc3333" thickness="3px" />
      <Typography as="p">Above a rule spanning 40% of the width.</Typography>
      <Divider color="#3366cc" thickness="2px" width={40} />
      <Typography as="p">Below the last rule.</Typography>
    </>
  ),
};

/**
 * A `Spacer` on its own is invisible, so it is shown between two rules: the gap
 * is the distance between them.
 */
export const Gap: Story = {
  render: () => (
    <>
      <Divider />
      <Spacer height="0.5in" />
      <Divider />
    </>
  ),
};
