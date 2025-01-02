# @typed/async-data

A type-safe, Effect-based library for managing asynchronous data states in TypeScript applications. Built on top of the Effect ecosystem, it provides a powerful and composable way to handle loading, success, failure, and optimistic states of your data.

Key benefits:
- 🎯 **Type-safe**: Full TypeScript support with strict typing
- 🔄 **Effect Integration**: Seamless integration with the Effect ecosystem
- 📊 **Progress Tracking**: Built-in support for loading progress
- 🎭 **State Management**: Comprehensive state handling for async operations
- 🔄 **Optimistic Updates**: First-class support for optimistic UI updates
- 🛡️ **Error Handling**: Type-safe error handling with Effect

## Installation

```bash
npm install @typed/async-data
# or
pnpm add @typed/async-data
# or
yarn add @typed/async-data
```

## Basic Usage

```typescript
import * as AsyncData from '@typed/async-data'
import { Effect } from 'effect'

// Create an AsyncData instance
const noData = AsyncData.noData()
const loading = AsyncData.loading()
const success = AsyncData.success(1)
const failure = AsyncData.failure(Cause.fail('error'))
const refreshing = AsyncData.refreshing(AsyncData.success(1))
const optimistic = AsyncData.optimistic(AsyncData.loading(), 1)
```

## Core Features

### State Types

AsyncData represents data that can be in one of six states:

1. `NoData` - Initial state when no data has been loaded
2. `Loading` - Data is being loaded for the first time
3. `Success<A>` - Successfully loaded data of type A
4. `Failure<E>` - Failed to load data with error of type E
5. `Refreshing<A, E>` - Reloading data while preserving previous state
6. `Optimistic<A, E>` - Optimistically updated while waiting for confirmation

### Effect Integration

AsyncData instances are Effect values, allowing seamless integration with Effect's ecosystem:

```typescript
import { Effect, Cause } from 'effect'
import * as AsyncData from '@typed/async-data'

const program = Effect.gen(function* (_) {
  // NoData and Loading are Failures
  const noData = AsyncData.noData()
  const noDataExit = yield* Effect.exit(noData)
  // noDataExit === Exit.fail(noData)

  // Success values are Successes
  const success = AsyncData.success(1)
  const value = yield* success
  // value === 1

  // Refreshing preserves the previous state
  const refreshing = AsyncData.refreshing(AsyncData.success(1))
  const refreshValue = yield* refreshing
  // refreshValue === 1

  // Optimistic updates provide immediate feedback
  const optimistic = AsyncData.optimistic(AsyncData.fail('not used'), 1)
  const optValue = yield* optimistic
  // optValue === 1
})
```

### LazyRef Integration

AsyncData can be used with LazyRef for managing state over time:

```typescript
import { Effect, Schema } from 'effect'
import * as AsyncData from '@typed/async-data'

// Define a schema-based AsyncData type
class Example extends AsyncData.AsyncData({
  success: Schema.Number,
  failure: Schema.String,
}) {}

const program = Effect.gen(function* (_) {
  // Create a lazy reference
  const example = yield* AsyncData.lazyRef(Example)

  // Run an async operation
  yield* Effect.forkScoped(
    AsyncData.runEffect(
      example,
      Effect.delay(Effect.succeed(1), 500)
    )
  )

  // State transitions automatically
  const initial = yield* example
  // initial === Example.noData()

  yield* TestClock.adjust(1)
  const loading = yield* example
  // loading === Example.loading()

  yield* TestClock.adjust(500)
  const final = yield* example
  // final === Example.success(1)
})
```

### Progress Tracking

AsyncData includes built-in support for tracking loading progress:

```typescript
import * as AsyncData from '@typed/async-data'
import { Progress } from '@typed/async-data'

// Create loading state with progress
const progress = Progress.make({ 
  loaded: 50,
  total: Option.some(100)
})
const loading = AsyncData.loading(progress)

// Update progress
const updated = AsyncData.updateProgress(loading, 
  Progress.make({ loaded: 75, total: Option.some(100) })
)
```

### Pattern Matching

AsyncData provides comprehensive pattern matching capabilities:

```typescript
import * as AsyncData from '@typed/async-data'

const result = AsyncData.match(data, {
  NoData: () => 'No data yet',
  Loading: (progress) => `Loading... ${progress}`,
  Success: (value, { isRefreshing, isOptimistic }) => 
    `Value: ${value} ${isRefreshing ? '(refreshing)' : ''} ${isOptimistic ? '(optimistic)' : ''}`,
  Failure: (cause, { isRefreshing }) => 
    `Error: ${cause} ${isRefreshing ? '(refreshing)' : ''}`
})
```

## Advanced Usage

### Tagged Services

Create tagged services with AsyncData:

```typescript
import * as AsyncData from '@typed/async-data'
import { Effect, Schema } from 'effect'

const UserService = AsyncData.Tag('UserService')<
  typeof UserService,
  User,
  string
>()

const program = Effect.gen(function* (_) {
  const users = yield* UserService
  
  // Run effects and automatically manage state
  yield* UserService.run(
    Effect.succeed({ id: 1, name: 'John' })
  )
})

// Provide implementation
program.pipe(
  Effect.provide(UserService.Default)
)
```

### Type-safe Error Handling

AsyncData ensures type-safe error handling:

```typescript
import * as AsyncData from '@typed/async-data'
import { Effect, Cause } from 'effect'

type ApiError = { code: number; message: string }

const result = AsyncData.failure<ApiError>(
  Cause.fail({ code: 404, message: 'Not found' })
)

AsyncData.match(result, {
  Failure: (cause) => {
    // cause is typed as Cause<ApiError>
    const errors = Array.from(Cause.failures(cause))
    // Handle errors
  },
  // ... other cases
})
```

## License

MIT

