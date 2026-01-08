// 大模型API请求服务
import * as https from 'https';
import * as http from 'http';

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
    const { prompt, temperature = 0.7, max_tokens = 1000, top_p = 1.0, frequency_penalty = 0, presence_penalty = 0 } = request;

    const data = JSON.stringify({
      model: request.model || this.config.model,
      prompt,
      temperature,
      max_tokens,
      top_p,
      frequency_penalty,
      presence_penalty
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
            const parsedResponse = JSON.parse(responseData) as LLMResponse;
            resolve(parsedResponse);
          } catch (error) {
            reject(new Error(`Failed to parse LLM response: ${error}`));
          }
        });
      });

      req.on('error', (error) => {
        reject(new Error(`LLM API request failed: ${error}`));
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
  apiKey: process.env['LLM_API_KEY'] || '',
  baseUrl: process.env['LLM_BASE_URL'] || 'https://api.openai.com/v1/completions',
  model: process.env['LLM_MODEL'] || 'text-davinci-003'
});
