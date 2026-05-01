/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoogleGenAI, Type } from "@google/genai";
import { SubtitleItem, GeminiKeyRecord } from "../types";
import { getTranscriptionRules, buildRulesText } from "./transcriptionRulesService";

function getGenAI(apiKey: string) {
  if (!apiKey) {
    throw new Error("No API Key provided. Please set it in Settings.");
  }
  return new GoogleGenAI({ apiKey });
}

// Model IDs khớp với su-translate-main (dùng thẳng, không cần remap)
const MODEL_MAPPING: Record<string, string> = {
  'gemini-2.5-pro':        'gemini-2.5-pro',
  'gemini-2.5-flash':      'gemini-2.5-flash',
  'gemini-2.5-flash-lite': 'gemini-2.5-flash-lite',
  'gemini-2.0-flash':      'gemini-2.0-flash',
  'gemini-2.0-flash-lite': 'gemini-2.0-flash-lite',
};

function resolveModel(model: string): string {
  return MODEL_MAPPING[model] || model || 'gemini-2.5-flash';
}

// System instruction cho transcription — chỉ enforce JSON output, không override format timestamp
const TRANSCRIPTION_SYSTEM = `You are an expert transcriber and video analysis specialist.
Your task is to watch the entire video/audio from beginning to end and provide complete subtitles.

CRITICAL RULES:
1. PROCESS THE ENTIRE VIDEO: Do not stop until you reach the very end.
2. ABSOLUTE TIMESTAMPS: Always use total seconds from the start (e.g. 150.5 for 2m30s).
3. COMPLETENESS: Do not summarize. Capture every spoken segment.
4. GRANULARITY: Keep segments short (3-8 seconds) for better sync.
5. NO SHORTCUTS: Ensure output covers the full time range.

Output a JSON array. Each object must have:
- startTime: number (seconds from start)
- endTime: number (seconds from start)  
- text: string`;

// System instruction cho dịch tiếng Việt — chuyên biệt Hán Việt
const TRANSLATION_SYSTEM = `You are a professional subtitle translator specializing in Chinese to Vietnamese translation for video content.

CRITICAL TRANSLATION RULES:

**1. GAME/TECHNICAL TERMINOLOGY:**
- Character names, boss names, skill names: Keep original or use Sino-Vietnamese (Hán Việt)
- Class/Job names: Use correct Sino-Vietnamese (腐潮 = Phụ Triều, not Phủ Triều)
- Location names: Use Sino-Vietnamese (山内 = Sơn Nội, 关山藏锋 = Quan Sơn Tàng Phong)
- Item names: Use Sino-Vietnamese + explanation in parentheses if needed

**2. TRANSLATION QUALITY:**
- Translate meaning, not word-by-word
- Use natural, fluent Vietnamese
- Keep technical terms: Tank, DPS, AOE, buff, boss, P1/P2
- Use correct Sino-Vietnamese pronunciation, not literal meaning

**3. EXAMPLES:**
- ❌ "núi 4,5,6" → ✅ "Sơn Nội 4,5,6"
- ✅ "腐潮" → "Phụ Triều" (correct Sino-Vietnamese)
- ❌ "腐潮" → "Phủ Triều" (wrong)
- ✅ "无间霜影" → "Vô Gian Sương Ảnh"

**4. TECHNICAL:**
- Translate ONLY the "chinese" field value
- Preserve "id" values EXACTLY
- Return valid JSON array only`;

/**
 * Tự động thử lại với key khác khi gặp lỗi quota/rate-limit
 */
async function executeWithRotation<T>(
  apiKeys: GeminiKeyRecord[],
  activeKeyId: string | null,
  onKeyError: (id: string, error: any) => void,
  task: (ai: any) => Promise<T>
): Promise<T> {
  const sortedKeys = [...apiKeys].sort((a, b) => {
    if (a.id === activeKeyId) return -1;
    if (b.id === activeKeyId) return 1;
    return a.errorCount - b.errorCount;
  });

  let lastError: any;
  for (const keyRecord of sortedKeys) {
    if (keyRecord.status === 'error' && keyRecord.errorCount > 5) continue;
    if (!keyRecord.hasQuota) continue;

    try {
      const ai = getGenAI(keyRecord.key);
      return await task(ai);
    } catch (error: any) {
      lastError = error;
      const isQuotaError =
        error?.message?.includes('429') || error?.message?.includes('quota');
      if (isQuotaError) {
        onKeyError(keyRecord.id, error);
        continue;
      }
      throw error;
    }
  }
  throw lastError || new Error('All API keys failed or no keys available.');
}

/**
 * Parse timestamp format từ response của Gemini
 * Hỗ trợ nhiều format:
 * - [ 00m0s367ms 00m4s187ms] Text  (không có dấu -)
 * - [00m30s000ms - 00m35s500ms] Text (có dấu -)
 * - [MM:SS - MM:SS] Text
 */
