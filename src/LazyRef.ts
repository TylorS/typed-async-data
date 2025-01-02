import * as L from '@typed/lazy-ref'
import { Effect, Layer } from 'effect'
import { dual } from 'effect/Function'
import type { Scope } from 'effect/Scope'
import * as AsyncData from './AsyncData.js'

export interface LazyRef<A, E = never, R = never> extends L.LazyRef<AsyncData.AsyncData<A, E>, never, R> {}

export type LazyRefOptions<A, E = never> = L.LazyRefOptions<AsyncData.AsyncData<A, E>> & {
  readonly drop?: number
  readonly take?: number
}

export interface Tagged<Self, Id extends string, A, E = never>
  extends L.TaggedClass<Self, Id, AsyncData.AsyncData<A, E>, never> {
  // Layers

  readonly Default: Layer.Layer<Self>
  readonly fromEffect: <R>(
    effect: Effect.Effect<A, E, R>,
  ) => Layer.Layer<Self, never, Exclude<R, Scope>>

  // Effects
  readonly run: <R>(
    effect: Effect.Effect<A, E, R>,
  ) => Effect.Effect<AsyncData.AsyncData<A, E>, never, R | Self>
}

export function Tag<const Id extends string>(id: Id) {
  return <Self, A, E = never>(
    options?: L.LazyRefOptions<AsyncData.AsyncData<A, E>>,
  ): Tagged<Self, Id, A, E> =>
    class extends L.Tag(id)<Self, AsyncData.AsyncData<A, E>>() {
      static readonly Default = this.make(Effect.sync(AsyncData.noData<A, E>), options)

      static readonly fromEffect = <R>(effect: Effect.Effect<A, E, R>) =>
        Layer.scoped(
          this.tag,
          Effect.gen(function* () {
            const ref = yield* lazyRef(options)
            yield* runEffect(ref, effect).pipe(Effect.forkScoped, Effect.interruptible)
            return ref
          }),
        )

      static readonly run = <R>(effect: Effect.Effect<A, E, R>) => runEffect(this, effect)
    }
}

export function lazyRef<A, E = never>(
  options?: L.LazyRefOptions<AsyncData.AsyncData<A, E>>,
): Effect.Effect<LazyRef<A, E>, never, Scope> {
  return L.sync<AsyncData.AsyncData<A, E>>(AsyncData.noData<A, E>, options)
}

export const runEffect: {
  <A, E, R2>(
    effect: Effect.Effect<A, E, R2>,
  ): <R>(
    lazyRef: L.LazyRef<AsyncData.AsyncData<A, E>, never, R>,
  ) => Effect.Effect<AsyncData.AsyncData<A, E>, never, R | R2>
  <A, E, R, R2>(
    lazyRef: L.LazyRef<AsyncData.AsyncData<A, E>, never, R>,
    effect: Effect.Effect<A, E, R2>,
  ): Effect.Effect<AsyncData.AsyncData<A, E>, never, R | R2>
} = dual(2, function runEffect<
  A,
  E,
  R,
  R2,
>(lazyRef: L.LazyRef<AsyncData.AsyncData<A, E>, never, R>, effect: Effect.Effect<A, E, R2>): Effect.Effect<
  AsyncData.AsyncData<A, E>,
  never,
  R | R2
> {
  return lazyRef.runUpdates(({ get, set }) =>
    Effect.gen(function* () {
      const initial = yield* get
      yield* set(AsyncData.startLoading(initial))
      const exit = yield* effect.pipe(
        Effect.onInterrupt(() => set(initial)),
        Effect.exit,
      )
      return yield* set(AsyncData.fromExit(exit))
    }),
  )
})
