import { kebabCase } from 'lodash';
import type { HtmlAttributes } from '../../entities';

/**
 * hast represents `class="a b"` as `className: ['a', 'b']`, so class values
 * have to be flattened to single names before they can be de-duplicated.
 */
const toClassNames = (value: unknown): ReadonlyArray<string> =>
  [value]
    .flat(Infinity)
    .flatMap((item) => (typeof item === 'string' ? item.split(/\s+/) : []))
    .filter(Boolean);

export const extendHtmlAttributes = (
  ...attributesArgs: ReadonlyArray<undefined | Partial<HtmlAttributes>>
) => {
  const targetAttributes: HtmlAttributes = {};
  const targetClassNames: Array<string> = [];
  const targetStyles: Array<HtmlAttributes['style']> = [];

  for (const thisAttributes of attributesArgs) {
    for (const attributeKey in thisAttributes) {
      const attributeValue =
        thisAttributes[attributeKey as keyof HtmlAttributes];

      if (!attributeValue) {
        continue;
      }

      if (attributeKey === 'class' || attributeKey === 'className') {
        for (const className of toClassNames(attributeValue)) {
          if (!targetClassNames.includes(className)) {
            targetClassNames.push(className);
          }
        }
        continue;
      }

      if (attributeKey === 'style') {
        targetStyles.push(attributeValue);
        continue;
      }

      if (attributeKey === 'href') {
        targetAttributes[attributeKey] = attributeValue;
        continue;
      }

      // TODO: Rewrite below.
      const kebabKey = kebabCase(attributeKey) as `data-${string}`;
      if (kebabKey.startsWith('data-')) {
        targetAttributes[kebabKey] = attributeValue;
        continue;
      }
      if (
        typeof attributeValue === 'string' ||
        typeof attributeValue === 'number'
      ) {
        targetAttributes[attributeKey] = attributeValue;
      }
    }
  }

  if (targetClassNames.length > 0) {
    targetAttributes.class = targetClassNames.join(' ');
  }

  if (targetStyles.length > 0) {
    targetAttributes.style = targetStyles
      .flat(Infinity)
      .map((style) => style && (style.endsWith(';') ? style : `${style};`))
      .join(' ');
  }

  return targetAttributes;
};