function parseTimestampResponse(text: string): Array<{ startTime: number; endTime: number; text: string }> {
  const results: Array<{ startTime: number; endTime: number; text: string }> = [];
  if (!text) return results;

  // Format: [MMmSSsNNNms MMmSSsNNNms] hoặc [MMmSSsNNNms - MMmSSsNNNms]
  // Dấu - là tuỳ chọn, có thể chỉ có khoảng trắng
  const regexMs = /\[\s*(\d+)m(\d+)s(?:(\d+)ms)?\s*(?:[-–]\s*)?(\d+)m(\d+)s(?:(\d+)ms)?\s*\]\s*(.+?)(?=\[|\s*$)/gs;
  let match: RegExpExecArray | null;

  while ((match = regexMs.exec(text)) !== null) {
    const startMin = parseInt(match[1]);
    const startSec = parseInt(match[2]);
    const startMs  = match[3] ? parseInt(match[3]) / 1000 : 0;
    const endMin   = parseInt(match[4]);
    const endSec   = parseInt(match[5]);
    const endMs    = match[6] ? parseInt(match[6]) / 1000 : 0;
    const content  = match[7].trim();

    if (content) {
      results.push({
        startTime: startMin * 60 + startSec + startMs,
        endTime:   endMin   * 60 + endSec   + endMs,
        text: content,
      });
    }
  }

  if (results.length > 0) return results;

  // Format 2: [MM:SS - MM:SS] Text
  const regexColon = /\[\s*(\d+):(\d+)\s*[-–]\s*(\d+):(\d+)\s*\]\s*(.+?)(?=\[|\s*$)/gs;
  while ((match = regexColon.exec(text)) !== null) {
    const startMin = parseInt(match[1]);
    const startSec = parseInt(match[2]);
    const endMin   = parseInt(match[3]);
    const endSec   = parseInt(match[4]);
    const content  = match[5].trim();
    if (content) {
      results.push({
        startTime: startMin * 60 + startSec,
        endTime:   endMin   * 60 + endSec,
        text: content,
      });
    }
  }

  return results;
}

/**
 * Build prompt cuối cùng: thay {contentType}, TARGET_LANGUAGE, inject rules
 */
function buildTranscriptionPrompt(basePrompt: string, contentType: string): string {
  let prompt = basePrompt.replace(/\{contentType\}/g, contentType);

  const targetLanguage = localStorage.getItem('translation_target_language') || 'Tiếng Việt';
  if (prompt.includes('TARGET_LANGUAGE')) {
    prompt = prompt.replace(/TARGET_LANGUAGE/g, targetLanguage);
  }

  const rules = getTranscriptionRules();
  if (rules) {
    prompt += buildRulesText(rules);
  }

  return prompt;
}

export async function transcribeVideo(
  videoBase64: string,
  mimeType: string,
  apiKeys: GeminiKeyRecord[],
  activeKeyId: string | null,
  model: string,
  prompt: string,
  onKeyError: (id: string, error: any) => void
): Promise<SubtitleItem[]> {
  const contentType = mimeType.startsWith('video') ? 'video' : 'audio';
  const finalPrompt = buildTranscriptionPrompt(prompt, contentType);
  const realModelName = resolveModel(model);

  return executeWithRotation(apiKeys, activeKeyId, onKeyError, async (ai) => {
    const response = await ai.models.generateContent({
      model: realModelName,
      // Không dùng systemInstruction cứng — để prompt tự điều khiển format
      contents: [
        {
          role: 'user',
          parts: [
            { inlineData: { data: videoBase64, mimeType } },
            { text: finalPrompt },
          ],
        },
      ],
      // Không dùng responseSchema — để Gemini trả về text format [MMmSSsNNNms]
      // theo đúng prompt từ constants.ts
    });

    const rawText = response.text || '';
    console.log('[Transcribe] Raw response length:', rawText.length);
    console.log('[Transcribe] Raw response preview:', rawText.slice(0, 300));

    let items: Array<{ startTime: number; endTime: number; text: string }> = [];

    // Thử parse JSON trước (nếu Gemini trả về JSON)
    try {
      const trimmed = rawText.trim();
      if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
        const parsed = JSON.parse(trimmed);
        const arr = Array.isArray(parsed) ? parsed : [];
        if (arr.length > 0 && typeof arr[0].startTime === 'number') {
          items = arr;
          console.log('[Transcribe] Parsed as JSON, items:', items.length);
        }
      }
    } catch (e) {
      console.log('[Transcribe] Not JSON, trying timestamp format. Error:', e);
    }

    // Fallback: parse format [MMmSSsNNNms - MMmSSsNNNms] Text
    if (items.length === 0) {
      items = parseTimestampResponse(rawText);
      console.log('[Transcribe] Parsed as timestamp format, items:', items.length);
      if (items.length > 0) {
        console.log('[Transcribe] First item:', items[0]);
      }
    }

    if (items.length === 0) {
      console.warn('[Transcribe] No items parsed! Full response:', rawText);
    }

    return items.map((item, index) => ({
      id: `sub-${index}`,
      startTime: item.startTime,
      endTime:   item.endTime,
      chinese:   item.text,
    }));
  });
}

export async function translateSubtitles(
  subtitles: SubtitleItem[],
  apiKeys: GeminiKeyRecord[],
  activeKeyId: string | null,
  model: string,
  onKeyError: (id: string, error: any) => void
): Promise<SubtitleItem[]> {
  if (subtitles.length === 0) return [];

  const realModelName = resolveModel(model);
  const input = subtitles.map(s => ({ id: s.id, chinese: s.chinese }));

  return executeWithRotation(apiKeys, activeKeyId, onKeyError, async (ai) => {
    const response = await ai.models.generateContent({
      model: realModelName,
      systemInstruction: TRANSLATION_SYSTEM,
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: `Translate these subtitles to Vietnamese. Return the same JSON array with original "id" and a new "vietnamese" field.\n\n${JSON.stringify(input, null, 2)}`,
            },
          ],
        },
      ],
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id:         { type: Type.STRING },
              vietnamese: { type: Type.STRING },
            },
            required: ['id', 'vietnamese'],
          },
        },
      },
    });

    const translationsJson = JSON.parse(response.text || '[]');
    const translationMap = new Map<string, string>();
    translationsJson.forEach((item: any) => {
      if (item.id && item.vietnamese) {
        translationMap.set(item.id, item.vietnamese);
      }
    });

    return subtitles.map(s => ({
      ...s,
      vietnamese: translationMap.get(s.id) || s.vietnamese,
    }));
  });
}
