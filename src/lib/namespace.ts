import { createElement as createElementFn } from './createElement';
import { Fragment as FragmentComponent } from './Fragment';

export namespace DocXJSX {
  export const createElement = createElementFn;
  export const Fragment = FragmentComponent;
}
