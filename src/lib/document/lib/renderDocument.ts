import { type ReactElement, type ReactNode } from 'react';
import {
  bindGlobalDispatcher,
  bindNodeDispatcher,
  type RenderEnvironment,
} from 'src/lib/renderer';
import {
  isNullish,
  isIntrinsicElement,
  type IntrinsicElement,
  type IntrinsicType,
  type RenderedNode,
  isRenderedNode,
} from '../entities';
import { renderNode } from './renderNode';
import { mapObjectEntries } from 'src/utils';

const getItrinsic = <TType extends IntrinsicType, TSingle extends boolean>(
  node: ReactNode,
  type: TType,
  single: TSingle,
): TSingle extends true
  ? null | IntrinsicElement<TType>
  : ReadonlyArray<IntrinsicElement<TType>> => {
  const nodes = renderNode(node).filter((child) => {
    if (isNullish(node)) {
      return false;
    }
    if (!isIntrinsicElement(child, type)) {
      throw new Error(`Node must only return ${type} Intrinsic Elements.`);
    }
    return true;
  });
  if (!single) {
    return nodes as any;
  }
  if (nodes.length > 1) {
    throw new Error('Node may only return 0 or 1 Intrinsic Elements.');
  }
  return (nodes[0] ?? null) as any;
};

// TODO: How to handle Context set in Document?
// create StartNode(callback) and FinishNode() that try catch instead of try finally.

type RenderNext = <TFn extends () => any>(fn: TFn) => ReturnType<TFn>;

export const renderDocument = (
  renderEnvironment: RenderEnvironment,
  rootEl: ReactElement,
  renderContent: (
    renderedNode: RenderedNode,
    renderNext: RenderNext,
  ) => unknown,
) =>
  bindGlobalDispatcher(renderEnvironment, () => {
    const renderNext: RenderNext = (fn) => {
      return bindNodeDispatcher(fn)();
    };

    const documentElement = getItrinsic(rootEl, 'document', true);
    if (!documentElement) {
      throw new Error('Missing Document element.');
    }

    const {
      props: { children: documentChildren, ...documentOptions },
    } = documentElement;

    if (!isRenderedNode(documentChildren)) {
      throw new Error('Document children is not a valid node.');
    }

    const sectionOptions = getItrinsic(
      documentChildren,
      'section',
      false,
    ).flatMap((sectionElement) => {
      const {
        props: {
          children: sectionChildren,
          header: headersProp,
          footer: footersProp,
          ...options
        },
      } = sectionElement;

      if (!isRenderedNode(sectionChildren)) {
        throw new Error('Section children is not a valid Node.');
      }

      const children = renderContent(sectionChildren, renderNext);

      const header = mapObjectEntries(
        headersProp ?? {},
        (key, headerElement) => {
          const instance = getItrinsic(headerElement, 'header', true);
          return instance
            ? [key, renderContent(instance, renderNext)]
            : undefined;
        },
      );

      const footer = mapObjectEntries(
        footersProp ?? {},
        (key, footerElement) => {
          const instance = getItrinsic(footerElement, 'footer', true);
          return instance
            ? [key, renderContent(instance, renderNext)]
            : undefined;
        },
      );

      return { ...options, header, children, footer };
    });

    if (!sectionOptions.length) {
      throw new Error('Document must have at least one Section.');
    }

    return {
      sections: sectionOptions,
      ...documentOptions,
    };
  })();
