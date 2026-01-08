// 图片编辑服务
import https from 'https';
import http from 'http';
import fs from 'fs/promises';
import { GeneratedImage } from './generate';

export interface ImageEditRequest {
  image: string; // 图片URL或Base64编码
  mask?: string; // 可选的遮罩图片URL或Base64编码
  prompt: string; // 编辑说明
  n?: number;
  size?: '256x256' | '512x512' | '1024x1024';
  response_format?: 'url' | 'b64_json';
  user?: string;
}

export interface ImageVariationRequest {
  image: string; // 图片URL或Base64编码
  n?: number;
  size?: '256x256' | '512x512' | '1024x1024';
  response_format?: 'url' | 'b64_json';
  user?: string;
}

export interface ImageEditResponse {
  created: number;
  data: GeneratedImage[];
}

export interface ImageEditConfig {
  apiKey: string;
  baseUrl: string;
  editEndpoint?: string;
  variationEndpoint?: string;
}

export class ImageEditService {
  private config: ImageEditConfig;

  constructor(config: ImageEditConfig) {
    this.config = {
      editEndpoint: '/v1/images/edits',
      variationEndpoint: '/v1/images/variations',
      ...config
    };
  }

  // 编辑图片
  async editImage(request: ImageEditRequest): Promise<ImageEditResponse> {
    const { 
      image, 
      mask, 
      prompt, 
      n = 1, 
      size = '1024x1024', 
      response_format = 'url', 
      user 
    } = request;

    // 构建multipart/form-data请求
    const boundary = `--------------------------${Date.now().toString(16)}`;
    const formData = this.buildFormData({
      image,
      mask,
      prompt,
      n,
      size,
      response_format,
      user
    }, boundary);

    const options = this.createRequestOptions(
      formData.length, 
      boundary, 
      this.config.editEndpoint!
    );

    return new Promise((resolve, reject) => {
      const client = this.config.baseUrl.startsWith('https://') ? https : http;
      const req = client.request(options, (res) => {
        let responseData = '';

        res.on('data', (chunk) => {
          responseData += chunk;
        });

        res.on('end', () => {
          try {
            const parsedResponse = JSON.parse(responseData) as ImageEditResponse;
            resolve(parsedResponse);
          } catch (error) {
            reject(new Error(`Failed to parse image edit response: ${error}`));
          }
        });
      });

      req.on('error', (error) => {
        reject(new Error(`Image edit API request failed: ${error}`));
      });

      req.write(formData);
      req.end();
    });
  }

  // 生成图片变体
  async createImageVariation(request: ImageVariationRequest): Promise<ImageEditResponse> {
    const { 
      image, 
      n = 1, 
      size = '1024x1024', 
      response_format = 'url', 
      user 
    } = request;

    // 构建multipart/form-data请求
    const boundary = `--------------------------${Date.now().toString(16)}`;
    const formData = this.buildFormData({
      image,
      n,
      size,
      response_format,
      user
    }, boundary);

    const options = this.createRequestOptions(
      formData.length, 
      boundary, 
      this.config.variationEndpoint!
    );

    return new Promise((resolve, reject) => {
      const client = this.config.baseUrl.startsWith('https://') ? https : http;
      const req = client.request(options, (res) => {
        let responseData = '';

        res.on('data', (chunk) => {
          responseData += chunk;
        });

        res.on('end', () => {
          try {
            const parsedResponse = JSON.parse(responseData) as ImageEditResponse;
            resolve(parsedResponse);
          } catch (error) {
            reject(new Error(`Failed to parse image variation response: ${error}`));
          }
        });
      });

      req.on('error', (error) => {
        reject(new Error(`Image variation API request failed: ${error}`));
      });

      req.write(formData);
      req.end();
    });
  }

  private createRequestOptions(contentLength: number, boundary: string, endpoint: string): http.RequestOptions {
    const url = new URL(this.config.baseUrl);
    return {
      hostname: url.hostname,
      port: url.port ? parseInt(url.port) : (url.protocol === 'https:' ? 443 : 80),
      path: endpoint,
      method: 'POST',
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Authorization': `Bearer ${this.config.apiKey}`,
        'Content-Length': contentLength
      }
    };
  }

  private buildFormData(fields: Record<string, any>, boundary: string): string {
    let formData = '';

    for (const [key, value] of Object.entries(fields)) {
      if (value === undefined || value === null) continue;

      formData += `--${boundary}\r\n`;
      
      if (key === 'image' || key === 'mask') {
        // 处理图片数据
        const isBase64 = this.isBase64(value);
        const isUrl = this.isUrl(value);
        
        formData += `Content-Disposition: form-data; name="${key}"; filename="${key}.png"\r\n`;
        formData += `Content-Type: image/png\r\n\r\n`;
        
        if (isBase64) {
          // Base64编码的图片，需要解码
          formData += Buffer.from(value.replace(/^data:image\/\w+;base64,/, ''), 'base64').toString('binary');
        } else if (isUrl) {
          // 图片URL，这里简化处理，实际应该下载图片
          throw new Error('URL images are not directly supported. Please use Base64 encoded images.');
        } else {
          // 直接使用图片数据
          formData += value;
        }
      } else {
        // 普通文本字段
        formData += `Content-Disposition: form-data; name="${key}"\r\n\r\n`;
        formData += value.toString();
      }
      
      formData += '\r\n';
    }

    formData += `--${boundary}--\r\n`;
    return formData;
  }

  private isBase64(str: string): boolean {
    return str.startsWith('data:image/');
  }

  private isUrl(str: string): boolean {
    try {
      new URL(str);
      return true;
    } catch {
      return false;
    }
  }

  // 从文件系统加载图片并转换为Base64
  async loadImageFromFile(filePath: string): Promise<string> {
    const data = await fs.readFile(filePath);
    return `data:image/png;base64,${data.toString('base64')}`;
  }

  // 保存Base64编码的图片到文件系统
  async saveImageToFile(base64Data: string, filePath: string): Promise<void> {
    const data = base64Data.replace(/^data:image\/\w+;base64,/, '');
    await fs.writeFile(filePath, Buffer.from(data, 'base64'));
  }
}

// 默认图片编辑服务配置
export const defaultImageEditConfig: ImageEditConfig = {
  apiKey: process.env['IMAGE_API_KEY'] || '',
  baseUrl: process.env['IMAGE_BASE_URL'] || 'https://api.openai.com'
};

// 默认图片编辑服务实例
export const defaultImageEditService = new ImageEditService(defaultImageEditConfig);
