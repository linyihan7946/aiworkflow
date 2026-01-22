// Cloudflare Worker 代理工具
// 用于通过 Cloudflare Worker 代理请求国外 API，如 Gemini 3 聊天对话 API

import axios from 'axios';

const workerUrl = "https://aigenimage.xyz";// process.env["CLOUDFLARE_WORKER_URL"] || '';
const googleApiKey = "AIzaSyC2LNzYPBaoGGWKuT8XnR7N7tIjchd8pTw";// process.env["GOOGLE_API_KEY"] || '';
/**
 * Cloudflare Worker 代理配置
 */
export interface CloudflareWorkerConfig {
  timeout?: number; // 请求超时时间（毫秒）
  headers?: Record<string, string>; // 额外的请求头
}

/**
 * 通过 Cloudflare Worker 代理请求 API
 * @param config Cloudflare Worker 配置
 * @param apiUrl 目标 API 地址
 * @param options 请求选项
 * @returns 请求响应
 */
export async function proxyRequest<T>(
  config: CloudflareWorkerConfig,
  apiUrl: string,
  options: {
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
    headers?: Record<string, string>;
    data?: any;
    params?: Record<string, any>;
  }
): Promise<T> {
  try {
    const {
      method = 'POST',
      headers = {},
      data,
      params
    } = options;

    // 构建代理请求体
    const proxyRequestBody = {
      url: apiUrl,
      method,
      headers,
      data,
      params
    };

    // 发送请求到 Cloudflare Worker
    const response = await axios.post<T>(workerUrl, proxyRequestBody, {
      headers: {
        'Content-Type': 'application/json',
        ...config.headers
      },
      timeout: config.timeout || 30000 // 默认 30 秒超时
    });

    console.log("Cloudflare Worker 代理响应:", response.data);

    return response.data;
  } catch (error) {
    console.error('Cloudflare Worker 代理请求失败:', error);
    throw error;
  }
}

/**
 * 构建 Gemini 3 聊天对话 API 请求
 * @param config Cloudflare Worker 配置
 * @param apiKey API 密钥
 * @param messages 消息列表
 * @param model 模型名称
 * @param temperature 温度参数
 * @returns 聊天响应
 */
export async function geminiChatCompletion(
  config: CloudflareWorkerConfig,
  apiKey: string,
  messages: Array<{
    role: 'user' | 'assistant' | 'system';
    content: string;
  }>,
  model: string = 'gemini-2.0-flash-001',
  temperature: number = 0.7
) {
    console.log("开始请求 Gemini 3 聊天对话 API");
    const apiUrl = `https://generativelanguage.googleapis.com/v1/models/${model}:generateContent?key=${apiKey}`;

    const requestData = {
        contents: messages.map(msg => ({
            role: msg.role === 'assistant' ? 'model' : 'user',
            parts: [{
                text: msg.content
            }]
        })),
        generationConfig: {
            temperature
        }
    };

    return proxyRequest<any>(config, apiUrl, {
        method: 'POST',
        headers: {
            // 'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
        },
        data: requestData
    });
}

const response = await geminiChatCompletion(
    {
        timeout: 30000,
        headers: {
            'Authorization': `Bearer ${googleApiKey}`,
            'Content-Type': 'application/json'
        }
    }, 
    googleApiKey, 
    [{
        role: 'user',
        content: '今天天气怎么样？'
    }]
);
console.log(response);


