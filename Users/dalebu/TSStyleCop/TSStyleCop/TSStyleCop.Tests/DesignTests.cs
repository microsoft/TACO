using System;
using Microsoft.VisualStudio.TestTools.UnitTesting;
using System.IO;

namespace TSStyleCop.Tests
{
    [TestClass]
    public class DesignTests : BaseRuleTest
    {
        [TestMethod]
        public void TestCA1044()
        {
            this.ExpectError("CA1044", 2, 5);
            this.ExpectError("CA1044", 9, 5);
            this.Analyze(@"DesignFailures\CA1044_Fail.ts");
        }
    }
}
