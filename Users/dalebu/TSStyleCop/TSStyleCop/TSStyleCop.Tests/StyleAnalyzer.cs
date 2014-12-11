namespace TSStyleCop.Tests
{
    using System;
    using System.Collections.Generic;
    using System.Diagnostics;
    using System.Threading;

    /// <summary>
    /// Wrapper around cscript to allow testing TSStyleCop
    /// </summary>
    class StyleAnalyzer
    {
        /// <summary>
        /// Analyzes files, by launching cscript and parsing the output
        /// </summary>
        /// <param name="filesToAnalyze">The list of files to analyze</param>
        public void AnalyzeAll(IEnumerable<string> filesToAnalyze)
        {

            //string strCmdText;
            //strCmdText = "/C timeout 6";
            //Process process = System.Diagnostics.Process.Start("CMD.exe", strCmdText);

            string args = string.Format(
                "/c node {0} -analyze {1}",
                "TSStyleCop.js",
                string.Join(" ", filesToAnalyze));

            //string args = "/c timeout 5";

            ProcessStartInfo startInfo = new ProcessStartInfo("cmd.exe", args);
            //startInfo.CreateNoWindow = false;
            startInfo.RedirectStandardError = true;
            startInfo.RedirectStandardOutput = true;
            startInfo.UseShellExecute = false;
            //startInfo.WindowStyle = ProcessWindowStyle.Normal;
            Process process = new Process();
            process.StartInfo = startInfo;
            process.OutputDataReceived += this.OnOutputDataReceived;
            process.ErrorDataReceived += this.OnErrorDataReceived;
            process.EnableRaisingEvents = true;
            process.Start();

            process.BeginOutputReadLine();
            process.BeginErrorReadLine();

            process.WaitForExit();
            //string output = process.StandardOutput.ReadToEnd();
        }

        private void OnErrorDataReceived(object sender, DataReceivedEventArgs e)
        {
            if (e.Data != null)
            {
                throw new InvalidOperationException(e.Data);
            }
        }

        private void OnOutputDataReceived(object sender, DataReceivedEventArgs e)
        {
            if (this.Message != null && e.Data != null)
            {
                this.Message(this, StyleMessageEventArgs.FromOutputLine(e.Data));
            }
        }

        /// <summary>
        /// Event fired when a message is received from the rule engine (via the HostAPI)
        /// </summary>
        public event EventHandler<StyleMessageEventArgs> Message;
    }
}
