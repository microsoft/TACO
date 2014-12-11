
/// <reference path="IScriptHostAPI.ts" />
/// <reference path="IStyleRule.ts" />
/// <reference path="IStyleSettings.ts" />
/// <reference path="TypeScript/tsc.d.ts" />
/// <reference path="Utils.ts" />

module TSStyleCop {
    export class RuleEngine {
        private _rules: IStyleRule<TypeScript.ISyntaxElement>[][];
        private _elementCount: number;
        private _rulesRunCount: number;
        private _enabledRules: { [code: string]: boolean; };
        private _settings: IStyleSettings;
        private _prevToken: TypeScript.ISyntaxToken;
        private _host: IScriptHostAPI;
        private _suppressionStack: string[];

        constructor(settings: IStyleSettings, host: IScriptHostAPI) {
            settings = settings || {};
            settings.spacesPerTab = settings.spacesPerTab || 4;
            this._host = host;
            this._enabledRules = {};
            this._rules = [];
            this._settings = settings;
            this._suppressionStack = [];
            this.collectRules(TSStyleCop["Rules"]);
            if (settings && settings.rules) {
                for (var i = 0; i < settings.rules.length; i++) {
                    this.setRule(settings.rules[i]);
                }
            }
        }

        public analyzeFile(filename: string, fileContents: string, autoCorrect: boolean): string {
            this._elementCount = 0;
            this._rulesRunCount = 0;
            var context = new RuleContext(filename, fileContents, autoCorrect, this._settings, this._host);
            this.preProcess(context.root);
            this.analyze(context.root, context);
            this._suppressionStack = [];
            var resultString = null;
            if (autoCorrect) {
                resultString = this.getCorrectedString(context.root);
            }

            return resultString;
        }

        private setRule(code: string): void {
            var enabled: boolean = code.charAt(0) === "+";
            code = code.substr(1);
            this._enabledRules[code] = enabled;
        }

        private getCorrectedString(element: TypeScript.ISyntaxElement): string {
            if (!element) {
                return "";
            } else if (element.isToken()) {
                var token = <TypeScript.ISyntaxToken>element;
                return this.getCorrectedTrivia(<TypeScript.SyntaxTrivia[]><any>token.leadingTrivia()) + (typeof token["TS_NewText"] === "undefined" ? token.text() : token["TS_NewText"]) + this.getCorrectedTrivia(<TypeScript.SyntaxTrivia[]><any>token.trailingTrivia());
            } else {
                var result = "";
                var orderMapping: number[] = element["TS_NewOrder"];
                for (var i = 0; i < element.childCount(); i++) {
                    var index = i;
                    if (orderMapping) {
                        index = orderMapping[i];
                    }

                    result += this.getCorrectedString(element.childAt(index));
                }

                return result;
            }
        }

        private getCorrectedTrivia(triviaList: TypeScript.SyntaxTrivia[]): string {
            var result = "";
            if (triviaList) {
                for (var i = 0; i < triviaList.length; i++) {
                    var item = triviaList[i];
                    result += typeof item["TS_NewText"] === "undefined" ? item.fullText() : item["TS_NewText"];
                }
            }

            return result;
        }

        private analyzeTrivia(triviaList: TypeScript.SyntaxTrivia[], context: RuleContext, position: number): void {
            if (triviaList) {
                for (var i = 0, count = triviaList.length; i < count; i++) {
                    this._elementCount++;
                    var trivia = triviaList[i];
                    var syntaxKind = trivia.kind();
                    this.runRules(trivia, context, this._rules[-1], position);
                    this.runRules(trivia, context, this._rules[syntaxKind], position);
                    position += trivia.fullText().length;
                }
            }
        }

        private preProcess(element: TypeScript.ISyntaxElement): void {
            if (element) {
                if (element.isToken()) {
                    var token = (<TypeScript.ISyntaxToken>element);
                    var prevTrailingTrivia = this._prevToken && this._prevToken.trailingTrivia();
                    token.leadingTrivia = <any>this.solidifyTriviaList(token, <any>token.leadingTrivia(), -token.leadingTriviaWidth(), prevTrailingTrivia && prevTrailingTrivia[prevTrailingTrivia.count() - 1]);
                    token.trailingTrivia = <any>this.solidifyTriviaList(token, <any>token.trailingTrivia(), token.width(), null);
                    this._prevToken = token;
                }

                for (var i = 0; i < element.childCount(); i++) {
                    this.preProcess(element.childAt(i));
                }
            }
        }

        private solidifyTriviaList(token: TypeScript.ISyntaxToken, triviaList: any, startOffset: number, prevTrivia: TypeScript.SyntaxTrivia): () => TypeScript.SyntaxTrivia[] {
            var triviaListArray = triviaList.toArray();
            triviaListArray.count = () => triviaListArray.length;
            triviaListArray.syntaxTriviaAt = (i: number) => triviaListArray[i];
            prevTrivia && (prevTrivia.nextTrivia = triviaListArray[0]);
            for (var i = 0; i < triviaListArray.length; i++) {
                var trivia = triviaListArray[i];
                trivia.startOffset = startOffset;
                startOffset += trivia.fullText().length;
                trivia.token = token;
                if (i === 0) {
                    trivia.prevTrivia = prevTrivia;
                } else {
                    trivia.prevTrivia = triviaListArray[i - 1];
                }

                if (i < triviaListArray.length - 1) {
                    trivia.nextTrivia = triviaListArray[i + 1];
                }
            }

            return () => triviaListArray;
        }

