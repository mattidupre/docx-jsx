import type { Variants, TypographyOptions } from '../entities';

const MOCK_VARIANTS: Variants = {
  heading1: {
    fontFamily: 'Merriweather',
    color: '#ff00ff',
    fontSize: '2rem',
    fontWeight: 'bold',
    fontStyle: 'italic',
  },
  hyperlink: {
    color: '#ff00ff',
  },
  mockVariant: {
    fontFamily: 'Merriweather',
    fontSize: '2rem',
    color: ['--mock-color', '#00ffff'],
    fontWeight: 'bold',
  },
};

export type MockVariants = Record<
  keyof typeof MOCK_VARIANTS,
  TypographyOptions
>;

export type MockVariant = keyof MockVariants;

export const createMockVariantsConfig = () => structuredClone(MOCK_VARIANTS);
