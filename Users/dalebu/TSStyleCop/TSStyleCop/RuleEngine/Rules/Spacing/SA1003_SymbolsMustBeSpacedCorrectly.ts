
/// <reference path="../../IStyleRule.ts" />
/// <reference path="../../Utils.ts" />
/// <reference path="SpacingHelpers.ts" />

module TSStyleCop.Rules {
    export class SymbolsMustBeSpacedCorrectly implements IStyleRule<TypeScript.ISyntaxToken> {
        public code = "SA1003";
        public name = "SymbolsMustBeSpacedCorrectly";

        public filter = [
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

        public checkElement(symbol: TypeScript.ISyntaxToken, context: RuleContext): void {
            var parent = context.getParent(symbol);
            var parentKind = parent && parent.isNode() && (<TypeScript.ISyntaxNode>parent).kind();
            switch (symbol.tokenKind) {
                case TypeScript.SyntaxKind.ExclamationToken:
                case TypeScript.SyntaxKind.TildeToken:
                    var previousToken = context.getPreviousToken(symbol);
                    if (previousToken.tokenKind === TypeScript.SyntaxKind.ExclamationToken || previousToken.tokenKind === TypeScript.SyntaxKind.TildeToken) {
                        SpacingHelpers.errorIfLeadingWhitespace(symbol, context, this.name, this.code, true);
                    } else {
                        SpacingHelpers.errorIfNotLeadingWhitespace(symbol, context, this.name, this.code, true, true);
                    }

                    SpacingHelpers.errorIfTrailingWhitespace(symbol, context, this.name, this.code, false);
                    break;
                case TypeScript.SyntaxKind.ColonToken:
                case TypeScript.SyntaxKind.QuestionToken:
                    if (parentKind === TypeScript.SyntaxKind.ConditionalExpression) {
                        SpacingHelpers.errorIfNotLeadingWhitespace(symbol, context, this.name, this.code, false, false);
                        SpacingHelpers.errorIfNotTrailingWhitespace(symbol, context, this.name, this.code, true, false);
                    } else {
                        SpacingHelpers.errorIfLeadingWhitespace(symbol, context, this.name, this.code, false);
                        if (symbol.tokenKind === TypeScript.SyntaxKind.QuestionToken && context.getNextToken(symbol).tokenKind === TypeScript.SyntaxKind.ColonToken) {
                            SpacingHelpers.errorIfTrailingWhitespace(symbol, context, this.name, this.code, false);
                        } else {
                            SpacingHelpers.errorIfNotTrailingWhitespace(symbol, context, this.name, this.code, true, true);
                        }
                    }

                    break;
                case TypeScript.SyntaxKind.LessThanToken:
                    if (parentKind === TypeScript.SyntaxKind.TypeParameterList || parentKind === TypeScript.SyntaxKind.TypeArgumentList) {
                        SpacingHelpers.errorIfLeadingWhitespace(symbol, context, this.name, this.code, false);
                        SpacingHelpers.errorIfTrailingWhitespace(symbol, context, this.name, this.code, true);
                    } else if (parentKind === TypeScript.SyntaxKind.CastExpression) {
                        var previousToken = context.getPreviousToken(symbol);
                        if (previousToken.tokenKind === TypeScript.SyntaxKind.GreaterThanToken && context.getParent(previousToken).kind() === TypeScript.SyntaxKind.CastExpression) {
                            // Two or more casts in a row shouldn't have a space in between
                            SpacingHelpers.errorIfLeadingWhitespace(symbol, context, this.name, this.code, false);
                        }

                        SpacingHelpers.errorIfTrailingWhitespace(symbol, context, this.name, this.code, false);
                    } else {
                        SpacingHelpers.errorIfNotLeadingWhitespace(symbol, context, this.name, this.code, false, true);
                        SpacingHelpers.errorIfNotTrailingWhitespace(symbol, context, this.name, this.code, true, true);
                    }

                    break;
                case TypeScript.SyntaxKind.GreaterThanToken:
                    if (parentKind === TypeScript.SyntaxKind.TypeParameterList || parentKind === TypeScript.SyntaxKind.TypeArgumentList) {
                        SpacingHelpers.errorIfLeadingWhitespace(symbol, context, this.name, this.code, false);
                    } else if (parentKind === TypeScript.SyntaxKind.CastExpression) {
                        SpacingHelpers.errorIfLeadingWhitespace(symbol, context, this.name, this.code, false);
                        SpacingHelpers.errorIfTrailingWhitespace(symbol, context, this.name, this.code, true);
                    } else {
                        SpacingHelpers.errorIfNotLeadingWhitespace(symbol, context, this.name, this.code, false, true);
                        SpacingHelpers.errorIfNotTrailingWhitespace(symbol, context, this.name, this.code, true, true);
                    }

                    break;
                case TypeScript.SyntaxKind.PlusToken:
                case TypeScript.SyntaxKind.MinusToken:
                    if (parentKind === TypeScript.SyntaxKind.NegateExpression || parentKind === TypeScript.SyntaxKind.PlusExpression) {
                        // Covered by SA1021 and SA1022
                    } else {
                        SpacingHelpers.errorIfNotLeadingWhitespace(symbol, context, this.name, this.code, false, true);
                        SpacingHelpers.errorIfNotTrailingWhitespace(symbol, context, this.name, this.code, true, true);
                    }

                    break;
                case TypeScript.SyntaxKind.OpenBracketToken:
                    if (parentKind === TypeScript.SyntaxKind.ArrayType || parentKind === TypeScript.SyntaxKind.ElementAccessExpression) {
                        SpacingHelpers.errorIfLeadingWhitespace(symbol, context, this.name, this.code, false);
                    }

                    var closeBracketTokenIndex: number;
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
                        var closeBracketToken = <TypeScript.ISyntaxToken>parent.childAt(closeBracketTokenIndex);
                        var openLine = context.lineMap.getLineNumberFromPosition(context.start(symbol));
                        var closeLine = context.lineMap.getLineNumberFromPosition(context.start(closeBracketToken));
                        if (openLine === closeLine) {
                            SpacingHelpers.errorIfTrailingWhitespace(symbol, context, this.name, this.code, false);
                        }
                    }

                    break;
                case TypeScript.SyntaxKind.CloseBracketToken:
                    var openBracketTokenIndex: number;
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
                        var openBracketToken = <TypeScript.ISyntaxToken>parent.childAt(openBracketTokenIndex);
                        var openLine = context.lineMap.getLineNumberFromPosition(context.start(openBracketToken));
                        var closeLine = context.lineMap.getLineNumberFromPosition(context.start(symbol));
                        if (openLine === closeLine) {
                            SpacingHelpers.errorIfLeadingWhitespace(symbol, context, this.name, this.code, false);
                        }
                    }

                    break;
                default:
                    SpacingHelpers.errorIfNotLeadingWhitespace(symbol, context, this.name, this.code, false, true, true);
                    SpacingHelpers.errorIfNotTrailingWhitespace(symbol, context, this.name, this.code, true, true);
                    break;
            }
        }
    }
}