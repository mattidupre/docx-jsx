import {
  BuilderElement,
  FileChild,
  Table,
  TableCell,
  Header,
  Footer,
  Paragraph,
  LineRuleType,
  XmlComponent,
  type IContext,
  type IXmlableObject,
  type ITableOptions,
  type ITableCellOptions,
} from 'docx';
import type { RepeatingRowGroup } from '../../entities';

const WORD_2013_NAMESPACE =
  'http://schemas.microsoft.com/office/word/2012/wordml';

const valueElement = (name: string, value: string | number) =>
  new BuilderElement({
    name,
    attributes: { value: { key: 'w:val', value } },
  });

/** SDT wrappers are XML containers, not layout ancestors for docx's table width resolution. */
class RepeatingControl extends XmlComponent {
  private readonly properties: BuilderElement;

  constructor(
    id: number,
    private readonly children: ReadonlyArray<XmlComponent>,
    options?: { name: string; title: string },
  ) {
    super('w:sdt');
    this.properties = new BuilderElement({
      name: 'w:sdtPr',
      children: [
        ...(options
          ? [
              valueElement('w:alias', options.title),
              valueElement('w:tag', options.name),
            ]
          : []),
        valueElement('w:id', id),
        new BuilderElement({
          name: options ? 'w15:repeatingSection' : 'w15:repeatingSectionItem',
          children: options
            ? [valueElement('w15:sectionTitle', options.title)]
            : [],
        }),
      ],
    });
  }

  override prepForXml(context: IContext): IXmlableObject {
    const children = this.children
      .flatMap((child) => child.writtenAs ?? [child])
      .map((child) => child.prepForXml(context))
      .filter((child) => child !== undefined);
    return {
      'w:sdt': [
        { _attr: { 'xmlns:w15': WORD_2013_NAMESPACE } },
        this.properties.prepForXml(context),
        { 'w:sdtContent': children },
      ],
    };
  }
}

/** A real Word block, accepted by sections without pretending it is a paragraph. */
export class RepeatingBlock extends FileChild {
  private readonly component: RepeatingControl;

  constructor(
    private readonly id: number,
    readonly children: ReadonlyArray<FileChild>,
    private readonly options?: { name: string; title: string },
  ) {
    super('w:sdt');
    this.component = new RepeatingControl(id, children, options);
  }

  withChildren(children: ReadonlyArray<FileChild>): RepeatingBlock {
    return new RepeatingBlock(this.id, children, this.options);
  }

  override prepForXml(context: IContext): IXmlableObject {
    // Body resolves section geometry from its direct FileChild. Within a cell,
    // controls must stay invisible so Table can find cell/row/table ancestors.
    if (context.stack.some((parent) => parent instanceof TableCell)) {
      return this.component.prepForXml(context);
    }
    context.stack.push(this);
    try {
      return this.component.prepForXml(context);
    } finally {
      context.stack.pop();
    }
  }
}

/** Keep the dependency's normal cell properties and allow custom block children. */
export class RepeaterTableCell extends TableCell {
  constructor({
    children,
    ...options
  }: Omit<ITableCellOptions, 'children'> & {
    children: ReadonlyArray<FileChild>;
  }) {
    super({ ...options, children: [] });
    this.root.push(...children);
    if (children.at(-1) instanceof RepeatingBlock) {
      // Keep Word's cell-ending paragraph, without adding a normal-height blank line.
      this.root.push(
        new Paragraph({
          spacing: {
            before: 0,
            after: 0,
            line: 1,
            lineRule: LineRuleType.EXACT,
          },
        }),
      );
    }
  }
}

/** Header/footer APIs accept paragraphs and tables; this adapter emits the original block XML. */
class HeaderBlock extends Paragraph {
  constructor(private readonly block: FileChild) {
    super({});
  }
  override prepForXml(context: IContext): IXmlableObject | undefined {
    return this.block.prepForXml(context);
  }
}
const headerChildren = (children: ReadonlyArray<FileChild>) =>
  children.map((child) =>
    child instanceof Paragraph || child instanceof Table
      ? child
      : new HeaderBlock(child),
  );
export const createRepeaterHeader = (children: ReadonlyArray<FileChild>) =>
  new Header({ children: headerChildren(children) });
export const createRepeaterFooter = (children: ReadonlyArray<FileChild>) =>
  new Footer({ children: headerChildren(children) });

/** Apply paragraph spacing across transparent controls while keeping their IDs and structure. */
export const transformRepeatingBlocks = (
  blocks: ReadonlyArray<unknown>,
  transform: (blocks: ReadonlyArray<unknown>) => Array<unknown>,
): Array<unknown> => {
  const leaves: Array<unknown> = [];
  const flatten = (nodes: ReadonlyArray<unknown>) => {
    for (const node of nodes) {
      if (node instanceof RepeatingBlock) flatten(node.children);
      else leaves.push(node);
    }
  };
  flatten(blocks);
  const transformed = transform(leaves);
  let index = 0;
  const restore = (nodes: ReadonlyArray<unknown>): Array<unknown> =>
    nodes.map((node) => {
      if (!(node instanceof RepeatingBlock)) return transformed[index++];
      const children = restore(node.children);
      if (!children.every((child) => child instanceof FileChild)) {
        throw new TypeError('Repeater children must remain Word blocks.');
      }
      return node.withChildren(children);
    });
  return restore(blocks);
};

/** Preserve Table's width resolution and row-span preparation before grouping rows. */
class RepeatingTable extends Table {
  constructor(options: ITableOptions, children: ReadonlyArray<XmlComponent>) {
    super(options);
    const start = this.root.indexOf(options.rows[0]);
    if (start < 0) throw new TypeError('Expected a table row to wrap.');
    this.root.splice(start, options.rows.length, ...children);
  }
}

/** All generated control IDs belong to one document construction. */
export const createRepeaterFactory = () => {
  let nextId = 1;
  const block = (
    children: ReadonlyArray<FileChild>,
    options?: { name: string; title: string },
  ) => new RepeatingBlock(nextId++, children, options);
  const rowControl = (
    children: ReadonlyArray<XmlComponent>,
    options?: { name: string; title: string },
  ) => new RepeatingControl(nextId++, children, options);

  const table = (
    options: ITableOptions,
    paths: ReadonlyArray<ReadonlyArray<RepeatingRowGroup>>,
  ) => {
    const group = (
      start: number,
      end: number,
      depth: number,
    ): Array<XmlComponent> => {
      const output: Array<XmlComponent> = [];
      let index = start;
      while (index < end) {
        const current = paths[index][depth];
        if (!current) {
          output.push(options.rows[index++]);
          continue;
        }
        let groupEnd = index + 1;
        while (groupEnd < end && paths[groupEnd][depth]?.id === current.id)
          groupEnd++;
        const items: Array<XmlComponent> = [];
        while (index < groupEnd) {
          const item = paths[index][depth].item;
          let itemEnd = index + 1;
          while (itemEnd < groupEnd && paths[itemEnd][depth].item === item)
            itemEnd++;
          items.push(rowControl(group(index, itemEnd, depth + 1)));
          index = itemEnd;
        }
        output.push(rowControl(items, current));
      }
      return output;
    };
    return paths.some((path) => path.length > 0)
      ? new RepeatingTable(options, group(0, options.rows.length, 0))
      : new Table(options);
  };
  return { block, table };
};

export type RepeaterFactory = ReturnType<typeof createRepeaterFactory>;
