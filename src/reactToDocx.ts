import { Packer } from 'docx';
import { htmlToDocx, type HtmlToDocxOptions } from './parsers/docx';
import { patchPackedDocx } from './parsers/docx/patchPackedDocx';
import { reactToHtml, type DocumentRootComponent } from './lib/reactToHtml';

export const reactToDocx = async (
  DocumentRoot: DocumentRootComponent,
  options: HtmlToDocxOptions,
) =>
  patchPackedDocx(
    await Packer.toBuffer(
      await htmlToDocx(reactToHtml(DocumentRoot, 'docx'), options),
    ),
  );
