import { Document, Packer } from 'docx';
import { type PrimitiveName, type FunctionElement } from './entities';
import { renderDocXElement, GetRenderedElement } from './renderDocXElement';

type EntryElement = FunctionElement<PrimitiveName, { children: any }>;

export const renderToDocX = async <T extends EntryElement>(element: T) => {
  const instance = renderDocXElement(element);

  const sections = [
    { children: Array.isArray(instance) ? instance : [instance] },
  ];

  console.log(sections);

  // @ts-ignore
  const document = new Document({
    sections,
  });

  const buffer = await Packer.toBuffer(document); // TODO: Streams work too?

  return buffer;
};
