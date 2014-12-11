
module TSStyleCop {
    export class Utils {
        public static startsWithLineBreak(str: string): boolean {
            return str.charAt(0) === "\n" || str.substr(0, 2) === "\r\n";
        }

        public static createIndent(count: number): string {
            var spaces = "";
            for (var i = 0; i < count; i++) {
                spaces += "  ";
            }

            return spaces;
        }

        public static escapeString(str: string, maxLength?: number): string {
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
        }
    }

    Array.prototype.indexOf = Array.prototype.indexOf || function (value: any): number {
        for (var i = 0; i < this.length; i++) {
            if (this[i] === value) {
                return i;
            }
        }

        return -1;
    };

    String.prototype.trim = String.prototype.trim || function (): string {
        return this.replace(/^\s*/, "").replace(/\s*$/, "");
    };
}