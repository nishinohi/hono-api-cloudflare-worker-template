import { validationFailed } from '../errors/app-error'
import type { ApiErrorDetail } from './response'

/**
 * ZodError の構造だけを受ける型。
 *
 * zValidator が渡すのはスキーマの出力型で特殊化された $ZodError なので、
 * 具体的なクラス型ではなく必要な形だけを要求してバージョン差を吸収する。
 */
export type ValidationIssues = {
  readonly issues: readonly { readonly path: readonly PropertyKey[]; readonly message: string }[]
}

/**
 * ZodError をレスポンスの details 形式へ変換する。
 * 最初の 1 件で打ち切らず、すべての issue を残す。
 */
export const toErrorDetails = (error: ValidationIssues): readonly ApiErrorDetail[] =>
  error.issues.map((issue) => ({
    path: issue.path.map(String).join('.'),
    message: issue.message,
  }))

/**
 * zValidator に渡す共通フック。
 *
 * 検証に失敗したら 422 の AppError を throw し、レスポンスの整形は onError に任せる。
 * zValidator の既定動作（400 と zod 独自のボディ）は使わないため、必ずこれを渡す。
 */
export const rejectInvalid = (result: { readonly success: boolean; readonly error?: ValidationIssues }): void => {
  if (!result.success && result.error) throw validationFailed(toErrorDetails(result.error))
}
