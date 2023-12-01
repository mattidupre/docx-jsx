import ReactReconciler from 'react-reconciler';
import { createReactHostConfig } from './createReactHostConfig.js';
import * as Hast from 'hast';
import { fromHtmlIsomorphic } from 'hast-util-from-html-isomorphic';
import type { ReactElement } from 'react';
import { camelCase, mapKeys } from 'lodash-es';

// If encountering any bugs with react-reconciler, use:
//   fromHtmlIsomorphic(renderToStaticMarkup(element));
// Leaving this as-is for fine-grained debugging and future feature work.

// Originally wanted to:
// 1. extend nested options (e.g., bold w/ <b>) here.
// 2. flatten extraneous nodes.
// 3. instantiate docx tree.
// However, React renders from the inside out so it gets messy.

const parseProperties = (properties: Record<string, unknown>) =>
  mapKeys(properties, (value, key) => camelCase(key)) as Hast.Properties;

let RendererLazy: ReturnType<typeof ReactReconciler>;
const getRenderer = () => {
  if (!RendererLazy) {
    RendererLazy = ReactReconciler(
      createReactHostConfig({
        createInstance: (
          tagName,
          { children, ...properties },
          rootContainer,
          hostContext,
        ): Hast.Element => ({
          type: 'element',
          properties,
          tagName,
          children: [],
        }),
        createTextInstance: (text, rootContainer, hostContext): Hast.Text => {
          return {
            type: 'text',
            value: text,
          };
        },
        appendInitialChild: (parent, child) => {
          parent.children.push(child);
        },
        finalizeInitialChildren: (instance, type, props, hostContext) => {
          if ('dangerouslySetInnerHTML' in instance.properties) {
            if (
              'children' in instance.properties &&
              instance.properties.children !== undefined
            ) {
              throw new Error(
                'Do not combine dangerouslySetInnerHTML with children.',
              );
            }
            const children = fromHtmlIsomorphic(
              instance.properties.dangerouslySetInnerHTML.__html,
              { fragment: true },
            ).children;
            instance.children = children;
            delete instance.properties.dangerouslySetInnerHTML;
          }

          // Keep properties identical to HAST properties.
          instance.properties = parseProperties(instance.properties);

          return false;
        },
        appendChildToContainer: (container, child) => {
          container.children.push(child);
        },
        getRootHostContext: () => ({
          parentTypes: [] as ReadonlyArray<string>,
        }),
        getChildHostContext: ({ parentTypes }, type) => {
          return { parentTypes: [...parentTypes, type] };
        },
      }),
    );
  }
  return RendererLazy;
};

export const reactToHast = async (
  reactElement: ReactElement,
): Promise<Hast.Root> => {
  const Renderer = getRenderer();

  const hastElement: Hast.Root = {
    type: 'root',
    children: [],
  };

  const containerInfo = Renderer.createContainer(
    hastElement,
    0,
    null,
    true,
    null,
    '',
    (error) => {
      throw error;
    },
    null,
  );

  return new Promise((resolve) => {
    Renderer.updateContainer(reactElement, containerInfo, null, () => {
      resolve(hastElement);
    });
  });
};
