import {
  TextRun,
  Paragraph,
  Table,
  TableRow,
  TableCell,
  Header,
  Footer,
  type ISectionOptions,
} from 'docx';

class Section {
  options: ISectionOptions;

  constructor(options: ISectionOptions) {
    this.options = options;
  }
}

export const isDocXSectionInstance = (
  value: any,
): value is InstanceType<typeof Section> => value.constructor === Section;

export const DOCX_CLASSES = {
  TextRun,
  Paragraph,
  Table,
  TableRow,
  TableCell,
  Header,
  Footer,
  Section,
} as const;

export const DOCX_CLASS_NAMES = Object.keys(DOCX_CLASSES) as ReadonlyArray<
  keyof typeof DOCX_CLASSES
>;

export type DocXClassName = keyof DocXClasses;
export type DocXClasses = typeof DOCX_CLASSES;
export type DocXClass = DocXClasses[DocXClassName];
export type DocXInstance = InstanceType<DocXClass>;
export type DocXAny = DocXClassName | DocXClass | DocXInstance;

export type AsDocXClass<TDocX extends DocXAny = DocXClassName> =
  TDocX extends DocXClassName
    ? DocXClasses[TDocX]
    : TDocX extends DocXClasses[DocXClassName]
    ? TDocX
    : TDocX extends InstanceType<DocXClasses[DocXClassName]>
    ? DocXClasses[AsDocXClassName<TDocX>]
    : never;

export type AsDocXClassName<TDocX extends DocXAny> = TDocX extends DocXClassName
  ? TDocX
  : keyof {
      [N in DocXClassName as TDocX extends
        | DocXClasses[N]
        | InstanceType<DocXClasses[N]>
        ? N
        : never]: any;
    };

export type AsDocXInstance<TDocX extends DocXAny> = InstanceType<
  AsDocXClass<TDocX>
>;

export type DocXOptions<TDocX extends DocXAny = DocXAny> = Extract<
  ConstructorParameters<AsDocXClass<TDocX>>[0],
  Record<string, any>
>;

export const isDocXClassName = (value: any): value is DocXClassName =>
  DOCX_CLASS_NAMES.includes(value);

export const isDocXInstance = <TName extends undefined | DocXClassName>(
  value: any,
  name?: TName,
): value is TName extends DocXClassName
  ? AsDocXInstance<TName>
  : DocXInstance => {
  if (name !== undefined) {
    if (!isDocXClassName(name)) {
      throw new Error(`Invalid DocX class name "${name}".`);
    }
    return value instanceof DOCX_CLASSES[name];
  }
  return !!Object.values(DOCX_CLASSES).find(
    (docXClass) => value instanceof docXClass,
  );
};

export const createDocXInstance = <N extends DocXClassName>(
  className: N,
  options: DocXOptions<N>,
): InstanceType<AsDocXClass<N>> => {
  return new DOCX_CLASSES[className](options as any) as any;
};

export const isSectionInstances = (
  value: any,
): value is ReadonlyArray<AsDocXInstance<'Section'>> =>
  Array.isArray(value) && value.every((val) => isDocXInstance(val, 'Section'));

export const parseSectionInstances = (sections: ReadonlyArray<unknown>) =>
  sections.map((section) => {
    if (!isDocXInstance(section, 'Section')) {
      throw new Error('Child is not a DocX Section instance.');
    }
    return {
      ...section.options,
      children: section.options.children ?? [],
    };
  });
