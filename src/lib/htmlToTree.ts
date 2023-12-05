import { merge } from 'lodash-es';
import {
  PARAGRAPH_TAG_NAMES,
  extendElementHtmlAttributes,
  ElementHtmlAttributes,
} from '../entities';
import { mapDocument } from './mapDocumentHtml.js';
import { type TagName } from '../entities';
import { optionsToCssVarsString } from '../utils/cssVars.js';

type TreeRoot = {
  type: 'root';
  children: ReadonlyArray<TreeChild>;
};

type TreeText = {
  type: 'text';
  value: string;
};

type TreeElement = {
  type: 'element';
  tagName: TagName;
  properties: ElementHtmlAttributes;
  children: ReadonlyArray<TreeChild>;
};

type TreeChild = TreeElement | TreeText;

type TreeChildOptions = {
  tagName: TagName;
  attributes: ElementHtmlAttributes;
  children: readonly TreeChild[];
};

const createElement = ({
  tagName,
  attributes,
  children,
}: TreeChildOptions): TreeElement => {
  return {
    type: 'element',
    tagName,
    properties: extendElementHtmlAttributes(attributes),
    children,
  };
};

const createTextElement = (
  textValue: string,
  { attributes }: Omit<TreeChildOptions, 'tagName' | 'children'>,
) =>
  createElement({
    tagName: 'span',
    attributes,
    children: [
      {
        type: 'text',
        value: textValue,
      },
    ],
  });

export const htmlToTree = (html: string) =>
  mapDocument<TreeChild>(html, {
    onText: ({ textOptions, textValue }) => {
      return createTextElement(textValue, {
        attributes: { style: optionsToCssVarsString(textOptions) },
      });
    },
    onElement: (context) => {
      if (context.contextType === 'content') {
        if (context.elementType === 'htmltag') {
          const { tagName, htmlAttributes, children } = context;
          let attributes = extendElementHtmlAttributes(htmlAttributes);

          if (PARAGRAPH_TAG_NAMES.includes(tagName as any)) {
            attributes = extendElementHtmlAttributes(attributes, {
              style: optionsToCssVarsString(context.paragraphOptions),
            });
          }

          return createElement({
            tagName,
            attributes,
            children,
          });
        }

        if (context.elementType === 'counter') {
          const {
            tagName,
            elementOptions: { counterType },
            textOptions,
            htmlAttributes,
          } = context;

          return createElement({
            tagName,
            attributes: {
              style: optionsToCssVarsString(textOptions),
              ['data-counter-type']: counterType,
            },
            children: [],
          });
        }

        if (
          context.elementType === 'header' ||
          context.elementType === 'footer' ||
          context.elementType === 'content'
        ) {
          const { children } = context;
          return { type: 'root', children };
        }
      }

      if (context.contextType === 'stack') {
        if (context.elementType === 'stack') {
          const { children, stackOptions, elementOptions } = context;
          return {
            options: merge(elementOptions, stackOptions),
            children,
          };
        }
      }

      if (context.contextType === 'document') {
        const { children, documentOptions } = context;
        return { options: documentOptions, stacks: children };
      }
    },
  });
