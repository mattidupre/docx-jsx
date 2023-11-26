// @ts-check

/**
 * @type { import('@storybook/react-vite').StorybookConfig }
 */
const config = {
  addons: [],
  typescript: {
    // https://github.com/storybookjs/storybook/issues/10784
    reactDocgen: false,
  },
  framework: {
    name: '@storybook/react-vite',
    options: {},
  },
  stories: ['../src/**/*.stories.@(js|jsx|mjs|ts|tsx)'],
};

export default config;
