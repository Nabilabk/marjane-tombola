export interface Receipt {
  store: string
  total: number
  receiptNumber: string
  date: string
  /** SHA-256 of the uploaded image, from the backend — carry this back as
   *  `bill_hash` on /api/participate so a receipt can't be replayed there
   *  either, not just at the /api/receipt/validate step. */
  imageHash?: string
}

export type ValidationErrorCode =
  | 'no_active_campaign'
  | 'ocr_failed'
  | 'wrong_store'
  | 'invalid_receipt_format'
  | 'duplicate_receipt'
  | 'below_minimum'
  | 'no_qualifying_articles'
  | 'campaign_ended'
  | 'campaign_maintenance'

export interface ValidationResult {
  success: boolean
  receipt: Receipt | null
  errors: ValidationErrorCode[]
}