        private visitSuppressionComments(triviaList: TypeScript.SyntaxTrivia[], context: RuleContext, position: number): void {
            if (triviaList) {
                for (var i = 0, count = triviaList.length; i < count; i++) {
                    var trivia = triviaList[i];
                    var text = trivia.fullText();
                    var suppressionMatch = text.match(/^\/\/\/\s+<(disable|enable)\s+code="(\w+)".*\/>\s*$/);
                    if (suppressionMatch) {
                        var code = suppressionMatch[2];
                        switch (suppressionMatch[1]) {
                            case "enable":
                                var topCode = this._suppressionStack.pop();
                                if (topCode !== code) {
                                    var lineAndChar = context.lineMap.getLineAndCharacterFromPosition(position);
                                    this._host.error("Unmatched enable tag", null, context.filename, lineAndChar.line(), lineAndChar.character(), lineAndChar.line(), lineAndChar.character());
                                }

                                break;
                            case "disable":
                                this._suppressionStack.push(code);
                                break;
                        }
                    }
                }
            }
        }

        private analyze(element: TypeScript.ISyntaxElement, context: RuleContext): void {
            if (element) {
                this._elementCount++;
                var syntaxKind: TypeScript.SyntaxKind;
                if (element.isToken()) {
                    var token = (<TypeScript.ISyntaxToken>element);
                    syntaxKind = token.tokenKind;
                    if (token.hasLeadingTrivia()) {
                        if (context.getParent(token).firstToken() !== token) {
                            this.visitSuppressionComments(<any>token.leadingTrivia(), context, context.start(token) - token.leadingTriviaWidth());
                        }
                        this.analyzeTrivia(<any>token.leadingTrivia(), context, context.start(token) - token.leadingTriviaWidth());
                    }

                    if (token.hasTrailingTrivia()) {
                        this.visitSuppressionComments(<any>token.trailingTrivia(), context, context.end(token));
                        this.analyzeTrivia(<any>token.trailingTrivia(), context, context.end(token));
                    }
                } else {
                    var node = (<TypeScript.ISyntaxNode>element);
                    syntaxKind = node.kind();
                    if (node.isNode() && node.firstToken()) {
                        this.visitSuppressionComments(<any>node.firstToken().leadingTrivia(), context, context.start(node.firstToken()) - node.firstToken().leadingTriviaWidth());
                    }
                }

                this.runRules(element, context, this._rules[-1]);
                this.runRules(element, context, this._rules[syntaxKind]);

                for (var i = 0; i < element.childCount(); i++) {
                    this.analyze(element.childAt(i), context);
                }
            }
        }

        private runRules(trivia: TypeScript.SyntaxTrivia, context: RuleContext, ruleSet: IStyleRule<TypeScript.ISyntaxElement>[], positon: number): void;
        private runRules(element: TypeScript.ISyntaxElement, context: RuleContext, ruleSet: IStyleRule<TypeScript.ISyntaxElement>[]): void;
        private runRules(element: any, context: RuleContext, ruleSet: IStyleRule<TypeScript.ISyntaxElement>[], position?: number): void {
            if (ruleSet) {
                for (var i = 0; i < ruleSet.length; i++) {
                    try {
                        var rule = ruleSet[i];
                        if (this._suppressionStack.indexOf(rule.code) < 0) {
                            if (this._enabledRules[rule.code]) {
                                this._rulesRunCount++;
                                rule.checkElement(element, context, position);
                            }
                        }
                    } catch (e) {
                        context.reportError(element, "Error running rule: " + rule.code + ":" + rule.name, rule.code);
                    }
                }
            }
        }

        private collectRules(namespace: any): void {
            for (var key in namespace) {
                if (namespace.hasOwnProperty(key)) {
                    var value = namespace[key];
                    if (typeof value === "function") {
                        var rule = new value();
                        if (rule.name && rule.code && rule.checkElement) {
                            this.addRule(rule);
                        }
                    } else if (typeof value === "object") {
                        this.collectRules(value);
                    }
                }
            }
        }

        private addRule(rule: IStyleRule<TypeScript.ISyntaxElement>): void {
            if (typeof this._enabledRules[rule.code] !== "undefined") {
                this._host.error("Duplicate error code: " + rule.code, rule.code, null, 0, 0, 0, 0);
            }

            this._enabledRules[rule.code] = true;
            var addFilteredRule = (rule: IStyleRule<TypeScript.ISyntaxElement>, syntaxKind: TypeScript.SyntaxKind): void => {
                var list = this._rules[syntaxKind];
                if (!list) {
                    list = this._rules[syntaxKind] = [];
                }

                list.push(rule);
            };

            var filters = rule.filter;
            if (rule.filter) {
                for (var i = 0; i < filters.length; i++) {
                    addFilteredRule(rule, filters[i]);
                }
            } else {
                addFilteredRule(rule, -1);
            }
        }
    }
}