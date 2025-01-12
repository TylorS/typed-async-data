import * as Cause from 'effect/Cause'
import * as Effect from 'effect/Effect'
import * as Either from 'effect/Either'
import * as Equal from 'effect/Equal'
import * as Equivalence from 'effect/Equivalence'
import * as Exit from 'effect/Exit'
import { dual, identity } from 'effect/Function'
import * as Option from 'effect/Option'
import * as Schema from 'effect/Schema'
import * as SchemaAST from 'effect/SchemaAST'
import * as Unify from 'effect/Unify'
import { Progress, type ProgressEncoded } from './Progress.js'
import { DataEffect, LiteralWithDefault } from './_internal.js'

export type AsyncData<A, E = never> =
  | NoData
  | Loading
  | Success<A>
  | Failure<E>
  | Refreshing<A, E>
  | Optimistic<A, E>

export namespace AsyncData {
  export type Encoded<A, E = never> =
    | typeof NoData.Encoded
    | typeof Loading.Encoded
    | SuccessEncoded<A>
    | FailureEncoded<E>
    | RefreshingEncoded<A, E>
    | OptimisticEncoded<A, E>
  export interface SuccessEncoded<A> {
    readonly _tag: 'Success'
    readonly value: A
  }

  export interface FailureEncoded<E> {
    readonly _tag: 'Failure'
    readonly cause: Schema.CauseEncoded<E, unknown>
  }

  export type RefreshingEncoded<A, E = never> = {
    readonly _tag: 'Refreshing'
    readonly previous: SuccessEncoded<A> | FailureEncoded<E>
    readonly progress?: ProgressEncoded
  }

  export interface OptimisticEncoded<A, E = never> {
    readonly _tag: 'Optimistic'
    readonly previous: Encoded<A, E>
    readonly value: A
  }

  /**
   * @category models
   * @since 1.0.0
   */
  export interface Unify<A extends { [Unify.typeSymbol]?: any }> extends Effect.EffectUnify<A> {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    AsyncData: () => Unify_<A[Unify.typeSymbol]> extends AsyncData<infer E0, infer A0> | infer _
      ? AsyncData<E0, A0>
      : never
  }

  type Unify_<T extends AsyncData<any, any>> = T extends NoData
    ? AsyncData<never, never>
    : T extends Loading
      ? AsyncData<never, never>
      : T extends Failure<infer E>
        ? AsyncData<E, never>
        : T extends Success<infer A>
          ? AsyncData<never, A>
          : T extends Optimistic<infer A, infer E>
            ? AsyncData<A, E>
            : T extends Refreshing<infer A, infer E>
              ? AsyncData<A, E>
              : never

  /**
   * @category models
   * @since 1.0.0
   */
  export interface IgnoreList extends Effect.EffectUnifyIgnore {
    Effect: true
  }
}

export class NoData
  extends Schema.TaggedError<NoData>()('NoData', {})
  implements Effect.Effect<never, NoData, never> {}

export const noData: {
  (): NoData
  <A, E = never>(): AsyncData<A, E>
} = () => NoData.make()

export class Loading
  extends Schema.TaggedError<Loading>()('Loading', {
    progress: Schema.optionalWith(Progress, { as: 'Option', default: undefined }),
  })
  implements Effect.Effect<never, Loading, never> {}

export function loading(progress?: Progress): Loading
export function loading<A, E = never>(progress?: Progress): AsyncData<A, E>
export function loading<A, E = never>(progress?: Progress): AsyncData<A, E> {
  return Loading.make({ progress: Option.fromNullable(progress) })
}

export class Success<A>
  extends DataEffect('Success')<{ readonly value: A }, A>
  implements Effect.Effect<A>
{
  constructor(value: A) {
    super({ value }, Effect.succeed(value))
  }

  static schema<A, I, R>(
    value: Schema.Schema<A, I, R>,
  ): Schema.SchemaClass<Success<A>, AsyncData.SuccessEncoded<I>, R> {
    return Schema.Struct({
      _tag: LiteralWithDefault<'_tag'>()('Success'),
      value,
    }).pipe(
      Schema.transform(Schema.instanceOf(Success<A>), {
        strict: true,
        decode: (from) => new Success(from.value),
        encode: identity,
      }),
    )
  }
}

export function success<A>(value: A): Success<A>
export function success<A, E = never>(value: A): AsyncData<A, E>
export function success<A>(value: A): Success<A> {
  return new Success(value)
}

