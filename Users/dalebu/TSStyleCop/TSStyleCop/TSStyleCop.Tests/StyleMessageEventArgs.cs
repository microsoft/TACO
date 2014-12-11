namespace TSStyleCop.Tests
{
    using System;
using System.Text.RegularExpressions;

    /// <summary>
    /// Types of messages which can be sent from the rule engine
    /// </summary>
    public enum MessageType
    {
        /// <summary>
        /// The message is informational only
        /// </summary>
        Message,

        /// <summary>
        /// The message is a warning
        /// </summary>
        Warning,

        /// <summary>
        /// The message is an error
        /// </summary>
        Error,
    }

    /// <summary>
    /// EventArgs for a style message
    /// </summary>
    class StyleMessageEventArgs : EventArgs
    {
        private static readonly Regex OutputLineRegex = new Regex(@"(?<Filename>[^\(]+)\((?<StartLine>\d+),(?<StartChar>\d+),(?<EndLine>\d+),(?<EndChar>\d+)\)\:\s+(?<Type>information|warning|error)\s+(?<Code>[^\:]+)\:\s+(?<Message>.+)", RegexOptions.Compiled);

        /// <summary>
        /// Initializes a new instance of the StyleMessageEventArgs class
        /// </summary>
        /// <param name="messageType">The type of message</param>
        /// <param name="message">The message text</param>
        /// <param name="code">The message code</param>
        /// <param name="filename">The name of the file where the message occurred</param>
        /// <param name="startLine">The start line that the message refers to</param>
        /// <param name="startCharacter">The start character that the message refers to</param>
        /// <param name="endLine">The end line that the message refers to</param>
        /// <param name="endCharacter">The end character that the message refers to</param>
        public StyleMessageEventArgs(MessageType messageType, string message, string code, string filename, int startLine, int startCharacter, int endLine, int endCharacter)
        {
            this.MessageType = messageType;
            this.Message = message;
            this.Code = code;
            this.Filename = filename;
            this.StartLine = startLine;
            this.StartCharacter = startCharacter;
            this.EndLine = endLine;
            this.EndCharacter = endCharacter;
        }

        public static StyleMessageEventArgs FromOutputLine(string line)
        {
            Match match = StyleMessageEventArgs.OutputLineRegex.Match(line);
            if (match != null && match.Success)
            {
                return new StyleMessageEventArgs(
                    (MessageType)Enum.Parse(typeof(MessageType), match.Groups["Type"].Value, true),
                    match.Groups["Message"].Value,
                    match.Groups["Code"].Value,
                    match.Groups["Filename"].Value,
                    int.Parse(match.Groups["StartLine"].Value),
                    int.Parse(match.Groups["StartChar"].Value),
                    int.Parse(match.Groups["EndLine"].Value),
                    int.Parse(match.Groups["EndChar"].Value));
            }
            else
            {
                throw new InvalidOperationException("Unable to parse message: " + line);
            }
        }

        /// <summary>
        /// Gets the type of message (error, warning or log)
        /// </summary>
        public MessageType MessageType { get; private set; }

        /// <summary>
        /// Gets the text of the message 
        /// </summary>
        public string Message { get; private set; }

        /// <summary>
        /// Gets the message code
        /// </summary>
        public string Code { get; private set; }

        /// <summary>
        /// Gets the name of the file where the message occurred
        /// </summary>
        public string Filename { get; private set; }

        /// <summary>
        /// Gets the starting line where the message occurred
        /// </summary>
        public int StartLine { get; private set; }

        /// <summary>
        /// Gets the starting character where the message occurred
        /// </summary>
        public int StartCharacter { get; private set; }

        /// <summary>
        /// Gets the ending line where the message occurred
        /// </summary>
        public int EndLine { get; private set; }

        /// <summary>
        /// Gets the ending character where the message occurred
        /// </summary>
        public int EndCharacter { get; private set; }
    }
}
