import { renderDocX } from 'src/lib/docX';
import { Packer } from 'docx';
import { type ReactElement } from 'react';

export const renderToDocXStream = async (rootEl: ReactElement) =>
  Packer.toStream(renderDocX(rootEl));
