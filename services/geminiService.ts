
import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import { LineItem } from "../types";


export const geminiService = {
  parseWorkDescription: async (text: string): Promise<{ items: Partial<LineItem>[], clientName?: string, totalAmount?: number }> => {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (!apiKey) {
      console.error("Gemini API Key is missing");
      return { items: [] };
    }
    console.log("Gemini API Key loaded:", apiKey.substring(0, 10) + "...");


    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: {
          type: SchemaType.OBJECT,
          properties: {
            clientName: { type: SchemaType.STRING },
            items: {
              type: SchemaType.ARRAY,
              items: {
                type: SchemaType.OBJECT,
                properties: {
                  description: { type: SchemaType.STRING },
                  quantity: { type: SchemaType.NUMBER },
                  unitPrice: { type: SchemaType.NUMBER }
                },
                required: ["description", "quantity", "unitPrice"]
              }
            }
          },
          required: ["items"]
        }
      },
      systemInstruction: `You are Tewómi, a smart invoicing assistant for Nigerian freelancers.
        Extract the following:
        1. clientName: The person or company being billed.
        2. items: An array of objects with description, quantity, and unitPrice.
        
        Example: "Bill Kola 50k for Logo Design and 10k for Social Media Post"
        Result: clientName="Kola", items=[{description: "Logo Design", quantity: 1, unitPrice: 50000}, {description: "Social Media Post", quantity: 1, unitPrice: 10000}]
        
        If currency is $ or USD, use that in unitPrice. If Naira or k (as in 50k), use thousands.
        Default quantity to 1 if not specified.`
    });

    try {
      const result = await model.generateContent(`Parse this billing request: "${text}"`);
      return JSON.parse(result.response.text());
    } catch (e: any) {
      console.error("Failed to parse Tewómi request. Error details:", e);
      if (e.message) console.error("Error message:", e.message);
      return { items: [] };
    }
  }
};
