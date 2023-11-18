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
  createInstance: (tagName, { children, ...properties }): TreeElement => {
    return {
      type: 'element',
      tagName,
      properties,
      children: [],
      data: htmlAttributesToData(properties),
    };
  },
  createTextInstance: (text): TreeText => {
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
  finalizeInitialChildren: () => false,
  prepareForCommit: () => null,
  getRootHostContext: () => null,
  getChildHostContext: () => null,
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

const Renderer = ReactReconciler(hostConfig as any);

export const reactToTree = async (
  reactElement: ReactElement,
): Promise<TreeRoot> => {
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
