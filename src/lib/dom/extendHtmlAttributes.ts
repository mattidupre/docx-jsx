import { kebabCase } from 'lodash';
import type { HtmlAttributes } from '../../entities';

export const extendHtmlAttributes = (
  ...attributesArgs: ReadonlyArray<undefined | Partial<HtmlAttributes>>
) => {
  const targetAttributes: HtmlAttributes = {};
  const targetClassNames: Array<HtmlAttributes['class']> = [];
  const targetStyles: Array<HtmlAttributes['style']> = [];

  for (const thisAttributes of attributesArgs) {
    for (const attributeKey in thisAttributes) {
      const attributeValue =
        thisAttributes[attributeKey as keyof HtmlAttributes];

      if (!attributeValue) {
        continue;
      }

      if (attributeKey === 'class' || attributeKey === 'className') {
        if (!targetClassNames.includes(attributeValue)) {
          targetClassNames.push(attributeValue);
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

      const kebabKey = kebabCase(attributeKey) as `data-${string}`;
      if (kebabKey.startsWith('data-')) {
        targetAttributes[kebabKey] = attributeValue;
        continue;
      }
    }
  }

  if (targetClassNames.length > 0) {
    targetAttributes.class = targetClassNames.flat(Infinity).join(' ');
  }

  if (targetStyles.length > 0) {
    targetAttributes.style = targetStyles.flat(Infinity).join(' ');
  }

  return targetAttributes;
};
