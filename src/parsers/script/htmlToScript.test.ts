import { describe, expect, test } from 'vitest';
import { htmlToScript } from './htmlToScript';

/**
 * Reads back the JavaScript literal `htmlToScript` assigned to `name`. Parsing
 * it as JSON proves the value survives the trip into the generated script
 * without being reinterpreted by the JavaScript parser.
 */
const readLiteral = (script: string, name: string) => {
  const match = script.match(new RegExp(`const ${name} = (.*);\\n`));
  expect(match, `assignment of ${name}`).not.toBeNull();
  return JSON.parse(match![1]) as unknown;
};

describe('htmlToScript', () => {
  const HTML_SUBJECTS = [
    '<p>Plain</p>',
    // A backtick used to terminate the template literal the HTML was
    // interpolated into.
    '<p>Backtick ` in text</p>',
    // A dollar-brace used to interpolate arbitrary expressions.
    '<p>${1 + 1}</p>',
    '<p>${globalThis.process}</p>',
    '<p data-x="`${injected}`">Both</p>',
    '<p>Backslash \\ and "quotes"</p>',
    '<p>Newline\nand\ttab</p>',
  ] as const;

  for (const html of HTML_SUBJECTS) {
    test(`embeds ${JSON.stringify(html)} verbatim`, () => {
      expect(readLiteral(htmlToScript(html), 'html')).toBe(html);
    });
  }

  test('embeds the target query verbatim', () => {
    const targetQuery = '[data-id="`${x}`"]';
    const script = htmlToScript('<p>x</p>', { targetQuery });
    const match = script.match(/document\.querySelector\((.*)\);/);
    expect(match, 'querySelector call').not.toBeNull();
    expect(JSON.parse(match![1])).toBe(targetQuery);
  });

  test('embeds the HTML as a quoted string, not a template literal', () => {
    const script = htmlToScript('<p>` ${1 + 1}</p>');
    const [, literal] = script.match(/const html = (.*);\n/)!;
    // A template literal would let a backtick close it and `${}` evaluate.
    expect(literal.startsWith('`')).toBe(false);
    expect(literal.startsWith('"')).toBe(true);
  });

  test('escapes `<` so the script is safe inside an HTML script element', () => {
    const script = htmlToScript('<p>closing </script> tag</p>');
    expect(script).not.toContain('</script>');
    expect(readLiteral(script, 'html')).toBe('<p>closing </script> tag</p>');
  });
});
