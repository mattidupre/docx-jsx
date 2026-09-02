import type { Meta, StoryObj } from '@storybook/react-vite';
import {
  createMockPrefixesConfig,
  createMockVariantsConfig,
} from '../fixtures';
import { ContentProvider } from './ContentProvider';
import { Bookmark, Link } from './Link';
import { Typography } from './Typography';

const mockVariants = createMockVariantsConfig();
const mockPrefixes = createMockPrefixesConfig();

const BOOKMARK_ID = 'cetology';

const meta: Meta<typeof Link> = {
  component: Link,
  decorators: [
    (Story) => (
      // `mockVariants` declares `hyperlink`, which is what colours a link.
      <ContentProvider
        variants={mockVariants}
        prefixes={mockPrefixes}
        injectEnvironmentCss
      >
        <Story />
      </ContentProvider>
    ),
  ],
};

export default meta;

type Story = StoryObj<typeof Link>;

export const External: Story = {
  render: () => (
    <Typography as="p">
      <Link href="https://example.com/">An absolute link</Link>
    </Typography>
  ),
};

/**
 * `bookmark` and `to` name the same target two ways; a `Bookmark` is the
 * destination both of them resolve to.
 */
export const Internal: Story = {
  render: () => (
    <>
      <Typography as="p">
        <Link bookmark={BOOKMARK_ID}>Jump to cetology</Link>
      </Typography>
      <Typography as="p">
        <Link to={`#${BOOKMARK_ID}`}>The same jump, written as a fragment</Link>
      </Typography>
      <Typography as="h2">
        <Bookmark id={BOOKMARK_ID}>Cetology</Bookmark>
      </Typography>
    </>
  ),
};
