import type { Variants, TypographyOptions } from '../entities';

const MOCK_VARIANTS: Variants = {
  mockVariant: {
    color: ['--mock-color', '#00ff00'],
    fontWeight: 'bold',
  },
  title: {
    color: '#0000ff',
  },
};

export type MockVariants = Record<
  keyof typeof MOCK_VARIANTS,
  TypographyOptions
>;

export type MockVariant = keyof MockVariants;

export const createMockVariantsConfig = () => structuredClone(MOCK_VARIANTS);
