# @typed/navigation

A Effect-based library for managing browser navigation. Built on top of the [Navigation API](https://developer.mozilla.org/en-US/docs/Web/API/Navigation_API) where supported, falling back to the History API, it provides a type-safe and composable way to handle routing, history management, and navigation events in your web applications.

Key benefits:
- Type-safe navigation with full TypeScript support
- Seamless integration with Effect for powerful error handling and composability 
- Graceful fallback to History API in unsupported browsers
- First-class support for testing and SSR through memory-based navigation

## Features

- 🎯 **Type-Safe**: Full TypeScript support with strict typing
- 🔄 **Effect Integration**: Built on top of the Effect ecosystem
- 🧠 **Memory Navigation**: In-memory navigation support for testing and SSR
- 🌐 **Browser Support**: Seamless integration with the browser's Navigation API
- 🎭 **State Management**: Built-in state management for navigation entries
- 🔄 **Navigation Events**: Comprehensive event system for navigation lifecycle
- 🛡️ **Error Handling**: Type-safe error handling with Effect

## Installation

```bash
npm install @typed/navigation
# or
pnpm add @typed/navigation
# or
yarn add @typed/navigation
```

## Basic Usage

```typescript
import * as Navigation from '@typed/navigation'
import { Effect } from 'effect'

// Create a navigation instance
const program = Effect.gen(function* (_) {  
  // Basic navigation operations
  const destination = yield* Navigation.navigate('/new-path')
  yield* Navigation.back()
  yield* Navigation.forward()
  
  // Navigate with state and options
  yield* Navigation.navigate('/dashboard', {
    state: { userId: 123 },
    history: 'replace', // 'push' | 'replace' | 'auto'
    info: { source: 'user-action' }
  })
  
  // Access current navigation state
  const current = yield* Navigation.CurrentEntry
  console.log(current.url.pathname) // '/dashboard'
  console.log(current.state) // { userId: 123 }
  
  // Check navigation capabilities
  const canGoBack = yield* Navigation.CanGoBack
  const canGoForward = yield* Navigation.CanGoForward
  
  // Access navigation history
  const entries = yield* Navigation.Entries
  const specificEntry = entries[0]
  yield* Navigation.traverseTo(specificEntry.key)
  
  // Update current entry's state
  yield* Navigation.updateCurrentEntry({
    state: { userId: 123, lastUpdated: Date.now() }
  })
  
  // Reload current entry
  yield* Navigation.reload({
    state: { refreshed: true },
    info: { source: 'refresh-button' }
  })
  
  // Listen to navigation events
  yield* Navigation.onNavigation((event) => 
    Effect.log(`Navigated to ${event.destination.url.pathname}`)
  )

  // Intercept navigation events
  yield* Navigation.beforeNavigation((event) => 
    Effect.gen(function* (_) {
      console.log(`Navigating from ${event.from.url.pathname} to ${event.to.url.pathname}`)

      // Can cancel
      yield* Navigation.cancelNavigation

      // Can redirect
      yield* Navigation.redirect(...)
    })
  )
  
  // Track ongoing transitions
  const transition = yield* Navigation.transition
  if (Option.isSome(transition)) {
    const { from, to, type } = transition.value
    console.log(`Transition in progress: ${type} from ${from.url.pathname} to ${to.url.pathname}`)
  }
})

program.pipe(
  Effect.provide(Navigation.fromWindow(window))
  // Effect.provide(Navigation.initialMemory({ url: '/' }))
)
```

## Core Features

### Navigation Operations

- `navigate(url, options?)`: Navigate to a new URL
- `back(options?)`: Go back in history
- `forward(options?)`: Go forward in history
- `traverseTo(key, options?)`: Navigate to a specific history entry
- `updateCurrentEntry(options)`: Update the state of the current entry
- `reload(options?)`: Reload the current entry

### State Management

- `currentEntry`: Get the current navigation entry
- `entries`: Access all navigation entries
- `canGoBack`: Check if backward navigation is possible
- `canGoForward`: Check if forward navigation is possible

### Event Handling

- `beforeNavigation`: Register handlers to run before navigation
- `onNavigation`: Register handlers to run after navigation
- `transition`: Track ongoing navigation transitions

## Advanced Usage

### Memory Navigation

For testing or SSR environments:

```typescript
import { Navigation } from '@typed/navigation'
import { Effect } from 'effect'

const program = Effect.gen(function* (_) {
  const nav = yield* Navigation.Navigation
  
  // Use in-memory navigation
}).pipe(
  Effect.provide(Navigation.initialMemory({ 
    url: 'https://example.com',
    state: { /* initial state */ }
  }))
)
```

### Browser Navigation

For browser environments:

```typescript
import { Navigation } from '@typed/navigation'
import { Effect } from 'effect'

const program = Effect.gen(function* (_) {
  const nav = yield* Navigation.Navigation
  
  // Use browser's Navigation API
}).pipe(
  // Has support for:
  // - <base href="...">
  // - intercepting history.*
  // - utilizing native Navigation API (currently Chrome only)
  Effect.provide(Navigation.fromWindow(window))
)
```

### Blocking Navigation

The library provides powerful capabilities to intercept and control navigation attempts through the `useBlockNavigation` API. This is useful for scenarios like:
- Preventing navigation when there are unsaved changes
- Showing confirmation dialogs before navigation
- Redirecting users to different paths based on conditions

```typescript
import { Navigation } from '@typed/navigation'
import { Effect } from 'effect'

const program = Effect.gen(function* (_) {
  // Create a blocking navigation instance
  const blockNavigation = yield* Navigation.useBlockNavigation({
    // Optional: Specify when to block navigation
    shouldBlock: (event) => Effect.succeed(true)
  })

  // Listen to blocking events and handle them
  yield* Effect.forkScoped(blockNavigation.whenBlocked(
    (blocking) => 
      Effect.gen(function* (_) {
        // You can:
        // 1. Confirm the navigation
        yield* blocking.confirm
        
        // 2. Cancel the navigation
        yield* blocking.cancel
        
        // 3. Redirect to a different path
        yield* blocking.redirect('/different-path', {
          state: { /* optional state */ },
          info: { /* optional info */ }
        })
      })
  ))
})

// Provide the navigation layer
program.pipe(
  Effect.provide(Navigation.fromWindow(window))
)
```

You can also use `beforeNavigation` for simpler blocking scenarios:

```typescript
yield* Navigation.beforeNavigation((event) =>
  Effect.gen(function* (_) {
    if (shouldBlock(event)) {
      // Cancel the navigation
      return yield* Navigation.cancelNavigation
    }
    
    if (shouldRedirect(event)) {
      // Redirect to a different path
      return yield* Navigation.redirectToPath('/new-path')
    }
    
    // Allow the navigation to proceed
    return Effect.none()
  })
)
```

## License

MIT

