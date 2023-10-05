export type TextConfig = Readonly<{
  color: 'red' | 'blue';
}>;

export type TextOptions = Partial<TextConfig>;

export const DEFAULT_TEXT_CONFIG = {
  color: 'blue',
} as const satisfies TextConfig;

export const extendTextConfig = (config: TextConfig, options: TextOptions) => ({
  ...config,
  ...options,
});
