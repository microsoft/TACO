
declare module TSStyleCop.Rules {
    export interface IDocumentation {
        summary: string;
        parameters: IDocumentationParameter[];
        returns?: string;
    }

    export interface IDocumentationParameter {
        name?: string;
        text?: string;
    }
}