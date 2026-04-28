/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoogleGenAI, Type } from "@google/genai";
import { SubtitleItem, GeminiKeyRecord } from "../types";

function getGenAI(apiKey: string) {
  if (!apiKey) {
    throw new Error("No API Key provided. Please set it in Settings.");
  }
  return new GoogleGenAI({ apiKey });
}

// System instruction for transcription
const TRANSCRIPTION_SYSTEM = `You are an expert Chinese transcriber and video analysis specialist. 
Your task is to watch the entire video from beginning to end and provide complete Chinese subtitles.

Analyze the video carefully and output a JSON array of objects.
Each object must have:
- startTime: number (ABSOLUTE seconds from start, e.g., 150.5 for 2m30s)
- endTime: number (ABSOLUTE seconds from start)
- text: string (Chinese transcript)

CRITICAL RULES:
1. PROCESS THE ENTIRE VIDEO: Do not stop until you reach the very end of the video duration.
2. ABSOLUTE TIMESTAMPS: Always use total seconds from the start.
3. COMPLETENESS: Do not summarize. Every sentence spoken must be captured.
4. GRANULARITY: Keep segments short (3-8 seconds) for better synchronization.
5. NO SHORTCUTS: If a video is long, ensure your output covers the full time range.`;

// System instruction for translation
const TRANSLATION_SYSTEM = `You are a professional Chinese to Vietnamese translator specialized in video subtitling.
Translate the provided Chinese subtitles into Vietnamese.
Maintain the exact same JSON structure, adding a 'vietnamese' field.
Ensure the translation is natural, culturally appropriate, and fits the context of the subtitles.`;

/**
 * Executes a function with automatic API key rotation on quota limits
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
      const isQuotaError = error?.message?.includes("429") || error?.message?.includes("quota");
      if (isQuotaError) {
        onKeyError(keyRecord.id, error);
        continue; // Try next key
      }
      throw error; // Other errors should fail immediately
    }
  }
  throw lastError || new Error("All API keys failed or no keys available.");
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
  const finalPrompt = prompt.replace(/{contentType}/g, contentType);

  // Map user-friendly IDs to real Gemini API model names
  const modelMapping: Record<string, string> = {
    'gemini-2.5-pro': 'gemini-1.5-pro',
    'gemini-2.5-flash': 'gemini-1.5-flash',
    'gemini-2.5-flash-lite': 'gemini-1.5-flash-8b',
    'gemini-2.0-flash': 'gemini-2.0-flash',
  };
  const realModelName = modelMapping[model] || model || "gemini-1.5-flash";

  return executeWithRotation(apiKeys, activeKeyId, onKeyError, async (ai) => {
    const response = await ai.models.generateContent({
      model: realModelName,
      systemInstruction: TRANSCRIPTION_SYSTEM,
      contents: [
        {
          role: "user",
          parts: [
            {
              inlineData: {
                data: videoBase64,
                mimeType: mimeType,
              },
            },
            {
              text: finalPrompt,
            },
          ],
        },
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              startTime: { type: Type.NUMBER },
              endTime: { type: Type.NUMBER },
              text: { type: Type.STRING },
            },
            required: ["startTime", "endTime", "text"],
          },
        },
      },
    });

    const result = JSON.parse(response.text || "[]");
    return result.map((item: any, index: number) => ({
      id: `sub-${index}`,
      startTime: item.startTime,
      endTime: item.endTime,
      chinese: item.text,
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
  
  // Map user-friendly IDs to real Gemini API model names
  const modelMapping: Record<string, string> = {
    'gemini-2.5-pro': 'gemini-1.5-pro',
    'gemini-2.5-flash': 'gemini-1.5-flash',
    'gemini-2.5-flash-lite': 'gemini-1.5-flash-8b',
    'gemini-2.0-flash': 'gemini-2.0-flash',
  };
  const realModelName = modelMapping[model] || model || "gemini-1.5-flash";

  return executeWithRotation(apiKeys, activeKeyId, onKeyError, async (ai) => {
    // Send original id and chinese text for translation
    const input = subtitles.map(s => ({ id: s.id, chinese: s.chinese }));
    
    const response = await ai.models.generateContent({
      model: realModelName,
      systemInstruction: TRANSLATION_SYSTEM,
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `Translate these Chinese subtitles to Vietnamese. Return the same JSON array structure including the original 'id' and a new 'vietnamese' field. Content: ${JSON.stringify(input)}`,
            },
          ],
        },
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              vietnamese: { type: Type.STRING },
            },
            required: ["id", "vietnamese"],
          },
        },
      },
    });

    const translationsJson = JSON.parse(response.text || "[]");
    const translationMap = new Map<string, string>();
    translationsJson.forEach((item: any) => {
      if (item.id && item.vietnamese) {
        translationMap.set(item.id, item.vietnamese);
      }
    });

    // Merge translations back into the original subtitles to ensure no data loss/reordering
    return subtitles.map(s => ({
      ...s,
      vietnamese: translationMap.get(s.id) || s.vietnamese
    }));
  });
}
