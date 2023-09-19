import {
  TextRun,
  Paragraph,
  Table,
  TableRow,
  TableCell,
  Header,
  Footer,
} from 'docx';

export const DOCX_CLASSES = {
  TextRun,
  Paragraph,
  Table,
  TableRow,
  TableCell,
  Header,
  Footer,
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

export const createDocXInstance = <N extends DocXClassName>(
  className: N,
  options: DocXOptions<N>,
): InstanceType<AsDocXClass<N>> => {
  return new DOCX_CLASSES[className](options as any) as any;
};

export const isDocXInstance = (value: any): value is DocXInstance =>
  !!Object.values(DOCX_CLASSES).find((docXClass) => value instanceof docXClass);
