using System;
using Microsoft.VisualStudio.TestTools.UnitTesting;
using System.IO;

namespace TSStyleCop.Tests
{
    [TestClass]
    public class NamingTests : BaseRuleTest
    {
        [TestMethod]
        public void TestSA1300()
        {
            this.ExpectError("SA1300", 1, 7);
            this.ExpectError("SA1300", 2, 20);
            this.ExpectError("SA1300", 5, 19);
            this.ExpectError("SA1300", 9, 6);
            this.ExpectError("SA1300", 11, 11);
            this.ExpectError("SA1302", 11, 11);
            this.Analyze(@"NamingFailures\SA1300_Fail.ts");
        }

        [TestMethod]
        public void TestSA1301()
        {
            this.ExpectError("SA1301", 4, 12);
            this.ExpectError("SA1301", 5, 12);
            this.ExpectError("SA1301", 6, 12);
            this.ExpectError("SA1301", 8, 12);
            this.ExpectError("SA1301", 8, 24);
            this.ExpectError("SA1301", 9, 13);
            this.ExpectError("SA1301", 10, 13);
            this.Analyze(@"NamingFailures\SA1301_Fail.ts");
        }

        [TestMethod]
        public void TestSA1302()
        {
            this.ExpectError("SA1302", 2, 11);
            this.Analyze(@"NamingFailures\SA1302_Fail.ts");
        }
    }
}
