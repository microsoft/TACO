declare module TacoRemoteMultiplexer {
    interface IPropertyBag {
        [property: string]: string;
    }
    interface IPackageSpec {
        location: string;
        name: string;
    }
    interface ITacoRemoteMultiplexer {
        getPackage(query: IPropertyBag): IPackageSpec;
    }
}