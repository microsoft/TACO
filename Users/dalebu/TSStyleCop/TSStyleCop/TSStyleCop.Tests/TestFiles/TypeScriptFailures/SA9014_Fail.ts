var foo = null;
var x = foo !== null;

while (foo != null) { }

class DoNotCompareAgainstNullTest {
    public someFunc(): void {
        if (foo === null) { return; };

        do {
        } while (foo == null);

        for (var i = 0; i < 20 && foo != null; i++) {
        }
    }
}