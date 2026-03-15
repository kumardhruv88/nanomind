import axios from 'axios'

// Force the production URL when not on localhost to bypass any faulty Vercel environment variables
const isLocal = typeof window !== 'undefined' ? window.location.hostname === 'localhost' : process.env.NODE_ENV === 'development'
const API_URL = isLocal ? 'http://localhost:8000' : 'https://aryan012234-nanomind-api.hf.space'

export const api = axios.create({
  baseURL: API_URL,
  timeout: 60000,
})

export interface GenerateRequest {
  prompt: string
  max_tokens?: number
  temperature?: number
  top_k?: number
}

export interface GenerateResponse {
  prompt: string
  generated: string
  full_text: string
  tokens_generated: number
  time_seconds: number
  model_type: string
}

export interface ChatRequest {
  instruction: string
  input_text?: string
  max_tokens?: number
  temperature?: number
}

export interface ChatResponse {
  instruction: string
  input: string
  response: string
  tokens_generated: number
  time_seconds: number
  model_type: string
}

export interface ModelInfo {
  model_info: {
    type: string
    val_loss: number
    step: number | string
    params: number
    device: string
  }
  architecture: {
    type: string
    parameters: string
    vocab_size: number
    context_len: number
    n_layers: number
    n_heads: number
    n_embd: number
  }
  training: {
    pretrain_dataset: string
    finetune_dataset: string
    pretrain_steps: number
    finetune_epochs: number
  }
}

export const generateText = async (req: GenerateRequest): Promise<GenerateResponse> => {
  const { data } = await api.post('/generate', req)
  return data
}

export const chat = async (req: ChatRequest): Promise<ChatResponse> => {
  const { data } = await api.post('/chat', req)
  return data
}

export const getModelInfo = async (): Promise<ModelInfo> => {
  const { data } = await api.get('/model/info')
  return data
}

export const getHealth = async () => {
  const { data } = await api.get('/health')
  return data
}

export const getExamples = async () => {
  const { data } = await api.get('/examples')
  return data
}
