// Type definitions for nopt 3.0.1
// Project: https://github.com/npm/nopt
// Definitions by: jbondc <https://github.com/jbondc>
// Definitions: https://github.com/borisyankov/DefinitelyTyped

declare module Nopt {
    interface OptionsParsed {
        [k: string]: any
        argv: {
            remain: string[]
            cooked: string[]
            original: string[]
        }
    }
    interface CommandData {
        [key: string]: Object[]|Object
    }

    interface TypeDefs {
        [key: string]: TypeInfo
    }

    interface TypeInfo {
        type: Object
        validate: (data: CommandData, k: string, val: string) => boolean
    }
    interface FlagTypeMap {
        [k: string]: Object
    }

    interface ShortFlags {
        [k: string]: string[]|string
    }
}

declare module "nopt" {
    module nopt {
        export function clean(data: Nopt.CommandData, types: Nopt.FlagTypeMap, typeDefs?: Nopt.TypeDefs): string
        export var typeDefs: Nopt.TypeDefs
    }

    function nopt(types: Nopt.FlagTypeMap, shorthands?: Nopt.ShortFlags, args?: string[], slice?: number): Nopt.OptionsParsed

    export = nopt
}
