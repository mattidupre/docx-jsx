import { renderDocX } from 'src/lib/docX';
import { Packer } from 'docx';
import { type ReactElement } from 'react';

export const renderToDocXBuffer = async (rootEl: ReactElement) =>
  Packer.toBuffer(renderDocX(rootEl));
