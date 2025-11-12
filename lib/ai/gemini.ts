import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  throw new Error("GEMINI_API_KEY is not set");
}

const genAI = new GoogleGenerativeAI(apiKey);

export interface InvoiceExtractionResult {
  extraction: {
    vendor_name: string;
    vendor_tax_id?: string;
    invoice_number: string;
    issue_date: string;
    due_date: string;
    currency: string;
    subtotal: number;
    tax_total: number;
    total: number;
    terms?: string;
    po_number?: string;
    line_items: Array<{
      description: string;
      qty: number;
      unit_price: number;
      tax_percent: number;
      line_total: number;
      suggested_category?: string;
    }>;
    notes?: string;
  };
  confidence: number;
}

export const extractInvoiceFromImage = async (
  imageBase64: string,
  mimeType: string
): Promise<InvoiceExtractionResult> => {
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  const prompt = `You are a precise invoice parser. Extract all information from this invoice image and return it as a JSON object. Be accurate and do not invent values. If a value is not visible, return null for that field.

Return a JSON object with this exact structure:
{
  "vendor_name": "string",
  "vendor_tax_id": "string or null",
  "invoice_number": "string",
  "issue_date": "YYYY-MM-DD",
  "due_date": "YYYY-MM-DD",
  "currency": "ISO currency code (USD, EUR, etc.)",
  "subtotal": number,
  "tax_total": number,
  "total": number,
  "terms": "string or null",
  "po_number": "string or null",
  "line_items": [
    {
      "description": "string",
      "qty": number,
      "unit_price": number,
      "tax_percent": number,
      "line_total": number,
      "suggested_category": "string or null"
    }
  ],
  "notes": "string or null"
}

Extract all line items from the invoice. Calculate confidence as a decimal between 0 and 1 based on how clear and complete the invoice appears.`;

  try {
    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          data: imageBase64,
          mimeType: mimeType,
        },
      },
    ]);

    const response = result.response;
    const text = response.text();

    // Extract JSON from the response (handle markdown code blocks)
    let jsonText = text.trim();
    if (jsonText.startsWith("```json")) {
      jsonText = jsonText.replace(/^```json\n?/, "").replace(/\n?```$/, "");
    } else if (jsonText.startsWith("```")) {
      jsonText = jsonText.replace(/^```\n?/, "").replace(/\n?```$/, "");
    }

    const parsed = JSON.parse(jsonText);

    // Validate and calculate confidence
    const confidence = calculateConfidence(parsed);

    return {
      extraction: {
        vendor_name: parsed.vendor_name || "",
        vendor_tax_id: parsed.vendor_tax_id || undefined,
        invoice_number: parsed.invoice_number || "",
        issue_date: parsed.issue_date || new Date().toISOString().split("T")[0],
        due_date: parsed.due_date || new Date().toISOString().split("T")[0],
        currency: parsed.currency || "USD",
        subtotal: parseFloat(parsed.subtotal) || 0,
        tax_total: parseFloat(parsed.tax_total) || 0,
        total: parseFloat(parsed.total) || 0,
        terms: parsed.terms || undefined,
        po_number: parsed.po_number || undefined,
        line_items: (parsed.line_items || []).map((item: any) => ({
          description: item.description || "",
          qty: parseFloat(item.qty) || 1,
          unit_price: parseFloat(item.unit_price) || 0,
          tax_percent: parseFloat(item.tax_percent) || 0,
          line_total: parseFloat(item.line_total) || 0,
          suggested_category: item.suggested_category || undefined,
        })),
        notes: parsed.notes || undefined,
      },
      confidence,
    };
  } catch (error: any) {
    console.error("Gemini extraction error:", error);
    throw new Error(`Failed to extract invoice: ${error.message}`);
  }
};

const calculateConfidence = (parsed: any): number => {
  let score = 1.0;
  const requiredFields = [
    "vendor_name",
    "invoice_number",
    "total",
    "issue_date",
    "due_date",
  ];

  // Reduce confidence for missing required fields
  for (const field of requiredFields) {
    if (!parsed[field]) {
      score -= 0.15;
    }
  }

  // Reduce confidence if no line items
  if (!parsed.line_items || parsed.line_items.length === 0) {
    score -= 0.2;
  }

  return Math.max(0.3, Math.min(1.0, score));
};
