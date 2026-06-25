import { GoogleGenAI, Type } from "@google/genai";

export const config = {
  maxDuration: 60, // Extend timeout if needed (Vercel Hobby has max 10s default, Pro up to 300s)
};

export default async function handler(req: any, res: any) {
  // Only allow POST requests
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  try {
    const { title, currentCode, prompt, history = [] } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: "修改提示詞為必填內容" });
    }

    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      return res.status(500).json({
        error: "找不到 GEMINI_API_KEY 環境變數。請在 Vercel 專案設定的 Environment Variables 中設定此金鑰！",
      });
    }

    const ai = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });

    // Prepare system instructions for AI
    const systemInstruction = `你是一位高階軟體工程師與前端介面設計師。
使用者的目標是修改、修復或調整一段程式碼檔案（像是 HTML, CSS, JavaScript, TypeScript, React Component 等）。
請詳細分析使用者當前的程式碼「${title || '未命名檔案'}」與其要求「${prompt}」。

你的任務是：
1. 深入理解使用者的修改需求，不論是調整 UI 介面、增加新功能、重構整理、還是修復 Bug。
2. 進行程式碼調整，並將結果輸出。你必須提供調整後的「完整程式碼」（必須可以直接執行、沒有省略、沒有 placeholders）。
3. 如果使用者只是單純發問、要求解釋、並不需要實際修改代碼，請在 explanation 中提供詳盡解答，並於 modifiedCode 中原封不動地帶回當前的 currentCode，且將 changed 標為 false。
4. 若有修改代碼，changed 必須為 true，且 modifiedCode 為修改後的完整新代碼。

請嚴格以此 JSON 結構回覆：
- explanation: 詳盡的字面修改說明或說明解答，使用繁體中文。請條理清晰。
- modifiedCode: 修改、更新、美化後的「完整代碼內容」。不要有 markdown 區塊包裹在 modifiedCode string 內，就是純代碼字串。
- changed: 布林值 (true / false)，表示程式碼是否有被實質修改或更新。
- language: 預測、識別此程式碼的最適合副檔名/語言形態（例如：'html', 'css', 'javascript', 'typescript', 'tsx', 'json', 'markdown'）。`;

    // Construct conversation messages payload
    const contextPrompt = `
[目前正在處理的檔案檔案：${title || '未命名檔案'}]
[當前代碼內容]
\`\`\`
${currentCode || ""}
\`\`\`

[修改或回答需求]
${prompt}
`;

    // Reconstruct history structure if any
    const apiHistory = history.map((h: any) => ({
      role: h.role === "user" ? "user" : "model",
      parts: [{ text: h.content || "" }]
    }));

    const contents = [...apiHistory, { role: "user", parts: [{ text: contextPrompt }] }];

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: contents,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            explanation: {
              type: Type.STRING,
              description: "對代碼修改內容的繁體中文解釋或問答回應",
            },
            modifiedCode: {
              type: Type.STRING,
              description: "調整、修改或生成的「完整且無缺漏的程式碼」內容",
            },
            changed: {
              type: Type.BOOLEAN,
              description: "內容是否與輸入相比有發生改動與最佳化",
            },
            language: {
              type: Type.STRING,
              description: "程式碼的語法類型，例如 html, css, tsx, javascript, python, etc",
            },
          },
          required: ["explanation", "modifiedCode", "changed", "language"],
        },
      },
    });

    const resultText = response.text;
    if (!resultText) {
      throw new Error("Gemini 回應為空");
    }

    const parsedResult = JSON.parse(resultText.trim());
    return res.status(200).json(parsedResult);
  } catch (error: any) {
    console.error("Gemini modify error:", error);
    return res.status(500).json({ error: error.message || "伺服器內部發生錯誤" });
  }
}
