/** 一覧系レスポンスのページング情報。 */
export type ApiMeta = {
  readonly total: number
  readonly page: number
  readonly limit: number
}

/** バリデーションエラーなどの詳細。 */
export type ApiErrorDetail = {
  readonly path: string
  readonly message: string
}

export type ApiSuccess<T> = {
  readonly success: true
  readonly data: T
  readonly meta?: ApiMeta
}

export type ApiFailure = {
  readonly success: false
  readonly error: {
    readonly code: string
    readonly message: string
    readonly details?: readonly ApiErrorDetail[]
  }
}

export type ApiResponse<T> = ApiSuccess<T> | ApiFailure

/** 成功レスポンスを組み立てる。常に新しいオブジェクトを返す。 */
export const success = <T>(data: T, meta?: ApiMeta): ApiSuccess<T> =>
  meta ? { success: true, data, meta } : { success: true, data }

/** 失敗レスポンスを組み立てる。常に新しいオブジェクトを返す。 */
export const failure = (code: string, message: string, details?: readonly ApiErrorDetail[]): ApiFailure =>
  details ? { success: false, error: { code, message, details } } : { success: false, error: { code, message } }
