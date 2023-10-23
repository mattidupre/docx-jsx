import { SCHEMA } from 'src/entities';
import { mapObjectValues } from 'src/utils';
export const mapChildren = (obj, onChild, currentSchema = SCHEMA) => {
    return mapObjectValues(obj, (key, value) => {
        const thisSchema = currentSchema[key];
        if (thisSchema === undefined) {
            return value;
        }
        if (typeof thisSchema === 'string' || Array.isArray(thisSchema)) {
            return onChild(value, thisSchema);
        }
        return mapChildren(value, onChild, thisSchema);
    });
};
//# sourceMappingURL=mapChildren.js.map