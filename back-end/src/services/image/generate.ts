// 图片生成服务
import https from 'https';
import http from 'http';

/**
 * 图片生成请求参数
 */
export interface ImageGenerationRequest {
  prompt: string;
  n?: number;
  size?: '256x256' | '512x512' | '1024x1024';
  response_format?: 'url' | 'b64_json';
  user?: string;
}

/**
 * 生成图片响应数据
 */
export interface GeneratedImage {
  url?: string;
  b64_json?: string;
  revised_prompt?: string;
}

/**
 * 图片生成响应
 */
export interface ImageGenerationResponse {
  created: number;
  data: GeneratedImage[];
}

/**
 * 图片生成服务配置
 */
export interface ImageGenerationConfig {
  apiKey: string;
  baseUrl: string;
}

export class ImageGenerationService {
  private config: ImageGenerationConfig;

  constructor(config: ImageGenerationConfig) {
    this.config = config;
  }

  /**
   * 生成图片
   * @param request 图片生成请求参数
   * @returns 图片生成响应
   */
  async generateImage(request: ImageGenerationRequest): Promise<ImageGenerationResponse> {
    const { 
      prompt, 
      n = 1, 
      size = '1024x1024', 
      response_format = 'url', 
      user 
    } = request;

    const data = JSON.stringify({
      prompt,
      n,
      size,
      response_format,
      user
    });

    const options = this.createRequestOptions(data.length);

    return new Promise((resolve, reject) => {
      const client = this.config.baseUrl.startsWith('https://') ? https : http;
      const req = client.request(options, (res) => {
        let responseData = '';

        res.on('data', (chunk) => {
          responseData += chunk;
        });

        res.on('end', () => {
          try {
            const parsedResponse = JSON.parse(responseData) as ImageGenerationResponse;
            resolve(parsedResponse);
          } catch (error) {
            reject(new Error(`Failed to parse image generation response: ${error}`));
          }
        });
      });

      req.on('error', (error) => {
        reject(new Error(`Image generation API request failed: ${error}`));
      });

      req.write(data);
      req.end();
    });
  }

  private createRequestOptions(contentLength: number): http.RequestOptions {
    const url = new URL(this.config.baseUrl);
    return {
      hostname: url.hostname,
      port: url.port ? parseInt(url.port) : (url.protocol === 'https:' ? 443 : 80),
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`,
        'Content-Length': contentLength
      }
    };
  }
}

// 默认图片生成服务配置
export const defaultImageGenerationConfig: ImageGenerationConfig = {
  apiKey: process.env['IMAGE_API_KEY'] || '',
  baseUrl: process.env['IMAGE_BASE_URL'] || 'https://api.openai.com/v1/images/generations'
};

// 默认图片生成服务实例
export const defaultImageGenerationService = new ImageGenerationService(defaultImageGenerationConfig);
