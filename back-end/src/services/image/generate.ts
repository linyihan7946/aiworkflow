// 图片生成服务
import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import { cosUploader } from '../../utils/cos-upload';
import { findClosestAspectRatio, getImageAspectRatio, getImageMimeTypeFromUrl, imageUrlToBase64Simple } from '../../utils/image-utils';

const API_GEMINI_PRO_IMAGE = process.env["YIAPI_GEMINI_PRO_IMAGE"] as string || '';
/**
 * 图片生成请求参数
 */
export interface ImageGenerationRequest {
  prompt: string;
  aspect_ratio: string;// 长宽比
  resolution: string;// 分辨率：2K
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

  constructor() {
  }

  /**
   * 生成图片
   * @param request 图片生成请求参数
   * @returns 图片生成响应
   */
  async generateImage(request: ImageGenerationRequest): Promise<ImageGenerationResponse> {
    // Gemini 3 Pro图片生成接口 - 支持多张图片合成
    const API_KEY = process.env["YIAPI_KEY"] || '';
    
    // 从请求体中获取参数
    const prompt = request.prompt;
    const aspectRatio = request.aspect_ratio || "16:9";
    const imageSize = request.resolution || "2K";

    try {
      
      if (!prompt) {
        return {
          created: 400, 
          data: [] 
        };
      }

      // 设置超时时间映射，与Python代码保持一致
      const TIMEOUT_MAP: { [key: string]: number } = { "1K": 180, "2K": 300, "4K": 360 };
      const timeout = TIMEOUT_MAP[imageSize] || 300; // 默认5分钟超时

      // 准备parts数组，包含所有图片和文本提示
      const parts: any[] = [];
      parts.push({"text": prompt});
      
      // 构建请求体，与Python示例保持一致
      const requestBody = {
        "contents": [{"parts": parts}],
        "generationConfig": {
          "responseModalities": ["IMAGE"],
          "imageConfig": {
            "aspectRatio": aspectRatio,
            "imageSize": imageSize
          }
        }
      };
      
      console.log(`⏳ 正在处理，预计 ${timeout / 60} 分钟...`);

      const startTime = Date.now();
      
      // 发送请求到Gemini API，使用动态超时时间
      const response = await axios.post(API_GEMINI_PRO_IMAGE, requestBody, {
        headers: {
          "Authorization": `Bearer ${API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: timeout * 1000 // 转换为毫秒
      });
      
      const elapsed = (Date.now() - startTime) / 1000;
      console.log(`⏱️  实际用时: ${elapsed.toFixed(1)} 秒`);
      
      // 处理API响应
      const data = response.data;
      const images: string[] = [];
      
      if (data.candidates && data.candidates.length > 0) {
        // 获取生成的图片数据
        const img_data = data.candidates[0].content.parts[0].inlineData.data;
        
        // 将生成的图片上传到COS
        const imageUrl = await cosUploader.uploadBase64(img_data, '.png', {
          contentType: 'image/png'
        });
        
        images.push(imageUrl);
        console.log(`✅ 编辑成功！已保存至: ${imageUrl}`);
      }
      
      console.log("生成的图片URLs:", images);

      const data1: GeneratedImage[] = [];
      images.forEach((imageUrl) => {
        data1.push({
          url: imageUrl
        });
      });
      
      return {
        created: 200,
        data: data1
      };
      
    } catch (error: any) {
      // 处理失败的编辑
      return this.handleFailedEdit(error);
    }
  }

  // 失败编辑
  private handleFailedEdit(error: any): ImageGenerationResponse {
    console.error('新格式图片编辑请求失败:', error.message || error);
    
    // 处理错误响应
    if (error.response) {
      // 服务器返回了错误状态码
      return {
        created: error.response.status || 500,
        data: [] 
      };
    } else if (error.request) {
      // 请求已发送但没有收到响应
      return {
        created: 504,
        data: [] 
      };
    } else {
      // 其他错误
      return {
        created: 500,
        data: [] 
      };
    }
  }
}

// 默认图片生成服务实例
export const defaultImageGenerationService = new ImageGenerationService();
