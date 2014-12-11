
/// <reference path="IDocumentation.d.ts" />
/// <reference path="../../TypeScript/tsc.d.ts" />
/// <reference path="../../RuleContext.ts" />

module TSStyleCop.Rules {
    export class DocumentationHelpers {
        public static parseXmlDoc(comment: TypeScript.SyntaxTrivia): IDocumentation {
            if (!DocumentationHelpers.isXmlDoc(comment)) {
                throw new Error("parseXmlDoc should be called on the first XML comment line");
            }

            var content: string = "";
            while (comment) {
                if (comment.kind() === TypeScript.SyntaxKind.SingleLineCommentTrivia) {
                    var text = comment.fullText();
                    var match = text.match(/^\/\/\/\s*(.*)$/);

                    if (match) {
                        content += match[1] + TypeScript.newLine();
                    }
                }

                comment = comment.nextTrivia;
            }

            var documentation: IDocumentation = { summary: "", parameters: [] };

            var xmlDoc: Document;
            var xmlText = "<doc>" + content + "</doc>";
            if (typeof DOMParser !== "undefined") {
                var parser = new DOMParser();
                xmlDoc = parser.parseFromString(xmlText, "text/xml");
            } else {
                xmlDoc = new ActiveXObject("Microsoft.XMLDOM");
                (<any>xmlDoc).async = false;
                (<any>xmlDoc).loadXML(xmlText);
            }

            var nodes = xmlDoc.documentElement.childNodes;
            for (var i = 0; i < nodes.length; i++) {
                if (nodes[i].nodeType === 1 /* ELEMENT_NODE */) {
                    var node = <Element>nodes[i];
                    var value = node.firstChild && node.firstChild.nodeValue;
                    switch (node.tagName.toUpperCase()) {
                        case "SUMMARY":
                            documentation.summary = value;
                            break;
                        case "PARAM":
                            documentation.parameters.push({ name: node.getAttribute("name"), text: value });
                            break;
                        case "RETURNS":
                            documentation.returns = value;
                            break;
                        default:
                            throw new Error("Unexpected XmlDoc tag: " + node.tagName);
                            break;
                    }
                }
            }

            return documentation;
        }

        public static createJSDoc(documentation: IDocumentation, column: number): TypeScript.SyntaxTrivia {
            var indent = RuleHelpers.spaceString(column + 1) + "*";
            var text = "/**" + TypeScript.newLine();

            appendJSDocLines(documentation.summary, "");
            
            for (var i = 0; i < documentation.parameters.length; i++) {
                var parameter = documentation.parameters[i];
                var header = "@param " + parameter.name + " ";
                appendJSDocLines(parameter.text, header);
            }

            if (documentation.returns) {
                appendJSDocLines(documentation.returns, "@returns ");
            }

            text += indent + "/" + TypeScript.newLine();
            
            return <TypeScript.SyntaxTrivia><any>TypeScript.Syntax.trivia(TypeScript.SyntaxKind.MultiLineCommentTrivia, text);
            
            // NOTE: The \n chars in the function below are maintaining existing \r chars if they exist, so no need for TypeScript.newLine()
            function appendJSDocLines(content: string, header: string): void {
                var lines = content.trim().split("\n");
                var innerIndent = RuleHelpers.spaceString(header.length + 1);

                text += indent + " " + header + lines[0] + "\n";

                // Indent remaining lines more
                for (var i = 1; i < lines.length; i++) {
                    text += indent + innerIndent + lines[i] + "\n";
                }
            }
        }

        public static isXmlDoc(comment: TypeScript.SyntaxTrivia): boolean {
            var prevTrivia = comment.prevTrivia;
            while (prevTrivia) {
                if (prevTrivia.kind() === TypeScript.SyntaxKind.SingleLineCommentTrivia) {
                    return false;
                }

                prevTrivia = prevTrivia.prevTrivia;
            }

            while (comment) {
                var text = comment.fullText();
                if (text.match(/^\/\/\/\s*\<\/?(summary|param|returns)/)) {
                    return true;
                }

                comment = comment.nextTrivia;
            }

            return false;
        }
    }
}