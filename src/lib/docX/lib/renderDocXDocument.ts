// import { type ReactElement, type ReactNode, createElement } from 'react';
// import { TextRun } from 'src/lib/components';
// import {
//   renderDocument,
//   renderNode,
//   isIntrinsicElement,
//   isNullish,
//   isStringish,
//   type Child,
// } from 'src/lib/document';
// import { asArray } from 'src/utils';
// import { asDocXInstance, type DocXInstance } from '../entities';

// // TODO: Parameter types
// const renderDocXInstance = (
//   type: any,
//   props: Record<string, unknown>,
//   render: typeof renderDocXNode,
// ) => {
//   switch (type) {
//     default:
//       return asDocXInstance(
//         type,
//         props['children'] === undefined
//           ? props
//           : {
//               ...props,
//               children: render(props.children as any),
//             },
//       );
//   }
// };

// const renderDocXNode = (
//   node: ReactNode,
//   wrap: () => any,
// ): ReadonlyArray<DocXInstance> =>
//   asArray<Child>(node).flatMap((child) => {
//     if (isNullish(child)) {
//       return [];
//     }

//     if (isStringish(child)) {
//       const textElement = createElement(TextRun, { text: String(child) });
//       const textNode = wrap(() => renderNode(textElement));
//       return renderDocXNode(textNode, wrap);
//     }

//     if (isIntrinsicElement(child)) {
//       if (child.type === 'textrun') {
//         // console.log('AFTER', child.props);
//       }
//       return renderDocXInstance(child.type, child.props, (node) =>
//         renderDocXNode(node, wrap),
//       );
//     }

//     console.log(child);

//     return wrap(() => renderDocXNode(renderNode(child as any), wrap));
//   }) as any;

// export const renderDocXDocument = (rootEl: ReactElement) =>
//   asDocXInstance(
//     'document',
//     renderDocument('docx', rootEl, (node, wrap) => {
//       if (
//         isIntrinsicElement(node, 'header') ||
//         isIntrinsicElement(node, 'footer')
//       ) {
//         return asDocXInstance('header', {
//           children: renderDocXNode(node.props.children, wrap),
//         });
//       }
//       return renderDocXNode(node, wrap);
//     }),
//   );
