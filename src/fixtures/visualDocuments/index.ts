import type { DocumentRootComponent } from '../../lib/reactToHtml';
import { BreaksDocument } from './breaksDocument';
import { ColumnsDocument } from './columnsDocument';
import { GridDocument } from './gridDocument';
import { LinksDocument } from './linksDocument';
import { ListsDocument } from './listsDocument';
import { MediaDocument } from './mediaDocument';
import { NavigationDocument } from './navigationDocument';
import { SplitDocument } from './splitDocument';
import { SvgDocument } from './svgDocument';
import { TableDocument } from './tableDocument';
import { TypographyDocument } from './typographyDocument';

export type VisualDocument = {
  /** Baseline file names are derived from this, so it is kebab case and stable. */
  readonly name: string;
  readonly Document: DocumentRootComponent;
};

/**
 * One small, deterministic document per feature area. They are deliberately
 * short: a baseline is a committed PNG per page, so breadth of coverage has to
 * come from having several focused fixtures rather than one long document.
 */
export const VISUAL_DOCUMENTS: ReadonlyArray<VisualDocument> = [
  { name: 'typography', Document: TypographyDocument },
  { name: 'grid', Document: GridDocument },
  { name: 'split', Document: SplitDocument },
  { name: 'columns', Document: ColumnsDocument },
  { name: 'breaks', Document: BreaksDocument },
  { name: 'lists', Document: ListsDocument },
  { name: 'links', Document: LinksDocument },
  { name: 'svg', Document: SvgDocument },
  { name: 'media', Document: MediaDocument },
  { name: 'navigation', Document: NavigationDocument },
  { name: 'table', Document: TableDocument },
];
