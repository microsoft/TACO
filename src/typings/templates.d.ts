declare module Templates {
    interface ITemplateMetaData {
        [kitName: string]: {
            [templateName: string]: {
                name: string;
                url: string;
            };
        };
    }
}