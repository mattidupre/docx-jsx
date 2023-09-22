import { type Props, type Element } from './element';

const IS_EXOTIC_COMPONENT_KEY = '__isExoticComponent';

export type ComponentFn<TProps extends Props = Props> = (
  props: TProps,
) => null | Element;

export type ExoticComponent<TProps extends Props = Props> = {
  [IS_EXOTIC_COMPONENT_KEY]: true;
  (props: TProps): void;
};

export const isExoticComponent = (value: any): value is ExoticComponent =>
  value?.[IS_EXOTIC_COMPONENT_KEY] === true;

export const defineExoticComponent = <TProps extends Props>(
  render: (props: TProps) => void,
): ExoticComponent<TProps> =>
  Object.assign((props: TProps) => render(props), {
    [IS_EXOTIC_COMPONENT_KEY]: true,
  } as const);
