import type { Meta, StoryObj } from '@storybook/react';
import type { ReactNode } from 'react';
import type { VariantsConfig } from '../entities';
import { Typography } from './Typography';
import { DocumentProvider } from './DocumentProvider';

const meta: Meta<typeof Typography> = {
  component: Typography,
};

export default meta;

type Story = StoryObj<typeof Typography>;

const MOCK_TEXT = "The quick brown fox jumped over the lazy dog's head.";

type WrapperProps = {
  variants?: VariantsConfig;
  children: ReactNode;
};

function Wrapper({ variants, children }: WrapperProps) {
  return (
    <DocumentProvider variants={variants} injectEnvironmentCss>
      {children}
    </DocumentProvider>
  );
}

export const Heading: Story = {
  render: () => (
    <Wrapper>
      <Typography as="h1" color="#ff0000">
        {MOCK_TEXT}
      </Typography>
    </Wrapper>
  ),
};
