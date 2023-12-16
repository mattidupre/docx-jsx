import { kebabCase } from 'lodash-es';

// TODO: Add more semantic HTML TagNames.
//* IMPORTANT: Keep these in sync with typography stylesheet.
export type TagName = keyof Pick<
  JSX.IntrinsicElements,
  | 'div'
  | 'p'
  | 'h1'
  | 'h2'
  | 'h3'
  | 'h4'
  | 'h5'
  | 'h6'
  | 'a'
  | 'b'
  | 'strong'
  | 'i'
  | 'em'
  | 's'
  | 'u'
  | 'sub'
  | 'sup'
  | 'span'
>;

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
          continue;
        }

        if (attributeKey === 'href') {
          targetAttributes[attributeKey] = thisAttributes[attributeKey];
          continue;
        }

        const kebabKey = kebabCase(attributeKey) as `data-${string}`;
        if (kebabKey.startsWith('data-')) {
          targetAttributes[kebabKey] = thisAttributes[attributeKey];
          continue;
        }

        // All other attributes are omitted.
      }
      return targetAttributes;
    },
    (arg0 ?? {}) as HtmlAttributes,
  );
