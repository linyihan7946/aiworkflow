import http from 'http'
import { defaultLLMService } from '../services/llm/api'
import { defaultIntentRecognitionService } from '../services/llm/intent-recognition'
import { defaultImageGenerationService } from '../services/image/generate'
import { defaultImageEditService } from '../services/image/edit-image'
import { sendSuccessResponse, sendErrorResponse } from '../utils'

export const homeController = (_req: http.IncomingMessage, res: http.ServerResponse) => {
  res.setHeader('Content-Type', 'application/json')
  res.writeHead(200)
  res.end(JSON.stringify({
    message: 'Hello, Node.js + Vite + TypeScript Backend!',
    timestamp: new Date().toISOString(),
    status: 'running',
    availableEndpoints: [
      '/api/data',
      '/api/llm',
      '/api/intent',
      '/api/image/generate',
      '/api/image/edit'
    ]
  }))
}

export const dataController = (_req: http.IncomingMessage, res: http.ServerResponse) => {
  res.setHeader('Content-Type', 'application/json')
  res.writeHead(200)
  res.end(JSON.stringify({
    data: [1, 2, 3, 4, 5],
    message: 'API endpoint working!'
  }))
}

// 大模型API请求控制器
export const llmController = async (req: http.IncomingMessage, res: http.ServerResponse) => {
  try {
    let body = ''
    req.on('data', chunk => {
      body += chunk.toString()
    })
    req.on('end', async () => {
      try {
        const { prompt, model, temperature, max_tokens } = JSON.parse(body)
        const result = await defaultLLMService.generateText({
          prompt,
          model,
          temperature,
          max_tokens
        })
        sendSuccessResponse(res, result, 'LLM API request successful')
      } catch (error) {
        sendErrorResponse(res, 400, 'Invalid request body', error)
      }
    })
  } catch (error) {
    sendErrorResponse(res, 500, 'Internal server error', error)
  }
}

// 意图识别控制器
export const intentController = async (req: http.IncomingMessage, res: http.ServerResponse) => {
  try {
    let body = ''
    req.on('data', chunk => {
      body += chunk.toString()
    })
    req.on('end', async () => {
      try {
        const { text } = JSON.parse(body)
        const result = await defaultIntentRecognitionService.recognizeIntent(text)
        sendSuccessResponse(res, result, 'Intent recognition successful')
      } catch (error) {
        sendErrorResponse(res, 400, 'Invalid request body', error)
      }
    })
  } catch (error) {
    sendErrorResponse(res, 500, 'Internal server error', error)
  }
}

// 图片生成控制器
export const imageGenerateController = async (req: http.IncomingMessage, res: http.ServerResponse) => {
  try {
    let body = ''
    req.on('data', chunk => {
      body += chunk.toString()
    })
    req.on('end', async () => {
      try {
        const { prompt, n, size, response_format } = JSON.parse(body)
        const result = await defaultImageGenerationService.generateImage({
          prompt,
          n,
          size,
          response_format
        })
        sendSuccessResponse(res, result, 'Image generation successful')
      } catch (error) {
        sendErrorResponse(res, 400, 'Invalid request body', error)
      }
    })
  } catch (error) {
    sendErrorResponse(res, 500, 'Internal server error', error)
  }
}

// 图片编辑控制器
export const imageEditController = async (req: http.IncomingMessage, res: http.ServerResponse) => {
  try {
    let body = ''
    req.on('data', chunk => {
      body += chunk.toString()
    })
    req.on('end', async () => {
      try {
        const { images, prompt, aspect_ratio, resolution, url_type } = JSON.parse(body)
        const result = await defaultImageEditService.editImage({
          images,
          prompt,
          aspect_ratio,
          resolution,
          url_type
        })
        sendSuccessResponse(res, result, 'Image editing successful')
      } catch (error) {
        sendErrorResponse(res, 400, 'Invalid request body', error)
      }
    })
  } catch (error) {
    sendErrorResponse(res, 500, 'Internal server error', error)
  }
}
