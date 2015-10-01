declare module BuildConfig {
    export interface IBuildConfig {
        src: string;
        templates: string;
        build: string;
        buildSrc: string;
        buildPackages: string;
        buildTools: string;
        buildTemplates: string;
        tsCompileOptions: any;
    }
}
