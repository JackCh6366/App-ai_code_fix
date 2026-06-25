import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

// 本地優先讀取 .env.local，fallback 到 .env
dotenv.config({ path: ".env.local" });
dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ limit: "20mb", extended: true }));

// ─── 工具函式 ────────────────────────────────────────────────────────────────

type Provider = "gemini" | "nvidia-code" | "nvidia" | "meta";

const PROVIDER_MODELS: Record<Provider, string> = {
  gemini: "gemini-3.1-flash-lite",
  // NVIDIA Nemotron Ultra 550B: frontier-scale reasoning & agentic code model
  "nvidia-code": "nvidia/nemotron-3-ultra-550b-a55b",
  // Llama-3.3-Nemotron-Super-49B: NAS-optimized, best speed/quality for code & reasoning
  nvidia: "nvidia/llama-3.3-nemotron-super-49b-v1",
  // Meta Llama 3.3 70B: strong general-purpose code & instruction model
  meta: "meta/llama-3.3-70b-instruct",
};

function buildSystemPrompt(title: string, prompt: string) {
  return `你是一位高階軟體工程師與前端介面設計師。
使用者的目標是修改、修復或調整一段程式碼檔案（像是 HTML, CSS, JavaScript, TypeScript, React Component 等）。
請詳細分析使用者當前的程式碼「${title}」與其要求「${prompt}」。

你的任務是：
1. 深入理解使用者的修改需求，不論是調整 UI 介面、增加新功能、重構整理、還是修復 Bug。
2. 進行程式碼調整，並將結果輸出。你必須提供調整後的「完整程式碼」（必須可以直接執行、沒有省略、沒有 placeholders）。
3. 如果使用者只是單純發問、要求解釋、並不需要實際修改代碼，請在 explanation 中提供詳盡解答，並於 modifiedCode 中原封不動地帶回當前的 currentCode，且將 changed 標為 false。
4. 若有修改代碼，changed 必須為 true，且 modifiedCode 為修改後的完整新代碼。

請嚴格以此 JSON 結構回覆（不要任何 markdown 包裹，直接是 JSON 字串）：
{"explanation":"繁體中文說明","modifiedCode":"完整代碼","changed":true,"language":"html"}`;
}

function buildContextPrompt(title: string, currentCode: string, prompt: string) {
  return `[目前正在處理的檔案：${title}]
[當前代碼內容]
\`\`\`
${currentCode}
\`\`\`

[修改或回答需求]
${prompt}`;
}

function parseJSONSafe(text: string) {
  const cleaned = text.trim()
    .replace(/^```(?:json)?\n?/, "")
    .replace(/\n?```$/, "")
    .trim();
  return JSON.parse(cleaned);
}

// ─── /api/analyze：統一多 AI 供應商入口（對應 Vercel api/analyze.ts） ─────────

app.post("/api/analyze", async (req, res) => {
  try {
    const { provider = "gemini", title = "未命名檔案", currentCode = "", prompt, history = [] } = req.body;

    if (!prompt?.trim()) {
      res.status(400).json({ error: "prompt 為必填內容" });
      return;
    }

    const validProviders: Provider[] = ["gemini", "nvidia-code", "nvidia", "meta"];
    if (!validProviders.includes(provider as Provider)) {
      res.status(400).json({ error: `無效的 provider：${provider}` });
      return;
    }

    const systemInstruction = buildSystemPrompt(title, prompt);
    const contextPrompt = buildContextPrompt(title, currentCode, prompt);

    // ── Gemini ──
    if (provider === "gemini") {
      const key = process.env.GEMINI_API_KEY;
      if (!key) throw new Error("找不到 GEMINI_API_KEY，請在 .env.local 中設定！");

      const ai = new GoogleGenAI({ apiKey: key });
      const apiHistory = history.map((h: any) => ({
        role: h.role === "user" ? "user" : "model",
        parts: [{ text: h.content || "" }],
      }));
      const contents = [...apiHistory, { role: "user", parts: [{ text: contextPrompt }] }];

      const response = await ai.models.generateContent({
        model: PROVIDER_MODELS.gemini,
        contents,
        config: {
          systemInstruction,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              explanation: { type: Type.STRING },
              modifiedCode: { type: Type.STRING },
              changed: { type: Type.BOOLEAN },
              language: { type: Type.STRING },
            },
            required: ["explanation", "modifiedCode", "changed", "language"],
          },
        },
      });

      const text = response.text;
      if (!text) throw new Error("Gemini 回應為空");
      res.json(parseJSONSafe(text));
      return;
    }

    // ── NVIDIA NIM / Meta (OpenAI-compatible) ──
    const key = process.env.NVIDIA_API_KEY;
    if (!key) throw new Error("找不到 NVIDIA_API_KEY，請在 .env.local 中設定！");

    const model = PROVIDER_MODELS[provider as Provider];
    const messages = [
      { role: "system", content: systemInstruction },
      ...history.map((h: any) => ({
        role: h.role === "user" ? "user" : "assistant",
        content: h.content,
      })),
      { role: "user", content: contextPrompt },
    ];

    const nimRes = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.6,
        max_tokens: 4096,
        response_format: { type: "json_object" },
      }),
    });

    if (!nimRes.ok) {
      const errText = await nimRes.text();
      throw new Error(`${provider} API 錯誤 (${nimRes.status}): ${errText}`);
    }

    const nimData: any = await nimRes.json();
    const nimText: string = nimData?.choices?.[0]?.message?.content;
    if (!nimText) throw new Error(`${provider} 回應為空`);
    res.json(parseJSONSafe(nimText));

  } catch (error: any) {
    console.error("[/api/analyze] error:", error);
    res.status(500).json({ error: error.message || "伺服器內部發生錯誤" });
  }
});

// ─── /api/gemini/modify：保留舊路由相容性 ────────────────────────────────────

app.post("/api/gemini/modify", async (req, res) => {
  try {
    const { title = "未命名檔案", currentCode = "", prompt, history = [] } = req.body;
    if (!prompt) {
      res.status(400).json({ error: "修改提示詞為必填內容" });
      return;
    }

    const key = process.env.GEMINI_API_KEY;
    if (!key) throw new Error("找不到 GEMINI_API_KEY，請在 .env.local 中設定！");

    const ai = new GoogleGenAI({ apiKey: key });
    const systemInstruction = buildSystemPrompt(title, prompt);
    const contextPrompt = buildContextPrompt(title, currentCode, prompt);
    const apiHistory = history.map((h: any) => ({
      role: h.role === "user" ? "user" : "model",
      parts: [{ text: h.content || "" }],
    }));
    const contents = [...apiHistory, { role: "user", parts: [{ text: contextPrompt }] }];

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            explanation: { type: Type.STRING },
            modifiedCode: { type: Type.STRING },
            changed: { type: Type.BOOLEAN },
            language: { type: Type.STRING },
          },
          required: ["explanation", "modifiedCode", "changed", "language"],
        },
      },
    });

    const resultText = response.text;
    if (!resultText) throw new Error("Gemini 回應為空");
    res.json(parseJSONSafe(resultText));
  } catch (error: any) {
    console.error("Gemini modify error:", error);
    res.status(500).json({ error: error.message || "伺服器內部發生錯誤" });
  }
});

// ─── Vite Dev Middleware / Static Build ───────────────────────────────────────

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Server] Express 伺服器已啟動於連接埠 ${PORT}`);
    console.log(`[Server] 本地開發: http://localhost:${PORT}`);
  });
}

startServer();
