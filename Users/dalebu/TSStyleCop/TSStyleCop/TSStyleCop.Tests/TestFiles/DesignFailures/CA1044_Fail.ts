class SetAccessorTests {
    public set errorHere(a: string) { }

    public get notHere(): string {
        return null;
    }
    public set notHere(a: string) { }

    public set hereAsWell(a: number) { }

    private get norHere(): string {
        return null;
    }
    private set norHere(a: string) { }
}