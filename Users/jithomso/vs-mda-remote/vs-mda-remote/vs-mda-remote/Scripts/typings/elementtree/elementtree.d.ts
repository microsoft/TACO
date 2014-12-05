// Barebones typing for elementtree, added as-needed

declare module "elementtree" {
    export class ElementTree {
        constructor(xml: XMLElement);

        getroot(): XMLElement
        find(name: string): XMLElement;
        findall(name: string): XMLElement[];
    }

    class XMLElement {
        attrib: { [key: string] : string };
        text: string;
    }

    export function XML(data: string): XMLElement;
}