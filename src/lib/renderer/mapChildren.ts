import { SCHEMA } from 'src/entities';
import { mapObjectValues } from 'src/utils';

export const mapChildren = (
  obj: any,
  renderNode: (value: any) => ReadonlyArray<any>,
  parseChild: (value: any) => any,
  schemaOption: keyof typeof SCHEMA | Record<string, any>,
) => {
  const schemaObj =
    typeof schemaOption === 'string' ? SCHEMA[schemaOption] : schemaOption;

  const handleChild = (
    { type, props },
    expectedTypes: ReadonlyArray<string>,
  ) => {
    if (!expectedTypes.includes(type)) {
      throw new TypeError(
        `Invalid type "${type}", expected "${expectedTypes.join(' or ')}".`,
      );
    }

    const propsWithChildren = mapChildren(
      props,
      renderNode,
      parseChild,
      SCHEMA[type],
    );

    return parseChild({ type, props: propsWithChildren });
  };

  return mapObjectValues(obj, (key, value) => {
    const schemaValue = schemaObj[key];

    if (schemaValue === undefined) {
      return value;
    }

    if (typeof schemaValue === 'string') {
      const childElements = renderNode(value);
      if (childElements.length > 1) {
        throw new TypeError('Expected a single value.');
      }
      return handleChild(childElements[0], [schemaValue]);
    }

    if (Array.isArray(schemaValue)) {
      const childElements = renderNode(value);
      return childElements.map((child) => handleChild(child, schemaValue));
    }

    return mapChildren(value, renderNode, parseChild, schemaObj);
  });
};
