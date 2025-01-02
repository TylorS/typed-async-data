import { describe, expect, it } from '@effect/vitest'
import { Cause, Effect, Exit, Schema, TestClock } from 'effect'
import * as AsyncData from './index.js'

describe('AsyncData', () => {
  describe('Effect', () => {
    it.effect('NoData is a Failure', () =>
      Effect.gen(function* () {
        const noData = AsyncData.noData()
        const exit = yield* Effect.exit(noData)

        expect(exit).toEqual(Exit.fail(noData))
      }),
    )

    it.effect('Loading is a Failure', () =>
      Effect.gen(function* () {
        const loading = AsyncData.loading()
        const exit = yield* Effect.exit(loading)

        expect(exit).toEqual(Exit.fail(loading))
      }),
    )

    it.effect('Failure is a Failure', () =>
      Effect.gen(function* () {
        const cause = Cause.fail('test')
        const failure = AsyncData.failure(cause)
        const exit = yield* Effect.exit(failure)

        expect(exit).toEqual(Exit.failCause(cause))
      }),
    )

    it.effect('Success is a Success', () =>
      Effect.gen(function* () {
        expect(yield* AsyncData.success(1)).toEqual(1)
      }),
    )

    it.effect('Refreshing<Success> is a Success', () =>
      Effect.gen(function* () {
        expect(yield* AsyncData.refreshing(AsyncData.success(1))).toEqual(1)
      }),
    )

    it.effect('Refreshing<Failure> is a Failure', () =>
      Effect.gen(function* () {
        const cause = Cause.fail('test')
        const failure = AsyncData.failure(cause)
        const exit = yield* Effect.exit(AsyncData.refreshing(failure))

        expect(exit).toEqual(Exit.failCause(cause))
      }),
    )

    it.effect('Optimistic is a Success', () =>
      Effect.gen(function* () {
        expect(yield* AsyncData.optimistic(AsyncData.fail('not used'), 1)).toEqual(1)
      }),
    )
  })

  describe('Schema + LazyRef', () => {
    class Example extends AsyncData.AsyncData({
      success: Schema.Number,
      failure: Schema.String,
    }) {}

    it.scoped('keeps state', () =>
      Effect.gen(function* () {
        const example = yield* AsyncData.lazyRef(Example)

        // Simulate an async operation
        yield* Effect.forkScoped(AsyncData.runEffect(example, Effect.delay(Effect.succeed(1), 500)))

        expect(yield* example).toEqual(Example.noData())

        yield* TestClock.adjust(1)

        expect(yield* example).toEqual(Example.loading())

        yield* TestClock.adjust(500)

        expect(yield* example).toEqual(Example.success(1))
      }),
    )
  })
})
