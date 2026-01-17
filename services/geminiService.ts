
import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import { LineItem } from "../types";
import { storageService } from "./storageService";


export const geminiService = {
  parseWorkDescription: async (text: string): Promise<{
    items: (Partial<LineItem> & { unit?: string })[],
    clientName?: string,
    clientEmail?: string,
    clientPhone?: string,
    clientAddress?: string,
    dueDate?: string,
    totalAmount?: number
  }> => {
    // Try user-defined key first
    const user = storageService.getUser();
    const userApiKey = user?.businessProfile?.geminiApiKey;

    // Fallback to naming conventions defined in vite.config.ts
    const envApiKey = (import.meta as any).env.GEMINI_API_KEY || (import.meta as any).env.API_KEY || (import.meta as any).env.VITE_GEMINI_API_KEY;

    const apiKey = userApiKey || envApiKey;

    if (!apiKey) {
      console.error("Gemini API Key is missing. Check your Settings or environment variables.");
      return { items: [], _error: "Missing API Key. Please add one in Settings." } as any;
    }
    console.log("Gemini API Key found, starting parse...");


    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: {
          type: SchemaType.OBJECT,
          properties: {
            clientName: { type: SchemaType.STRING },
            clientEmail: { type: SchemaType.STRING },
            clientPhone: { type: SchemaType.STRING },
            clientAddress: { type: SchemaType.STRING },
            dueDate: { type: SchemaType.STRING },
            items: {
              type: SchemaType.ARRAY,
              items: {
                type: SchemaType.OBJECT,
                properties: {
                  description: { type: SchemaType.STRING },
                  quantity: { type: SchemaType.NUMBER },
                  unit: { type: SchemaType.STRING },
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
        Extract detailed information from ANY sentence. Don't be strict about format.
        Extract the following:
        1. clientName: The person or company being billed.
        2. clientEmail: The client's email address if mentioned.
        3. clientPhone: The client's phone number if mentioned.
        4. clientAddress: The client's physical address if mentioned.
        5. dueDate: The date the payment is due. Return as YYYY-MM-DD if possible, or a descriptive string if not.
        6. items: An array of objects with description, quantity, unit (e.g., "bags", "hours", "units"), and unitPrice.
        
        Examples:
        - "Bill Kola 50k for Logo Design. Pay by next Friday" -> clientName="Kola", dueDate="[Date of next Friday]", ...
        - "Ajani owes 20k for consultation and 5k for lunch. Due Jan 20" -> clientName="Ajani", dueDate="2026-01-20", items=[{description: "consultation", ...}, {description: "lunch", ...}]
        - "Send invoice to bola@test.com for 5 bags of rice at 45k each. Address is 10 Gbagada. Pay me by Monday." -> clientEmail="bola@test.com", clientAddress="10 Gbagada", dueDate="[Date of Monday]", items=[{description: "rice", quantity: 5, unit: "bags", unitPrice: 45000}]
        
        Today's date is ${new Date().toISOString().split('T')[0]}. Use this to resolve relative dates like "next Monday".
        If currency is $ or USD, use that in unitPrice. If Naira or k (as in 50k), use thousands.
        Default quantity to 1 if not specified.
        If a unit is mentioned (like "2 bags", "5 hours"), extract "bags" or "hours" as the unit.`
    });

    try {
      const result = await model.generateContent(`Parse this billing request: "${text}"`);
      const responseText = result.response.text();
      console.log("Gemini Raw Response:", responseText);

      // Clean the response in case it's wrapped in markdown code blocks
      const cleanJson = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
      return JSON.parse(cleanJson);
    } catch (e: any) {
      console.error("Failed to parse Tewómi request. Error details:", e);
      return { items: [], _error: e.message || "Unknown error" } as any;
    }
  }
};
