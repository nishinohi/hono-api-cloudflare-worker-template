import { HTTPException } from 'hono/http-exception'
import type { ContentfulStatusCode } from 'hono/utils/http-status'
import type { ApiErrorDetail } from '../lib/response'

export const ErrorCode = {
  BadRequest: 'BAD_REQUEST',
  ValidationFailed: 'VALIDATION_FAILED',
  NotFound: 'NOT_FOUND',
  Internal: 'INTERNAL_SERVER_ERROR',
} as const

export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode]

export type AppErrorOptions = {
  readonly cause?: unknown
  readonly details?: readonly ApiErrorDetail[]
}

/**
 * アプリケーション固有のエラー。
 *
 * HTTPException を継承しているため、Hono のミドルウェアや onError から
 * 標準の HTTP エラーと同じ流れで扱える。レスポンスの整形は errorHandler に集約する。
 */
export class AppError extends HTTPException {
  readonly code: ErrorCode
  readonly details?: readonly ApiErrorDetail[]

  constructor(status: ContentfulStatusCode, code: ErrorCode, message: string, options: AppErrorOptions = {}) {
    super(status, { message, cause: options.cause })
    this.name = 'AppError'
    this.code = code
    this.details = options.details
  }
}

export const badRequest = (message: string, cause?: unknown): AppError =>
  new AppError(400, ErrorCode.BadRequest, message, { cause })

export const notFoundError = (message: string): AppError => new AppError(404, ErrorCode.NotFound, message)

export const validationFailed = (details: readonly ApiErrorDetail[]): AppError =>
  new AppError(422, ErrorCode.ValidationFailed, '入力値が不正です', { details })