export class Failure<E>
  extends DataEffect('Failure')<{ readonly cause: Cause.Cause<E> }, never, E, never>
  implements Effect.Effect<never, E, never>
{
  constructor(cause: Cause.Cause<E>) {
    super({ cause }, Effect.failCause(cause))
  }

  static schema<E, I, R>(
    error: Schema.Schema<E, I, R>,
  ): Schema.SchemaClass<Failure<E>, AsyncData.FailureEncoded<I>, R> {
    return Schema.Struct({
      _tag: LiteralWithDefault<'_tag'>()('Failure'),
      cause: Schema.Cause({
        error,
        defect: Schema.Unknown,
      }),
    }).pipe(
      Schema.transform(Schema.instanceOf(Failure<E>), {
        strict: true,
        decode: (from) => new Failure(from.cause),
        encode: identity,
      }),
    )
  }
}

export function failure<E>(cause: Cause.Cause<E>): Failure<E>
export function failure<E, A = never>(cause: Cause.Cause<E>): AsyncData<A, E>
export function failure<E>(cause: Cause.Cause<E>): Failure<E> {
  return new Failure(cause)
}

export function die(cause: unknown): Failure<never>
export function die<A, E = never>(cause: unknown): AsyncData<A, E>
export function die<E>(cause: unknown): Failure<E> {
  return new Failure(Cause.die(cause))
}

export function fail<E>(error: E): Failure<E> {
  return new Failure(Cause.fail(error))
}

export class Refreshing<A, E>
  extends DataEffect('Refreshing')<
    { readonly previous: Success<A> | Failure<E>; readonly progress: Option.Option<Progress> },
    A,
    E,
    never
  >
  implements Effect.Effect<A, E>
{
  constructor(previous: Success<A> | Failure<E>, progress: Option.Option<Progress>) {
    super({ previous, progress }, previous)
  }

  static schema<A, EI, E, AI, R>(
    previous: Schema.Schema<
      Success<A> | Failure<E>,
      AsyncData.SuccessEncoded<AI> | AsyncData.FailureEncoded<EI>,
      R
    >,
  ): Schema.SchemaClass<Refreshing<A, E>, AsyncData.RefreshingEncoded<AI, EI>, R> {
    return Schema.Struct({
      _tag: LiteralWithDefault<'_tag'>()('Refreshing'),
      previous,
      progress: Schema.optionalWith(Progress, { as: 'Option', default: undefined }),
    }).pipe(
      Schema.transform(Schema.instanceOf(Refreshing<A, E>), {
        strict: true,
        decode: (from) => new Refreshing(from.previous, from.progress),
        encode: identity,
      }),
    )
  }
}

export function refreshing<A = never, E = never>(
  previous: Success<A> | Failure<E>,
  progress?: Progress,
): Refreshing<A, E> {
  return new Refreshing(previous, Option.fromNullable(progress))
}

export class Optimistic<A, E>
  extends DataEffect('Optimistic')<{ readonly previous: AsyncData<A, E>; readonly value: A }, A>
  implements Effect.Effect<A>
{
  constructor(previous: AsyncData<A, E>, value: A) {
    super({ previous, value }, Effect.succeed(value))
  }

  static schema<A, EI, E, AI, R, R2>(
    previous: Schema.Schema<AsyncData<A, E>, AsyncData.Encoded<AI, EI>, R>,
    value: Schema.Schema<A, AI, R2>,
  ): Schema.SchemaClass<Optimistic<A, E>, AsyncData.OptimisticEncoded<AI, EI>, R | R2> {
    return Schema.Struct({
      _tag: LiteralWithDefault<'_tag'>()('Optimistic'),
      previous,
      value,
    }).pipe(
      Schema.transform(Schema.instanceOf(Optimistic<A, E>), {
        strict: true,
        decode: (from) => new Optimistic(from.previous, from.value),
        encode: identity,
      }),
    )
  }
}

export const optimistic: {
  <A>(value: A): <E>(previous: AsyncData<A, E>) => Optimistic<A, E>
  <A, E>(previous: AsyncData<A, E>, value: A): Optimistic<A, E>
} = dual(2, function optimistic<A, E>(previous: AsyncData<A, E>, value: A): Optimistic<A, E> {
  return new Optimistic(previous, value)
})

