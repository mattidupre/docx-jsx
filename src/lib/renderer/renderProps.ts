import { SCHEMA } from 'src/entities';
import { mapObjectValues } from 'src/utils';
import { type ReactElement, type ReactNode } from 'react';

export type OnChildrenProp = (
  children: ReactNode,
  types: string | ReadonlyArray<string>,
) => unknown;

const mapProps = (
  currentObj: any,
  currentSchema: Record<string, any>,
  onChildren: OnChildrenProp,
) => {
  return mapObjectValues(currentObj, (key, value) => {
    const thisSchema = currentSchema[key];

    if (thisSchema === undefined) {
      return value;
    }

    if (typeof thisSchema === 'string' || Array.isArray(thisSchema)) {
      return onChildren(value, thisSchema);
    }

    return mapProps(value, thisSchema, onChildren);
  });
};

export const renderProps = (
  element: ReactElement<any, string>,
  onChildren: OnChildrenProp,
) => mapProps(element.props, SCHEMA[element.type], onChildren);
