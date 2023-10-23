export declare const SCHEMA: {
    readonly document: {
        readonly children: readonly ["pagesGroup"];
    };
    readonly pagesGroup: {
        readonly headers: {
            readonly default: "header";
            readonly even: "header";
            readonly odd: "header";
            readonly first: "header";
        };
        readonly children: readonly ["paragraph", "table"];
        readonly footers: {
            readonly default: "header";
            readonly even: "header";
            readonly odd: "header";
            readonly first: "header";
        };
    };
    readonly header: {
        readonly children: readonly ["paragraph", "table"];
    };
    readonly footer: {
        readonly children: readonly ["paragraph", "table"];
    };
    readonly paragraph: {
        readonly children: readonly ["textrun"];
    };
    readonly textrun: {
        readonly children: readonly ["textrun"];
    };
    readonly table: {};
};
