import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export interface EstimateLineItem {
  name: string;
  category: 'material' | 'labor' | 'other';
  quantity: number;
  unit: string;
  unitPrice: number;
  description: string;
}

export interface EstimateResult {
  projectName: string;
  items: EstimateLineItem[];
  tips: string[];
}

export const geminiService = {
  async estimateTask(userInput: string): Promise<EstimateResult> {
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview", // Use standard reliable model
        contents: `你是一位專業的台灣室內裝修與工程估價專家。
        請根據使用者的輸入內容，產生專業的工程報價單。
        使用者輸入內容可能包含：簡短的任務描述、或是詳細的現場丈量筆記（清單與數量）。
        使用者的輸入內容："${userInput}"。
        
        你的任務：
        1. 識別輸入內容的意圖。如果使用者已經提供了清單與數量（例如：客廳油漆 30坪），請務必忠實採納其數量與項目。
        2. 如果使用者僅提供簡短描述，請發揮專業拆解出合理的工項清單。
        3. 搜尋並帶入當前台灣市場行情（包含材料與工資）。
        4. 提供 3-5 點專業的工程施作建議或注意事項。
        
        請務必以繁體中文回答，並回傳符合結構的 JSON 格式。`,
        config: {
          tools: [{ googleSearch: {} }], 
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              projectName: { type: Type.STRING },
              items: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    name: { type: Type.STRING },
                    category: { type: Type.STRING, enum: ['material', 'labor', 'other'] },
                    quantity: { type: Type.NUMBER },
                    unit: { type: Type.STRING },
                    unitPrice: { type: Type.NUMBER },
                    description: { type: Type.STRING }
                  },
                  required: ['name', 'category', 'quantity', 'unit', 'unitPrice']
                }
              },
              tips: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
              }
            },
            required: ['projectName', 'items', 'tips']
          }
        }
      });

      if (!response.text) {
        throw new Error("AI 未回傳任何內容");
      }

      return JSON.parse(response.text.trim()) as EstimateResult;
    } catch (e: any) {
      console.error("AI Estimation Error:", e);
      if (e.message?.includes("API key")) {
        throw new Error("API 金鑰無效或未設定");
      }
      throw new Error(`估價分析失敗: ${e.message || "未知錯誤"}`);
    }
  }
};
