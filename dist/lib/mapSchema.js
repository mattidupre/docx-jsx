import { SCHEMA } from 'src/entities';
export const mapChildren = (obj, renderNode, parseChild, schemaOption) => {
    const schemaObj = typeof schemaOption === 'string' ? SCHEMA[schemaOption] : schemaOption;
    const handleChild = ({ type, props }, expectedTypes) => {
        if (!expectedTypes.includes(type)) {
            throw new TypeError(`Invalid type "${type}", expected "${expectedTypes.join(' or ')}".`);
        }
        const propsWithChildren = mapChildren(props, renderNode, parseChild, SCHEMA[type]);
        return parseChild({ type, props: propsWithChildren });
    };
    return mapObjectValues(obj, (key, value) => {
        const schemaValue = schemaObj[key];
        if (schemaValue === undefined) {
            return [key, value];
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
//# sourceMappingURL=mapSchema.js.map