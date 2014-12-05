// Barebones typing for plist-with-patches, added as-needed

declare module "plist-with-patches" {
    export function parseFileSync(filename: string): Buffer;

    /** 
    * generate an XML plist string from the input object 
    * 
    * @param object obj the object to convert 
    * @return string converted plist 
    */ 
    export function build(obj: any): string;
}