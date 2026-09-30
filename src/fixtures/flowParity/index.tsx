import { DocumentProvider } from '../../reactComponents';
import { BreakSections } from './breakSections';
import { ColumnSections } from './columnSections';
import { FlowSections } from './flowSections';
import { MasonrySections } from './masonrySections';
import { TrimSections } from './trimSections';
import { FLOW_PARITY_FONTS } from './shared';

export { FLOW_PARITY_FONTS, FLOW_PARITY_FONT_SRC } from './shared';

export const FLOW_PARITY_SECTIONS = [
  'flow',
  'breaks',
  'columns',
  'trim',
  'masonry',
] as const;

export type FlowParitySection = (typeof FLOW_PARITY_SECTIONS)[number];

/** The probes of the requested sections as one document. */
export const createFlowParityDocument = (
  sections: ReadonlyArray<FlowParitySection>,
) =>
  function FlowParityDocument() {
    return (
      <DocumentProvider fonts={FLOW_PARITY_FONTS}>
        {sections.includes('flow') && <FlowSections />}
        {sections.includes('breaks') && <BreakSections />}
        {sections.includes('columns') && <ColumnSections />}
        {sections.includes('trim') && <TrimSections />}
        {sections.includes('masonry') && <MasonrySections />}
      </DocumentProvider>
    );
  };
