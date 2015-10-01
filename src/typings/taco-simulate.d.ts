/**
 *******************************************************
 *                                                     *
 *   Copyright (C) Microsoft. All rights reserved.     *
 *                                                     *
 *******************************************************
 */

declare function simulate<T>(options?:any):Q.Promise<T>;

declare module "taco-simulate" {
    export = simulate;
}
