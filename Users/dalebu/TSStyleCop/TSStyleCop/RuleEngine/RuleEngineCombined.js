/// <reference path="TypeScript/tsc.d.ts" />
/// <reference path="IScriptHostAPI.ts" />
/// <reference path="IStyleSettings.ts" />
var TSStyleCop;
(function (TSStyleCop) {
    var RuleContext = (function () {
        function RuleContext(filename, fileContents, autoCorrect, settings, host) {
            this.filename = filename || "";
            this._host = host;
            this._autoCorrect = autoCorrect;
            this._settings = settings;
            var text = TypeScript.SimpleText.fromString(fileContents);
            var syntaxTree = TypeScript.Parser.parse(filename, text, false, new TypeScript.ParseOptions(0 /* EcmaScript3 */, false, true));

            this.lineMap = syntaxTree.lineMap();
            var lineStarts = this.lineMap.lineStarts();
            this._isWhitespaceLine = new Array(lineStarts.length);
            for (var i = 0; i < lineStarts.length; i++) {
                var lineStart = lineStarts[i];
                var lineEnd = i < lineStarts.length - 1 ? lineStarts[i + 1] : fileContents.length - 1;
                var lineText = fileContents.substring(lineStart, lineEnd);
                this._isWhitespaceLine[i] = !lineText.match(/\S/);
            }

            this.lineCount = lineStarts.length;

            this.root = syntaxTree.sourceUnit();
            this._syntaxInfo = TypeScript.SyntaxInformationMap.create(this.root, true, true);
        }
        RuleContext.prototype.getIndent = function (token) {
            var column = TypeScript.Indentation.columnForStartOfFirstTokenInLineContainingToken(token, this._syntaxInfo, this._settings);
            return column / this._settings.spacesPerTab;
        };

        RuleContext.prototype.isWhitespaceLine = function (lineNumber) {
            return this._isWhitespaceLine[lineNumber];
        };

        RuleContext.prototype.autoCorrectOrError = function (correctFunction, element, message, code, position, width) {
            var suffix = " (Run with auto-correction enabled to auto-correct this)";
            if (this._autoCorrect) {
                try  {
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
        };

        RuleContext.prototype.autoCorrectOrder = function (element, newOrder) {
            element["TS_NewOrder"] = newOrder;
        };

        RuleContext.prototype.autoCorrectText = function (element, newText) {
            if (this._autoCorrect) {
                element.TS_NewText = newText;
            }
        };

        RuleContext.prototype.reportError = function (element, message, code, position, width) {
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
        };

        RuleContext.prototype.isFirstTokenInLine = function (token) {
            var prevToken = this.getPreviousToken(token);
            if (!prevToken) {
                return true;
            }

            var tokenLine = this.lineMap.getLineNumberFromPosition(this.start(token));
            var prevTokenLine = this.lineMap.getLineNumberFromPosition(this.end(prevToken));
            return prevTokenLine < tokenLine;
        };

        RuleContext.prototype.isLastTokenInLine = function (token) {
            var nextToken = this.getNextToken(token);
            if (!nextToken || nextToken.tokenKind === TypeScript.SyntaxKind.EndOfFileToken) {
                return true;
            }

            var tokenLine = this.lineMap.getLineNumberFromPosition(this.end(token));
            var nextTokenLine = this.lineMap.getLineNumberFromPosition(this.start(nextToken));
            return nextTokenLine > tokenLine;
        };

        RuleContext.prototype.getParent = function (element) {
            return this._syntaxInfo.parent(element);
        };

        RuleContext.prototype.start = function (element) {
            if (element.token) {
                var trivia = element;
                var token = trivia.token;
                var tokenStart = this._syntaxInfo.start(token);
                return tokenStart + trivia.startOffset;
            } else {
                return this._syntaxInfo.start(element);
            }
        };

        RuleContext.prototype.end = function (element) {
            return this._syntaxInfo.end(element);
        };

        RuleContext.prototype.getAllLeadingTrivia = function (token) {
            var leadingTrivia = token.leadingTrivia();
            var previousToken = this.getPreviousToken(token);
            if (previousToken) {
                leadingTrivia = previousToken.trailingTrivia().concat(leadingTrivia);
            }

            return leadingTrivia;
        };

        RuleContext.prototype.getAllTrailingTrivia = function (token) {
            var trailingTrivia = token.trailingTrivia();
            var nextToken = this.getNextToken(token);
            if (nextToken) {
                trailingTrivia = trailingTrivia.concat(nextToken.leadingTrivia());
            }

            return trailingTrivia;
        };

        RuleContext.prototype.clearLeadingWhitespace = function (token) {
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
        };

        RuleContext.prototype.clearTrailingWhitespace = function (token, elementOnly) {
            var trailingTrivia = this.getAllTrailingTrivia(token);
            for (var i = 0; i < trailingTrivia.length; i++) {
                var syntaxTrivia = trailingTrivia[i];
                if (syntaxTrivia.isWhitespace() || syntaxTrivia.isNewLine()) {
                    this.autoCorrectText(syntaxTrivia, "");
                } else {
                    return;
                }
            }
        };

        RuleContext.prototype.getLeadingWhitespace = function (token) {
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
        };

        RuleContext.prototype.getTrailingWhitespace = function (token) {
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
        };

        RuleContext.prototype.getNextToken = function (token) {
            var tokenInfo = this._syntaxInfo.tokenInformation(token);
            return tokenInfo && tokenInfo.nextToken;
        };

        RuleContext.prototype.getPreviousToken = function (token) {
            var tokenInfo = this._syntaxInfo.tokenInformation(token);
            return tokenInfo && tokenInfo.previousToken;
        };
        return RuleContext;
    })();
    TSStyleCop.RuleContext = RuleContext;
})(TSStyleCop || (TSStyleCop = {}));
var TSStyleCop;
(function (TSStyleCop) {
    var Utils = (function () {
        function Utils() {
        }
        Utils.startsWithLineBreak = function (str) {
            return str.charAt(0) === "\n" || str.substr(0, 2) === "\r\n";
        };

        Utils.createIndent = function (count) {
            var spaces = "";
            for (var i = 0; i < count; i++) {
                spaces += "  ";
            }

            return spaces;
        };

        Utils.escapeString = function (str, maxLength) {
            var result = "";
            for (var i = 0; i < str.length; i++) {
                var code = str.charCodeAt(i);
                var c = str.charAt(i);
                if (c === "\n") {
                    result += "\\n";
                } else if (c === "\"") {
                    result += "\\\"";
                } else if (code > 32) {
                    result += c;
                }
            }

            if (maxLength && result.length > maxLength) {
                var portionLength = (maxLength - 3) / 2;
                result = result.substr(0, portionLength) + "..." + result.substr(result.length - portionLength, portionLength);
            }

            return "\"" + result + "\"";
        };
        return Utils;
    })();
    TSStyleCop.Utils = Utils;

    Array.prototype.indexOf = Array.prototype.indexOf || function (value) {
        for (var i = 0; i < this.length; i++) {
            if (this[i] === value) {
                return i;
            }
        }

        return -1;
    };

    String.prototype.trim = String.prototype.trim || function () {
        return this.replace(/^\s*/, "").replace(/\s*$/, "");
    };
})(TSStyleCop || (TSStyleCop = {}));
/// <reference path="RuleContext.ts" />
/// <reference path="Utils.ts" />
/// <reference path="IScriptHostAPI.ts" />
/// <reference path="IStyleRule.ts" />
/// <reference path="IStyleSettings.ts" />
/// <reference path="TypeScript/tsc.d.ts" />
/// <reference path="Utils.ts" />
var TSStyleCop;
(function (TSStyleCop) {
    var RuleEngine = (function () {
        function RuleEngine(settings, host) {
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
        RuleEngine.prototype.analyzeFile = function (filename, fileContents, autoCorrect) {
            this._elementCount = 0;
            this._rulesRunCount = 0;
            var context = new TSStyleCop.RuleContext(filename, fileContents, autoCorrect, this._settings, this._host);
            this.preProcess(context.root);
            this.analyze(context.root, context);
            this._suppressionStack = [];
            var resultString = null;
            if (autoCorrect) {
                resultString = this.getCorrectedString(context.root);
            }

            return resultString;
        };

        RuleEngine.prototype.setRule = function (code) {
            var enabled = code.charAt(0) === "+";
            code = code.substr(1);
            this._enabledRules[code] = enabled;
        };

        RuleEngine.prototype.getCorrectedString = function (element) {
            if (!element) {
                return "";
            } else if (element.isToken()) {
                var token = element;
                return this.getCorrectedTrivia(token.leadingTrivia()) + (typeof token["TS_NewText"] === "undefined" ? token.text() : token["TS_NewText"]) + this.getCorrectedTrivia(token.trailingTrivia());
            } else {
                var result = "";
                var orderMapping = element["TS_NewOrder"];
                for (var i = 0; i < element.childCount(); i++) {
                    var index = i;
                    if (orderMapping) {
                        index = orderMapping[i];
                    }

                    result += this.getCorrectedString(element.childAt(index));
                }

                return result;
            }
        };

        RuleEngine.prototype.getCorrectedTrivia = function (triviaList) {
            var result = "";
            if (triviaList) {
                for (var i = 0; i < triviaList.length; i++) {
                    var item = triviaList[i];
                    result += typeof item["TS_NewText"] === "undefined" ? item.fullText() : item["TS_NewText"];
                }
            }

            return result;
        };

        RuleEngine.prototype.analyzeTrivia = function (triviaList, context, position) {
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
        };

        RuleEngine.prototype.preProcess = function (element) {
            if (element) {
                if (element.isToken()) {
                    var token = element;
                    var prevTrailingTrivia = this._prevToken && this._prevToken.trailingTrivia();
                    token.leadingTrivia = this.solidifyTriviaList(token, token.leadingTrivia(), -token.leadingTriviaWidth(), prevTrailingTrivia && prevTrailingTrivia[prevTrailingTrivia.count() - 1]);
                    token.trailingTrivia = this.solidifyTriviaList(token, token.trailingTrivia(), token.width(), null);
                    this._prevToken = token;
                }

                for (var i = 0; i < element.childCount(); i++) {
                    this.preProcess(element.childAt(i));
                }
            }
        };

        RuleEngine.prototype.solidifyTriviaList = function (token, triviaList, startOffset, prevTrivia) {
            var triviaListArray = triviaList.toArray();
            triviaListArray.count = function () {
                return triviaListArray.length;
            };
            triviaListArray.syntaxTriviaAt = function (i) {
                return triviaListArray[i];
            };
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

            return function () {
                return triviaListArray;
            };
        };

        RuleEngine.prototype.visitSuppressionComments = function (triviaList, context, position) {
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
        };

        RuleEngine.prototype.analyze = function (element, context) {
            if (element) {
                this._elementCount++;
                var syntaxKind;
                if (element.isToken()) {
                    var token = element;
                    syntaxKind = token.tokenKind;
                    if (token.hasLeadingTrivia()) {
                        if (context.getParent(token).firstToken() !== token) {
                            this.visitSuppressionComments(token.leadingTrivia(), context, context.start(token) - token.leadingTriviaWidth());
                        }
                        this.analyzeTrivia(token.leadingTrivia(), context, context.start(token) - token.leadingTriviaWidth());
                    }

                    if (token.hasTrailingTrivia()) {
                        this.visitSuppressionComments(token.trailingTrivia(), context, context.end(token));
                        this.analyzeTrivia(token.trailingTrivia(), context, context.end(token));
                    }
                } else {
                    var node = element;
                    syntaxKind = node.kind();
                    if (node.isNode() && node.firstToken()) {
                        this.visitSuppressionComments(node.firstToken().leadingTrivia(), context, context.start(node.firstToken()) - node.firstToken().leadingTriviaWidth());
                    }
                }

                this.runRules(element, context, this._rules[-1]);
                this.runRules(element, context, this._rules[syntaxKind]);

                for (var i = 0; i < element.childCount(); i++) {
                    this.analyze(element.childAt(i), context);
                }
            }
        };

        RuleEngine.prototype.runRules = function (element, context, ruleSet, position) {
            if (ruleSet) {
                for (var i = 0; i < ruleSet.length; i++) {
                    try  {
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
        };

        RuleEngine.prototype.collectRules = function (namespace) {
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
        };

        RuleEngine.prototype.addRule = function (rule) {
            var _this = this;
            if (typeof this._enabledRules[rule.code] !== "undefined") {
                this._host.error("Duplicate error code: " + rule.code, rule.code, null, 0, 0, 0, 0);
            }

            this._enabledRules[rule.code] = true;
            var addFilteredRule = function (rule, syntaxKind) {
                var list = _this._rules[syntaxKind];
                if (!list) {
                    list = _this._rules[syntaxKind] = [];
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
        };
        return RuleEngine;
    })();
    TSStyleCop.RuleEngine = RuleEngine;
})(TSStyleCop || (TSStyleCop = {}));
/// <reference path="../../IStyleRule.ts" />
var TSStyleCop;
(function (TSStyleCop) {
    (function (Rules) {
        var SpacingHelpers = (function () {
            function SpacingHelpers() {
            }
            SpacingHelpers.errorIfLeadingWhitespace = function (token, context, message, code, allowStartOfLine) {
                var leadingWhitespace = context.getLeadingWhitespace(token);
                if (!leadingWhitespace || (allowStartOfLine && context.isFirstTokenInLine(token))) {
                    return;
                } else {
                    context.autoCorrectOrError(function () {
                        context.clearLeadingWhitespace(token);
                    }, token, message, code);
                }
            };

            SpacingHelpers.errorIfNotLeadingWhitespace = function (token, context, message, code, allowStartOfLine, allowOpenParen, moveToPrevLine) {
                var leadingWhitespace = context.getLeadingWhitespace(token);
                var prevToken = context.getPreviousToken(token);
                var prevTokenKind = prevToken.tokenKind;
                if (leadingWhitespace === " " || (leadingWhitespace.length > 3 && !context.isFirstTokenInLine(token)) || (allowStartOfLine && context.isFirstTokenInLine(token)) || (allowOpenParen && prevTokenKind === TypeScript.SyntaxKind.OpenParenToken) || (allowOpenParen && prevTokenKind === TypeScript.SyntaxKind.OpenBracketToken)) {
                    return;
                } else {
                    context.autoCorrectOrError(function () {
                        if (moveToPrevLine && !allowStartOfLine && context.isFirstTokenInLine(token)) {
                            context.autoCorrectText(prevToken, prevToken.text() + " " + token.text());
                            context.autoCorrectText(token, "");
                            context.clearTrailingWhitespace(token);
                        } else {
                            context.clearLeadingWhitespace(token);
                            context.autoCorrectText(token, " " + token.text());
                        }
                    }, token, message, code);
                }
            };

            SpacingHelpers.errorIfTrailingWhitespace = function (token, context, message, code, allowEndOfLine) {
                var trailingWhitespace = context.getTrailingWhitespace(token);
                if (!trailingWhitespace || (allowEndOfLine && context.isLastTokenInLine(token))) {
                    return;
                } else {
                    context.autoCorrectOrError(function () {
                        context.clearTrailingWhitespace(token);
                    }, token, message, code, context.end(token));
                }
            };

            SpacingHelpers.errorIfNotTrailingWhitespace = function (token, context, message, code, allowEndOfLine, allowCloseParenOrSemicolon) {
                var trailingWhitespace = context.getTrailingWhitespace(token);
                var nextTokenKind = context.getNextToken(token).tokenKind;
                if (trailingWhitespace === " " || (allowEndOfLine && context.isLastTokenInLine(token)) || (allowCloseParenOrSemicolon && nextTokenKind === TypeScript.SyntaxKind.CommaToken) || (allowCloseParenOrSemicolon && nextTokenKind === TypeScript.SyntaxKind.CloseParenToken) || (allowCloseParenOrSemicolon && nextTokenKind === TypeScript.SyntaxKind.CloseBraceToken) || (allowCloseParenOrSemicolon && nextTokenKind === TypeScript.SyntaxKind.CloseBracketToken) || (allowCloseParenOrSemicolon && nextTokenKind === TypeScript.SyntaxKind.SemicolonToken)) {
                    return;
                } else {
                    context.autoCorrectOrError(function () {
                        context.clearTrailingWhitespace(token);
                        context.autoCorrectText(token, token.text() + " ");
                    }, token, message, code, context.end(token));
                }
            };
            return SpacingHelpers;
        })();
        Rules.SpacingHelpers = SpacingHelpers;
    })(TSStyleCop.Rules || (TSStyleCop.Rules = {}));
    var Rules = TSStyleCop.Rules;
})(TSStyleCop || (TSStyleCop = {}));
/// <reference path="../../IStyleRule.ts" />
/// <reference path="SpacingHelpers.ts" />
var TSStyleCop;
(function (TSStyleCop) {
    (function (Rules) {
        var KeywordsMustBeSpacedCorrectly = (function () {
            function KeywordsMustBeSpacedCorrectly() {
                this.code = "SA1000";
                this.name = "KeywordsMustBeSpacedCorrectly";
                this.filter = [
                    TypeScript.SyntaxKind.BreakKeyword,
                    TypeScript.SyntaxKind.CaseKeyword,
                    TypeScript.SyntaxKind.CatchKeyword,
                    TypeScript.SyntaxKind.ClassKeyword,
                    TypeScript.SyntaxKind.ConstKeyword,
                    TypeScript.SyntaxKind.ConstructorKeyword,
                    TypeScript.SyntaxKind.ContinueKeyword,
                    TypeScript.SyntaxKind.DebuggerKeyword,
                    TypeScript.SyntaxKind.DeclareKeyword,
                    TypeScript.SyntaxKind.DefaultKeyword,
                    TypeScript.SyntaxKind.DeleteKeyword,
                    TypeScript.SyntaxKind.DoKeyword,
                    TypeScript.SyntaxKind.ElseKeyword,
                    TypeScript.SyntaxKind.EnumKeyword,
                    TypeScript.SyntaxKind.ExportKeyword,
                    TypeScript.SyntaxKind.ExtendsKeyword,
                    TypeScript.SyntaxKind.FinallyKeyword,
                    TypeScript.SyntaxKind.ForKeyword,
                    TypeScript.SyntaxKind.FunctionKeyword,
                    TypeScript.SyntaxKind.GetKeyword,
                    TypeScript.SyntaxKind.IfKeyword,
                    TypeScript.SyntaxKind.ImplementsKeyword,
                    TypeScript.SyntaxKind.ImportKeyword,
                    TypeScript.SyntaxKind.InKeyword,
                    TypeScript.SyntaxKind.InstanceOfKeyword,
                    TypeScript.SyntaxKind.InterfaceKeyword,
                    TypeScript.SyntaxKind.LetKeyword,
                    TypeScript.SyntaxKind.ModuleKeyword,
                    TypeScript.SyntaxKind.NewKeyword,
                    TypeScript.SyntaxKind.PackageKeyword,
                    TypeScript.SyntaxKind.PrivateKeyword,
                    TypeScript.SyntaxKind.ProtectedKeyword,
                    TypeScript.SyntaxKind.PublicKeyword,
                    TypeScript.SyntaxKind.RequireKeyword,
                    TypeScript.SyntaxKind.ReturnKeyword,
                    TypeScript.SyntaxKind.SetKeyword,
                    TypeScript.SyntaxKind.StaticKeyword,
                    TypeScript.SyntaxKind.SuperKeyword,
                    TypeScript.SyntaxKind.SwitchKeyword,
                    TypeScript.SyntaxKind.ThrowKeyword,
                    TypeScript.SyntaxKind.TryKeyword,
                    TypeScript.SyntaxKind.TypeOfKeyword,
                    TypeScript.SyntaxKind.VarKeyword,
                    TypeScript.SyntaxKind.WhileKeyword,
                    TypeScript.SyntaxKind.WithKeyword];
            }
            KeywordsMustBeSpacedCorrectly.prototype.checkElement = function (keyword, context) {
                switch (keyword.tokenKind) {
                    case TypeScript.SyntaxKind.BreakKeyword:
                    case TypeScript.SyntaxKind.ContinueKeyword:
                    case TypeScript.SyntaxKind.DefaultKeyword:
                    case TypeScript.SyntaxKind.DebuggerKeyword:
                        Rules.SpacingHelpers.errorIfTrailingWhitespace(keyword, context, this.name, this.code);
                        break;
                    case TypeScript.SyntaxKind.ReturnKeyword:
                    case TypeScript.SyntaxKind.ThrowKeyword:
                        var parent = context.getParent(keyword);
                        if (!parent.expression) {
                            Rules.SpacingHelpers.errorIfTrailingWhitespace(keyword, context, this.name, this.code);
                        } else {
                            Rules.SpacingHelpers.errorIfNotTrailingWhitespace(keyword, context, this.name, this.code, false, false);
                        }

                        break;
                    case TypeScript.SyntaxKind.ConstructorKeyword:
                    case TypeScript.SyntaxKind.SuperKeyword:
                        Rules.SpacingHelpers.errorIfTrailingWhitespace(keyword, context, this.name, this.code, false);
                        break;
                    case TypeScript.SyntaxKind.ElseKeyword:
                    case TypeScript.SyntaxKind.CatchKeyword:
                    case TypeScript.SyntaxKind.FinallyKeyword:
                    case TypeScript.SyntaxKind.InKeyword:
                    case TypeScript.SyntaxKind.InstanceOfKeyword:
                        Rules.SpacingHelpers.errorIfNotLeadingWhitespace(keyword, context, this.name, this.code, true, false);
                        Rules.SpacingHelpers.errorIfNotTrailingWhitespace(keyword, context, this.name, this.code, false, false);
                        break;
                    default:
                        Rules.SpacingHelpers.errorIfNotTrailingWhitespace(keyword, context, this.name, this.code, false, false);
                        break;
                }
            };
            return KeywordsMustBeSpacedCorrectly;
        })();
        Rules.KeywordsMustBeSpacedCorrectly = KeywordsMustBeSpacedCorrectly;
    })(TSStyleCop.Rules || (TSStyleCop.Rules = {}));
    var Rules = TSStyleCop.Rules;
})(TSStyleCop || (TSStyleCop = {}));
/// <reference path="../IStyleRule.ts" />
var TSStyleCop;
(function (TSStyleCop) {
    (function (Rules) {
        var RuleHelpers = (function () {
            function RuleHelpers() {
            }
            RuleHelpers.getBlockContents = function (node) {
                return node["statements"] || node["propertyAssignments"] || node["typeMembers"] || node["moduleElements"] || node["classElements"] || node["enumElements"] || node["switchClauses"];
            };

            RuleHelpers.getIndent = function (character) {
                return character / 4;
            };

            RuleHelpers.spaceString = function (count) {
                var result = "";
                for (var i = 0; i < count; i++) {
                    result += " ";
                }

                return result;
            };

            RuleHelpers.createIndent = function (count) {
                return RuleHelpers.spaceString(count * 4);
            };

            RuleHelpers.listContains = function (list, kind) {
                for (var i = 0; i < list.childCount(); i++) {
                    var element = list.childAt(i);
                    var elementKind;
                    if (element.isNode()) {
                        elementKind = element.kind();
                    } else if (element.isToken()) {
                        elementKind = element.tokenKind;
                    }

                    if (elementKind === kind) {
                        return true;
                    }
                }

                return false;
            };
            RuleHelpers.BlockNodeTypes = [
                TypeScript.SyntaxKind.Block,
                TypeScript.SyntaxKind.ModuleDeclaration,
                TypeScript.SyntaxKind.ClassDeclaration,
                TypeScript.SyntaxKind.EnumDeclaration,
                TypeScript.SyntaxKind.SwitchStatement];

            RuleHelpers.ComparisonExpressionTypes = [
                TypeScript.SyntaxKind.EqualsExpression,
                TypeScript.SyntaxKind.EqualsWithTypeConversionExpression,
                TypeScript.SyntaxKind.NotEqualsExpression,
                TypeScript.SyntaxKind.NotEqualsWithTypeConversionExpression
            ];

            RuleHelpers.ObjectLiteralTypes = [
                TypeScript.SyntaxKind.ObjectLiteralExpression,
                TypeScript.SyntaxKind.ObjectType];
            return RuleHelpers;
        })();
        Rules.RuleHelpers = RuleHelpers;
    })(TSStyleCop.Rules || (TSStyleCop.Rules = {}));
    var Rules = TSStyleCop.Rules;
})(TSStyleCop || (TSStyleCop = {}));
/// <reference path="../RuleHelpers.ts" />
var TSStyleCop;
(function (TSStyleCop) {
    (function (Rules) {
        var PropertiesShouldNotBeWriteOnly = (function () {
            function PropertiesShouldNotBeWriteOnly() {
                this.code = "CA1044";
                this.name = "PropertiesShouldNotBeWriteOnly";
                this.filter = [TypeScript.SyntaxKind.ClassDeclaration];
            }
            // The assumption of this rule is that the set and get accessors must be lexically declared in the same class. This means
            // the rule will report false positives if the get and set for a given property are declared in base/derived classes. Handling that
            // case would be very difficult syntactically, and I doubt we have any instances of it in our code anyway (we'll find out when this rule
            // is turned on for the rest of the code base). This rule will not prevent set only properites defined through Object.defineProperty(ies),
            // or defined in object literals.
            PropertiesShouldNotBeWriteOnly.prototype.checkElement = function (classDeclaration, context) {
                if (!classDeclaration.classElements) {
                    return;
                }

                var properties = {};
                var classElements = classDeclaration.classElements.toArray();

                for (var elementIndex = 0; elementIndex < classElements.length; elementIndex++) {
                    var classElement = classElements[elementIndex];
                    var classElementKind = classElement.kind();
                    var propertyName;

                    if (classElementKind === TypeScript.SyntaxKind.GetMemberAccessorDeclaration) {
                        propertyName = classElement.propertyName.text();

                        if (propertyName) {
                            if (properties[propertyName]) {
                                properties[propertyName].hasGet = true;
                            } else {
                                properties[propertyName] = { hasGet: true, setAccessorElement: null };
                            }
                        }
                    } else if (classElementKind === TypeScript.SyntaxKind.SetMemberAccessorDeclaration) {
                        propertyName = classElement.propertyName.text();

                        if (propertyName) {
                            if (properties[propertyName]) {
                                properties[propertyName].setAccessorElement = classElement;
                            } else {
                                properties[propertyName] = { hasGet: false, setAccessorElement: classElement };
                            }
                        }
                    }
                }

                for (var name in properties) {
                    if (properties[name].setAccessorElement && !properties[name].hasGet) {
                        context.reportError(properties[name].setAccessorElement, this.name, this.code);
                    }
                }
            };
            return PropertiesShouldNotBeWriteOnly;
        })();
        Rules.PropertiesShouldNotBeWriteOnly = PropertiesShouldNotBeWriteOnly;
    })(TSStyleCop.Rules || (TSStyleCop.Rules = {}));
    var Rules = TSStyleCop.Rules;
})(TSStyleCop || (TSStyleCop = {}));
/// <reference path="../../IStyleRule.ts" />
/// <reference path="SpacingHelpers.ts" />
var TSStyleCop;
(function (TSStyleCop) {
    (function (Rules) {
        var CommasMustBeSpacedCorrectly = (function () {
            function CommasMustBeSpacedCorrectly() {
                this.code = "SA1001";
                this.name = "CommasMustBeSpacedCorrectly";
                this.filter = [TypeScript.SyntaxKind.CommaToken];
            }
            CommasMustBeSpacedCorrectly.prototype.checkElement = function (comma, context) {
                Rules.SpacingHelpers.errorIfLeadingWhitespace(comma, context, this.name, this.code, false);
                Rules.SpacingHelpers.errorIfNotTrailingWhitespace(comma, context, this.name, this.code, true, false);
            };
            return CommasMustBeSpacedCorrectly;
        })();
        Rules.CommasMustBeSpacedCorrectly = CommasMustBeSpacedCorrectly;
    })(TSStyleCop.Rules || (TSStyleCop.Rules = {}));
    var Rules = TSStyleCop.Rules;
})(TSStyleCop || (TSStyleCop = {}));
/// <reference path="../../IStyleRule.ts" />
/// <reference path="../../Utils.ts" />
/// <reference path="SpacingHelpers.ts" />
var TSStyleCop;
(function (TSStyleCop) {
    (function (Rules) {
        var SemicolonsMustBeSpacedCorrectly = (function () {
            function SemicolonsMustBeSpacedCorrectly() {
                this.code = "SA1002";
                this.name = "SemicolonsMustBeSpacedCorrectly";
                this.filter = [TypeScript.SyntaxKind.SemicolonToken];
            }
            SemicolonsMustBeSpacedCorrectly.prototype.checkElement = function (semicolon, context) {
                if (semicolon.width()) {
                    var nextToken = context.getNextToken(semicolon);
                    var nextTokenKind = nextToken.tokenKind;

                    Rules.SpacingHelpers.errorIfLeadingWhitespace(semicolon, context, this.name, this.code, false);
                    if (nextTokenKind !== TypeScript.SyntaxKind.CloseParenToken) {
                        Rules.SpacingHelpers.errorIfNotTrailingWhitespace(semicolon, context, this.name, this.code, true, false);
                    }
                }
            };
            return SemicolonsMustBeSpacedCorrectly;
        })();
        Rules.SemicolonsMustBeSpacedCorrectly = SemicolonsMustBeSpacedCorrectly;
    })(TSStyleCop.Rules || (TSStyleCop.Rules = {}));
    var Rules = TSStyleCop.Rules;
})(TSStyleCop || (TSStyleCop = {}));
/// <reference path="../../IStyleRule.ts" />
/// <reference path="../../Utils.ts" />
/// <reference path="SpacingHelpers.ts" />
var TSStyleCop;
(function (TSStyleCop) {
    (function (Rules) {
        var SymbolsMustBeSpacedCorrectly = (function () {
            function SymbolsMustBeSpacedCorrectly() {
                this.code = "SA1003";
                this.name = "SymbolsMustBeSpacedCorrectly";
                this.filter = [
                    TypeScript.SyntaxKind.AmpersandAmpersandToken,
                    TypeScript.SyntaxKind.AmpersandEqualsToken,
                    TypeScript.SyntaxKind.AmpersandToken,
                    TypeScript.SyntaxKind.AsteriskEqualsToken,
                    TypeScript.SyntaxKind.AsteriskToken,
                    TypeScript.SyntaxKind.BarBarToken,
                    TypeScript.SyntaxKind.BarEqualsToken,
                    TypeScript.SyntaxKind.BarToken,
                    TypeScript.SyntaxKind.CaretEqualsToken,
                    TypeScript.SyntaxKind.CaretToken,
                    TypeScript.SyntaxKind.EqualsEqualsEqualsToken,
                    TypeScript.SyntaxKind.EqualsEqualsToken,
                    TypeScript.SyntaxKind.EqualsGreaterThanToken,
                    TypeScript.SyntaxKind.EqualsToken,
                    TypeScript.SyntaxKind.ExclamationEqualsEqualsToken,
                    TypeScript.SyntaxKind.ExclamationEqualsToken,
                    TypeScript.SyntaxKind.LessThanEqualsToken,
                    TypeScript.SyntaxKind.LessThanLessThanEqualsToken,
                    TypeScript.SyntaxKind.LessThanLessThanToken,
                    TypeScript.SyntaxKind.LessThanToken,
                    TypeScript.SyntaxKind.GreaterThanToken,
                    TypeScript.SyntaxKind.MinusEqualsToken,
                    TypeScript.SyntaxKind.MinusToken,
                    TypeScript.SyntaxKind.PercentEqualsToken,
                    TypeScript.SyntaxKind.PercentToken,
                    TypeScript.SyntaxKind.PlusEqualsToken,
                    TypeScript.SyntaxKind.PlusToken,
                    TypeScript.SyntaxKind.SlashEqualsToken,
                    TypeScript.SyntaxKind.SlashToken,
                    TypeScript.SyntaxKind.ColonToken,
                    TypeScript.SyntaxKind.QuestionToken,
                    TypeScript.SyntaxKind.ExclamationToken,
                    TypeScript.SyntaxKind.TildeToken,
                    TypeScript.SyntaxKind.OpenBracketToken,
                    TypeScript.SyntaxKind.CloseBracketToken
                ];
            }
            SymbolsMustBeSpacedCorrectly.prototype.checkElement = function (symbol, context) {
                var parent = context.getParent(symbol);
                var parentKind = parent && parent.isNode() && parent.kind();
                switch (symbol.tokenKind) {
                    case TypeScript.SyntaxKind.ExclamationToken:
                    case TypeScript.SyntaxKind.TildeToken:
                        var previousToken = context.getPreviousToken(symbol);
                        if (previousToken.tokenKind === TypeScript.SyntaxKind.ExclamationToken || previousToken.tokenKind === TypeScript.SyntaxKind.TildeToken) {
                            Rules.SpacingHelpers.errorIfLeadingWhitespace(symbol, context, this.name, this.code, true);
                        } else {
                            Rules.SpacingHelpers.errorIfNotLeadingWhitespace(symbol, context, this.name, this.code, true, true);
                        }

                        Rules.SpacingHelpers.errorIfTrailingWhitespace(symbol, context, this.name, this.code, false);
                        break;
                    case TypeScript.SyntaxKind.ColonToken:
                    case TypeScript.SyntaxKind.QuestionToken:
                        if (parentKind === TypeScript.SyntaxKind.ConditionalExpression) {
                            Rules.SpacingHelpers.errorIfNotLeadingWhitespace(symbol, context, this.name, this.code, false, false);
                            Rules.SpacingHelpers.errorIfNotTrailingWhitespace(symbol, context, this.name, this.code, true, false);
                        } else {
                            Rules.SpacingHelpers.errorIfLeadingWhitespace(symbol, context, this.name, this.code, false);
                            if (symbol.tokenKind === TypeScript.SyntaxKind.QuestionToken && context.getNextToken(symbol).tokenKind === TypeScript.SyntaxKind.ColonToken) {
                                Rules.SpacingHelpers.errorIfTrailingWhitespace(symbol, context, this.name, this.code, false);
                            } else {
                                Rules.SpacingHelpers.errorIfNotTrailingWhitespace(symbol, context, this.name, this.code, true, true);
                            }
                        }

                        break;
                    case TypeScript.SyntaxKind.LessThanToken:
                        if (parentKind === TypeScript.SyntaxKind.TypeParameterList || parentKind === TypeScript.SyntaxKind.TypeArgumentList) {
                            Rules.SpacingHelpers.errorIfLeadingWhitespace(symbol, context, this.name, this.code, false);
                            Rules.SpacingHelpers.errorIfTrailingWhitespace(symbol, context, this.name, this.code, true);
                        } else if (parentKind === TypeScript.SyntaxKind.CastExpression) {
                            var previousToken = context.getPreviousToken(symbol);
                            if (previousToken.tokenKind === TypeScript.SyntaxKind.GreaterThanToken && context.getParent(previousToken).kind() === TypeScript.SyntaxKind.CastExpression) {
                                // Two or more casts in a row shouldn't have a space in between
                                Rules.SpacingHelpers.errorIfLeadingWhitespace(symbol, context, this.name, this.code, false);
                            }

                            Rules.SpacingHelpers.errorIfTrailingWhitespace(symbol, context, this.name, this.code, false);
                        } else {
                            Rules.SpacingHelpers.errorIfNotLeadingWhitespace(symbol, context, this.name, this.code, false, true);
                            Rules.SpacingHelpers.errorIfNotTrailingWhitespace(symbol, context, this.name, this.code, true, true);
                        }

                        break;
                    case TypeScript.SyntaxKind.GreaterThanToken:
                        if (parentKind === TypeScript.SyntaxKind.TypeParameterList || parentKind === TypeScript.SyntaxKind.TypeArgumentList) {
                            Rules.SpacingHelpers.errorIfLeadingWhitespace(symbol, context, this.name, this.code, false);
                        } else if (parentKind === TypeScript.SyntaxKind.CastExpression) {
                            Rules.SpacingHelpers.errorIfLeadingWhitespace(symbol, context, this.name, this.code, false);
                            Rules.SpacingHelpers.errorIfTrailingWhitespace(symbol, context, this.name, this.code, true);
                        } else {
                            Rules.SpacingHelpers.errorIfNotLeadingWhitespace(symbol, context, this.name, this.code, false, true);
                            Rules.SpacingHelpers.errorIfNotTrailingWhitespace(symbol, context, this.name, this.code, true, true);
                        }

                        break;
                    case TypeScript.SyntaxKind.PlusToken:
                    case TypeScript.SyntaxKind.MinusToken:
                        if (parentKind === TypeScript.SyntaxKind.NegateExpression || parentKind === TypeScript.SyntaxKind.PlusExpression) {
                            // Covered by SA1021 and SA1022
                        } else {
                            Rules.SpacingHelpers.errorIfNotLeadingWhitespace(symbol, context, this.name, this.code, false, true);
                            Rules.SpacingHelpers.errorIfNotTrailingWhitespace(symbol, context, this.name, this.code, true, true);
                        }

                        break;
                    case TypeScript.SyntaxKind.OpenBracketToken:
                        if (parentKind === TypeScript.SyntaxKind.ArrayType || parentKind === TypeScript.SyntaxKind.ElementAccessExpression) {
                            Rules.SpacingHelpers.errorIfLeadingWhitespace(symbol, context, this.name, this.code, false);
                        }

                        var closeBracketTokenIndex;
                        switch (parentKind) {
                            case TypeScript.SyntaxKind.ArrayType:
                            case TypeScript.SyntaxKind.ArrayLiteralExpression:
                            case TypeScript.SyntaxKind.IndexSignature:
                                closeBracketTokenIndex = 2;
                                break;
                            case TypeScript.SyntaxKind.ElementAccessExpression:
                                closeBracketTokenIndex = 3;
                                break;
                            default:
                                closeBracketTokenIndex = -1;
                                break;
                        }

                        if (closeBracketTokenIndex !== -1) {
                            var closeBracketToken = parent.childAt(closeBracketTokenIndex);
                            var openLine = context.lineMap.getLineNumberFromPosition(context.start(symbol));
                            var closeLine = context.lineMap.getLineNumberFromPosition(context.start(closeBracketToken));
                            if (openLine === closeLine) {
                                Rules.SpacingHelpers.errorIfTrailingWhitespace(symbol, context, this.name, this.code, false);
                            }
                        }

                        break;
                    case TypeScript.SyntaxKind.CloseBracketToken:
                        var openBracketTokenIndex;
                        switch (parentKind) {
                            case TypeScript.SyntaxKind.ArrayType:
                            case TypeScript.SyntaxKind.ElementAccessExpression:
                                openBracketTokenIndex = 1;
                                break;
                            case TypeScript.SyntaxKind.ArrayLiteralExpression:
                            case TypeScript.SyntaxKind.IndexSignature:
                                openBracketTokenIndex = 0;
                                break;
                            default:
                                openBracketTokenIndex = -1;
                                break;
                        }

                        if (openBracketTokenIndex !== -1) {
                            var openBracketToken = parent.childAt(openBracketTokenIndex);
                            var openLine = context.lineMap.getLineNumberFromPosition(context.start(openBracketToken));
                            var closeLine = context.lineMap.getLineNumberFromPosition(context.start(symbol));
                            if (openLine === closeLine) {
                                Rules.SpacingHelpers.errorIfLeadingWhitespace(symbol, context, this.name, this.code, false);
                            }
                        }

                        break;
                    default:
                        Rules.SpacingHelpers.errorIfNotLeadingWhitespace(symbol, context, this.name, this.code, false, true, true);
                        Rules.SpacingHelpers.errorIfNotTrailingWhitespace(symbol, context, this.name, this.code, true, true);
                        break;
                }
            };
            return SymbolsMustBeSpacedCorrectly;
        })();
        Rules.SymbolsMustBeSpacedCorrectly = SymbolsMustBeSpacedCorrectly;
    })(TSStyleCop.Rules || (TSStyleCop.Rules = {}));
    var Rules = TSStyleCop.Rules;
})(TSStyleCop || (TSStyleCop = {}));
/// <reference path="../../IStyleRule.ts" />
/// <reference path="../RuleHelpers.ts" />
var TSStyleCop;
(function (TSStyleCop) {
    (function (Rules) {
        var DocumentationCommentsMustBeginWithStarSingleSpace = (function () {
            function DocumentationCommentsMustBeginWithStarSingleSpace() {
                this.code = "SA1004";
                this.name = "JSDocMustBeFormattedCorrectly";
                this.filter = [TypeScript.SyntaxKind.MultiLineCommentTrivia];
            }
            DocumentationCommentsMustBeginWithStarSingleSpace.prototype.checkElement = function (comment, context, position) {
                var text = comment.fullText();
                var errorPosition = -1;

                if (text.substr(0, 3) === "/**") {
                    var indent = " ";
                    var prevTriva = comment.prevTrivia;
                    if (prevTriva && prevTriva.isWhitespace()) {
                        indent = prevTriva.fullText() + " ";
                    }

                    var commentLines = text.split("\n");
                    if (commentLines.length === 1) {
                        // Ensure a single line comment looks like: /** Content */
                        if (!text.match(/^\s*\/\*\* \S.* \*\/\r?$/)) {
                            errorPosition = position;
                            commentLines[0] = "/** " + commentLines[0].substr(3, commentLines[0].length - 5).trim() + " */";
                        }
                    } else {
                        for (var i = 0; i < commentLines.length; i++) {
                            var line = commentLines[i];
                            var originalLength = line.length;
                            if (i === 0) {
                                if (!line.match(/^\/\*\*\r?$/)) {
                                    errorPosition = position + 3;
                                    var remainder = line.substr(3).trim();
                                    if (remainder.length) {
                                        commentLines.splice(1, 0, indent + "* " + remainder);
                                    }

                                    line = "/**";
                                }
                            } else {
                                // Ensure all lines are indented correctly
                                var lineIndent = line.substr(0, indent.length);
                                if (lineIndent !== indent) {
                                    errorPosition = position + indent.length;
                                    if (lineIndent.match(/^\s*$/)) {
                                        line = indent + line.substr(lineIndent.length);
                                    } else {
                                        line = indent + line.replace(/^\s*/, "");
                                    }
                                }

                                var afterIndent = line.substr(indent.length);
                                if (i === commentLines.length - 1) {
                                    if (!afterIndent.match(/^\*\/\r?$/)) {
                                        errorPosition = position + line.length - 2;
                                        var beforeEnd = afterIndent.substr(0, afterIndent.length - 2).trim();
                                        if (beforeEnd.length) {
                                            line = indent + beforeEnd;
                                            commentLines.push(indent + "*/");
                                        } else {
                                            line = indent + "*/";
                                        }
                                    }
                                } else {
                                    if (!afterIndent.match(/(^\* \s*\S)|(^\*)/)) {
                                        errorPosition = position + indent.length;
                                        var indexOfStar = afterIndent.indexOf("*");
                                        if (indexOfStar >= 0) {
                                            afterIndent = afterIndent.substr(indexOfStar + 1);
                                            afterIndent = afterIndent.replace(/^\s/, "");
                                        }

                                        afterIndent = afterIndent.replace(/\s*$/, "");
                                        line = indent + "* " + afterIndent;
                                    }
                                }
                            }

                            position += originalLength + 1;
                            commentLines[i] = line;
                        }
                    }

                    if (errorPosition >= 0) {
                        var newText = commentLines.join("\n");
                        if (newText !== text) {
                            context.autoCorrectOrError(function () {
                                context.autoCorrectText(comment, newText);
                            }, null, this.name, this.code, errorPosition, 0);
                        } else {
                            context.reportError(null, this.name, this.code, errorPosition, 0);
                        }
                    }
                }
            };
            return DocumentationCommentsMustBeginWithStarSingleSpace;
        })();
        Rules.DocumentationCommentsMustBeginWithStarSingleSpace = DocumentationCommentsMustBeginWithStarSingleSpace;
    })(TSStyleCop.Rules || (TSStyleCop.Rules = {}));
    var Rules = TSStyleCop.Rules;
})(TSStyleCop || (TSStyleCop = {}));
/// <reference path="../../IStyleRule.ts" />
var TSStyleCop;
(function (TSStyleCop) {
    (function (Rules) {
        var SingleLineCommentsMustBeginWithSingleSpace = (function () {
            function SingleLineCommentsMustBeginWithSingleSpace() {
                this.code = "SA1005";
                this.name = "SingleLineCommentsMustBeginWithSingleSpace";
                this.filter = [TypeScript.SyntaxKind.SingleLineCommentTrivia];
            }
            SingleLineCommentsMustBeginWithSingleSpace.prototype.checkElement = function (comment, context, position) {
                var text = comment.fullText();
                if (text.substr(0, 4) === "////") {
                    return;
                } else if (text.substr(0, 3) === "///") {
                    if (text.length > 3 && text.charAt(3) !== " ") {
                        context.autoCorrectOrError(function () {
                            context.autoCorrectText(comment, "/// " + text.substr(3));
                        }, null, this.name, this.code, position, text.length);
                    }
                } else if (text.substr(0, 2) === "//") {
                    if (text.length > 2 && text.charAt(2) !== " ") {
                        context.autoCorrectOrError(function () {
                            context.autoCorrectText(comment, "// " + text.substr(2));
                        }, null, this.name, this.code, position, text.length);
                    }
                }
            };
            return SingleLineCommentsMustBeginWithSingleSpace;
        })();
        Rules.SingleLineCommentsMustBeginWithSingleSpace = SingleLineCommentsMustBeginWithSingleSpace;
    })(TSStyleCop.Rules || (TSStyleCop.Rules = {}));
    var Rules = TSStyleCop.Rules;
})(TSStyleCop || (TSStyleCop = {}));
/// <reference path="../../IStyleRule.ts" />
/// <reference path="SpacingHelpers.ts" />
var TSStyleCop;
(function (TSStyleCop) {
    (function (Rules) {
        var OpeningParenthesisMustBeSpacedCorrectly = (function () {
            function OpeningParenthesisMustBeSpacedCorrectly() {
                this.code = "SA1008";
                this.name = "OpeningParenthesisMustBeSpacedCorrectly";
                this.filter = [TypeScript.SyntaxKind.OpenParenToken];
            }
            OpeningParenthesisMustBeSpacedCorrectly.prototype.checkElement = function (openParen, context) {
                var prevToken = context.getPreviousToken(openParen);
                switch (prevToken.tokenKind) {
                    case TypeScript.SyntaxKind.IfKeyword:
                    case TypeScript.SyntaxKind.ForKeyword:
                    case TypeScript.SyntaxKind.SwitchKeyword:
                    case TypeScript.SyntaxKind.WhileKeyword:
                    case TypeScript.SyntaxKind.CatchKeyword:
                    case TypeScript.SyntaxKind.FunctionKeyword:
                    case TypeScript.SyntaxKind.ReturnKeyword:
                    case TypeScript.SyntaxKind.ColonToken:
                    case TypeScript.SyntaxKind.QuestionToken:
                    case TypeScript.SyntaxKind.TypeOfKeyword:
                    case TypeScript.SyntaxKind.EqualsGreaterThanToken:
                    case TypeScript.SyntaxKind.OpenBraceToken:
                        break;
                    default:
                        if (!TypeScript.SyntaxFacts.isBinaryExpressionOperatorToken(prevToken.tokenKind)) {
                            Rules.SpacingHelpers.errorIfLeadingWhitespace(openParen, context, this.name, this.code, true);
                        }
                }

                Rules.SpacingHelpers.errorIfTrailingWhitespace(openParen, context, this.name, this.code, true);
            };
            return OpeningParenthesisMustBeSpacedCorrectly;
        })();
        Rules.OpeningParenthesisMustBeSpacedCorrectly = OpeningParenthesisMustBeSpacedCorrectly;
    })(TSStyleCop.Rules || (TSStyleCop.Rules = {}));
    var Rules = TSStyleCop.Rules;
})(TSStyleCop || (TSStyleCop = {}));
/// <reference path="../../IStyleRule.ts" />
/// <reference path="../../Utils.ts" />
/// <reference path="SpacingHelpers.ts" />
var TSStyleCop;
(function (TSStyleCop) {
    (function (Rules) {
        var IncrementDecrementSymbolsMustBeSpacedCorrectly = (function () {
            function IncrementDecrementSymbolsMustBeSpacedCorrectly() {
                this.code = "SA1020";
                this.name = "IncrementDecrementSymbolsMustBeSpacedCorrectly";
                this.filter = [
                    TypeScript.SyntaxKind.PreDecrementExpression,
                    TypeScript.SyntaxKind.PreIncrementExpression,
                    TypeScript.SyntaxKind.PostDecrementExpression,
                    TypeScript.SyntaxKind.PostIncrementExpression];
            }
            IncrementDecrementSymbolsMustBeSpacedCorrectly.prototype.checkElement = function (expression, context) {
                var token = expression.operatorToken;
                switch (expression.kind()) {
                    case TypeScript.SyntaxKind.PreDecrementExpression:
                    case TypeScript.SyntaxKind.PreIncrementExpression:
                        Rules.SpacingHelpers.errorIfNotLeadingWhitespace(token, context, this.name, this.code, true, true);
                        Rules.SpacingHelpers.errorIfTrailingWhitespace(token, context, this.name, this.code, false);
                        break;
                    case TypeScript.SyntaxKind.PostDecrementExpression:
                    case TypeScript.SyntaxKind.PostIncrementExpression:
                        Rules.SpacingHelpers.errorIfLeadingWhitespace(token, context, this.name, this.code, true);
                        Rules.SpacingHelpers.errorIfNotTrailingWhitespace(token, context, this.name, this.code, true, true);
                        break;
                }
            };
            return IncrementDecrementSymbolsMustBeSpacedCorrectly;
        })();
        Rules.IncrementDecrementSymbolsMustBeSpacedCorrectly = IncrementDecrementSymbolsMustBeSpacedCorrectly;
    })(TSStyleCop.Rules || (TSStyleCop.Rules = {}));
    var Rules = TSStyleCop.Rules;
})(TSStyleCop || (TSStyleCop = {}));
/// <reference path="../../IStyleRule.ts" />
/// <reference path="../../Utils.ts" />
/// <reference path="SpacingHelpers.ts" />
var TSStyleCop;
(function (TSStyleCop) {
    (function (Rules) {
        var NegativeSignsMustBeSpacedCorrectly = (function () {
            function NegativeSignsMustBeSpacedCorrectly() {
                this.code = "SA1021";
                this.name = "NegativeSignsMustBeSpacedCorrectly";
                this.filter = [TypeScript.SyntaxKind.NegateExpression];
            }
            NegativeSignsMustBeSpacedCorrectly.prototype.checkElement = function (negateExpression, context) {
                var minusToken = negateExpression.operatorToken;
                Rules.SpacingHelpers.errorIfNotLeadingWhitespace(minusToken, context, this.name, this.code, true, true);
                Rules.SpacingHelpers.errorIfTrailingWhitespace(minusToken, context, this.name, this.code, false);
            };
            return NegativeSignsMustBeSpacedCorrectly;
        })();
        Rules.NegativeSignsMustBeSpacedCorrectly = NegativeSignsMustBeSpacedCorrectly;
    })(TSStyleCop.Rules || (TSStyleCop.Rules = {}));
    var Rules = TSStyleCop.Rules;
})(TSStyleCop || (TSStyleCop = {}));
/// <reference path="../../IStyleRule.ts" />
/// <reference path="../../Utils.ts" />
/// <reference path="SpacingHelpers.ts" />
var TSStyleCop;
(function (TSStyleCop) {
    (function (Rules) {
        var PositiveSignsMustBeSpacedCorrectly = (function () {
            function PositiveSignsMustBeSpacedCorrectly() {
                this.code = "SA1022";
                this.name = "PositiveSignsMustBeSpacedCorrectly";
                this.filter = [TypeScript.SyntaxKind.PlusExpression];
            }
            PositiveSignsMustBeSpacedCorrectly.prototype.checkElement = function (plusExpression, context) {
                var plusToken = plusExpression.operatorToken;
                Rules.SpacingHelpers.errorIfNotLeadingWhitespace(plusToken, context, this.name, this.code, false, true);
                Rules.SpacingHelpers.errorIfTrailingWhitespace(plusToken, context, this.name, this.code, false);
            };
            return PositiveSignsMustBeSpacedCorrectly;
        })();
        Rules.PositiveSignsMustBeSpacedCorrectly = PositiveSignsMustBeSpacedCorrectly;
    })(TSStyleCop.Rules || (TSStyleCop.Rules = {}));
    var Rules = TSStyleCop.Rules;
})(TSStyleCop || (TSStyleCop = {}));
/// <reference path="../../IStyleRule.ts" />
var TSStyleCop;
(function (TSStyleCop) {
    (function (Rules) {
        var TabsMustNotBeUsed = (function () {
            function TabsMustNotBeUsed() {
                this.code = "SA1027";
                this.name = "TabsMustNotBeUsed";
                this.filter = [TypeScript.SyntaxKind.MultiLineCommentTrivia, TypeScript.SyntaxKind.WhitespaceTrivia, TypeScript.SyntaxKind.SingleLineCommentTrivia];
            }
            TabsMustNotBeUsed.prototype.checkElement = function (whitespace, context, position) {
                var text = whitespace.fullText();
                if (text.indexOf("\t") >= 0) {
                    context.autoCorrectOrError(function () {
                        context.autoCorrectText(whitespace, text.replace(/\t/g, "    "));
                    }, null, this.name, this.code, position + text.indexOf("\t"), 0);
                }
            };
            return TabsMustNotBeUsed;
        })();
        Rules.TabsMustNotBeUsed = TabsMustNotBeUsed;
    })(TSStyleCop.Rules || (TSStyleCop.Rules = {}));
    var Rules = TSStyleCop.Rules;
})(TSStyleCop || (TSStyleCop = {}));
/// <reference path="../RuleHelpers.ts" />
var TSStyleCop;
(function (TSStyleCop) {
    (function (Rules) {
        var ElementMustBeginWithUpperCaseLetter = (function () {
            function ElementMustBeginWithUpperCaseLetter() {
                this.code = "SA1300";
                this.name = "ElementMustBeginWithUpperCaseLetter";
                this.filter = [
                    TypeScript.SyntaxKind.ClassDeclaration, TypeScript.SyntaxKind.EnumDeclaration,
                    TypeScript.SyntaxKind.InterfaceDeclaration, TypeScript.SyntaxKind.MemberVariableDeclaration];
            }
            ElementMustBeginWithUpperCaseLetter.prototype.checkElement = function (element, context) {
                var nameToken;

                if (element.kind() === TypeScript.SyntaxKind.MemberVariableDeclaration) {
                    var member = element;
                    var modifiers = member.modifiers;

                    if (Rules.RuleHelpers.listContains(modifiers, TypeScript.SyntaxKind.StaticKeyword)) {
                        nameToken = member.variableDeclarator.identifier;
                    }
                } else {
                    // classes, enums, and interfaces all have identifier properties
                    nameToken = element.identifier;
                }

                if (nameToken) {
                    var name = nameToken.text();

                    if (!name.match(/^[A-Z]/)) {
                        context.reportError(nameToken, this.name, this.code);
                    }
                }
            };
            return ElementMustBeginWithUpperCaseLetter;
        })();
        Rules.ElementMustBeginWithUpperCaseLetter = ElementMustBeginWithUpperCaseLetter;
    })(TSStyleCop.Rules || (TSStyleCop.Rules = {}));
    var Rules = TSStyleCop.Rules;
})(TSStyleCop || (TSStyleCop = {}));
/// <reference path="../../IStyleRule.ts" />
/// <reference path="../RuleHelpers.ts" />
var TSStyleCop;
(function (TSStyleCop) {
    (function (Rules) {
        var ElementMustBeginWithLowerCaseLetter = (function () {
            function ElementMustBeginWithLowerCaseLetter() {
                this.code = "SA1301";
                this.name = "ElementMustBeginWithLowerCaseLetter";
                this.filter = [
                    TypeScript.SyntaxKind.MemberFunctionDeclaration,
                    TypeScript.SyntaxKind.GetMemberAccessorDeclaration,
                    TypeScript.SyntaxKind.SetMemberAccessorDeclaration,
                    TypeScript.SyntaxKind.VariableDeclarator,
                    TypeScript.SyntaxKind.Parameter];
            }
            ElementMustBeginWithLowerCaseLetter.prototype.checkElement = function (member, context) {
                // Ignore static fields as they are covered by a separate rule (and aren't camel case)
                if (member.kind() === TypeScript.SyntaxKind.VariableDeclarator) {
                    var parent = context.getParent(member);
                    if (parent && parent.kind() === TypeScript.SyntaxKind.MemberVariableDeclaration && Rules.RuleHelpers.listContains(parent.modifiers, TypeScript.SyntaxKind.StaticKeyword)) {
                        return;
                    }
                }

                var nameToken = member.propertyName || member.identifier;
                var name = nameToken.text();

                if (!name.match(/^_?[a-z]/)) {
                    context.reportError(nameToken, this.name, this.code);
                }
            };
            return ElementMustBeginWithLowerCaseLetter;
        })();
        Rules.ElementMustBeginWithLowerCaseLetter = ElementMustBeginWithLowerCaseLetter;
    })(TSStyleCop.Rules || (TSStyleCop.Rules = {}));
    var Rules = TSStyleCop.Rules;
})(TSStyleCop || (TSStyleCop = {}));
/// <reference path="../../IStyleRule.ts" />
var TSStyleCop;
(function (TSStyleCop) {
    (function (Rules) {
        var InterfaceNamesMustBeginWithI = (function () {
            function InterfaceNamesMustBeginWithI() {
                this.code = "SA1302";
                this.name = "InterfaceNamesMustBeginWithI";
                this.filter = [TypeScript.SyntaxKind.InterfaceDeclaration];
            }
            InterfaceNamesMustBeginWithI.prototype.checkElement = function (node, context) {
                var nameToken = node.identifier;
                var name = nameToken.text();
                if (name.charAt(0) !== "I") {
                    context.reportError(nameToken, this.name, this.code);
                }
            };
            return InterfaceNamesMustBeginWithI;
        })();
        Rules.InterfaceNamesMustBeginWithI = InterfaceNamesMustBeginWithI;
    })(TSStyleCop.Rules || (TSStyleCop.Rules = {}));
    var Rules = TSStyleCop.Rules;
})(TSStyleCop || (TSStyleCop = {}));
/// <reference path="../../IStyleRule.ts" />
/// <reference path="../../Utils.ts" />
var TSStyleCop;
(function (TSStyleCop) {
    (function (Rules) {
        var AccessModifierMustBeDeclared = (function () {
            function AccessModifierMustBeDeclared() {
                this.code = "SA1400";
                this.name = "AccessModifierMustBeDeclared";
                this.filter = [TypeScript.SyntaxKind.ClassDeclaration];
            }
            AccessModifierMustBeDeclared.prototype.checkElement = function (classNode, context) {
                var elements = classNode.classElements;
                for (var i = 0; i < elements.childCount(); i++) {
                    var element = elements.childAt(i);
                    if (element.kind() !== TypeScript.SyntaxKind.ConstructorDeclaration) {
                        if (!element.modifiers || element.modifiers.childCount() === 0) {
                            context.reportError(element, this.name, this.code);
                        } else {
                            var foundAccessModifier = false;
                            for (var j = 0; j < element.modifiers.childCount(); j++) {
                                var modifier = element.modifiers.childAt(j);
                                switch (modifier.tokenKind) {
                                    case TypeScript.SyntaxKind.PublicKeyword:
                                    case TypeScript.SyntaxKind.ProtectedKeyword:
                                    case TypeScript.SyntaxKind.PrivateKeyword:
                                        foundAccessModifier = true;
                                        break;
                                    case TypeScript.SyntaxKind.StaticKeyword:
                                    case TypeScript.SyntaxKind.DeclareKeyword:
                                        break;
                                    default:
                                        throw "Unexpected";
                                }
                            }

                            if (!foundAccessModifier) {
                                context.reportError(element, this.name, this.code);
                            }
                        }
                    }
                }
            };
            return AccessModifierMustBeDeclared;
        })();
        Rules.AccessModifierMustBeDeclared = AccessModifierMustBeDeclared;
    })(TSStyleCop.Rules || (TSStyleCop.Rules = {}));
    var Rules = TSStyleCop.Rules;
})(TSStyleCop || (TSStyleCop = {}));
/// <reference path="../../IStyleRule.ts" />
/// <reference path="../RuleHelpers.ts" />
var TSStyleCop;
(function (TSStyleCop) {
    (function (Rules) {
        var CurlyBracketsMustBeOnCorrectLine = (function () {
            function CurlyBracketsMustBeOnCorrectLine() {
                this.code = "SA1500";
                this.name = "CurlyBracketsMustBeOnCorrectLine";
                this.filter = Rules.RuleHelpers.BlockNodeTypes;
            }
            CurlyBracketsMustBeOnCorrectLine.prototype.checkElement = function (node, context) {
                var parent = context.getParent(node);
                var openBrace = node.openBraceToken;
                var children = Rules.RuleHelpers.getBlockContents(node);
                var closeBrace = node.closeBraceToken;
                if (children.childCount() > 0) {
                    var openBraceLine = context.lineMap.getLineNumberFromPosition(context.start(openBrace));
                    var closeBraceLine = context.lineMap.getLineNumberFromPosition(context.start(closeBrace));
                    var firstChild = children.childAt(0);
                    var lastChild = children.childAt(children.childCount() - 1);
                    var firstStatementLine = context.lineMap.getLineNumberFromPosition(context.start(firstChild));
                    var lastStatementLine = context.lineMap.getLineNumberFromPosition(context.end(lastChild));
                    if (openBraceLine === closeBraceLine && openBraceLine === firstStatementLine && firstStatementLine === lastStatementLine) {
                        return;
                    }

                    if (context.isFirstTokenInLine(openBrace) && parent.kind() !== TypeScript.SyntaxKind.Block) {
                        context.autoCorrectOrError(function () {
                            context.clearLeadingWhitespace(openBrace);
                            context.autoCorrectText(openBrace, " " + openBrace.text());
                        }, openBrace, this.name, this.code);
                    } else if (openBraceLine === firstStatementLine) {
                        context.autoCorrectOrError(function () {
                            context.clearTrailingWhitespace(openBrace);
                            context.autoCorrectText(openBrace, openBrace.text() + TypeScript.newLine() + Rules.RuleHelpers.createIndent(context.getIndent(openBrace) + 1));
                        }, openBrace, this.name, this.code);
                    }

                    var nextToken = context.getNextToken(closeBrace);
                    var nextTokenLine = context.lineMap.getLineNumberFromPosition(context.start(nextToken));
                    var nextTokenKind = nextToken.tokenKind;

                    if (nextToken.tokenKind === TypeScript.SyntaxKind.WhileKeyword && context.getParent(nextToken).kind() !== TypeScript.SyntaxKind.DoStatement) {
                        // Clear out the next token kind because we don't want it treated like a do while expression
                        nextTokenKind = null;
                    }

                    switch (nextTokenKind) {
                        case TypeScript.SyntaxKind.EndOfFileToken:
                        case TypeScript.SyntaxKind.CloseParenToken:
                        case TypeScript.SyntaxKind.CommaToken:
                        case TypeScript.SyntaxKind.DotToken:
                        case TypeScript.SyntaxKind.SemicolonToken:
                        case TypeScript.SyntaxKind.CloseBracketToken:
                            if (closeBraceLine !== nextTokenLine && nextToken.width()) {
                                context.autoCorrectOrError(function () {
                                    context.clearTrailingWhitespace(closeBrace);
                                }, nextToken, this.name, this.code);
                            }

                            break;
                        case TypeScript.SyntaxKind.ElseKeyword:
                        case TypeScript.SyntaxKind.CatchKeyword:
                        case TypeScript.SyntaxKind.FinallyKeyword:
                        case TypeScript.SyntaxKind.WhileKeyword:
                            if (closeBraceLine !== nextTokenLine) {
                                context.autoCorrectOrError(function () {
                                    context.clearTrailingWhitespace(closeBrace);
                                    context.autoCorrectText(closeBrace, closeBrace.text() + " ");
                                }, nextToken, this.name, this.code);
                            }

                            break;
                        default:
                            if (closeBraceLine === nextTokenLine) {
                                context.reportError(closeBrace, this.name, this.code);
                            }

                            break;
                    }

                    if (closeBraceLine === lastStatementLine) {
                        context.reportError(closeBrace, this.name, this.code);
                    }
                }
            };
            return CurlyBracketsMustBeOnCorrectLine;
        })();
        Rules.CurlyBracketsMustBeOnCorrectLine = CurlyBracketsMustBeOnCorrectLine;
    })(TSStyleCop.Rules || (TSStyleCop.Rules = {}));
    var Rules = TSStyleCop.Rules;
})(TSStyleCop || (TSStyleCop = {}));
/// <reference path="../../IStyleRule.ts" />
var TSStyleCop;
(function (TSStyleCop) {
    (function (Rules) {
        var CurlyBracketsMustNotBeOmitted = (function () {
            function CurlyBracketsMustNotBeOmitted() {
                this.code = "SA1503";
                this.name = "CurlyBracketsMustNotBeOmitted";
                this.filter = [
                    TypeScript.SyntaxKind.IfStatement,
                    TypeScript.SyntaxKind.ElseClause,
                    TypeScript.SyntaxKind.DoStatement,
                    TypeScript.SyntaxKind.ForInStatement,
                    TypeScript.SyntaxKind.ForStatement,
                    TypeScript.SyntaxKind.WhileStatement
                ];
            }
            CurlyBracketsMustNotBeOmitted.prototype.checkElement = function (syntaxNode, context) {
                var node = syntaxNode;
                if (node.kind() === TypeScript.SyntaxKind.ElseClause && node.statement && node.statement.kind() === TypeScript.SyntaxKind.IfStatement) {
                    return;
                }

                if (node.statement && node.statement.kind() !== TypeScript.SyntaxKind.Block) {
                    context.reportError(node.statement, this.name, this.code);
                }
            };
            return CurlyBracketsMustNotBeOmitted;
        })();
        Rules.CurlyBracketsMustNotBeOmitted = CurlyBracketsMustNotBeOmitted;
    })(TSStyleCop.Rules || (TSStyleCop.Rules = {}));
    var Rules = TSStyleCop.Rules;
})(TSStyleCop || (TSStyleCop = {}));
/// <reference path="../../IStyleRule.ts" />
/// <reference path="../RuleHelpers.ts" />
var TSStyleCop;
(function (TSStyleCop) {
    (function (Rules) {
        var OpeningCurlyBracketsMustNotBeFollowedByBlankLine = (function () {
            function OpeningCurlyBracketsMustNotBeFollowedByBlankLine() {
                this.code = "SA1505";
                this.name = "OpeningCurlyBracketsMustNotBeFollowedByBlankLine";
                this.filter = Rules.RuleHelpers.BlockNodeTypes.concat(Rules.RuleHelpers.ObjectLiteralTypes);
            }
            OpeningCurlyBracketsMustNotBeFollowedByBlankLine.prototype.checkElement = function (node, context) {
                var openBrace = node.openBraceToken;
                var closeBrace = node.closeBraceToken;
                var openBraceLine = context.lineMap.getLineNumberFromPosition(context.start(openBrace));
                var closeBraceLine = context.lineMap.getLineNumberFromPosition(context.start(closeBrace));

                if (openBraceLine === closeBraceLine) {
                    return;
                }

                if (context.isWhitespaceLine(openBraceLine + 1)) {
                    context.autoCorrectOrError(function () {
                        var nextToken = context.getNextToken(openBrace);
                        var trailingWhitespace = context.getTrailingWhitespace(openBrace);
                        var lastLineBreak = Math.min(trailingWhitespace.lastIndexOf("\n"), trailingWhitespace.lastIndexOf("\r"));
                        context.clearTrailingWhitespace(openBrace);
                        context.autoCorrectText(openBrace, openBrace.text() + trailingWhitespace.substr(lastLineBreak));
                    }, openBrace, this.name, this.code);
                }
            };
            return OpeningCurlyBracketsMustNotBeFollowedByBlankLine;
        })();
        Rules.OpeningCurlyBracketsMustNotBeFollowedByBlankLine = OpeningCurlyBracketsMustNotBeFollowedByBlankLine;
    })(TSStyleCop.Rules || (TSStyleCop.Rules = {}));
    var Rules = TSStyleCop.Rules;
})(TSStyleCop || (TSStyleCop = {}));
/// <reference path="../../IStyleRule.ts" />
var TSStyleCop;
(function (TSStyleCop) {
    (function (Rules) {
        var CodeMustNotContainMultipleBlankLinesInARow = (function () {
            function CodeMustNotContainMultipleBlankLinesInARow() {
                this.code = "SA1507";
                this.name = "CodeMustNotContainMultipleBlankLinesInARow";
                this.filter = [TypeScript.SyntaxKind.NewLineTrivia];
            }
            CodeMustNotContainMultipleBlankLinesInARow.prototype.checkElement = function (trivia, context) {
                trivia = trivia.nextTrivia;
                var foundOne = false;
                while (trivia && !trivia.isComment()) {
                    if (trivia.isNewLine()) {
                        if (foundOne) {
                            context.autoCorrectOrError(function () {
                                context.autoCorrectText(trivia, "");
                            }, null, this.name, this.code, context.start(trivia), 0);
                        }

                        foundOne = true;
                    }

                    trivia = trivia.nextTrivia;
                }
            };
            return CodeMustNotContainMultipleBlankLinesInARow;
        })();
        Rules.CodeMustNotContainMultipleBlankLinesInARow = CodeMustNotContainMultipleBlankLinesInARow;
    })(TSStyleCop.Rules || (TSStyleCop.Rules = {}));
    var Rules = TSStyleCop.Rules;
})(TSStyleCop || (TSStyleCop = {}));
/// <reference path="../../IStyleRule.ts" />
/// <reference path="../RuleHelpers.ts" />
var TSStyleCop;
(function (TSStyleCop) {
    (function (Rules) {
        var ClosingCurlyBracketsMustNotBePrecededByBlankLine = (function () {
            function ClosingCurlyBracketsMustNotBePrecededByBlankLine() {
                this.code = "SA1508";
                this.name = "ClosingCurlyBracketsMustNotBePrecededByBlankLine";
                this.filter = Rules.RuleHelpers.BlockNodeTypes.concat(Rules.RuleHelpers.ObjectLiteralTypes);
            }
            ClosingCurlyBracketsMustNotBePrecededByBlankLine.prototype.checkElement = function (node, context) {
                var openBrace = node.openBraceToken;
                var closeBrace = node.closeBraceToken;
                var openBraceLine = context.lineMap.getLineNumberFromPosition(context.start(openBrace));
                var closeBraceLine = context.lineMap.getLineNumberFromPosition(context.start(closeBrace));

                if (openBraceLine === closeBraceLine) {
                    return;
                }

                if (context.isWhitespaceLine(closeBraceLine - 1)) {
                    context.autoCorrectOrError(function () {
                        var leadingWhitespace = context.getLeadingWhitespace(closeBrace);
                        var lastLineBreak = Math.min(leadingWhitespace.lastIndexOf("\n"), leadingWhitespace.lastIndexOf("\r"));
                        context.clearTrailingWhitespace(context.getPreviousToken(closeBrace));
                        context.autoCorrectText(closeBrace, leadingWhitespace.substr(lastLineBreak) + closeBrace.text());
                    }, closeBrace, this.name, this.code);
                }
            };
            return ClosingCurlyBracketsMustNotBePrecededByBlankLine;
        })();
        Rules.ClosingCurlyBracketsMustNotBePrecededByBlankLine = ClosingCurlyBracketsMustNotBePrecededByBlankLine;
    })(TSStyleCop.Rules || (TSStyleCop.Rules = {}));
    var Rules = TSStyleCop.Rules;
})(TSStyleCop || (TSStyleCop = {}));
/// <reference path="../../IStyleRule.ts" />
var TSStyleCop;
(function (TSStyleCop) {
    (function (Rules) {
        var SingleLineCommentsMustNotBeFollowedByBlankLine = (function () {
            function SingleLineCommentsMustNotBeFollowedByBlankLine() {
                this.code = "SA1512";
                this.name = "SingleLineCommentsMustNotBeFollowedByBlankLine";
                this.filter = [TypeScript.SyntaxKind.SingleLineCommentTrivia];
            }
            SingleLineCommentsMustNotBeFollowedByBlankLine.prototype.checkElement = function (comment, context, position) {
                var text = comment.fullText();
                if (text.length > 2 && text.substr(0, 2) === "//" && text.charAt(2) !== "/") {
                    // First make sure the comment starts the line by finding a previous new line trivia
                    var trivia = comment.prevTrivia;
                    var startsLine = false;
                    while (trivia && !trivia.isComment()) {
                        if (trivia.isNewLine()) {
                            startsLine = true;
                            break;
                        }

                        trivia = trivia.prevTrivia;
                    }

                    trivia = comment.nextTrivia;
                    var foundOne = false;
                    while (startsLine && trivia && !trivia.isComment()) {
                        if (trivia.isNewLine()) {
                            if (foundOne) {
                                context.autoCorrectOrError(function () {
                                    context.autoCorrectText(trivia, "");
                                }, null, this.name, this.code, context.start(trivia), 0);
                            }

                            foundOne = true;
                        }

                        trivia = trivia.nextTrivia;
                    }
                }
            };
            return SingleLineCommentsMustNotBeFollowedByBlankLine;
        })();
        Rules.SingleLineCommentsMustNotBeFollowedByBlankLine = SingleLineCommentsMustNotBeFollowedByBlankLine;
    })(TSStyleCop.Rules || (TSStyleCop.Rules = {}));
    var Rules = TSStyleCop.Rules;
})(TSStyleCop || (TSStyleCop = {}));
/// <reference path="../../IStyleRule.ts" />
/// <reference path="../RuleHelpers.ts" />
var TSStyleCop;
(function (TSStyleCop) {
    (function (Rules) {
        var ClosingCurlyBracketMustBeFollowedByBlankLine = (function () {
            function ClosingCurlyBracketMustBeFollowedByBlankLine() {
                this.code = "SA1513";
                this.name = "ClosingCurlyBracketMustBeFollowedByBlankLine";
                this.filter = Rules.RuleHelpers.BlockNodeTypes;
            }
            ClosingCurlyBracketMustBeFollowedByBlankLine.prototype.checkElement = function (node, context) {
                var openBrace = node.openBraceToken;
                var closeBrace = node.closeBraceToken;
                var openBraceLine = context.lineMap.getLineNumberFromPosition(context.start(openBrace));
                var closeBraceLine = context.lineMap.getLineNumberFromPosition(context.start(closeBrace));
                if (openBraceLine === closeBraceLine) {
                    return;
                }

                // We allow grouping accessors together as they're conceptually one unit. Unfortunately this exclusion
                // means we won't catch cases where another member declaration is immediately following a set/get accessor
                // declaration. We could consider checking the parent of the token after the close brace to add this support,
                // but it doesn't seem worth the complexity for the moment.
                var parent = context.getParent(node);
                if (parent) {
                    var kind = parent.kind();

                    if (kind === TypeScript.SyntaxKind.GetMemberAccessorDeclaration || kind === TypeScript.SyntaxKind.SetMemberAccessorDeclaration) {
                        return;
                    }
                }

                var nextToken = context.getNextToken(closeBrace);
                if (nextToken.tokenKind === TypeScript.SyntaxKind.SemicolonToken) {
                    return;
                }

                switch (nextToken.tokenKind) {
                    case TypeScript.SyntaxKind.CloseBraceToken:
                    case TypeScript.SyntaxKind.ElseKeyword:
                    case TypeScript.SyntaxKind.CatchKeyword:
                    case TypeScript.SyntaxKind.FinallyKeyword:
                    case TypeScript.SyntaxKind.CommaToken:
                    case TypeScript.SyntaxKind.EndOfFileToken:
                    case TypeScript.SyntaxKind.DotToken:
                    case TypeScript.SyntaxKind.CloseParenToken:
                        return;
                    default:
                        if (!context.isWhitespaceLine(closeBraceLine + 1)) {
                            context.autoCorrectOrError(function () {
                                context.autoCorrectText(closeBrace, closeBrace.text() + TypeScript.newLine());
                            }, closeBrace, this.name, this.code);
                        }

                        break;
                }
            };
            return ClosingCurlyBracketMustBeFollowedByBlankLine;
        })();
        Rules.ClosingCurlyBracketMustBeFollowedByBlankLine = ClosingCurlyBracketMustBeFollowedByBlankLine;
    })(TSStyleCop.Rules || (TSStyleCop.Rules = {}));
    var Rules = TSStyleCop.Rules;
})(TSStyleCop || (TSStyleCop = {}));
/// <reference path="../../IStyleRule.ts" />
var TSStyleCop;
(function (TSStyleCop) {
    (function (Rules) {
        var ParametersMustHaveTypeAnnotation = (function () {
            function ParametersMustHaveTypeAnnotation() {
                this.code = "SA9001";
                this.name = "ParametersMustHaveTypeAnnotation";
                this.filter = [TypeScript.SyntaxKind.Parameter, TypeScript.SyntaxKind.IndexSignature];
            }
            ParametersMustHaveTypeAnnotation.prototype.checkElement = function (parameter, context) {
                if (!parameter.typeAnnotation) {
                    context.reportError(parameter, this.name, this.code);
                }
            };
            return ParametersMustHaveTypeAnnotation;
        })();
        Rules.ParametersMustHaveTypeAnnotation = ParametersMustHaveTypeAnnotation;
    })(TSStyleCop.Rules || (TSStyleCop.Rules = {}));
    var Rules = TSStyleCop.Rules;
})(TSStyleCop || (TSStyleCop = {}));
/// <reference path="../../IStyleRule.ts" />
var TSStyleCop;
(function (TSStyleCop) {
    (function (Rules) {
        var FunctionsMustHaveTypeAnnotation = (function () {
            function FunctionsMustHaveTypeAnnotation() {
                this.code = "SA9002";
                this.name = "FunctionsMustHaveTypeAnnotation";
                this.filter = [
                    TypeScript.SyntaxKind.CallSignature,
                    TypeScript.SyntaxKind.GetAccessorPropertyAssignment,
                    TypeScript.SyntaxKind.GetMemberAccessorDeclaration];
            }
            FunctionsMustHaveTypeAnnotation.prototype.checkElement = function (node, context) {
                var parent = context.getParent(node);
                if (!node.typeAnnotation && context.getParent(node).kind() !== TypeScript.SyntaxKind.ParenthesizedArrowFunctionExpression) {
                    context.reportError(node, this.name, this.code, context.end(node));
                }
            };
            return FunctionsMustHaveTypeAnnotation;
        })();
        Rules.FunctionsMustHaveTypeAnnotation = FunctionsMustHaveTypeAnnotation;
    })(TSStyleCop.Rules || (TSStyleCop.Rules = {}));
    var Rules = TSStyleCop.Rules;
})(TSStyleCop || (TSStyleCop = {}));
/// <reference path="../../IStyleRule.ts" />
var TSStyleCop;
(function (TSStyleCop) {
    (function (Rules) {
        var UnassignedVariablesMustHaveTypeAnnotation = (function () {
            function UnassignedVariablesMustHaveTypeAnnotation() {
                this.code = "SA9003";
                this.name = "UnassignedVariablesMustHaveTypeAnnotation";
                this.filter = [TypeScript.SyntaxKind.VariableDeclarator];
            }
            UnassignedVariablesMustHaveTypeAnnotation.prototype.checkElement = function (variable, context) {
                var grandParentElement = context.getParent(context.getParent(variable));
                if (grandParentElement.isNode() && grandParentElement.kind() === TypeScript.SyntaxKind.ForInStatement) {
                    // for (var key in obj) doesn't need a type annotation for key
                    return;
                }

                if (!variable.typeAnnotation && !variable.equalsValueClause) {
                    context.reportError(variable, this.name, this.code);
                }
            };
            return UnassignedVariablesMustHaveTypeAnnotation;
        })();
        Rules.UnassignedVariablesMustHaveTypeAnnotation = UnassignedVariablesMustHaveTypeAnnotation;
    })(TSStyleCop.Rules || (TSStyleCop.Rules = {}));
    var Rules = TSStyleCop.Rules;
})(TSStyleCop || (TSStyleCop = {}));
/// <reference path="../../IStyleRule.ts" />
var TSStyleCop;
(function (TSStyleCop) {
    (function (Rules) {
        var StringLiteralsMustUseDoubleQuotes = (function () {
            function StringLiteralsMustUseDoubleQuotes() {
                this.code = "SA9004";
                this.name = "StringLiteralsMustUseDoubleQuotes";
                this.filter = [TypeScript.SyntaxKind.StringLiteral];
            }
            StringLiteralsMustUseDoubleQuotes.prototype.checkElement = function (stringToken, context) {
                var text = stringToken.text();
                if (text.charAt(0) !== "\"") {
                    context.autoCorrectOrError(function () {
                        context.autoCorrectText(stringToken, "\"" + text.substr(1, text.length - 2).replace(/\"/g, "\\\"") + "\"");
                    }, stringToken, this.name, this.code);
                }
            };
            return StringLiteralsMustUseDoubleQuotes;
        })();
        Rules.StringLiteralsMustUseDoubleQuotes = StringLiteralsMustUseDoubleQuotes;
    })(TSStyleCop.Rules || (TSStyleCop.Rules = {}));
    var Rules = TSStyleCop.Rules;
})(TSStyleCop || (TSStyleCop = {}));
/// <reference path="../../IStyleRule.ts" />
var TSStyleCop;
(function (TSStyleCop) {
    (function (Rules) {
        var ComparisonOperatorsMustBeStrict = (function () {
            function ComparisonOperatorsMustBeStrict() {
                this.code = "SA9005";
                this.name = "ComparisonOperatorsMustBeStrict";
                this.filter = [TypeScript.SyntaxKind.EqualsEqualsToken, TypeScript.SyntaxKind.ExclamationEqualsToken];
            }
            ComparisonOperatorsMustBeStrict.prototype.checkElement = function (token, context) {
                context.reportError(token, this.name, this.code);
            };
            return ComparisonOperatorsMustBeStrict;
        })();
        Rules.ComparisonOperatorsMustBeStrict = ComparisonOperatorsMustBeStrict;
    })(TSStyleCop.Rules || (TSStyleCop.Rules = {}));
    var Rules = TSStyleCop.Rules;
})(TSStyleCop || (TSStyleCop = {}));
/// <reference path="../../IStyleRule.ts" />
/// <reference path="../../Utils.ts" />
var TSStyleCop;
(function (TSStyleCop) {
    (function (Rules) {
        var DoNotUseAutomaticSemicolons = (function () {
            function DoNotUseAutomaticSemicolons() {
                this.code = "SA9006";
                this.name = "DoNotUseAutomaticSemicolons";
                this.filter = [TypeScript.SyntaxKind.SemicolonToken];
            }
            DoNotUseAutomaticSemicolons.prototype.checkElement = function (semicolon, context) {
                if (!semicolon.width()) {
                    var prevToken = context.getPreviousToken(semicolon);
                    context.autoCorrectOrError(function () {
                        context.autoCorrectText(prevToken, prevToken.text() + ";");
                    }, null, this.name, this.code, context.end(prevToken), 0);
                }
            };
            return DoNotUseAutomaticSemicolons;
        })();
        Rules.DoNotUseAutomaticSemicolons = DoNotUseAutomaticSemicolons;
    })(TSStyleCop.Rules || (TSStyleCop.Rules = {}));
    var Rules = TSStyleCop.Rules;
})(TSStyleCop || (TSStyleCop = {}));
/// <reference path="../../IStyleRule.ts" />
var TSStyleCop;
(function (TSStyleCop) {
    (function (Rules) {
        var PropertiesMustHaveTypeAnnotation = (function () {
            function PropertiesMustHaveTypeAnnotation() {
                this.code = "SA9008";
                this.name = "PropertiesMustHaveTypeAnnotation";
                this.filter = [TypeScript.SyntaxKind.PropertySignature];
            }
            PropertiesMustHaveTypeAnnotation.prototype.checkElement = function (property, context) {
                if (!property.typeAnnotation) {
                    context.reportError(property, this.name, this.code);
                }
            };
            return PropertiesMustHaveTypeAnnotation;
        })();
        Rules.PropertiesMustHaveTypeAnnotation = PropertiesMustHaveTypeAnnotation;
    })(TSStyleCop.Rules || (TSStyleCop.Rules = {}));
    var Rules = TSStyleCop.Rules;
})(TSStyleCop || (TSStyleCop = {}));
/// <reference path="../../IStyleRule.ts" />
/// <reference path="../RuleHelpers.ts" />
var TSStyleCop;
(function (TSStyleCop) {
    (function (Rules) {
        var PrivateFieldsMustBeginWithUnderscore = (function () {
            function PrivateFieldsMustBeginWithUnderscore() {
                this.code = "SA9009";
                this.name = "PrivateFieldsMustBeginWithUnderscore";
                this.filter = [TypeScript.SyntaxKind.MemberVariableDeclaration];
            }
            PrivateFieldsMustBeginWithUnderscore.prototype.checkElement = function (node, context) {
                var modifiers = node.modifiers;
                if (Rules.RuleHelpers.listContains(modifiers, TypeScript.SyntaxKind.PrivateKeyword) && !Rules.RuleHelpers.listContains(modifiers, TypeScript.SyntaxKind.StaticKeyword)) {
                    var nameToken = node.variableDeclarator.identifier;
                    var name = nameToken.text();
                    if (name.charAt(0) !== "_") {
                        context.reportError(nameToken, this.name, this.code);
                    }
                }
            };
            return PrivateFieldsMustBeginWithUnderscore;
        })();
        Rules.PrivateFieldsMustBeginWithUnderscore = PrivateFieldsMustBeginWithUnderscore;
    })(TSStyleCop.Rules || (TSStyleCop.Rules = {}));
    var Rules = TSStyleCop.Rules;
})(TSStyleCop || (TSStyleCop = {}));
/// <reference path="IDocumentation.d.ts" />
/// <reference path="../../TypeScript/tsc.d.ts" />
/// <reference path="../../RuleContext.ts" />
var TSStyleCop;
(function (TSStyleCop) {
    (function (Rules) {
        var DocumentationHelpers = (function () {
            function DocumentationHelpers() {
            }
            DocumentationHelpers.parseXmlDoc = function (comment) {
                if (!DocumentationHelpers.isXmlDoc(comment)) {
                    throw new Error("parseXmlDoc should be called on the first XML comment line");
                }

                var content = "";
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

                var documentation = { summary: "", parameters: [] };

                var xmlDoc;
                var xmlText = "<doc>" + content + "</doc>";
                if (typeof DOMParser !== "undefined") {
                    var parser = new DOMParser();
                    xmlDoc = parser.parseFromString(xmlText, "text/xml");
                } else {
                    xmlDoc = new ActiveXObject("Microsoft.XMLDOM");
                    xmlDoc.async = false;
                    xmlDoc.loadXML(xmlText);
                }

                var nodes = xmlDoc.documentElement.childNodes;
                for (var i = 0; i < nodes.length; i++) {
                    if (nodes[i].nodeType === 1) {
                        var node = nodes[i];
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
            };

            DocumentationHelpers.createJSDoc = function (documentation, column) {
                var indent = Rules.RuleHelpers.spaceString(column + 1) + "*";
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

                return TypeScript.Syntax.trivia(TypeScript.SyntaxKind.MultiLineCommentTrivia, text);

                // NOTE: The \n chars in the function below are maintaining existing \r chars if they exist, so no need for TypeScript.newLine()
                function appendJSDocLines(content, header) {
                    var lines = content.trim().split("\n");
                    var innerIndent = Rules.RuleHelpers.spaceString(header.length + 1);

                    text += indent + " " + header + lines[0] + "\n";

                    for (var i = 1; i < lines.length; i++) {
                        text += indent + innerIndent + lines[i] + "\n";
                    }
                }
            };

            DocumentationHelpers.isXmlDoc = function (comment) {
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
            };
            return DocumentationHelpers;
        })();
        Rules.DocumentationHelpers = DocumentationHelpers;
    })(TSStyleCop.Rules || (TSStyleCop.Rules = {}));
    var Rules = TSStyleCop.Rules;
})(TSStyleCop || (TSStyleCop = {}));
/// <reference path="../../IStyleRule.ts" />
/// <reference path="../RuleHelpers.ts" />
/// <reference path="../Documentation/DocumentationHelpers.ts" />
var TSStyleCop;
(function (TSStyleCop) {
    (function (Rules) {
        var DoNotUseXmlDocs = (function () {
            function DoNotUseXmlDocs() {
                this.code = "SA9010";
                this.name = "DoNotUseXmlDocs";
                this.filter = [TypeScript.SyntaxKind.SingleLineCommentTrivia];
            }
            DoNotUseXmlDocs.prototype.checkElement = function (comment, context, position) {
                if (Rules.DocumentationHelpers.isXmlDoc(comment)) {
                    context.autoCorrectOrError(function () {
                        var documentation = Rules.DocumentationHelpers.parseXmlDoc(comment);
                        var token = comment.token;

                        while (context.start(token) > position) {
                            token = context.getPreviousToken(token);
                        }

                        // Scan to the beginning of the line
                        var line = context.lineMap.getLineNumberFromPosition(context.start(token));
                        var prevToken = context.getPreviousToken(token);
                        while (prevToken && context.lineMap.getLineNumberFromPosition(context.start(prevToken)) === line) {
                            token = prevToken;
                            prevToken = context.getPreviousToken(token);
                        }

                        while (comment) {
                            if (comment.kind() === TypeScript.SyntaxKind.SingleLineCommentTrivia) {
                                if (comment.fullText().match(/^\/\/\/\s*(.*)$/)) {
                                    context.autoCorrectText(comment, "");
                                } else {
                                    break;
                                }
                            } else if (comment.kind() === TypeScript.SyntaxKind.MultiLineCommentTrivia) {
                                break;
                            } else {
                                // Clear whitespace and newlines between comment lines
                                context.autoCorrectText(comment, "");
                            }

                            comment = comment.nextTrivia;
                        }

                        var triviaToAddTo = token.leadingTrivia();
                        var column = context.lineMap.getLineAndCharacterFromPosition(context.start(token)).character();
                        triviaToAddTo.push(Rules.DocumentationHelpers.createJSDoc(documentation, column));
                        triviaToAddTo.push(TypeScript.Syntax.trivia(TypeScript.SyntaxKind.WhitespaceTrivia, Rules.RuleHelpers.spaceString(column)));
                    }, null, this.name, this.code, position);
                }
            };
            return DoNotUseXmlDocs;
        })();
        Rules.DoNotUseXmlDocs = DoNotUseXmlDocs;
    })(TSStyleCop.Rules || (TSStyleCop.Rules = {}));
    var Rules = TSStyleCop.Rules;
})(TSStyleCop || (TSStyleCop = {}));
/// <reference path="../../IStyleRule.ts" />
/// <reference path="../RuleHelpers.ts" />
/// <reference path="../Spacing/SpacingHelpers.ts" />
var TSStyleCop;
(function (TSStyleCop) {
    (function (Rules) {
        var ObjectLiteralExpressionMustBeLaidOutCorrectly = (function () {
            function ObjectLiteralExpressionMustBeLaidOutCorrectly() {
                this.code = "SA9011";
                this.name = "ObjectLiteralExpressionMustBeLaidOutCorrectly";
                this.filter = [TypeScript.SyntaxKind.ColonToken, TypeScript.SyntaxKind.ObjectLiteralExpression];
            }
            ObjectLiteralExpressionMustBeLaidOutCorrectly.prototype.checkElement = function (token, context) {
                var parent = context.getParent(token);
                var grandParent = context.getParent(parent);
                if (token.isToken() && token.tokenKind === TypeScript.SyntaxKind.ColonToken) {
                    if (grandParent.kind() === TypeScript.SyntaxKind.PropertySignature || grandParent.kind() === TypeScript.SyntaxKind.ObjectLiteralExpression) {
                        var nextToken = context.getNextToken(token);
                        var colonLine = context.lineMap.getLineNumberFromPosition(context.start(token));
                        var nextTokenLine = context.lineMap.getLineNumberFromPosition(context.start(nextToken));
                        if (colonLine !== nextTokenLine) {
                            context.autoCorrectOrError(function () {
                                var colon = context.getPreviousToken(nextToken);
                                context.clearTrailingWhitespace(colon);
                                context.autoCorrectText(colon, ": ");
                            }, nextToken, this.name, this.code);
                        }
                    }
                } else if (token.isNode() && token.kind() === TypeScript.SyntaxKind.ObjectLiteralExpression) {
                    var openBrace = token.openBraceToken;
                    var closeBrace = token.closeBraceToken;
                    var openBraceLine = context.lineMap.getLineNumberFromPosition(context.start(openBrace));
                    var closeBraceLine = context.lineMap.getLineNumberFromPosition(context.start(closeBrace));
                    if (openBraceLine === closeBraceLine && context.getNextToken(openBrace) !== closeBrace) {
                        Rules.SpacingHelpers.errorIfNotLeadingWhitespace(closeBrace, context, this.name, this.code, false, true);
                        Rules.SpacingHelpers.errorIfNotTrailingWhitespace(openBrace, context, this.name, this.code, true, true);
                    }
                }
            };
            return ObjectLiteralExpressionMustBeLaidOutCorrectly;
        })();
        Rules.ObjectLiteralExpressionMustBeLaidOutCorrectly = ObjectLiteralExpressionMustBeLaidOutCorrectly;
    })(TSStyleCop.Rules || (TSStyleCop.Rules = {}));
    var Rules = TSStyleCop.Rules;
})(TSStyleCop || (TSStyleCop = {}));
/// <reference path="../RuleHelpers.ts" />
var TSStyleCop;
(function (TSStyleCop) {
    (function (Rules) {
        var ObjectLiteralsDontUseQuotesForNames = (function () {
            function ObjectLiteralsDontUseQuotesForNames() {
                this.code = "SA9012";
                this.name = "ObjectLiteralsDontUseQuotesForNames";
                this.filter = [TypeScript.SyntaxKind.ObjectLiteralExpression];
            }
            ObjectLiteralsDontUseQuotesForNames.prototype.checkElement = function (objectLiteralNode, context) {
                var propertyAssignments = objectLiteralNode.propertyAssignments.toNonSeparatorArray();

                for (var propertyIndex = 0; propertyIndex < propertyAssignments.length; propertyIndex++) {
                    var property = propertyAssignments[propertyIndex];

                    if (property.propertyName && property.propertyName.tokenKind === TypeScript.SyntaxKind.StringLiteral) {
                        var propertyText = property.propertyName.text();
                        var propertySimpleText = TypeScript.SimpleText.fromString(propertyText.substring(1, propertyText.length - 1));

                        if (propertySimpleText && TypeScript.Scanner.isValidIdentifier(propertySimpleText, 1 /* EcmaScript5 */)) {
                            context.reportError(property.propertyName, this.name, this.code);
                        }
                    }
                }
            };
            return ObjectLiteralsDontUseQuotesForNames;
        })();
        Rules.ObjectLiteralsDontUseQuotesForNames = ObjectLiteralsDontUseQuotesForNames;
    })(TSStyleCop.Rules || (TSStyleCop.Rules = {}));
    var Rules = TSStyleCop.Rules;
})(TSStyleCop || (TSStyleCop = {}));
/// <reference path="../RuleHelpers.ts" />
var TSStyleCop;
(function (TSStyleCop) {
    (function (Rules) {
        var DoNotUseParameterPropertyDeclarations = (function () {
            function DoNotUseParameterPropertyDeclarations() {
                this.code = "SA9013";
                this.name = "DoNotUseParameterPropertyDeclarations";
                this.filter = [TypeScript.SyntaxKind.ConstructorDeclaration];
            }
            DoNotUseParameterPropertyDeclarations.prototype.checkElement = function (constructorDeclaration, context) {
                var parameterList = constructorDeclaration.parameterList;
                var containsParameterPropertyDeclaration = false;

                if (parameterList && parameterList.parameters) {
                    var parameters = parameterList.parameters;

                    for (var parameterIndex = 0; parameterIndex < parameters.childCount(); parameterIndex++) {
                        var parameter = parameters.childAt(parameterIndex);

                        if (parameter.kind() === TypeScript.SyntaxKind.Parameter && parameter.publicOrPrivateKeyword) {
                            containsParameterPropertyDeclaration = true;
                            break;
                        }
                    }

                    if (containsParameterPropertyDeclaration) {
                        context.reportError(constructorDeclaration, this.name, this.code);
                    }
                }
            };
            return DoNotUseParameterPropertyDeclarations;
        })();
        Rules.DoNotUseParameterPropertyDeclarations = DoNotUseParameterPropertyDeclarations;
    })(TSStyleCop.Rules || (TSStyleCop.Rules = {}));
    var Rules = TSStyleCop.Rules;
})(TSStyleCop || (TSStyleCop = {}));
/// <reference path="../RuleHelpers.ts" />
var TSStyleCop;
(function (TSStyleCop) {
    (function (Rules) {
        var DoNotCompareAgainstNull = (function () {
            function DoNotCompareAgainstNull() {
                this.code = "SA9014";
                this.name = "DoNotCompareAgainstNull";
                this.filter = Rules.RuleHelpers.ComparisonExpressionTypes;
            }
            DoNotCompareAgainstNull.prototype.checkElement = function (binaryExpression, context) {
                if (binaryExpression.left.kind() === TypeScript.SyntaxKind.NullKeyword || binaryExpression.right.kind() === TypeScript.SyntaxKind.NullKeyword) {
                    context.reportError(binaryExpression, this.name, this.code);
                }
            };
            return DoNotCompareAgainstNull;
        })();
        Rules.DoNotCompareAgainstNull = DoNotCompareAgainstNull;
    })(TSStyleCop.Rules || (TSStyleCop.Rules = {}));
    var Rules = TSStyleCop.Rules;
})(TSStyleCop || (TSStyleCop = {}));
/// <reference path="../RuleHelpers.ts" />
var TSStyleCop;
(function (TSStyleCop) {
    (function (Rules) {
        var DoNotCompareAgainstTrueOrFalse = (function () {
            function DoNotCompareAgainstTrueOrFalse() {
                this.code = "SA9015";
                this.name = "DoNotCompareAgainstTrueOrFalse";
                this.filter = Rules.RuleHelpers.ComparisonExpressionTypes;
            }
            DoNotCompareAgainstTrueOrFalse.prototype.checkElement = function (binaryExpression, context) {
                var leftKind = binaryExpression.left.kind();
                var rightKind = binaryExpression.right.kind();

                if (leftKind === TypeScript.SyntaxKind.TrueKeyword || leftKind === TypeScript.SyntaxKind.FalseKeyword || rightKind === TypeScript.SyntaxKind.TrueKeyword || rightKind === TypeScript.SyntaxKind.FalseKeyword) {
                    context.reportError(binaryExpression, this.name, this.code);
                }
            };
            return DoNotCompareAgainstTrueOrFalse;
        })();
        Rules.DoNotCompareAgainstTrueOrFalse = DoNotCompareAgainstTrueOrFalse;
    })(TSStyleCop.Rules || (TSStyleCop.Rules = {}));
    var Rules = TSStyleCop.Rules;
})(TSStyleCop || (TSStyleCop = {}));
/// <reference path="../RuleHelpers.ts" />
var TSStyleCop;
(function (TSStyleCop) {
    (function (Rules) {
        var EnumMembersMustBePascalCase = (function () {
            function EnumMembersMustBePascalCase() {
                this.code = "SA9016";
                this.name = "EnumMembersMustBePascalCase";
                this.filter = [TypeScript.SyntaxKind.EnumElement];
            }
            EnumMembersMustBePascalCase.prototype.checkElement = function (enumMember, context) {
                var name = enumMember.propertyName.text();

                if (!name.match(/^[A-Z]\d*$|^[A-Z][a-z\d]+(?:[A-Z][a-z\d]+)*$/)) {
                    context.reportError(enumMember, this.name, this.code);
                }
            };
            return EnumMembersMustBePascalCase;
        })();
        Rules.EnumMembersMustBePascalCase = EnumMembersMustBePascalCase;
    })(TSStyleCop.Rules || (TSStyleCop.Rules = {}));
    var Rules = TSStyleCop.Rules;
})(TSStyleCop || (TSStyleCop = {}));
/// <reference path="../RuleHelpers.ts" />
var TSStyleCop;
(function (TSStyleCop) {
    (function (Rules) {
        var NoUnquotedUndefined = (function () {
            function NoUnquotedUndefined() {
                this.code = "SA9017";
                this.name = "NoUnquotedUndefined";
                this.filter = [TypeScript.SyntaxKind.IdentifierName];
            }
            // This rule is expensive since it checks every identifier in the file
            NoUnquotedUndefined.prototype.checkElement = function (identifier, context) {
                var text = identifier.text();

                if (text === "undefined") {
                    context.reportError(identifier, this.name, this.code);
                }
            };
            return NoUnquotedUndefined;
        })();
        Rules.NoUnquotedUndefined = NoUnquotedUndefined;
    })(TSStyleCop.Rules || (TSStyleCop.Rules = {}));
    var Rules = TSStyleCop.Rules;
})(TSStyleCop || (TSStyleCop = {}));
/// <reference path="../../IStyleRule.ts" />
var TSStyleCop;
(function (TSStyleCop) {
    (function (Rules) {
        var DoNotLeaveDebuggerStatementsInCode = (function () {
            function DoNotLeaveDebuggerStatementsInCode() {
                this.code = "SA9018";
                this.name = "DoNotLeaveDebuggerStatementsInCode";
                this.filter = [TypeScript.SyntaxKind.DebuggerKeyword];
            }
            DoNotLeaveDebuggerStatementsInCode.prototype.checkElement = function (identifier, context) {
                context.reportError(identifier, this.name, this.code);
            };
            return DoNotLeaveDebuggerStatementsInCode;
        })();
        Rules.DoNotLeaveDebuggerStatementsInCode = DoNotLeaveDebuggerStatementsInCode;
    })(TSStyleCop.Rules || (TSStyleCop.Rules = {}));
    var Rules = TSStyleCop.Rules;
})(TSStyleCop || (TSStyleCop = {}));
/// <reference path="../../IStyleRule.ts" />
/// <reference path="SpacingHelpers.ts" />
var TSStyleCop;
(function (TSStyleCop) {
    (function (Rules) {
        var OpeningCurlyBracketsMustBeSpacedCorrectly = (function () {
            function OpeningCurlyBracketsMustBeSpacedCorrectly() {
                this.code = "SA1012";
                this.name = "OpeningCurlyBracketsMustBeSpacedCorrectly";
                this.filter = [TypeScript.SyntaxKind.OpenBraceToken];
            }
            OpeningCurlyBracketsMustBeSpacedCorrectly.prototype.checkElement = function (openBrace, context) {
                var prevToken = context.getPreviousToken(openBrace);
                if (prevToken.tokenKind === TypeScript.SyntaxKind.GreaterThanToken && context.getParent(prevToken).kind() === TypeScript.SyntaxKind.CastExpression) {
                    Rules.SpacingHelpers.errorIfLeadingWhitespace(openBrace, context, this.name, this.code, false);
                } else {
                    Rules.SpacingHelpers.errorIfNotLeadingWhitespace(openBrace, context, this.name, this.code, true, true);
                }

                Rules.SpacingHelpers.errorIfNotTrailingWhitespace(openBrace, context, this.name, this.code, true, true);
            };
            return OpeningCurlyBracketsMustBeSpacedCorrectly;
        })();
        Rules.OpeningCurlyBracketsMustBeSpacedCorrectly = OpeningCurlyBracketsMustBeSpacedCorrectly;
    })(TSStyleCop.Rules || (TSStyleCop.Rules = {}));
    var Rules = TSStyleCop.Rules;
})(TSStyleCop || (TSStyleCop = {}));
/// <reference path="../../IStyleRule.ts" />
var TSStyleCop;
(function (TSStyleCop) {
    (function (Rules) {
        var ElementsMustAppearInTheCorrectOrder = (function () {
            function ElementsMustAppearInTheCorrectOrder() {
                this._expectedOrder = [
                    { visibility: "private", instance: false, type: "field" },
                    { visibility: "private", instance: true, type: "field" },
                    { visibility: "public", instance: false, type: "field" },
                    { visibility: "public", instance: true, type: "field" },
                    { visibility: "public", instance: true, type: "constructor" },
                    { visibility: "public", instance: false, type: "property" },
                    { visibility: "public", instance: true, type: "property" },
                    { visibility: "private", instance: false, type: "property" },
                    { visibility: "private", instance: true, type: "property" },
                    { visibility: "public", instance: false, type: "function" },
                    { visibility: "public", instance: true, type: "function" },
                    { visibility: "private", instance: false, type: "function" },
                    { visibility: "private", instance: true, type: "function" }];
                this.code = "SA1201";
                this.name = "ElementsMustAppearInTheCorrectOrder";
                this.filter = [TypeScript.SyntaxKind.ClassDeclaration];
            }
            ElementsMustAppearInTheCorrectOrder.prototype.checkElement = function (classDeclaration, context) {
                var elements = classDeclaration.classElements;
                var currentOrder = [];
                var errorString;
                var errorElement;
                for (var i = 0; i < elements.childCount(); i++) {
                    var element = elements.childAt(i);
                    var metadata = this.getMetadata(element);
                    var prev = currentOrder.length && currentOrder[currentOrder.length - 1];
                    var expectedOrder = this.getExpectedOrderIndex(metadata);
                    currentOrder.push({ expectedOrder: expectedOrder, element: element, metadata: metadata, index: i });
                    if (expectedOrder < prev.expectedOrder) {
                        errorString = this.getMetadataString(metadata) + " should be before " + this.getMetadataString(prev.metadata);
                        errorElement = element;
                    }
                }

                if (errorElement && errorString) {
                    context.autoCorrectOrError(function () {
                        currentOrder.sort(function (a, b) {
                            return a.expectedOrder - b.expectedOrder;
                        });
                        var newOrder = [];
                        for (var i = 0; i < currentOrder.length; i++) {
                            newOrder.push(currentOrder[i].index);
                        }

                        context.autoCorrectOrder(classDeclaration.classElements, newOrder);
                    }, errorElement, this.name + " " + errorString, this.code);
                }
            };

            ElementsMustAppearInTheCorrectOrder.prototype.getMetadataString = function (metadata) {
                return metadata.visibility + (metadata.instance ? " instance " : " static ") + metadata.type;
            };

            ElementsMustAppearInTheCorrectOrder.prototype.getMetadata = function (element) {
                var visibility = "public";
                var instance = true;
                var type = null;

                // Figure out the visibility and whether or not the member is static by examining the modifiers
                var modifiers = element.modifiers;
                if (modifiers) {
                    for (var i = 0; i < modifiers.childCount(); i++) {
                        var modifier = modifiers.childAt(i);
                        switch (modifier.tokenKind) {
                            case TypeScript.SyntaxKind.PrivateKeyword:
                                visibility = "private";
                                break;
                            case TypeScript.SyntaxKind.PublicKeyword:
                                visibility = "public";
                                break;
                            case TypeScript.SyntaxKind.StaticKeyword:
                                instance = false;
                                break;
                            default:
                                throw new Error("Unknown modifier " + modifier.text());
                        }
                    }
                }

                switch (element.kind()) {
                    case TypeScript.SyntaxKind.MemberVariableDeclaration:
                        type = "field";
                        break;
                    case TypeScript.SyntaxKind.GetMemberAccessorDeclaration:
                    case TypeScript.SyntaxKind.SetMemberAccessorDeclaration:
                        type = "property";
                        break;
                    case TypeScript.SyntaxKind.ConstructorDeclaration:
                        type = "constructor";
                        break;
                    case TypeScript.SyntaxKind.MemberFunctionDeclaration:
                        type = "function";
                        break;
                    default:
                        throw new Error("Unknown member type " + element.kind());
                }

                return { visibility: visibility, instance: instance, type: type };
            };

            ElementsMustAppearInTheCorrectOrder.prototype.getExpectedOrderIndex = function (metadata) {
                for (var i = 0; i < this._expectedOrder.length; i++) {
                    var entry = this._expectedOrder[i];
                    if (entry.visibility === metadata.visibility && entry.instance === metadata.instance && entry.type === metadata.type) {
                        return i;
                    }
                }

                throw new Error("Unable to find expected index");
            };
            return ElementsMustAppearInTheCorrectOrder;
        })();
        Rules.ElementsMustAppearInTheCorrectOrder = ElementsMustAppearInTheCorrectOrder;
    })(TSStyleCop.Rules || (TSStyleCop.Rules = {}));
    var Rules = TSStyleCop.Rules;
})(TSStyleCop || (TSStyleCop = {}));
/// <reference path="Typings/node.d.ts" />
/// <reference path="TypeScript/tsc.d.ts" />
/// <reference path="RuleEngine.ts" />
var TSStyleCop;
(function (TSStyleCop) {
    /**
    * Class which runs on the command line and analyzes the files using the passed in command line settings
    */
    var App = (function () {
        /** The IO interface used to interact with the console & file system */
        //private _io: Object;
        /**
        * Initializes a new instance of the App class
        * @param io - The interface for integrating with the console & file system
        */
        function App() {
            var fs = require('fs');
            var args = this.parseArgs(process.argv);
            var settings = {};

            if (args["config"]) {
                try  {
                    eval("settings = " + fs.readFileSync(args["config"][0]).toString());
                } catch (e) {
                    this.reportError("Unable to load config. " + e.message);
                    settings = {};
                }
            }

            if (args["autoCorrect"]) {
                settings.autoCorrect = true;
            }

            var ruleEngine = new TSStyleCop.RuleEngine(settings, this);

            var inputFilesOrDirs = args["analyze"];
            var filesToAnalyze = [];
            if (inputFilesOrDirs) {
                for (var i = 0; i < inputFilesOrDirs.length; i++) {
                    var inputFileOrDir = inputFilesOrDirs[i];
                    if (fs.existsSync(inputFileOrDir) && !fs.statSync(inputFileOrDir).isDirectory()) {
                        filesToAnalyze.push(inputFileOrDir);
                    } else if (fs.existsSync(inputFileOrDir) && fs.statSync(inputFileOrDir).isDirectory()) {
                        filesToAnalyze = filesToAnalyze.concat(this.getProjectTypescriptFiles(inputFileOrDir, []));
                    } else {
                        this.reportError("Input file or directory does not exist: " + inputFileOrDir);
                    }
                }
            }

            var excludedFiles = args["exclude"];
            var filteredFilesToAnalyze = filesToAnalyze;

            if (excludedFiles) {
                for (var i = filesToAnalyze.length - 1; i >= 0; i--) {
                    var parts = filesToAnalyze[i].split(/[\/\\]/);
                    if (excludedFiles.indexOf(parts[parts.length - 1]) >= 0) {
                        filteredFilesToAnalyze.splice(i, 1);
                    }
                }
            }

            for (var i = 0; i < filesToAnalyze.length; i++) {
                var filename = filesToAnalyze[i];
                var fileContents = fs.readFileSync(filename).toString();
                var autoCorrect = settings.autoCorrect && !App.isFileReadOnly(filename);
                var correctedText = ruleEngine.analyzeFile(filename, fileContents, autoCorrect);
                if (correctedText && correctedText !== fileContents) {
                    var stream = require('stream');
                    var s = new stream.Readable();
                    s._read = function noop() {
                    };
                    s.push(correctedText);
                    s.push(null);
                    s.pipe(fs.createWriteStream(filename));
                }
            }

            process.exit(0);
        }
        /**
        * Logs an informational message
        * @param message The message to log
        * @param code The message's code
        * @param filename The name of the file
        * @param startLine The start line
        * @param startCharacter The start character
        * @param endLine The end line
        * @param endCharacter The end character
        */
        App.prototype.log = function (message, code, filename, startLine, startCharacter, endLine, endCharacter) {
            console.log(this.createMSBuildMessage("information", message, code, filename, startLine, startCharacter, endLine, endCharacter));
        };

        /**
        * Logs a warning message
        * @param message The message to log
        * @param code The message's code
        * @param filename The name of the file
        * @param startLine The start line
        * @param startCharacter The start character
        * @param endLine The end line
        * @param endCharacter The end character
        */
        App.prototype.warning = function (message, code, filename, startLine, startCharacter, endLine, endCharacter) {
            console.log(this.createMSBuildMessage("warning", message, code, filename, startLine, startCharacter, endLine, endCharacter));
        };

        /**
        * Logs an error message
        * @param message The message to log
        * @param code The message's code
        * @param filename The name of the file
        * @param startLine The start line
        * @param startCharacter The start character
        * @param endLine The end line
        * @param endCharacter The end character
        */
        App.prototype.error = function (message, code, filename, startLine, startCharacter, endLine, endCharacter) {
            console.log(this.createMSBuildMessage("error", message, code, filename, startLine, startCharacter, endLine, endCharacter));
        };

        /**
        * TypeScript's IO abstraction layer doesn't supply read-only info for files, so hacking it in here
        * @param filename The file name to check for read-only status
        * @returns True if the file is read only
        */
        App.isFileReadOnly = function (filename) {
            if (typeof WScript !== "undefined" && typeof ActiveXObject === "function") {
                try  {
                    var fso = new ActiveXObject("Scripting.FileSystemObject");
                    var file = fso.GetFile(filename);
                    return !!(file.Attributes & 1);
                } catch (e) {
                    return true;
                }
            } else {
                var fs = require("fs");
                var stats = fs.statSync(filename);
                return !(stats.mode & 2);
            }
        };

        /**
        * Creates a message in a format supported by MSBuild
        * @param type The message type: "error" "warning" or "information"
        * @param message The message to log
        * @param code The message's code
        * @param filename The name of the file
        * @param startLine The start line
        * @param startCharacter The start character
        * @param endLine The end line
        * @param endCharacter The end character
        */
        App.prototype.createMSBuildMessage = function (type, message, code, filename, startLine, startCharacter, endLine, endCharacter) {
            return filename + "(" + startLine + "," + startCharacter + "," + endLine + "," + endCharacter + "): " + type + " " + code + ": " + message;
        };

        /**
        * Logs an error to the console
        */
        App.prototype.reportError = function (error) {
            console.log("error TSCOP: " + error);
        };

        /**
        * Parses the command line args in the form:
        *   (-key value*)*
        * @param args The command line args slpit by space
        * @returns The parsed args where the values after each key are grouped by their key
        */
        App.prototype.parseArgs = function (args) {
            var parsedArgs = {};
            var key = "";
            var list = parsedArgs[key] = [];
            for (var i = 0; i < args.length; i++) {
                var arg = args[i];
                if (arg.charAt(0) === "-") {
                    key = arg.substr(1);
                    list = parsedArgs[key];
                    if (!list) {
                        list = parsedArgs[key] = [];
                    }
                } else {
                    list.push(arg);
                }
            }

            return parsedArgs;
        };

        /**
        * Recursively finds all the typescript files under the filesRoot path.
        */
        App.prototype.getProjectTypescriptFiles = function (filesRoot, result) {
            var fs = require('fs');
            var path = require('path');

            if (fs.existsSync(filesRoot)) {
                var files = fs.readdirSync(filesRoot);
                for (var i = 0; i < files.length; i++) {
                    var currentPath = path.join(filesRoot, files[i]);
                    if (!fs.statSync(currentPath).isDirectory()) {
                        /* push the typescript files */
                        if (path.extname(currentPath) === '.ts') {
                            result.push(currentPath);
                        }
                    } else {
                        /* call the function recursively for subdirectories */
                        this.getProjectTypescriptFiles(currentPath, result);
                    }
                }
            }

            return result;
        };
        return App;
    })();
    TSStyleCop.App = App;
})(TSStyleCop || (TSStyleCop = {}));

if (process) {
    new TSStyleCop.App();
}
//# sourceMappingURL=RuleEngineCombined.js.map
