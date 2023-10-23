import { Type, Kind, TypeRegistry, } from '@sinclair/typebox';
import { Value } from '@sinclair/typebox/value';
const ELEMENT_SCHEMA_KEY = Symbol('Element schema key');
TypeRegistry.Set('Element', (schema, value) => {
    const { nodeType, elementTypes, required } = schema[ELEMENT_SCHEMA_KEY];
    return true;
});
const Element = ({ nodeType, decoder, }) => (elementTypes, required) => {
    const elementDefinition = {
        nodeType,
        elementTypes,
        required,
    };
    return Type.Transform(Type.Unsafe({
        [Kind]: 'Element',
        [ELEMENT_SCHEMA_KEY]: elementDefinition,
    })).Decode((node) => {
        return decoder({
            node: node,
            elementDefinition,
        });
    });
};
const createSubschemas = (options) => ({
    Child: Element({ nodeType: 'child', ...options }),
    Children: Element({ nodeType: 'children', ...options }),
});
export const defineSchema = (callback) => (elementHandler) => {
    const elementsSchema = {};
    const decoder = ({ node, elementDefinition }) => elementHandler(node, {
        elementDefinition,
        decodeElement: ({ type, props }) => {
            return Value.Decode(elementsSchema[type], props);
        },
    });
    Object.assign(elementsSchema, callback(createSubschemas({ elementsSchema, decoder })));
    return (node, rootElementType) => decoder({
        node,
        elementDefinition: {
            nodeType: 'child',
            elementTypes: [rootElementType],
            required: true,
        },
    });
};
//# sourceMappingURL=defineSchema.js.map