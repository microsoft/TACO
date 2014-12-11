
/// <reference path="TypeScript/tsc.d.ts" />
/// <reference path="IScriptHostAPI.ts" />
/// <reference path="IStyleSettings.ts" />

module TSStyleCop {
    export class RuleContext {
        private _syntaxInfo: TypeScript.SyntaxInformationMap;
        private _isWhitespaceLine: boolean[];
        private _settings: IStyleSettings;
        private _autoCorrect: boolean;
        private _host: IScriptHostAPI;

        public lineMap: TypeScript.LineMap;
        public root: TypeScript.ISyntaxNode;
        public filename: string;
        public lineCount: number;

        constructor(filename: string, fileContents: string, autoCorrect: boolean, settings: IStyleSettings, host: IScriptHostAPI) {
            this.filename = filename || "";
            this._host = host;
            this._autoCorrect = autoCorrect;
            this._settings = settings;
            var text = TypeScript.SimpleText.fromString(fileContents);
            var syntaxTree = TypeScript.Parser.parse(filename, text, false, new TypeScript.ParseOptions(TypeScript.LanguageVersion.EcmaScript3, false, true));

            this.lineMap = syntaxTree.lineMap();
            var lineStarts = this.lineMap.lineStarts();
            this._isWhitespaceLine = new Array<boolean>(lineStarts.length);
            for (var i = 0; i < lineStarts.length; i++) {
                var lineStart = lineStarts[i];
                var lineEnd = i < lineStarts.length - 1 ? lineStarts[i + 1] : fileContents.length - 1;
                var lineText = fileContents.substring(lineStart, lineEnd);
                this._isWhitespaceLine[i] = !lineText.match(/\S/);
            }

            this.lineCount = lineStarts.length;

            this.root = syntaxTree.sourceUnit();
            this._syntaxInfo = TypeScript.SyntaxInformationMap.create(<TypeScript.SyntaxNode>this.root, true, true);
        }

        public getIndent(token: TypeScript.ISyntaxToken): number {
            var column = TypeScript.Indentation.columnForStartOfFirstTokenInLineContainingToken(token, this._syntaxInfo, <FormattingOptions>this._settings);
            return column / this._settings.spacesPerTab;
        }

        public isWhitespaceLine(lineNumber: number): boolean {
            return this._isWhitespaceLine[lineNumber];
        }

        public autoCorrectOrError(correctFunction: () => void, element: TypeScript.ISyntaxElement, message: string, code: string, position?: number, width?: number): void {
            var suffix = " (Run with auto-correction enabled to auto-correct this)";
            if (this._autoCorrect) {
                try {
                    correctFunction();
                    if (typeof position !== "number") {
                        position = this.start(element);
                    }

                    if (typeof width !== "number") {
                        width = element ? element.width() : 0;
                    }

                    var startLocation = this.lineMap.getLineAndCharacterFromPosition(position);
                    var endLocation = this.lineMap.getLineAndCharacterFromPosition(position + width);
                    message = message || "";
                    var startLine = startLocation.line() + 1;
                    var startCharacter = startLocation.character() + 1;
                    var endLine = endLocation.line() + 1;
                    var endCharacter = endLocation.character() + 1;
                    this._host.log("Auto corrected " + code + ":" + message, code, this.filename, startLine, startCharacter, endLine, endCharacter);
                    return;
                } catch (e) {
                    suffix = " Attempts to auto correct failed " + e.message;
                }
            }

            this.reportError(element, message + suffix, code, position, width);
        }

        public autoCorrectOrder(element: TypeScript.ISyntaxElement, newOrder: number[]): void {
            element["TS_NewOrder"] = newOrder;
        }

        public autoCorrectText(element: TypeScript.SyntaxTrivia, newText: string): void;
        public autoCorrectText(element: TypeScript.ISyntaxToken, newText: string): void;
        public autoCorrectText(element: any, newText: string): void {
            if (this._autoCorrect) {
                element.TS_NewText = newText;
            }
        }

        public reportError(element: TypeScript.ISyntaxElement, message: string, code: string, position?: number, width?: number): void {
            if (typeof position !== "number") {
                position = this.start(element);
            }

            if (typeof width !== "number") {
                width = element ? element.width() : 0;
            }

            var startLocation = this.lineMap.getLineAndCharacterFromPosition(position);
            var endLocation = this.lineMap.getLineAndCharacterFromPosition(position + width);
            message = message || "";
            var startLine = startLocation.line() + 1;
            var startCharacter = startLocation.character() + 1;
            var endLine = endLocation.line() + 1;
            var endCharacter = endLocation.character() + 1;
            this._host.error(code ? code + ":" + message : message, code, this.filename, startLine, startCharacter, endLine, endCharacter);
        }

        public isFirstTokenInLine(token: TypeScript.ISyntaxToken): boolean {
            var prevToken = this.getPreviousToken(token);
            if (!prevToken) {
                return true;
            }

            var tokenLine = this.lineMap.getLineNumberFromPosition(this.start(token));
            var prevTokenLine = this.lineMap.getLineNumberFromPosition(this.end(prevToken));
            return prevTokenLine < tokenLine;
        }

