import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';

/**
 * 将 Base64 字符串保存为本地图片
 * @param {string} base64Str - Base64 字符串（可带格式头，如 data:image/png;base64,xxx）
 * @param {string} outputPath - 输出图片路径（含文件名，如 ./images/test.png）
 * @returns {Promise} - 保存成功/失败的Promise
 */
export function base64ToImage(base64Str: string, outputPath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    try {
      // 移除 Base64 字符串中的格式头（如 data:image/png;base64,）
      const base64Data = base64Str.replace(/^data:image\/\w+;base64,/, '');
      
      // 将 Base64 字符串转换为 Buffer
      const buffer = Buffer.from(base64Data, 'base64');
      
      // 创建输出目录（如果不存在）
      const dir = path.dirname(outputPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      
      // 写入文件
      fs.writeFile(outputPath, buffer, (err) => {
        if (err) {
          reject(`保存失败：${err.message}`);
        } else {
          resolve(`图片已保存至：${outputPath}`);
        }
      });
    } catch (error) {
      reject(`处理失败：${error}`);
    }
  });
}

/**
 * 将图片URL转换为Base64字符串
 * @param {string} imageUrl - 图片URL
 * @returns {Promise<string>} - Base64字符串（包含格式头，如 data:image/png;base64,xxx）
 */
