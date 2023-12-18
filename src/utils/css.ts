import type { CSSProperties } from 'react';
import { kebabCase } from 'lodash-es';

export type SimpleCss = Record<
  string,
  {
    [K in keyof CSSProperties]: CSSProperties[K] | `var(--${string})`;
  }
>;

export const simpleCssToString = (object: SimpleCss) => {
  const cssArr: Array<string> = [];
  for (const selector in object) {
    const rulesArray: Array<string> = [];
    const rules = object[selector];
    for (const prop in rules) {
      const parsedProp = prop.startsWith('--') ? prop : kebabCase(prop);
      rulesArray.push(`  ${parsedProp}: ${rules[prop as keyof typeof rules]};`);
    }
    const rulesString = rulesArray.length ? `\n${rulesArray.join('\n')}\n` : '';
    cssArr.push(`${selector} {${rulesString}}`);
  }
  return cssArr.join('\n');
};
