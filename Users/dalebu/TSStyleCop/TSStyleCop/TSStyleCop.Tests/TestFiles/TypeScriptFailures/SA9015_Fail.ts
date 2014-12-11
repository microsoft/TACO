var foo = true;
var x = foo !== true;

while (foo != false) { }

class DoNotCompareAgainstTrueOrFalseTest {
    public someFunc(): void {
        if (foo === true) { return; };

        do {
        } while (foo == false);

        for (var i = 0; i < 20 && foo != true; i++) {
        }
    }
}