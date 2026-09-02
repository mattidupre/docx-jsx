import type { Meta, StoryObj } from '@storybook/react';
import { createMockPrefixesConfig } from '../fixtures';
import { ContentProvider } from './ContentProvider';
import { List, ListItem } from './List';

const mockPrefixes = createMockPrefixesConfig();

const meta: Meta<typeof List> = {
  component: List,
  decorators: [
    (Story) => (
      <ContentProvider prefixes={mockPrefixes} injectEnvironmentCss>
        <Story />
      </ContentProvider>
    ),
  ],
};

export default meta;

type Story = StoryObj<typeof List>;

export const Bulleted: Story = {
  render: () => (
    <List>
      <ListItem>Cetology</ListItem>
      <ListItem>The Sperm Whale</ListItem>
      <ListItem>The Right Whale</ListItem>
    </List>
  ),
};

/** `start` is what makes the browser agree with Word about the first number. */
export const Formats: Story = {
  render: () => (
    <>
      <List ordered>
        <ListItem>Loomings</ListItem>
        <ListItem>The Carpet-Bag</ListItem>
      </List>
      <List format="upperLetter">
        <ListItem>Upper letter, first</ListItem>
        <ListItem>Upper letter, second</ListItem>
      </List>
      <List format="lowerRoman" start={3}>
        <ListItem>Lower roman, from three</ListItem>
        <ListItem>Lower roman, the next one</ListItem>
      </List>
    </>
  ),
};

export const Nested: Story = {
  render: () => (
    <List ordered>
      <ListItem>Depth one</ListItem>
      <List format="lowerLetter">
        <ListItem>Depth two</ListItem>
        <List format="lowerRoman">
          <ListItem>Depth three</ListItem>
        </List>
      </List>
      <ListItem>Depth one again</ListItem>
    </List>
  ),
};