export const matchAll: {
  <A, E, R1, R2, R3, R4, R5, R6>(
    data: AsyncData<A, E>,
    matchers: {
      readonly NoData: () => R1
      readonly Loading: (progress: Option.Option<Progress>) => R2
      readonly Success: (value: A) => R3
      readonly Failure: (cause: Cause.Cause<E>) => R4
      readonly Refreshing: (
        previous: Success<A> | Failure<E>,
        progress: Option.Option<Progress>,
      ) => R5
      readonly Optimistic: (value: A, previous: AsyncData<A, E>) => R6
    },
  ): R1 | R2 | R3 | R4 | R5 | R6

  <A, E, R1, R2, R3, R4, R5, R6>(
    data: AsyncData<A, E>,
    matchers: {
      readonly NoData: () => R1
      readonly Loading: (progress: Option.Option<Progress>) => R2
      readonly Success: (value: A) => R3
      readonly Failure: (cause: Cause.Cause<E>) => R4
      readonly Refreshing: (
        previous: Success<A> | Failure<E>,
        progress: Option.Option<Progress>,
      ) => R5
      readonly Optimistic: (value: A, previous: AsyncData<A, E>) => R6
    },
  ): R1 | R2 | R3 | R4 | R5 | R6
} = dual(
  2,
  function matchAll<A, E, R1, R2, R3, R4, R5, R6>(
    data: AsyncData<A, E>,
    matchers: {
      readonly NoData: () => R1
      readonly Loading: (progress: Option.Option<Progress>) => R2
      readonly Success: (value: A) => R3
      readonly Failure: (cause: Cause.Cause<E>) => R4
      readonly Refreshing: (
        previous: Success<A> | Failure<E>,
        progress: Option.Option<Progress>,
      ) => R5
      readonly Optimistic: (value: A, previous: AsyncData<A, E>) => R6
    },
  ): R1 | R2 | R3 | R4 | R5 | R6 {
    switch (data._tag) {
      case 'NoData':
        return matchers.NoData()
      case 'Loading':
        return matchers.Loading(data.progress)
      case 'Success':
        return matchers.Success(data.value)
      case 'Failure':
        return matchers.Failure(data.cause)
      case 'Refreshing':
        return matchers.Refreshing(data.previous, data.progress)
      case 'Optimistic':
        return matchers.Optimistic(data.value, data.previous)
    }
  },
)

export const match: {
  <A, E, R1, R2, R3, R4>(matchers: {
    readonly NoData: () => R1
    readonly Loading: (progress: Option.Option<Progress>) => R2
    readonly Success: (
      value: A,
      params: {
        readonly isRefreshing: boolean
        readonly isOptimistic: boolean
        readonly progress: Option.Option<Progress>
      },
    ) => R3
    readonly Failure: (
      cause: Cause.Cause<E>,
      params: { readonly isRefreshing: boolean; readonly progress: Option.Option<Progress> },
    ) => R4
  }): (data: AsyncData<A, E>) => Unify.Unify<R1 | R2 | R3 | R4>

  <A, E, R1, R2, R3, R4>(
    data: AsyncData<A, E>,
    matchers: {
      readonly NoData: () => R1
      readonly Loading: (progress: Option.Option<Progress>) => R2
      readonly Success: (
        value: A,
        params: {
          readonly isRefreshing: boolean
          readonly isOptimistic: boolean
          readonly progress: Option.Option<Progress>
        },
      ) => R3
      readonly Failure: (
        cause: Cause.Cause<E>,
        params: { readonly isRefreshing: boolean; readonly progress: Option.Option<Progress> },
      ) => R4
    },
  ): Unify.Unify<R1 | R2 | R3 | R4>
} = dual(
  2,
  function match<A, E, R1, R2, R3, R4>(
    data: AsyncData<A, E>,
    matchers: {
      readonly NoData: () => R1
      readonly Loading: (progress: Option.Option<Progress>) => R2
      readonly Success: (
        value: A,
        params: {
          readonly isRefreshing: boolean
          readonly isOptimistic: boolean
          readonly progress: Option.Option<Progress>
        },
      ) => R3
      readonly Failure: (
        cause: Cause.Cause<E>,
        params: { readonly isRefreshing: boolean; readonly progress: Option.Option<Progress> },
      ) => R4
    },
  ): Unify.Unify<R1 | R2 | R3 | R4> {
    const match_ = (
      data: AsyncData<A, E>,
      params: {
        readonly isRefreshing: boolean
        readonly isOptimistic: boolean
        readonly progress: Option.Option<Progress>
      },
    ): R1 | R2 | R3 | R4 =>
      matchAll(data, {
        NoData: matchers.NoData,
        Loading: matchers.Loading,
        Success: (value) => matchers.Success(value, params),
        Failure: (cause) => matchers.Failure(cause, params),
        Refreshing: (previous, progress) =>
          match_(previous, { ...params, isRefreshing: true, progress }),
        Optimistic: (value) => matchers.Success(value, { ...params, isOptimistic: true }),
      })

    return Unify.unify(
      match_(data, {
        isRefreshing: false,
        isOptimistic: false,
        progress: Option.none(),
      }),
    )
  },
)

