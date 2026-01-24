// 大模型API请求服务
import * as https from 'https';
import * as http from 'http';
import { geminiChatCompletion, ModelNameList } from '../../utils/cloudflare-worker';

export interface LLMRequest {
  model: string;
  prompt: string;
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
}

export interface LLMResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    text: string;
    index: number;
    logprobs?: any;
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface LLMConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
}

export class LLMService {
  private config: LLMConfig;

  constructor(config: LLMConfig) {
    this.config = config;
  }

  async generateText(request: LLMRequest): Promise<LLMResponse> {
    const { prompt, temperature = 0.7 } = request;
    
    try {
      const response = await geminiChatCompletion(
        { timeout: 30000 },
        this.config.apiKey,
        [{ role: 'user', content: prompt }],
        request.model || this.config.model,
        temperature
      );
      
      // 提取Gemini响应中的文本内容
      const content = response.candidates[0].content.parts[0].text;
      
      // 转换为兼容的LLMResponse格式
      const llmResponse: LLMResponse = {
        id: `gemini-${Date.now()}`,
        object: 'text_completion',
        created: Math.floor(Date.now() / 1000),
        model: request.model || this.config.model,
        choices: [{
          text: content,
          index: 0,
          finish_reason: 'stop'
        }],
        usage: {
          prompt_tokens: prompt.length,
          completion_tokens: content.length,
          total_tokens: prompt.length + content.length
        }
      };
      
      return llmResponse;
    } catch (error) {
      throw new Error(`LLM API request failed: ${error}`);
    }
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

  // 流式生成文本
  async generateTextStream(request: LLMRequest, onChunk: (chunk: string) => void, onComplete: () => void): Promise<void> {
    const { prompt, temperature = 0.7, max_tokens = 1000, top_p = 1.0, frequency_penalty = 0, presence_penalty = 0 } = request;

    const data = JSON.stringify({
      model: request.model || this.config.model,
      prompt,
      temperature,
      max_tokens,
      top_p,
      frequency_penalty,
      presence_penalty,
      stream: true
    });

    const options = this.createRequestOptions(data.length);

    return new Promise((resolve, reject) => {
      const client = this.config.baseUrl.startsWith('https://') ? https : http;
      const req = client.request(options, (res) => {
        let buffer = '';

        res.on('data', (chunk) => {
          buffer += chunk;
          // 处理流式响应
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.trim() === '') continue;
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') {
                onComplete();
                resolve();
                return;
              }
              try {
                const parsed = JSON.parse(data);
                if (parsed.choices && parsed.choices.length > 0 && parsed.choices[0].text) {
                  onChunk(parsed.choices[0].text);
                }
              } catch (error) {
                // 忽略解析错误
              }
            }
          }
        });

        res.on('end', () => {
          onComplete();
          resolve();
        });
      });

      req.on('error', (error) => {
        reject(new Error(`LLM API request failed: ${error}`));
      });

      req.write(data);
      req.end();
    });
  }
}

// 默认配置的LLM服务实例
export const defaultLLMService = new LLMService({
  apiKey: process.env['GOOGLE_API_KEY'] || process.env['LLM_API_KEY'] || '',
  baseUrl: '',
  model: ModelNameList.Gemini2Flash001
});
