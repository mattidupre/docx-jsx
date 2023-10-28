import ReactReconciler from 'react-reconciler';
import { type ReactElement } from 'react';

const unused = () => {
  throw new Error('Unused Renderer method called.');
};

const hostConfig: Partial<
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
> = {
  supportsMutation: true,
  supportsPersistence: false,
  createInstance: (type, { children, ...properties }) => ({
    type: 'element',
    tagName: type,
    properties,
    children: [],
  }),
  createTextInstance: (text) => ({ type: 'text', value: text }),
  appendInitialChild: (parent, child) => {
    parent.children.push(child);
  },
  appendChildToContainer: (container, child) => {
    container.children.push(child);
  },
  shouldSetTextContent: () => false,
  appendChild: unused,
  commitUpdate: unused,
  commitTextUpdate: unused,
  removeChild: unused,
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
};

const Renderer = (ReactReconciler as any)(hostConfig);

export const reactToAst = async (reactElement: ReactElement) => {
  const root = {
    type: 'root',
    children: [],
  };

  const node = Renderer.createContainer(root);

  return new Promise((resolve) => {
    Renderer.updateContainer(reactElement, node, null, () => {
      resolve(root);
    });
  });
};