export function startLoading<A, E>(data: AsyncData<A, E>, progress?: Progress): AsyncData<A, E> {
  switch (data._tag) {
    case 'Success':
    case 'Failure':
      return refreshing(data, progress)
    case 'NoData':
      return loading(progress)
    case 'Optimistic':
      return optimistic(startLoading(data.previous, progress), data.value)
    default:
      return data
  }
}

export function stopLoading<A, E>(data: AsyncData<A, E>): AsyncData<A, E> {
  switch (data._tag) {
    case 'Refreshing':
      return data.previous
    case 'Loading':
      return noData()
    case 'Optimistic':
      return optimistic(stopLoading(data.previous), data.value)
    default:
      return data
  }
}

export function updateProgress<A, E>(data: AsyncData<A, E>, progress: Progress): AsyncData<A, E> {
  switch (data._tag) {
    case 'Refreshing':
      return refreshing(data.previous, progress)
    case 'Loading':
      return loading(progress)
    case 'Optimistic':
      return optimistic(updateProgress(data.previous, progress), data.value)
    default:
      return data
  }
}

export interface AsyncDataSchemaClass<E, EI, ER, A, AI, AR>
  extends Schema.SchemaClass<AsyncData<A, E>, AsyncData.Encoded<AI, EI>, AR | ER> {
  readonly eq: Equivalence.Equivalence<AsyncData<A, E>>

  readonly success: (value: A) => AsyncData<A, E>
  readonly failCause: (cause: Cause.Cause<E>) => AsyncData<A, E>
  readonly fail: (error: E) => AsyncData<A, E>
  readonly die: (cause: unknown) => AsyncData<A, E>
  readonly optimistic: (previous: AsyncData<A, E>, value: A) => AsyncData<A, E>
  readonly refreshing: (previous: Success<A> | Failure<E>, progress?: Progress) => AsyncData<A, E>
  readonly loading: (progress?: Progress) => AsyncData<A, E>
  readonly noData: () => AsyncData<A, E>
}

export function AsyncData<A, AI, AR, E, EI, ER>(
  schemas: {
    readonly success: Schema.Schema<A, AI, AR>
    readonly failure: Schema.Schema<E, EI, ER>
  },
  annotations?: Schema.Annotations.Schema<AsyncData<A, E>>,
): AsyncDataSchemaClass<E, EI, ER, A, AI, AR> {
  const identifier = Option.all({
    E: getIdentifier(schemas.failure.ast),
    A: getIdentifier(schemas.success.ast),
  }).pipe(
    Option.match({
      onNone: () => 'AsyncData',
      onSome: ({ E, A }) => `AsyncData<${E}, ${A}>`,
    }),
  )

  const equivalence = makeEquivalence(
    Schema.equivalence(schemas.success),
    Schema.equivalence(schemas.failure),
  )

  const recursive: Schema.Schema<
    AsyncData<A, E>,
    AsyncData.Encoded<AI, EI>,
    AR | ER
  > = Schema.suspend(() => AsyncData).annotations({
    identifier,
    equivalence: () => equivalence,
    ...annotations,
  })

  const successAndFailure = Schema.Union(
    Success.schema(schemas.success),
    Failure.schema(schemas.failure),
  )

  const AsyncData = Schema.Union(
    NoData,
    Loading,
    successAndFailure,
    Refreshing.schema(successAndFailure),
    Optimistic.schema(recursive, schemas.success),
  ).annotations({
    equivalence: () => equivalence,
  })

  return class extends AsyncData {
    static readonly eq = equivalence
    static readonly success = success
    static readonly failCause = failure
    static readonly fail = fail
    static readonly die = die
    static readonly optimistic = optimistic
    static readonly refreshing = refreshing
    static readonly loading = loading
    static readonly noData = noData
  }
}

function getIdentifier(ast: SchemaAST.AST) {
  return SchemaAST.getJSONIdentifier(ast).pipe(
    Option.orElse(() => SchemaAST.getTitleAnnotation(ast)),
  )
}

export function fromExit<A, E>(exit: Exit.Exit<A, E>): AsyncData<A, E> {
  return Exit.match(exit, { onSuccess: success<A>, onFailure: failure<E> })
}

export function fromEither<A, E>(either: Either.Either<A, E>): AsyncData<A, E> {
  return Either.match(either, { onLeft: fail<E>, onRight: success<A> })
}

export function fromOption<A>(option: Option.Option<A>): AsyncData<A> {
  return Option.match(option, { onSome: success<A>, onNone: noData<A> })
}

