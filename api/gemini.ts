import { GoogleGenerativeAI } from "@google/generative-ai";

export default async function handler(req: any, res: any) {
  // CORS support
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { prompt } = req.body;
    
    if (!prompt) {
      return res.status(400).json({ error: "Prompt is required" });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error("Server API Key missing");
      return res.status(500).json({ error: "Server configuration error" });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });

    const systemPrompt = `
      You are a mortgage data extractor. Extract loan details from the user's natural language input into a JSON object.
      Match this interface exactly:
      {
        "type": "commercial" | "provident" | "combo",
        "commercialAmount": number,  // 单位：万
        "commercialRate": number,   // 百分比，如 3.5
        "commercialYears": number,
        "providentAmount": number,   // 单位：万
        "providentRate": number,    // 百分比，如 2.6
        "providentYears": number
      }
      Rules:
      - Amount in "100万" → 100
      - Default commercial rate: 3.5%, provident rate: 2.6%
      - Default years: 30
      - If mentions provident fund → prefer 'provident' or 'combo'
      - Only return the values that are mentioned or implied.
      - Return ONLY valid JSON, no extra text.
    `;

    const result = await model.generateContent(`${systemPrompt}\n\nUser Input: ${prompt}`);
    const text = result.response.text();

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("No valid JSON found in response");
    }

    const data = JSON.parse(jsonMatch[0]);
    res.status(200).json({ data });
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    res.status(500).json({ error: "AI processing failed: " + (error.message || "Unknown error") });
  }
}
