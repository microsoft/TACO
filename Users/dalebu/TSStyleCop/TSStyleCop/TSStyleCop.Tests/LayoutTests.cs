using System;
using Microsoft.VisualStudio.TestTools.UnitTesting;
using System.IO;

namespace TSStyleCop.Tests
{
    [TestClass]
    public class LayoutTests : BaseRuleTest
    {
        [TestMethod]
        public void TestSA1500()
        {
            this.ExpectError("SA1500", 4, 1);
            this.ExpectError("SA1500", 10, 25);
            this.ExpectError("SA1500", 13, 11);
            this.Analyze(@"LayoutFailures\SA1500_Fail.ts");
        }

        [TestMethod]
        public void TestSA1503()
        {
            this.ExpectError("SA1503", 4, 5);
            this.ExpectError("SA1503", 6, 14);
            this.ExpectError("SA1503", 9, 5);
            this.Analyze(@"LayoutFailures\SA1503_Fail.ts");
        }

        [TestMethod]
        public void TestSA1505()
        {
            this.ExpectError("SA1505", 3, 10);
            this.ExpectError("SA1505", 5, 13);
            this.ExpectError("SA1505", 7, 35);
            this.Analyze(@"LayoutFailures\SA1505_Fail.ts");
        }

        [TestMethod]
        public void TestSA1507()
        {
            this.ExpectError("SA1507", 3, 1);
            this.ExpectError("SA1507", 7, 1);
            this.Analyze(@"LayoutFailures\SA1507_Fail.ts");
        }

        [TestMethod]
        public void TestSA1508()
        {
            this.ExpectError("SA1508", 8, 9);
            this.ExpectError("SA1508", 10, 5);
            this.ExpectError("SA1508", 12, 1);
            this.Analyze(@"LayoutFailures\SA1508_Fail.ts");
        }

        [TestMethod]
        public void TestSA1512()
        {
            this.ExpectError("SA1512", 3, 1);
            this.Analyze(@"LayoutFailures\SA1512_Fail.ts");
        }

        [TestMethod]
        public void TestSA1513()
        {
            this.ExpectError("SA1513", 7, 13);
            this.ExpectError("SA1513", 11, 13);
            this.ExpectError("SA1513", 13, 9);
            this.Analyze(@"LayoutFailures\SA1513_Fail.ts");
        }
    }
}
