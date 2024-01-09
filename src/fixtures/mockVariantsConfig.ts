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
  mockParagraphVariant: {
    fontFamily: 'Merriweather',
    fontSize: '1.25rem',
    color: ['--mock-color', '#00dddd'],
    fontWeight: 'bold',
    paddingBottom: '0.25rem',
    borderBottomColor: '#ffff00',
    borderBottomWidth: '0.25rem',
  },
  mockTextVariant: {
    fontFamily: 'Merriweather',
    fontSize: '1.25rem',
    color: ['--mock-color', '#00dddd'],
    fontWeight: 'bold',
  },
  mockContentVariant: {
    marginBottom: '1rem',
    lineHeight: '1.5rem',
    textIndent: '1rem',
  },
};

export type MockVariants = Record<
  keyof typeof MOCK_VARIANTS,
  TypographyOptions
>;

export type MockVariant = keyof MockVariants;

export const createMockVariantsConfig = () => structuredClone(MOCK_VARIANTS);