export const map: {
  <A, B>(f: (a: A) => B): <E>(data: AsyncData<A, E>) => AsyncData<B, E>
  <A, E, B>(data: AsyncData<A, E>, f: (a: A) => B): AsyncData<B, E>
} = dual(2, function map<A, E, B>(data: AsyncData<A, E>, f: (a: A) => B): AsyncData<B, E> {
  if (data._tag === 'Success') {
    return new Success(f(data.value))
  } else if (data._tag === 'Refreshing' && data.previous._tag === 'Success') {
    return new Refreshing(new Success(f(data.previous.value)), data.progress)
  } else if (data._tag === 'Optimistic') {
    if (data.previous._tag === 'Success') {
      return new Optimistic(new Success(f(data.previous.value)), f(data.value))
    } else if (data.previous._tag === 'Failure') {
      return new Optimistic(data.previous, f(data.value))
    }
  }

  return data as AsyncData<B, E>
})

export const flatMap: {
  <A, B, E2>(f: (a: A) => AsyncData<B, E2>): <E>(data: AsyncData<A, E>) => AsyncData<B, E | E2>
  <A, E, B, E2>(data: AsyncData<A, E>, f: (a: A) => AsyncData<B, E2>): AsyncData<B, E | E2>
} = dual(2, function flatMap<
  A,
  E,
  B,
  E2,
>(data: AsyncData<A, E>, f: (a: A) => AsyncData<B, E2>): AsyncData<B, E | E2> {
  if (data._tag === 'Success' || data._tag === 'Optimistic') {
    return f(data.value)
  } else if (data._tag === 'Refreshing' && data.previous._tag === 'Success') {
    return f(data.previous.value)
  }

  return data as AsyncData<B, E>
})

export function isNoData<A, E>(data: AsyncData<A, E>): data is NoData {
  return data._tag === 'NoData'
}

export function isLoading<A, E>(data: AsyncData<A, E>): data is Loading {
  return data._tag === 'Loading'
}

export function isSuccess<A, E>(data: AsyncData<A, E>): data is Success<A> {
  return data._tag === 'Success'
}

export function isFailure<A, E>(data: AsyncData<A, E>): data is Failure<E> {
  return data._tag === 'Failure'
}

export function isRefreshing<A, E>(data: AsyncData<A, E>): data is Refreshing<A, E> {
  return data._tag === 'Refreshing'
}

export function isLoadingOrRefreshing<A, E>(
  data: AsyncData<A, E>,
): data is Loading | Refreshing<A, E> {
  return isLoading(data) || isRefreshing(data)
}

export function isOptimistic<A, E>(data: AsyncData<A, E>): data is Optimistic<A, E> {
  return data._tag === 'Optimistic'
}

export function makeEquivalence<A, E>(
  eqA: Equivalence.Equivalence<A>,
  eqB: Equivalence.Equivalence<E>,
): Equivalence.Equivalence<AsyncData<A, E>> {
  const eqCause = Equivalence.make((a: Cause.Cause<E>, b: Cause.Cause<E>) => {
    const failuresA = Array.from(Cause.failures(a))
    const failuresB = Array.from(Cause.failures(b))
    if (failuresA.length > 0) {
      return (
        failuresA.length === failuresB.length && failuresA.every((e, i) => eqB(e, failuresB[i]))
      )
    }

    return Equal.equals(a, b)
  })

  const eq: Equivalence.Equivalence<AsyncData<A, E>> = Equivalence.make((a, b) =>
    matchAll(a, {
      NoData: () => isNoData(b),
      Loading: (progress) => isLoading(b) && Equal.equals(progress, b.progress),
      Success: (value) => isSuccess(b) && eqA(value, b.value),
      Failure: (cause) => isFailure(b) && eqCause(cause, b.cause),
      Refreshing: (previous, progress) =>
        isRefreshing(b) && eq(previous, b.previous) && Equal.equals(progress, b.progress),
      Optimistic: (value, previous) =>
        isOptimistic(b) && eqA(value, b.value) && eq(previous, b.previous),
    }),
  )

  return eq
}

type EqValue<T> = T extends Equivalence.Equivalence<infer A> ? A : never

function unionEquivalence<EQS extends ReadonlyArray<Equivalence.Equivalence<any>>>(
  eqs: EQS,
): Equivalence.Equivalence<EqValue<EQS[number]>> {
  return (a, b) => {
    for (const eq of eqs) {
      if (eq(a, b)) {
        return true
      }
    }

    return false
  }
}

export const equals = makeEquivalence(Equal.equals, Equal.equals)
