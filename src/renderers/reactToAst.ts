import ReactReconciler from 'react-reconciler';
import { type ReactElement } from 'react';
import { type RootContent } from 'hast';
import {
  HTML_TYPE_ATTRIBUTE,
  HTML_DATA_ATTRIBUTE,
  PAGE_TYPES,
  type PageTypesOptions,
} from 'src/entities';
import { type UnitsNumber } from 'src/utils/units';

const mutatePageGroupElement = (element: ReactAst) => {
  const pageTypes: Record<PageType, { header?: ReactAst; footer?: ReactAst }> =
    {
      default: { ...DEFAULT_PAGE_OPTIONS },
      first: { ...DEFAULT_PAGE_OPTIONS },
      even: { ...DEFAULT_PAGE_OPTIONS },
      odd: { ...DEFAULT_PAGE_OPTIONS },
    };

  element.children = element.children!.flatMap((child) => {
    if (isHeader(child) || isFooter(child)) {
      pageTypes[child.elementData.pageType][child.elementType] = child;
      return [];
    }
    return child;
  });

  element.elementData = {
    ...element,
  };
};

const unused = () => {
  throw new Error(
    [
      'Unused Renderer method called.',
      'If encountering this, ReactReconciler hostConfig needs to be updated.',
    ].join(' '),
  );
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
  createInstance: (type, { children, ...props }): ReactAst => {
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
  createTextInstance: (text): ReactAst => ({
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
  finalizeInitialChildren: (element: ReactAst) => {
    if (element.elementType === 'pagegroup') {
      mutatePageGroupElement(element);
    }
    return false;
  },
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
): Promise<ReactAst> => {
  const root: ReactAst = {
    elementType: 'root',
    type: 'root',
    children: [],
  };

  const node = Renderer.createContainer(root);

  return new Promise((resolve) => {
    Renderer.updateContainer(reactElement, node, null, () => {
      console.log(root.children[0].children[0]);
      resolve(root as any);
    });
  });
};
