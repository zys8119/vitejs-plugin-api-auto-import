import { Plugin } from "vite";
export interface AutoApi {
    [key: string]: any;
    name: string;
    dir: string;
    constApiData: string;
    outFile: string;
    include: RegExp[];
    resolvers?: Resolver[];
    resolveAliasName?: string;
    autoResolveAliasName?: boolean;
    exclude?: RegExp;
    allExport?: boolean;
    import?: string | boolean;
}
export interface Resolver {
    from: string;
    resolve(importData: any): Record<any, any>;
}
export declare function autoApi(options?: Partial<AutoApi>): Plugin;
export default autoApi;
