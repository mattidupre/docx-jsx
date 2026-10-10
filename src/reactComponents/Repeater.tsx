import {
  Fragment,
  createContext,
  useContext,
  useId,
  type Key,
  type ReactNode,
} from 'react';
import type {
  RepeatingRowGroup,
  TypographyOptions,
  VariantName,
} from '../entities';
import { InternalElement } from './InternalElement';
import type { ExtendableProps } from './entities';

type BlockPresentation = ExtendableProps &
  TypographyOptions & { variant?: VariantName };

export type RepeaterProps<T> = {
  name: string;
  title?: string;
  items: ReadonlyArray<T>;
  getKey: (item: T, index: number) => Key;
  children: (item: T, index: number) => ReactNode;
  /** One starter item when items is empty, rendered in every output context. */
  emptyItem?: () => ReactNode;
} & (
  | ({ mode?: 'blocks' } & BlockPresentation)
  /** Rows preserves the table's HTML structure; styles belong on TableRow. */
  | ({ mode: 'rows' } & { [Option in keyof BlockPresentation]?: never })
);

export const RepeatingRowsContext = createContext<
  ReadonlyArray<RepeatingRowGroup>
>([]);
export const RepeaterRowsAllowedContext = createContext(false);

/** Internal metadata carried by real rows, without a wrapper inside tbody. */
export const useRepeatingRows = () => useContext(RepeatingRowsContext);

/** A React loop whose items remain a native repeating section in Word. */
export function Repeater<T>({
  name,
  title = name,
  items,
  getKey,
  children,
  emptyItem,
  mode = 'blocks',
  variant,
  className,
  style,
  ...typography
}: RepeaterProps<T>) {
  const id = useId();
  const parentRows = useRepeatingRows();
  const rowsAllowed = useContext(RepeaterRowsAllowedContext);
  if (!name.trim() || !title.trim()) {
    throw new TypeError('Repeater name and title must not be blank.');
  }
  if (
    mode === 'rows' &&
    (variant || className || style || Object.keys(typography).length)
  ) {
    throw new TypeError(
      'Style repeated rows on TableRow, not on a rows-mode Repeater.',
    );
  }
  if (mode === 'rows' && !rowsAllowed) {
    throw new TypeError(
      'A rows-mode Repeater must be inside the body of Table.',
    );
  }
  if (mode === 'blocks' && rowsAllowed) {
    throw new TypeError(
      'Use a rows-mode Repeater in Table, or place block Repeater inside TableCell.',
    );
  }
  const renderItem = (content: ReactNode, key: string) => {
    if (content == null || typeof content === 'boolean') return null;
    if (mode === 'rows') {
      return (
        <RepeatingRowsContext.Provider
          key={key}
          value={[...parentRows, { id, name, title, item: key }]}
        >
          {content}
        </RepeatingRowsContext.Provider>
      );
    }
    return (
      <InternalElement
        key={key}
        tagName="div"
        elementType="repeaterItem"
        elementOptions={{}}
      >
        {content}
      </InternalElement>
    );
  };
  const keys = new Set<string>();
  const renderedItems = items.map((item, index) => {
    const key = String(getKey(item, index));
    if (keys.has(key))
      throw new TypeError(`Repeater "${name}" has duplicate key "${key}".`);
    keys.add(key);
    return renderItem(children(item, index), key);
  });
  if (items.length === 0 && emptyItem) {
    renderedItems.push(renderItem(emptyItem(), 'empty'));
  }
  const rendered = renderedItems.filter((item) => item !== null);
  if (mode === 'rows') return <Fragment>{rendered}</Fragment>;
  if (rendered.length === 0) return null;
  return (
    <InternalElement
      tagName="div"
      elementType="repeater"
      elementOptions={{ name, title }}
      variant={variant}
      className={className}
      style={style}
      typography={typography}
    >
      {rendered}
    </InternalElement>
  );
}
