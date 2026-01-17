// 通用数据模型

// API响应模型
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: ApiError;
  timestamp: number;
}

// API错误模型
export interface ApiError {
  code: string;
  message: string;
  details?: any;
  stack?: string;
}

// 分页请求模型
export interface PaginationRequest {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// 分页响应模型
export interface PaginationResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// 用户请求模型
export interface UserRequest {
  id?: string;
  name?: string;
  email?: string;
  role?: string;
}

// 大模型请求模型
export interface LLMRequest {
  model: string;
  prompt: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  stream?: boolean;
}

// 大模型响应模型
export interface LLMResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    text: string;
    index: number;
    logprobs?: any;
    finishReason: string;
  }>;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

// 图片生成请求模型
export interface ImageGenerationRequest {
  prompt: string;
  n?: number;
  size?: '256x256' | '512x512' | '1024x1024';
  responseFormat?: 'url' | 'b64_json';
}

// 图片生成响应模型
export interface ImageGenerationResponse {
  created: number;
  data: Array<{
    url?: string;
    b64Json?: string;
    revisedPrompt?: string;
  }>;
}

// 图片编辑请求模型
export interface ImageEditRequest {
  image: string;
  mask?: string;
  prompt: string;
  n?: number;
  size?: '256x256' | '512x512' | '1024x1024';
  responseFormat?: 'url' | 'b64_json';
}

// 意图识别请求模型
export interface IntentRecognitionRequest {
  text: string;
  intents?: Array<{
    name: string;
    description: string;
    examples: string[];
  }>;
}

// 意图识别响应模型
export interface IntentRecognitionResponse {
  intent: string;
  confidence: number;
  entities?: Record<string, any>;
}

// 工作流请求模型
export interface WorkflowRequest {
  name: string;
  description?: string;
  nodes: Array<{
    id: string;
    type: string;
    name: string;
    properties?: Record<string, any>;
    nextNodeId?: string;
  }>;
  startNodeId: string;
}

// 工作流执行请求模型
export interface WorkflowExecutionRequest {
  workflowId: string;
  inputData?: Record<string, any>;
}

// 工作流执行响应模型
export interface WorkflowExecutionResponse {
  id: string;
  workflowId: string;
  status: 'running' | 'completed' | 'failed';
  inputData?: Record<string, any>;
  outputData?: Record<string, any>;
  startTime: number;
  endTime?: number;
  error?: string;
}

// 创建错误响应
export const createErrorResponse = <T>(error: ApiError, message?: string): ApiResponse<T> => ({
  success: false,
  message: message || error.message,
  error,
  timestamp: Date.now()
});

// 创建分页响应
export const createPaginationResponse = <T>(
  items: T[],
  total: number,
  page: number,
  limit: number
): PaginationResponse<T> => ({
  items,
  total,
  page,
  limit,
  totalPages: Math.ceil(total / limit)
});