export async function imageUrlToBase64Simple(imageUrl: string, isAddData: boolean = false): Promise<string> {
  try {
    // 发送GET请求获取图片数据
    const response = await axios.get(imageUrl, {
      responseType: 'arraybuffer',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    // 从响应头获取Content-Type
    const contentType = response.headers['content-type'] || 'image/jpeg';
    
    // 将响应数据转换为Buffer
    const buffer = Buffer.from(response.data, 'binary');
    
    // 将Buffer转换为Base64字符串
    const base64String = buffer.toString('base64');
    const r = isAddData ? `data:${contentType};base64,${base64String}` : base64String;
    
    // 返回带格式头的Base64字符串
    return r;
  } catch (error) {
    throw new Error(`图片URL转Base64失败：${error instanceof Error ? error.message : String(error)}`);
  }
}


/**
 * 根据URL获取图片的MIME类型
 * @param url 图片URL地址
 * @returns string 图片的MIME类型，如image/jpeg, image/png等
 */
export const getImageMimeTypeFromUrl = (url: string): string => {
  if (!url || typeof url !== 'string') {
    return 'image/jpeg'; // 默认返回JPEG格式
  }
  
  try {
    // 解析URL，移除查询参数
    // 微信小程序环境不支持原生URL构造函数，手动解析
    const split = url.split('?');
    if (split.length <= 0) {
      return 'image/jpeg'; // 默认返回JPEG格式
    }
    let pathname = split[0] as string; // 去掉查询参数
    if (pathname.indexOf('://') > -1) {
      // 带协议，取path部分
      pathname = '/' + pathname.split('/').slice(3).join('/');
    }
    
    // 获取文件扩展名
    const parts = pathname.split('.');
    if (parts.length < 2) {
      return 'image/jpeg'; // 默认返回JPEG格式
    }
    
    const extension = parts.pop()?.toLowerCase() || '';
    
    // 根据扩展名映射到MIME类型
    const mimeTypes: Record<string, string> = {
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
      'webp': 'image/webp',
      'bmp': 'image/bmp',
      'svg': 'image/svg+xml',
      'tif': 'image/tiff',
      'tiff': 'image/tiff'
    };
    
    // 返回对应的MIME类型，如果没有匹配的则返回默认值
    return mimeTypes[extension] || 'image/jpeg';
  } catch (error) {
    console.error('解析图片URL获取MIME类型失败:', error);
    return 'image/jpeg'; // 解析失败时返回默认值
  }
};

// 获取图片的实际长宽比
export async function getImageAspectRatio(imageUrl: string): Promise<number> {
  try {
    console.log(`开始获取图片 ${imageUrl} 的长宽比...`);
    
    // 发送GET请求获取图片数据（直接获取，不先发送HEAD请求）
    const dataResponse = await axios.get(imageUrl, {
      responseType: 'arraybuffer',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3',
        'Referer': '', // 空Referer可能有助于避免某些跨域限制
        'Origin': ''   // 空Origin可能有助于避免某些跨域限制
      },
      timeout: 10000, // 增加超时时间到10秒
      withCredentials: false // 不发送凭证，避免跨域问题
    });
    
    console.log(`成功获取图片数据，状态码: ${dataResponse.status}`);
    console.log(`响应头:`, dataResponse.headers);
    
    // 解析图片尺寸
    const imageBuffer = Buffer.from(dataResponse.data);
    console.log(`图片数据大小: ${imageBuffer.length} 字节`);
    
    const dimensions = getImageDimensions(imageBuffer);
    
    if (dimensions) {
      console.log(`成功解析图片尺寸: ${dimensions.width}x${dimensions.height}`);
      return dimensions.width / dimensions.height;
    }
    
    // 如果无法解析尺寸，返回默认值
    console.log('无法解析图片尺寸，使用默认值');
    return 16 / 9;
  } catch (error) {
    console.error('获取图片长宽比失败:', error);
    if (axios.isAxiosError(error)) {
      console.error('Axios错误详情:');
      console.error('  - 错误信息:', error.message);
      console.error('  - 状态码:', error.response?.status);
      console.error('  - 响应头:', error.response?.headers);
      console.error('  - 请求配置:', error.config);
      
      if (error.response?.status === 403) {
        console.error('可能是跨域或权限问题导致的403错误');
      } else if (error.code === 'ECONNABORTED') {
        console.error('请求超时，可能是网络问题或服务器响应慢');
      } else if (error.code === 'ENOTFOUND') {
        console.error('无法找到服务器，可能是URL错误');
      }
    }
    // 发生错误时返回默认值
    return 16 / 9;
  }
}

// 从图片Buffer中获取尺寸
function getImageDimensions(buffer: Buffer): { width: number; height: number } | null {
  try {
    // 确保缓冲区有足够的字节
    if (buffer.length < 8) {
      console.error('缓冲区长度不足，无法解析图片尺寸');
      return null;
    }

    // 检查文件类型
    
    // BMP格式检查
    if (buffer[0] === 0x42 && buffer[1] === 0x4D) { // 'BM'
      if (buffer.length < 24) {
        console.error('BMP文件头不完整');
        return null;
      }
      const width = buffer.readUInt32LE(18);
      const height = buffer.readUInt32LE(22);
      return { width, height };
    }
    
    // GIF格式检查 - 前3个字节应该是'GIF'
    if (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46) {
      if (buffer.length < 10) {
        console.error('GIF文件头不完整');
        return null;
      }
      const width = buffer.readUInt16LE(6);
      const height = buffer.readUInt16LE(8);
      return { width, height };
    }
    
    // JPEG格式检查
    if (buffer[0] === 0xff && buffer[1] === 0xd8) {
      let i = 2;
      while (i + 5 < buffer.length) {
        // 确保有足够的字节来读取标记
        if (buffer[i] !== 0xff) {
          console.error('JPEG格式错误：找不到标记');
          return null;
        }
        
        const marker = buffer[i + 1] as number;
        
        // SOF标记（Start of Frame）
        if ((marker >= 0xc0 && marker <= 0xc3) || (marker >= 0xc5 && marker <= 0xc7) || 
            (marker >= 0xc9 && marker <= 0xcb) || (marker >= 0xcd && marker <= 0xcf)) {
          if (i + 8 > buffer.length) {
            console.error('JPEG SOF段不完整');
            return null;
          }
          const height = buffer.readUInt16BE(i + 5);
          const width = buffer.readUInt16BE(i + 7);
          return { width, height };
        }
        
        // 跳过其他标记段
        if (i + 2 > buffer.length) {
          console.error('JPEG段长度字段不完整');
          return null;
        }
        
        const segmentLength = buffer.readUInt16BE(i + 2);
        if (segmentLength < 2) {
          console.error('JPEG段长度无效');
          return null;
        }
        
        i += segmentLength + 2;
      }
      console.error('JPEG格式错误：找不到SOF标记');
      return null;
    }
    
    // PNG格式检查 - 比较字节值而不是字符串
    if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47 && 
        buffer[4] === 0x0D && buffer[5] === 0x0A && buffer[6] === 0x1A && buffer[7] === 0x0A) {
      if (buffer.length < 24) {
        console.error('PNG文件头不完整');
        return null;
      }
      const width = buffer.readUInt32BE(16);
      const height = buffer.readUInt32BE(20);
      return { width, height };
    }
    
    console.error('不支持的图片格式');
    return null;
  } catch (error) {
    console.error('解析图片尺寸失败:', error);
    return null;
  }
}