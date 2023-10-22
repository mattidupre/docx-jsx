import { type UnitsNumber } from 'src/utils';
export declare const PAGE_TYPES: readonly ["default", "even", "odd", "first"];
export type PageType = (typeof PAGE_TYPES)[number];
export declare function assertPageType(value: any): asserts value is PageType;
export declare const mapPageTypes: <TSourceObj extends Partial<Record<"default" | "even" | "odd" | "first", any>>, TReturn>(obj: TSourceObj, fn: <TPageType extends "default" | "even" | "odd" | "first">(pageType: TPageType, value: TSourceObj[TPageType]) => TReturn) => Record<"default" | "even" | "odd" | "first", TReturn>;
export type PageOptions = {
    width: UnitsNumber;
    height: UnitsNumber;
    marginTop: UnitsNumber;
    marginRight: UnitsNumber;
    marginBottom: UnitsNumber;
    marginLeft: UnitsNumber;
    headerHtml: false | string;
    footerHtml: false | string;
};
type PageTypesOptions = Partial<Record<PageType, Partial<PageOptions>>>;
export declare const parsePageTypes: (pageTypes?: PageTypesOptions) => Record<"default" | "even" | "odd" | "first", PageOptions>;
export type PagesGroupOptions = {
    contentHtml: string;
    id: string;
    pageTypes?: PageTypesOptions;
};
export {};
