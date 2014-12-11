
// Expect failure due to blank line after this comment

module A {
    /// No error here
    class B {
        //// Or here
        public toString(): string {
            /* Or here */
            alert("Something");
        }
    }
}
