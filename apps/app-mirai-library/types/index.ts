export interface GeneratedImageData {
  dataUrl: string
  prompt: string
  style: string
  timestamp: string
}

export interface GenerateResponse {
  imageDataUrl: string
  generationCount: number
}

export interface GenerateErrorResponse {
  error: string
  code?: string
}

export interface UserRecord {
  id: string
  email: string
  name: string | null
  generation_count: number
  created_at: string
  updated_at: string
}
