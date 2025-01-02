import {
  Data,
  type Effect,
  Effectable,
  Equal,
  Hash,
  Predicate,
  Schema,
  type SchemaAST,
} from 'effect'
import { constant } from 'effect/Function'
import { structuralRegion } from 'effect/Utils'

/**
 * Constructs the same interface as `Schema.Struct`, but with the ability to
 * wrap it in Data.struct to ensure we can hash the struct.
 */
export function DataStruct<Fields extends Schema.Struct.Fields>(
  fields: Fields,
): Schema.Struct<Fields> {
  return liftStructIntoDataStruct(Schema.Struct(fields))
}

function liftStructIntoDataStruct<Fields extends Schema.Struct.Fields>(
  struct: Schema.Struct<Fields>,
): Schema.Struct<Fields> {
  const data = Schema.Data(struct)

  return Object.assign(data, {
    make: (...params: Parameters<typeof struct.make>) => Data.struct(struct.make(...params)),
    pick: <K extends ReadonlyArray<keyof Fields>>(...params: K) =>
      liftStructIntoDataStruct(struct.pick(...params)),
    omit: <K extends ReadonlyArray<keyof Fields>>(...params: K) =>
      liftStructIntoDataStruct(struct.omit(...params)),
    fields: struct.fields,
    records: struct.records,
    annotations: (...params: Parameters<typeof struct.annotations>) =>
      liftStructIntoDataStruct(struct.annotations(...params)),
  })
}

export type LiteralWithDefault<
  K extends string,
  A extends SchemaAST.LiteralValue,
> = Schema.PropertySignature<':', A, K, ':', A, true, never>

export function LiteralWithDefault<K extends string>() {
  return <const A extends SchemaAST.LiteralValue>(value: A): LiteralWithDefault<K, A> => {
    return Schema.optionalWith(Schema.Literal(value), { default: () => value }) as any
  }
}

export type DataEffect<F extends Record<string, any>, A, E = never, R = never> = Effect.Effect<
  A,
  E,
  R
> &
  F &
  Hash.Hash &
  Equal.Equal

export interface DataEffectClass<Tag extends string> {
  readonly _tag: Tag

  new <Fields extends Record<string, any>, A = never, E = never, R = never>(
    fields: Fields,
    commit: Effect.Effect<A, E, R>,
  ): DataEffect<Fields & { readonly _tag: Tag }, A, E, R>
}

abstract class AbstractDataEffect<F extends Record<string, any>, A, E, R>
  extends Effectable.Class<A, E, R>
  implements Hash.Hash, Equal.Equal
{
  constructor(fields: F) {
    super()
    Object.assign(this, fields)
  }

  abstract commit(): Effect.Effect<A, E, R>

  [Hash.symbol]() {
    return Hash.structure(this)
  }

  [Equal.symbol](that: unknown) {
    return Predicate.isObject(that) && structuralRegion(() => Equal.equals(this, that))
  }
}

export function DataEffect<const Tag extends string>(tag: Tag): DataEffectClass<Tag> {
  class DataEffect<
    Fields extends Record<string, any>,
    A = never,
    E = never,
    R = never,
  > extends AbstractDataEffect<Fields, A, E, R> {
    static readonly _tag = tag
    readonly _tag = tag

    constructor(
      fields: Fields,
      readonly effect: Effect.Effect<A, E, R>,
    ) {
      super(fields)
    }

    commit() {
      return this.effect
    }
  }

  return DataEffect as any
}
