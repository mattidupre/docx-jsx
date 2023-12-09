import { kebabCase } from 'lodash-es';

export type HtmlAttributes = Record<string, string>;

export const assignHtmlAttributes = (
  arg0: HtmlAttributes,
  ...args: ReadonlyArray<HtmlAttributes>
) =>
  args.reduce(
    (targetAttributes, thisAttributes = {}) => {
      for (const attributeKey in thisAttributes) {
        const attributeValue =
          thisAttributes[attributeKey as keyof HtmlAttributes];
        if (!attributeValue) {
          continue;
        }

        if (attributeKey === 'class' || attributeKey === 'style') {
          targetAttributes[attributeKey] = [
            targetAttributes[attributeKey] || [],
            attributeValue,
          ]
            .flat()
            .join(' ');
        }

        const kebabKey = kebabCase(attributeKey) as `data-${string}`;
        if (kebabKey.startsWith('data-')) {
          targetAttributes[kebabKey] = thisAttributes[kebabKey];
        }

        // All other attributes are omitted.
      }
      return thisAttributes;
    },
    (arg0 ?? {}) as HtmlAttributes,
  );
