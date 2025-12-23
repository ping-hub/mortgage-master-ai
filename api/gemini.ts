// api/gemini.ts
import { GoogleGenerativeAI } from "@google/generative-ai";

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "只支持 POST 请求" });
  }

  const { prompt } = req.body;

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "服务器未配置 API Key" });
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    // 使用最新的稳定模型，gemini-1.5-flash 速度快、便宜
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

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
      Return ONLY valid JSON, no extra text.
    `;

    const result = await model.generateContent(`${systemPrompt}\n\nUser Input: ${prompt}`);
    const text = result.response.text();

    // 安全提取 JSON
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("未检测到有效 JSON");
    }

    const data = JSON.parse(jsonMatch[0]);
    res.status(200).json({ data });
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    res.status(500).json({ error: "AI 解析失败: " + error.message });
  }
}

export const config = {
  api: {
    bodyParser: true,
  },
};