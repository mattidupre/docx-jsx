/// <reference types="react" />
export declare const schema: <TElementHandler extends (node: import("react").ReactNode, context: {
    elementDefinition: {
        nodeType: "child" | "children";
        elementTypes: readonly string[];
        required: boolean | undefined;
    };
    decodeElement: (element: import("react").ReactElement<object & {
        length?: undefined;
    }, string>) => any;
}) => any>(elementHandler: TElementHandler) => (node: import("react").ReactNode, rootElementType: string) => any;
