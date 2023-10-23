import { SCHEMA } from 'src/entities';
import { mapObjectValues } from 'src/utils';
const mapProps = (currentObj, currentSchema, onChildren) => {
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
export const renderProps = (element, onChildren) => mapProps(element.props, SCHEMA[element.type], onChildren);
//# sourceMappingURL=renderProps.js.map