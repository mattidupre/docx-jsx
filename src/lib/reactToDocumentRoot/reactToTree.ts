import ReactReconciler from 'react-reconciler';
import { type ReactElement } from 'react';
import { APP_NAME } from '../../entities/primitives.js';
import {
  htmlAttributesToData,
  type TreeElement,
  type TreeText,
  type TreeChild,
  type TreeRoot,
} from '../../entities/tree.js';
import { htmlToTree } from '../../entities/tree.js';

const throwIfInvoked = () => {
  throw new Error(
    [
      'Unused Renderer method called.',
      `If encountering this, ${APP_NAME} ReactReconciler hostConfig needs to be updated.`,
    ].join(' '),
  );
};

const hostConfig = {
  supportsMutation: true,
  supportsPersistence: false,
  createInstance: (
    tagName,
    { children, ...properties },
    rootContainer,
    prevContext,
  ): TreeElement => {
    console.log('createInstance', tagName);
    prevContext.tagName = tagName;
    // TODO: Move to entities/elements
    return {
      type: 'element',
      tagName,
      properties,
      children: [],
      data: htmlAttributesToData(properties),
    };
  },
  createTextInstance: (text): TreeText => {
    // TODO: Move to entities/elements
    return {
      type: 'text',
      value: text,
      data: { elementType: 'text', options: { text } },
    };
  },
  appendInitialChild: (parent, child) => {
    parent.children.push(child);
  },
  appendChildToContainer: (container: TreeRoot, child: TreeChild) => {
    (container.children as Array<TreeChild>).push(child);
  },
  shouldSetTextContent: () => false,
  appendChild: throwIfInvoked,
  commitUpdate: throwIfInvoked,
  commitTextUpdate: throwIfInvoked,
  removeChild: throwIfInvoked,
  clearContainer: () => {},
  finalizeInitialChildren: (instance, type, props) => {
    if (props.dangerouslySetInnerHTML?.__html) {
      if (props.children?.length) {
        throw new Error(
          'Do not combine dangerouslySetInnerHTML with children.',
        );
      }
      const children = htmlToTree(
        props.dangerouslySetInnerHTML.__html,
      ).children;
      instance.children = children;
      delete instance.properties.dangerouslySetInnerHTML;
    }
    return false;
  },
  prepareForCommit: () => null,
  getRootHostContext: () => {
    return {
      tagName: 'root',
      counter: 1,
    };
  },
  getChildHostContext: (prevContext) => {
    console.log('getChildHostContext', prevContext.tagName);
    return {
      tagName: prevContext.tagName,
      counter: prevContext.counter + 1,
    };
  },
  resetAfterCommit: () => {},
  resetTextContent: () => {},
  prepareUpdate: () => true,
  detachDeletedInstance: () => {},
  removeChildFromContainer: () => {},
  getPublicInstance: (instance) => instance,
} as const satisfies Partial<
  ReactReconciler.HostConfig<
    any,
    any,
    any,
    any,
    any,
    any,
    any,
    any,
    any,
    any,
    any,
    any,
    any
  >
>;

export const createRenderer = () => {
  const Renderer = ReactReconciler(hostConfig as any);

  return async (reactElement: ReactElement): Promise<TreeRoot> => {
    const root: TreeRoot = {
      type: 'root',
      children: [],
      data: { elementType: 'root', options: {} },
    };

    const node = Renderer.createContainer(
      root,
      0,
      null,
      true,
      null,
      '',
      (err) => {
        throw err;
      },
      null,
    );

    return new Promise((resolve, reject) => {
      try {
        Renderer.updateContainer(reactElement, node, null, () => {
          resolve(root);
        });
      } catch (err) {
        reject(err);
      }
    });
  };
};
