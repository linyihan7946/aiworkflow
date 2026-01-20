import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import * as dotenv from 'dotenv';

// 为COS SDK定义接口类型
interface COSOptions {
  SecretId: string;
  SecretKey: string;
}

interface COS {
  SecretId?: string;
  SecretKey?: string;
  putObject(params: any, callback: (err: Error | null, data?: any) => void): void;
  getObjectUrl(params: any): string;
  deleteObject(params: any, callback: (err: Error | null) => void): void;
}

// 使用require导入并指定类型
const COS = require('cos-nodejs-sdk-v5') as new (options: COSOptions) => COS;

// 加载环境变量
dotenv.config();

/**
 * 腾讯云COS文件上传工具
 */
export class CosUploader {
  private cos: COS;
  private bucket: string;
  private region: string;

  constructor() {
    // 从环境变量获取COS配置
    this.cos = new COS({
      SecretId: process.env["TENCENT_COS_SECRET_ID"] || '',
      SecretKey: process.env["TENCENT_COS_SECRET_KEY"] || '',
    });

    this.bucket = process.env["TENCENT_COS_BUCKET"] || '';
    this.region = process.env["TENCENT_COS_REGION"] || '';

    // 验证必要的配置
    if (!process.env["TENCENT_COS_SECRET_ID"] || !process.env["TENCENT_COS_SECRET_KEY"]) {
      throw new Error('腾讯云COS密钥未配置，请设置 TENCENT_COS_SECRET_ID 和 TENCENT_COS_SECRET_KEY 环境变量');
    }
    if (!this.bucket || !this.region) {
      throw new Error('腾讯云COS存储桶信息未配置，请设置 TENCENT_COS_BUCKET 和 TENCENT_COS_REGION 环境变量');
    }
  }

  /**
   * 上传文件到腾讯云COS
   * @param filePath 本地文件路径
   * @param cosPath COS存储路径（相对于存储桶根目录）
   * @param options 上传选项
   * @returns 上传成功后的文件URL
   */
  async uploadFile(
    filePath: string,
    cosPath: string,
    options: {
      contentType?: string;
      // onProgress?: (progressData: { loaded: number; total: number; speed: number }) => void;
    } = {}
  ): Promise<string> {
    // 确保文件存在
    if (!fs.existsSync(filePath)) {
      throw new Error(`文件不存在: ${filePath}`);
    }

    // 获取文件信息
    const stats = fs.statSync(filePath);
    if (!stats.isFile()) {
      throw new Error(`路径不是文件: ${filePath}`);
    }

    // 生成存储路径，如果没有指定则使用文件名
    const key = cosPath || path.basename(filePath);

    // 读取文件内容
    const fileContent = fs.readFileSync(filePath);
    
    // 上传文件
    return new Promise((resolve, reject) => {
      this.cos.putObject(
        {
          Bucket: this.bucket,
          Region: this.region,
          Key: key,
          Body: fileContent,
          ContentType: options.contentType,
          // onProgress: options.onProgress,
        },
        (err: Error | null) => {
          if (err) {
            reject(new Error(`COS上传失败: ${err.message}`));
            return;
          }

          // 生成文件URL
          const fileUrl = this.getFileUrl(key);
          resolve(fileUrl);
        }
      );
    });
  }

  /**
   * 上传Buffer到腾讯云COS
   * @param buffer 文件Buffer数据
   * @param cosPath COS存储路径
   * @param options 上传选项
   * @returns 上传成功后的文件URL
   */
  async uploadBuffer(
    buffer: Buffer,
    cosPath: string,
    options: {
      contentType?: string;
      onProgress?: (progressData: { loaded: number; total: number; speed: number }) => void;
    } = {}
  ): Promise<string> {
    // 验证参数
    if (!buffer || buffer.length === 0) {
      throw new Error('上传数据为空');
    }

    if (!cosPath) {
      throw new Error('存储路径不能为空');
    }

    // 上传Buffer
    return new Promise((resolve, reject) => {
      this.cos.putObject(
        {
          Bucket: this.bucket,
          Region: this.region,
          Key: cosPath,
          Body: buffer,
          ContentType: options.contentType,
          onProgress: options.onProgress,
        },
        (err: Error | null) => {
          if (err) {
            reject(new Error(`COS上传失败: ${err.message}`));
            return;
          }

          // 生成文件URL
          const fileUrl = this.getFileUrl(cosPath);
          resolve(fileUrl);
        }
      );
    });
  }

