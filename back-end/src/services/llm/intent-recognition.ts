// 意图识别服务
import { LLMService, defaultLLMService } from './api';

export interface IntentRecognitionResult {
  intent: string;
  confidence: number;
  entities?: Record<string, any>;
}

export interface Intent {
  name: string;
  description: string;
  examples: string[];
}

export class IntentRecognitionService {
  private llmService: LLMService;
  private intents: Intent[];

  constructor(llmService: LLMService = defaultLLMService) {
    this.llmService = llmService;
    this.intents = [];
  }

  // 注册意图
  registerIntent(intent: Intent): void {
    this.intents.push(intent);
  }

  // 批量注册意图
  registerIntents(intents: Intent[]): void {
    this.intents = [...this.intents, ...intents];
  }

  // 清空所有意图
  clearIntents(): void {
    this.intents = [];
  }

  // 获取所有意图
  getIntents(): Intent[] {
    return [...this.intents];
  }

  // 意图识别
  async recognizeIntent(text: string): Promise<IntentRecognitionResult> {
    if (this.intents.length === 0) {
      throw new Error('No intents registered for recognition');
    }

    // 构建提示词
    const intentExamples = this.intents.map((intent, index) => {
      const examplesText = intent.examples.map(example => `- "${example}"`).join('\n');
      return `${index + 1}. ${intent.name}: ${intent.description}\n${examplesText}`;
    }).join('\n\n');

    const prompt = `请分析用户输入的文本，识别其意图。

可用意图列表：
${intentExamples}

用户输入："${text}"

请以JSON格式返回识别结果，包含以下字段：
- intent: 识别出的意图名称
- confidence: 置信度（0-1之间的数字）
- entities: 识别出的实体（可选）

JSON格式示例：
{"intent": "查询天气", "confidence": 0.95, "entities": {"location": "北京"}}`;

    try {
      const response = await this.llmService.generateText({
        prompt,
        temperature: 0.0,
        max_tokens: 200
      });

      if (response.choices && response.choices.length > 0) {
        const resultText = response.choices[0].text.trim();
        // 提取JSON部分
        const jsonMatch = resultText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0]) as IntentRecognitionResult;
        } else {
          throw new Error('Failed to extract JSON from LLM response');
        }
      } else {
        throw new Error('No valid response from LLM');
      }
    } catch (error) {
      throw new Error(`Intent recognition failed: ${error}`);
    }
  }

  // 简单意图匹配（基于关键词，作为后备方案）
  simpleIntentMatch(text: string): IntentRecognitionResult {
    const lowercaseText = text.toLowerCase();
    let bestMatch: Intent | null = null;
    let maxScore = 0;

    for (const intent of this.intents) {
      let score = 0;
      // 检查意图名称中的关键词
      const intentKeywords = intent.name.toLowerCase().split(/\s+/);
      for (const keyword of intentKeywords) {
        if (lowercaseText.includes(keyword)) {
          score += 0.3;
        }
      }

      // 检查示例中的关键词
      for (const example of intent.examples) {
        const exampleKeywords = example.toLowerCase().split(/\s+/);
        for (const keyword of exampleKeywords) {
          if (lowercaseText.includes(keyword)) {
            score += 0.1;
          }
        }
      }

      if (score > maxScore) {
        maxScore = score;
        bestMatch = intent;
      }
    }

    if (bestMatch && maxScore > 0) {
      return {
        intent: bestMatch.name,
        confidence: Math.min(maxScore, 1.0)
      };
    }

    return {
      intent: 'unknown',
      confidence: 0.0
    };
  }
}

// 预定义一些常见意图
export const commonIntents: Intent[] = [
  {
    name: '查询天气',
    description: '查询特定地点的天气信息',
    examples: ['今天北京天气怎么样？', '上海明天会下雨吗？', '广州的温度是多少？']
  },
  {
    name: '发送邮件',
    description: '发送电子邮件给指定收件人',
    examples: ['帮我发邮件给张三', '给李四发一封关于会议的邮件', '我要发送邮件']
  },
  {
    name: '设置提醒',
    description: '设置时间提醒',
    examples: ['明天早上8点提醒我开会', '设置一个下午3点的提醒', '提醒我周五交报告']
  },
  {
    name: '翻译文本',
    description: '将文本从一种语言翻译成另一种语言',
    examples: ['帮我翻译这句话', '把中文翻译成英文', '翻译 "Hello World" 成中文']
  },
  {
    name: '生成图片',
    description: '根据描述生成图片',
    examples: ['帮我生成一张猫的图片', '画一幅山水风景画', '生成一张科技感十足的城市夜景']
  },
  {
    name: '编辑图片',
    description: '对图片进行编辑操作',
    examples: ['帮我把这张图片裁剪一下', '调整图片的亮度', '给图片添加滤镜']
  }
];

// 默认意图识别服务实例
export const defaultIntentRecognitionService = new IntentRecognitionService();
// 注册常见意图
defaultIntentRecognitionService.registerIntents(commonIntents);
