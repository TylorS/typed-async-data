import * as Option from 'effect/Option'
import * as Schema from 'effect/Schema'
import { dual } from 'effect/Function'
import { DataStruct } from './_internal.js'

export const Progress = DataStruct({
  loaded: Schema.Number,
  total: Schema.optionalWith(Schema.Number, { as: 'Option', default: undefined }),
})

export type ProgressEncoded = typeof Progress.Encoded
export type Progress = typeof Progress.Type

export const empty: Progress = Progress.make({ loaded: 0, total: Option.none() })

/**
 * @since 1.0.0
 */
export const setLoaded: {
  (loaded: number): (progress: Progress) => Progress
  (progress: Progress, loaded: number): Progress
} = dual(2, function setLoaded(progress: Progress, loaded: number): Progress {
  return Progress.make({ loaded, total: progress.total })
})

/**
 * @since 1.0.0
 */
export const setTotal: {
  (total: number): (progress: Progress) => Progress
  (progress: Progress, total: number): Progress
} = dual(2, function setTotal(progress: Progress, total: number): Progress {
  return Progress.make({ loaded: progress.loaded, total: Option.some(total) })
})
