import ReactReconciler from 'react-reconciler';
import { type ReactElement } from 'react';
import { type RootContent } from 'hast';
import { HTML_TYPE_ATTRIBUTE, HTML_DATA_ATTRIBUTE } from 'src/entities';

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
  createInstance: (type, { children, ...props }) => {
    const elementType = props[HTML_TYPE_ATTRIBUTE];
    const elementDataStr = props[HTML_DATA_ATTRIBUTE];
    const elementData = elementDataStr
      ? JSON.parse(decodeURI(elementDataStr))
      : undefined;
    const properties = props;
    return {
      type: 'element',
      tagName: type,
      properties,
      children: [],
      elementType,
      elementData,
    };
  },
  createTextInstance: (text) => ({
    type: 'text',
    elementType: 'text',
    value: text,
  }),
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

export const reactToAst = async (
  reactElement: ReactElement,
): Promise<RootContent> => {
  const root = {
    elementType: 'root',
    type: 'root',
    children: [],
  };

  const node = Renderer.createContainer(root);

  return new Promise((resolve) => {
    Renderer.updateContainer(reactElement, node, null, () => {
      resolve(root as any);
    });
  });
};
