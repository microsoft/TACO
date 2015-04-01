declare module TemplateHelper2 {
    interface ITemplateMetaData {
        [kitName: string]: {
            [templateName: string]: {
                name: string;
                url: string;
            };
        };
    }
}