import { type ISectionOptions } from 'docx';

export {
  TextRun,
  Document,
  Paragraph,
  Table,
  TableRow,
  TableCell,
  Header,
  Footer,
} from 'docx';

export class Section {
  options: ISectionOptions;

  constructor(options: ISectionOptions) {
    this.options = options;
  }
}
