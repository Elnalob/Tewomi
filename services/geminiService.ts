
import { GoogleGenAI, Type } from "@google/genai";
import { LineItem } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const geminiService = {
  parseWorkDescription: async (text: string): Promise<{ items: Partial<LineItem>[], clientName?: string, totalAmount?: number }> => {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Parse this billing request: "${text}"`,
      config: {
        systemInstruction: `You are Tèwómí, a smart invoicing assistant for Nigerian freelancers.
        Extract the following:
        1. clientName: The person or company being billed.
        2. items: An array of objects with description, quantity, and unitPrice.
        
        Example: "Bill Kola 50k for Logo Design and 10k for Social Media Post"
        Result: clientName="Kola", items=[{description: "Logo Design", quantity: 1, unitPrice: 50000}, {description: "Social Media Post", quantity: 1, unitPrice: 10000}]
        
        If currency is $ or USD, use that in unitPrice. If Naira or k (as in 50k), use thousands.
        Default quantity to 1 if not specified.`,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            clientName: { type: Type.STRING },
            items: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  description: { type: Type.STRING },
                  quantity: { type: Type.NUMBER },
                  unitPrice: { type: Type.NUMBER }
                },
                required: ["description", "quantity", "unitPrice"]
              }
            }
          },
          required: ["items"]
        }
      }
    });

    try {
      return JSON.parse(response.text || '{}');
    } catch (e) {
      console.error("Failed to parse Tèwómí request", e);
      return { items: [] };
    }
  }
};