        public isLastTokenInLine(token: TypeScript.ISyntaxToken): boolean {
            var nextToken = this.getNextToken(token);
            if (!nextToken || nextToken.tokenKind === TypeScript.SyntaxKind.EndOfFileToken) {
                return true;
            }

            var tokenLine = this.lineMap.getLineNumberFromPosition(this.end(token));
            var nextTokenLine = this.lineMap.getLineNumberFromPosition(this.start(nextToken));
            return nextTokenLine > tokenLine;
        }

        public getParent(element: TypeScript.ISyntaxElement): TypeScript.ISyntaxNode {
            return <TypeScript.ISyntaxNode>this._syntaxInfo.parent(element);
        }

        public start(trivia: TypeScript.SyntaxTrivia): number;
        public start(element: TypeScript.ISyntaxElement): number;
        public start(element: any): number {
            if (element.token) {
                var trivia = <TypeScript.SyntaxTrivia>element;
                var token = trivia.token;
                var tokenStart = this._syntaxInfo.start(token);
                return tokenStart + trivia.startOffset;
            } else {
                return this._syntaxInfo.start(element);
            }
        }

        public end(element: TypeScript.ISyntaxElement): number {
            return this._syntaxInfo.end(element);
        }

        public getAllLeadingTrivia(token: TypeScript.ISyntaxToken): TypeScript.SyntaxTrivia[] {
            var leadingTrivia = token.leadingTrivia();
            var previousToken = this.getPreviousToken(token);
            if (previousToken) {
                leadingTrivia = previousToken.trailingTrivia().concat(leadingTrivia);
            }

            return <TypeScript.SyntaxTrivia[]><any>leadingTrivia;
        }

        public getAllTrailingTrivia(token: TypeScript.ISyntaxToken): TypeScript.SyntaxTrivia[] {
            var trailingTrivia = token.trailingTrivia();
            var nextToken = this.getNextToken(token);
            if (nextToken) {
                trailingTrivia = trailingTrivia.concat(nextToken.leadingTrivia());
            }

            return <TypeScript.SyntaxTrivia[]><any>trailingTrivia;
        }

        public clearLeadingWhitespace(token: TypeScript.ISyntaxToken): void {
            var leadingTrivia = this.getAllLeadingTrivia(token);
            for (var i = leadingTrivia.length - 1; i >= 0; i--) {
                var syntaxTrivia = leadingTrivia[i];
                if (syntaxTrivia.isWhitespace() || syntaxTrivia.isNewLine()) {
                    this.autoCorrectText(syntaxTrivia, "");
                } else {
                    if (syntaxTrivia.kind() === TypeScript.SyntaxKind.SingleLineCommentTrivia) {
                        this.autoCorrectText(syntaxTrivia, syntaxTrivia.fullText() + TypeScript.newLine());
                    }

                    return;
                }
            }
        }

        public clearTrailingWhitespace(token: TypeScript.ISyntaxToken, elementOnly?: boolean): void {
            var trailingTrivia = this.getAllTrailingTrivia(token);
            for (var i = 0; i < trailingTrivia.length; i++) {
                var syntaxTrivia = trailingTrivia[i];
                if (syntaxTrivia.isWhitespace() || syntaxTrivia.isNewLine()) {
                    this.autoCorrectText(syntaxTrivia, "");
                } else {
                    return;
                }
            }
        }

        public getLeadingWhitespace(token: TypeScript.ISyntaxToken): string {
            var leadingWhitespace = "";
            var leadingTrivia = this.getAllLeadingTrivia(token);
            for (var i = leadingTrivia.length - 1; i >= 0; i--) {
                var syntaxTrivia = leadingTrivia[i];
                if (syntaxTrivia.isWhitespace() || syntaxTrivia.isNewLine()) {
                    leadingWhitespace = syntaxTrivia.fullText() + leadingWhitespace;
                } else {
                    return leadingWhitespace;
                }
            }

            return leadingWhitespace;
        }

        public getTrailingWhitespace(token: TypeScript.ISyntaxToken): string {
            var trailingWhitespace = "";
            var trailingTrivia = this.getAllTrailingTrivia(token);
            for (var i = 0; i < trailingTrivia.length; i++) {
                var syntaxTrivia = trailingTrivia[i];
                if (syntaxTrivia.isWhitespace() || syntaxTrivia.isNewLine()) {
                    trailingWhitespace = trailingWhitespace + syntaxTrivia.fullText();
                } else {
                    return trailingWhitespace;
                }
            }

            return trailingWhitespace;
        }

        public getNextToken(token: TypeScript.ISyntaxToken): TypeScript.ISyntaxToken {
            var tokenInfo = this._syntaxInfo.tokenInformation(token);
            return tokenInfo && tokenInfo.nextToken;
        }

        public getPreviousToken(token: TypeScript.ISyntaxToken): TypeScript.ISyntaxToken {
            var tokenInfo = this._syntaxInfo.tokenInformation(token);
            return tokenInfo && tokenInfo.previousToken;
        }
    }
}