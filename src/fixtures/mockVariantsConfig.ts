import type { VariantConfig, VariantsConfig } from 'src/entities';

const MOCK_VARIANTS = {
  mockVariant: {
    color: '#00ff00',
    fontWeight: 'bold',
  },
  title: {
    color: '#0000ff',
  },
} as const satisfies VariantsConfig;

export type MockVariants = Record<keyof typeof MOCK_VARIANTS, VariantConfig>;

export type MockVariant = keyof MockVariants;

export const createMockVariantsConfig = () => structuredClone(MOCK_VARIANTS);
