import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createNodeDriver } from '@pandacss/dev/node';
import { describe, expect, test } from 'vitest';
import {
  CONTENT_STYLES_TEMPLATE,
  NEUTRAL_STYLES,
  PAGE_SHADOW_STYLES,
} from './generated/styles';
import { instantiateContentStyles } from './lib/contentStyles';
import { CSS_VARIABLE_PREFIX_TOKEN } from './lib/styles';
import { assignPrefixesOptions } from './entities';

const RESOLVE_DIR = path.dirname(fileURLToPath(import.meta.url));

const selectorsOf = (css: string) =>
  Array.from(
    css.matchAll(/^\s*([^{}\n@]+?)\s*\{/gm),
    ([, selector]) => selector,
  );

describe('the stylesheets the library installs itself', () => {
  test('carry no cascade layer in the light DOM', () => {
    // A layered rule loses to every unlayered rule of the host page.
    for (const css of [NEUTRAL_STYLES, CONTENT_STYLES_TEMPLATE]) {
      expect(css).not.toContain('@layer');
      expect(css).not.toContain('--made-with-panda');
    }
  });

  test('are rooted at the scope they are adopted in', () => {
    const selectors = [
      ...selectorsOf(NEUTRAL_STYLES),
      ...selectorsOf(CONTENT_STYLES_TEMPLATE),
    ];
    expect(selectors.length).toBeGreaterThan(20);
    for (const selector of selectors) {
      expect(selector).toMatch(/^:where\(:scope\)/);
    }
  });

  test('instantiate the content rules for a prefix', () => {
    expect(CONTENT_STYLES_TEMPLATE).toContain(
      `var(--${CSS_VARIABLE_PREFIX_TOKEN}-font-size, 16px)`,
    );
    expect(NEUTRAL_STYLES).not.toContain(CSS_VARIABLE_PREFIX_TOKEN);
    const css = instantiateContentStyles({
      prefixes: assignPrefixesOptions('resume'),
    });
    expect(css).not.toContain(CSS_VARIABLE_PREFIX_TOKEN);
    expect(css).toContain('var(--resume-font-size, 16px)');
    expect(css).toContain('--resume-margin-top: initial');
  });

  test('give the page chrome a layered shadow stylesheet without a host reset', () => {
    // Alone in its shadow root, the chrome keeps matti-kit's layer order.
    expect(PAGE_SHADOW_STYLES).toMatch(
      /^@layer reset, base, tokens, recipes, utilities;\n@layer reset \{/,
    );
    expect(PAGE_SHADOW_STYLES).toContain('@layer base');
    expect(PAGE_SHADOW_STYLES).not.toContain('html, :host');
    expect(PAGE_SHADOW_STYLES).not.toContain('--made-with-panda');
  });
});

describe('createMattiDocsPreset', () => {
  test('compiles into the application’s base layer, rooted at the content root class', async () => {
    const { compiler } = await createNodeDriver({
      cwd: path.join(RESOLVE_DIR, 'fixtures/pandaPresetConsumer'),
      configPath: 'panda.config.ts',
    });
    const { css, diagnostics } = compiler.getLayerCss({ layers: ['base'] });
    expect(diagnostics).toEqual([]);
    expect(css).toContain('@layer base');
    expect(css).toContain(':where(.matti-docs-content-root) * {');
    // The neutral rules come first, the structural ones after them.
    expect(
      css.indexOf(':where(.matti-docs-content-root) :where(*)'),
    ).toBeLessThan(css.indexOf(':where(.matti-docs-content-root) * {'));
    expect(css).toContain('var(--resume-font-size, 16px)');
    // Written as the DOCX target reads them, not resolved against tokens.
    expect(css).toMatch(/:where\(b, strong\) \{\s*font-weight: bold;/);
    expect(css).not.toContain(':scope');
  });
});
