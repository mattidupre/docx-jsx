export type Nullish = true | false | null | undefined;
export declare const isNullish: (value: any) => value is Nullish;
export type Stringish = string | number;
export declare const isStringish: (value: any) => value is Stringish;
