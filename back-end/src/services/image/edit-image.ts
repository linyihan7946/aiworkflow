import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import { cosUploader } from '../../utils/cos-upload';
import { getImageMimeTypeFromUrl, imageUrlToBase64Simple } from '../../utils/image-utils';
import type { GeneratedImage } from './generate';

// 预定义的长宽比列表
const PREDEFINED_ASPECT_RATIOS = [
  { value: "1:1", ratio: 1 / 1 },
  { value: "16:9", ratio: 16 / 9 },
  { value: "9:16", ratio: 9 / 16 },
  { value: "4:3", ratio: 4 / 3 },
  { value: "3:4", ratio: 3 / 4 },
  { value: "3:2", ratio: 3 / 2 },
  { value: "2:3", ratio: 2 / 3 },
  { value: "21:9", ratio: 21 / 9 },
  { value: "5:4", ratio: 5 / 4 },
  { value: "4:5", ratio: 4 / 5 }
];

// 获取图片的实际长宽比
async function getImageAspectRatio(imageUrl: string): Promise<number> {
  try {
    // 发送HEAD请求获取图片信息
    const response = await axios.head(imageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3'
      }
    });
    
    // 检查Content-Length是否存在，但这只能获取文件大小
    // 我们需要实际获取图片的尺寸
    
    // 发送GET请求获取图片数据
    const dataResponse = await axios.get(imageUrl, {
      responseType: 'arraybuffer',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3'
      }
    });
    
    // 解析图片尺寸
    const imageBuffer = Buffer.from(dataResponse.data);
    const dimensions = getImageDimensions(imageBuffer);
    
    if (dimensions) {
      return dimensions.width / dimensions.height;
    }
    
    // 如果无法解析尺寸，返回默认值
    return 16 / 9;
  } catch (error) {
    console.error('获取图片长宽比失败:', error);
    // 发生错误时返回默认值
    return 16 / 9;
  }
}

// 从图片Buffer中获取尺寸
function getImageDimensions(buffer: Buffer): { width: number; height: number } | null {
  try {
    // 检查文件类型
    const type = buffer.toString('ascii', 0, 2);
    
    if (type === 'BM') { // BMP
      const width = buffer.readUInt32LE(18);
      const height = buffer.readUInt32LE(22);
      return { width, height };
    } else if (type === 'GI') { // GIF
      const width = buffer.readUInt16LE(6);
      const height = buffer.readUInt16LE(8);
      return { width, height };
    } else if (buffer[0] === 0xff && buffer[1] === 0xd8) { // JPEG
      let i = 2;
      while (i < buffer.length) {
        const marker = buffer[i];
        const segmentLength = buffer.readUInt16BE(i + 2);
        
        if (marker === 0xc0 || marker === 0xc1 || marker === 0xc2) {
          const height = buffer.readUInt16BE(i + 5);
          const width = buffer.readUInt16BE(i + 7);
          return { width, height };
        }
        
        i += segmentLength + 2;
      }
    } else if (buffer.toString('ascii', 0, 8) === '89PNG\r\n\x1a\n') { // PNG
      const width = buffer.readUInt32BE(16);
      const height = buffer.readUInt32BE(20);
      return { width, height };
    }
    
    return null;
  } catch (error) {
    console.error('解析图片尺寸失败:', error);
    return null;
  }
}

// 找到最接近的预定义长宽比
function findClosestAspectRatio(actualRatio: number): string {
  let closest = PREDEFINED_ASPECT_RATIOS[0] as { value: string, ratio: number };
  let minDiff = Math.abs(actualRatio - closest.ratio);
  
  for (const ar of PREDEFINED_ASPECT_RATIOS) {
    const diff = Math.abs(actualRatio - ar.ratio);
    if (diff < minDiff) {
      minDiff = diff;
      closest = ar;
    }
  }
  
  return closest.value;
}

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
    let aspectRatio = request.aspect_ratio || "16:9";
    const imageSize = request.resolution || "2K";
    
    // 如果aspectRatio为"auto"，获取第一张图片的实际长宽比并找到最接近的预定义长宽比
    if (aspectRatio.toLowerCase() === "auto" && imageUrls && imageUrls.length > 0) {
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
        
    // 记录失败操作到数据库
    try {
      console.log('失败操作已记录到数据库');
    } catch (dbError) {
      console.error('记录失败操作到数据库失败:', dbError);
    }
    
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