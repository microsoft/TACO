declare module NodeJS {

    export interface Domain {
        lang: string;
    }

    export interface Process extends EventEmitter {
        domain: Domain;
    }
}