  /**
   * 生成文件的访问URL
   * @param key 文件在COS中的路径
   * @returns 文件的完整访问URL
   */
  getFileUrl(key: string): string {
    // 生成临时URL，有效期1天
    const signedUrl = this.cos.getObjectUrl({
      Bucket: this.bucket,
      Region: this.region,
      Key: key,
      Expires: 86400, // 24小时有效期
      Sign: true,
    });

    return signedUrl;
  }

  /**
   * 删除COS中的文件
   * @param cosPath 文件在COS中的路径
   */
  async deleteFile(cosPath: string): Promise<void> {
    if (!cosPath) {
      throw new Error('删除路径不能为空');
    }

    return new Promise((resolve, reject) => {
      this.cos.deleteObject(
        {
          Bucket: this.bucket,
          Region: this.region,
          Key: cosPath,
        },
        (err: Error | null) => {
          if (err) {
            reject(new Error(`COS删除失败: ${err.message}`));
            return;
          }
          resolve();
        }
      );
    });
  }

  /**
   * 生成唯一的文件路径，基于文件内容计算md5码
   * @param filePath 文件路径，用于读取文件内容计算md5
   * @param prefix 路径前缀
   * @returns 唯一的文件路径
   */
  generateUniqueFilePath(filePath: string, prefix = 'uploads'): string {
    // 读取文件内容并计算md5
    const fileContent = fs.readFileSync(filePath);
    const md5Hash = this.calculateMD5(fileContent);
    const ext = path.extname(filePath) || '';
    return `${prefix}/${md5Hash}${ext}`;
  }
  
  /**
   * 为Buffer数据生成唯一的文件路径
   * @param originalFileName 原始文件名
   * @param buffer 文件Buffer数据
   * @param prefix 路径前缀
   * @returns 唯一的文件路径
   */
  generateUniqueFilePathForBuffer(originalFileName: string, buffer: Buffer, prefix = 'uploads'): string {
    const md5Hash = this.calculateMD5(buffer);
    const ext = path.extname(originalFileName) || '';
    
    return `${prefix}/${md5Hash}${ext}`;
  }
  
  /**
   * 计算数据的MD5哈希值
   * @param data 文件内容或Buffer数据
   * @returns MD5哈希值（十六进制字符串）
   */
  private calculateMD5(data: Buffer): string {
    const md5Sum = crypto.createHash('md5');
    md5Sum.update(data);
    return md5Sum.digest('hex');
  }
  
  /**
   * 上传Base64格式的图片到腾讯云COS
   * @param base64Str Base64编码的图片字符串（可以包含前缀如'data:image/png;base64,'）
   * @param fileName 文件名，用于确定文件扩展名
   * @param options 上传选项
   * @returns 上传成功后的文件URL
   */
  async uploadBase64(
    base64Str: string,
    ext: string,
    options: {
      contentType?: string;
      onProgress?: (progressData: { loaded: number; total: number; speed: number }) => void;
    } = {}
  ): Promise<string> {
    // 验证参数
    if (!base64Str) {
      throw new Error('Base64字符串不能为空');
    }
    if (!ext) {
      throw new Error('文件名不能为空');
    }
    
    // 移除可能的前缀（如'data:image/png;base64,'）
    const base64Data = base64Str.replace(/^data:image\/[^;]+;base64,/, '');
    
    // 验证Base64格式
    if (!/^[A-Za-z0-9+/=]+$/.test(base64Data)) {
      throw new Error('无效的Base64字符串格式');
    }
    
    try {
      // 转换Base64字符串为Buffer
      const buffer = Buffer.from(base64Data, 'base64');
      
      // 直接生成包含正确扩展名的存储路径
      const md5Hash = this.calculateMD5(buffer);
      // 确保扩展名正确添加，处理ext可能已经包含.的情况
      const normalizedExt = ext.startsWith('.') ? ext : `.${ext}`;
      const cosPath = `uploads/${md5Hash}${normalizedExt}`;
      
      // 使用现有的uploadBuffer方法上传数据
      return await this.uploadBuffer(buffer, cosPath, options);
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Base64处理失败: ${error.message}`);
      }
      throw new Error('Base64处理失败');
    }
  }
}

/**
 * 创建CosUploader实例
 */
export const cosUploader = new CosUploader();




// testCosUpload();