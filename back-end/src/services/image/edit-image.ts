import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import { cosUploader } from '../../utils/cos-upload';
import { findClosestAspectRatio, getImageAspectRatio, getImageMimeTypeFromUrl, imageUrlToBase64Simple } from '../../utils/image-utils';
import type { GeneratedImage } from './generate';

// 从环境变量中读取API端点配置
const API_EDITIMAGE_NEW = process.env["YIAPI_EDITIMAGE_NEW"] as string || '';
const API_GEMINI_PRO_IMAGE = process.env["YIAPI_GEMINI_PRO_IMAGE"] as string || '';

export enum ImageEditUrlType {
  YI_API_GEMINI_2_5 = 1,// 易API，Gemini 2.5
  YI_API_GEMINI_3_0 = 2,// 易API，Gemini 3.0
}

export interface ImageEditRequest {
  images: string[]; // 图片URL或Base64编码
  prompt: string; // 编辑说明
  aspect_ratio: string;// 长宽比
  resolution: string;// 分辨率：2K
  url_type: ImageEditUrlType; // 链接类型
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

// 确保图片保存目录存在
const IMAGES_DIR = path.join(__dirname, '../images');
if (!fs.existsSync(IMAGES_DIR)) {
  fs.mkdirSync(IMAGES_DIR, { recursive: true });
}


class ImageEditService {

  public async editImage(request: ImageEditRequest): Promise<ImageEditResponse> {
    if (request.url_type === ImageEditUrlType.YI_API_GEMINI_2_5) {
      return this.yiApi_Gemini_2_5(request);
    } else if (request.url_type === ImageEditUrlType.YI_API_GEMINI_3_0) {
      return this.yiApi_Gemini_3_0(request);
    } else {
      return new Promise(() => {
        return {
          created: 200,
          data: []
        };
      });
    }
  }

  /**
   * 【edit-image-new】新的编辑图片的接口：指定长宽比
   * @param app 
   */
  public async yiApi_Gemini_2_5(request: ImageEditRequest): Promise<ImageEditResponse> {
    // 新的图片编辑接口 - 支持contents格式
    const API_KEY = process.env["YIAPI_KEY"] || '';

    const imageUrls = request.images;
    const instruction = request.prompt;
    const aspectRatio = request.aspect_ratio;
    try {
      if (!instruction) {
        return {
          created: 400, 
          data: [] 
        };
      }
      
      if (!imageUrls || imageUrls.length === 0) {
        return {
          created: 400, 
          data: [] 
        };
      }

      if (!aspectRatio) {
        return {
          created: 400, 
          data: [] 
        };
      }
      const mime_type = getImageMimeTypeFromUrl(imageUrls[0] as string);

      const base64ImageData = await imageUrlToBase64Simple(imageUrls[0] as string);
      
      // 构建转发请求体（转换为原有API所需格式）
      const requestBody = {
        "contents": [
          {
            "parts": [
              {
                "text": instruction
              },
              {
                "inline_data": {
                  mime_type,
                  "data": base64ImageData
                }
              }
            ]
          }
        ],
        "generationConfig": {
          "responseModalities": ["IMAGE"],
          "imageConfig": {
            aspectRatio
          }
        }
      };
      
      // 发送请求到目标API
      const response = await axios.post(API_EDITIMAGE_NEW, requestBody, {
        headers: {
          "Authorization": `Bearer ${API_KEY}`,
          'Content-Type': 'application/json'
        }
      });
      
      // 处理响应
      const images: string[] = [];
      const data = response.data;
      const candidates: any[] = data.candidates || [];
      
      for (let i = 0; i < candidates.length; i++) {
        const candidate = candidates[i];
        const content = candidate.content || '';
        if (!content) continue;
        const parts: any[] = content.parts || [];
        if (!parts || parts.length === 0) continue;
        const part = parts[0];
        const inlineData = part.inlineData;
        if (!inlineData) {
          continue;
        }
        const data = inlineData.data || '';
        if (!data) {
          continue;
        }
        const base64 = data;
        const imageUrl = await cosUploader.uploadBase64(base64, '.png', {
          contentType: 'image/png'
        });
        images.push(imageUrl);
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

  /**
   * 【gemini-image-generate】Gemini 3 Pro图片生成接口：支持多张图片合成
   * @param app 
   */
  public async yiApi_Gemini_3_0(request: ImageEditRequest): Promise<ImageEditResponse> {
    // Gemini 3 Pro图片生成接口 - 支持多张图片合成
    const API_KEY = process.env["YIAPI_KEY"] || '';
    
    // 从请求体中获取参数
    const imageUrls = request.images;
    const prompt = request.prompt;
    const oldAspectRatio = request.aspect_ratio || "16:9";
    const imageSize = request.resolution || "2K";
    
    // 如果aspectRatio为"auto"，获取第一张图片的实际长宽比并找到最接近的预定义长宽比
    let aspectRatio = oldAspectRatio;
    if (oldAspectRatio.toLowerCase() === "auto" && imageUrls && imageUrls.length > 0) {
      console.log('aspectRatio为auto，正在获取第一张图片的实际长宽比...');
      const actualRatio = await getImageAspectRatio(imageUrls[0] as string);
      const closestRatio = findClosestAspectRatio(actualRatio);
      console.log(`图片实际长宽比: ${actualRatio.toFixed(4)}, 最接近的预定义长宽比: ${closestRatio}`);
      aspectRatio = closestRatio;
    }

    try {
      
      if (!prompt) {
        return {
          created: 400, 
          data: [] 
        };
      }
      
      if (!imageUrls || imageUrls.length === 0) {
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
      
      // 处理每张图片，转换为base64格式
      console.log(`📤 正在读取 ${imageUrls.length} 张图片...`);
      for (let i = 0; i < imageUrls.length; i++) {
        const imageUrl = imageUrls[i] as string;
        const mime_type = getImageMimeTypeFromUrl(imageUrl);
        const base64ImageData = await imageUrlToBase64Simple(imageUrl);
        
        parts.push({
          "inline_data": {
            "mime_type": mime_type,
            "data": base64ImageData
          }
        });
        console.log(`✅ 图片 ${i + 1} (${mime_type}) (${imageUrl})`);
      }
      
      // 添加编辑指令
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

      // 打印最终使用的长宽比
      if (oldAspectRatio.toLowerCase() === "auto" && imageUrls && imageUrls.length > 0) {
        console.log('aspectRatio为auto，正在获取第一张图片的实际长宽比...');
        const actualRatio = await getImageAspectRatio(imageUrls[0] as string);
        const closestRatio = findClosestAspectRatio(actualRatio);
        console.log(`图片实际长宽比: ${actualRatio.toFixed(4)}, 最接近的预定义长宽比: ${closestRatio}`);
        aspectRatio = closestRatio;
      } else {
        console.log(`使用指定长宽比: ${aspectRatio}`);
      }
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
  private handleFailedEdit(error: any): ImageEditResponse {
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

export const defaultImageEditService = new ImageEditService();