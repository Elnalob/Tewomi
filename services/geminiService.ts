
import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import { LineItem, SplitPayment } from "../types";
import { storageService } from "./storageService";
import { VAT_RATE } from "../constants";

/**
 * Parses Nigerian k-shorthand (50k → 50000) and comma-formatted numbers.
 * Returns the numeric value, or NaN if it cannot be resolved.
 */
const parseNairaAmount = (raw: string): number => {
  // Remove commas, trim spaces
  const cleaned = raw.replace(/,/g, '').trim();
  // Handle "50k" → 50000
  if (/^\d+(\.\d+)?k$/i.test(cleaned)) {
    return parseFloat(cleaned) * 1000;
  }
  return parseFloat(cleaned);
};

/**
 * Client-side post-processor that scans the original sentence for:
 * 1. VAT keywords  → vatEnabled: true
 * 2. Split payment → splitPayment: { depositAmount, depositPercent, balance }
 *
 * This runs AFTER the Gemini AI parse, so it never affects the AI schema.
 */
const postProcessText = (
  text: string,
  subtotal: number
): { vatEnabled: boolean; splitPayment?: Omit<SplitPayment, 'balance'> } => {
  const lower = text.toLowerCase();

  // --- VAT Detection ---
  // Matches: +vat, with vat, including vat, add vat, including tax, plus tax
  const vatEnabled = /(\+vat|with\s+vat|including\s+(vat|tax)|add\s+vat|plus\s+tax)/.test(lower);

  // --- Split Payment Detection ---
  let splitPayment: Omit<SplitPayment, 'balance'> | undefined;

  // Pattern 1: "deposit 50,000" or "deposit 50k"
  const absoluteMatch = lower.match(/deposit\s+([\d,]+k?)/i);
  if (absoluteMatch) {
    const depositAmount = parseNairaAmount(absoluteMatch[1]);
    if (!isNaN(depositAmount) && depositAmount > 0) {
      splitPayment = { depositAmount };
    }
  }

  // Pattern 2: "50% upfront" or "deposit 30%" or "30% down payment"
  if (!splitPayment) {
    const percentMatch = lower.match(/(\d+)%\s*(upfront|deposit|down\s*payment|advance)/i)
      || lower.match(/(deposit|pay)\s+(\d+)%/i);
    if (percentMatch) {
      // Grab the numeric capture group that contains the percentage
      const pctStr = percentMatch[1] && /^\d+$/.test(percentMatch[1])
        ? percentMatch[1]
        : percentMatch[2];
      const pct = parseFloat(pctStr);
      if (!isNaN(pct) && pct > 0 && pct < 100) {
        splitPayment = {
          depositAmount: Math.round(subtotal * (pct / 100)),
          depositPercent: pct
        };
      }
    }
  }

  return { vatEnabled, splitPayment };
};


export const geminiService = {
  parseWorkDescription: async (text: string): Promise<{
    items: (Partial<LineItem> & { unit?: string })[],
    clientName?: string,
    clientEmail?: string,
    clientPhone?: string,
    clientAddress?: string,
    dueDate?: string,
    totalAmount?: number,
    vatEnabled?: boolean,
    splitPayment?: Omit<SplitPayment, 'balance'>
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
        If a unit is mentioned (like "2 bags", "5 hours"), extract "bags" or "hours" as the unit.
        Do NOT extract VAT, deposit, or split-payment data — that is handled separately.`
    });

    try {
      const result = await model.generateContent(`Parse this billing request: "${text}"`);
      const responseText = result.response.text();
      console.log("Gemini Raw Response:", responseText);

      // Clean the response in case it's wrapped in markdown code blocks
      const cleanJson = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
      const aiResult = JSON.parse(cleanJson);

      // Calculate subtotal from AI items for split-payment percentage calculation
      const subtotal = (aiResult.items || []).reduce(
        (sum: number, item: Partial<LineItem>) => sum + ((item.quantity || 1) * (item.unitPrice || 0)),
        0
      );

      // Apply client-side post-processing for VAT + split payment
      const { vatEnabled, splitPayment } = postProcessText(text, subtotal);

      return { ...aiResult, vatEnabled, splitPayment };
    } catch (e: any) {
      console.error("Failed to parse Tewómi request. Error details:", e);
      return { items: [], _error: e.message || "Unknown error" } as any;
    }
  }
};

