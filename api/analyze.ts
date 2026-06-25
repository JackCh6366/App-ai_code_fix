import { GoogleGenAI, Type } from "@google/genai";

export const config = {
  maxDuration: 60,
};

// ─── Types ────────────────────────────────────────────────────────────────────

type Provider = "gemini" | "nvidia-code" | "nvidia" | "meta";

interface RequestBody {
  provider: Provider;
  title?: string;
  currentCode?: string;
  prompt: string;
  history?: { role: string; content: string }[];
}

interface AIResult {
  explanation: string;
  modifiedCode: string;
  changed: boolean;
  language: string;
}

// ─── Provider configs ─────────────────────────────────────────────────────────

const PROVIDER_CONFIG: Record<Provider, { model: string; baseUrl?: string; noResponseFormat?: boolean }> = {
  gemini: {
    model: "gemini-3.1-flash-lite",
  },
  "nvidia-code": {
    // Google Gemma 3 27B Instruct via NVIDIA NIM
    // Does NOT support response_format:json_object — relies on system prompt JSON enforcement
    model: "google/gemma-3-27b-it",
    baseUrl: "https://integrate.api.nvidia.com/v1",
    noResponseFormat: true,
  },
  nvidia: {
    // Llama-3.3-Nemotron-Super-49B: NAS-optimized, best speed/quality for code & reasoning
    model: "nvidia/llama-3.3-nemotron-super-49b-v1",
    baseUrl: "https://integrate.api.nvidia.com/v1",
  },
  meta: {
    // Meta Llama 3.3 70B Instruct: strong general-purpose code & instruction model
    model: "meta/llama-3.3-70b-instruct",
    baseUrl: "https://integrate.api.nvidia.com/v1",
  },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildSystemPrompt(title: string, prompt: string): string {
  return `你是一位高階軟體工程師與前端介面設計師。
使用者的目標是修改、修復或調整一段程式碼檔案（像是 HTML, CSS, JavaScript, TypeScript, React Component 等）。
請詳細分析使用者當前的程式碼「${title}」與其要求「${prompt}」。

你的任務是：
1. 深入理解使用者的修改需求，不論是調整 UI 介面、增加新功能、重構整理、還是修復 Bug。
2. 進行程式碼調整，並將結果輸出。你必須提供調整後的「完整程式碼」（必須可以直接執行、沒有省略、沒有 placeholders）。
3. 如果使用者只是單純發問、要求解釋、並不需要實際修改代碼，請在 explanation 中提供詳盡解答，並於 modifiedCode 中原封不動地帶回當前的 currentCode，且將 changed 標為 false。
4. 若有修改代碼，changed 必須為 true，且 modifiedCode 為修改後的完整新代碼。

【重要輸出規則】你的回覆必須是且僅是一個合法的 JSON 物件，絕對不可以：
- 在 JSON 前後加任何文字說明
- 使用 \`\`\`json 或任何 markdown 包裹
- 輸出多個 JSON 或陣列

請嚴格遵守以下格式（直接輸出 JSON，不含任何其他字符）：
{"explanation":"詳盡的繁體中文說明","modifiedCode":"完整程式碼純文字","changed":true,"language":"html"}

欄位說明：
- explanation: string，繁體中文說明
- modifiedCode: string，完整程式碼（未修改時原樣回傳）
- changed: boolean，true = 有修改代碼，false = 未修改
- language: string，如 html / css / javascript / typescript / tsx / json`;
}

function buildContextPrompt(title: string, currentCode: string, prompt: string): string {
  return `[目前正在處理的檔案：${title}]
[當前代碼內容]
\`\`\`
${currentCode}
\`\`\`

[修改或回答需求]
${prompt}`;
}

function parseJSONSafe(text: string): AIResult {
  // Strip potential markdown fences
  const cleaned = text
    .trim()
    .replace(/^```(?:json)?\n?/, "")
    .replace(/\n?```$/, "")
    .trim();
  return JSON.parse(cleaned);
}

// ─── Gemini handler ───────────────────────────────────────────────────────────

async function callGemini(body: RequestBody): Promise<AIResult> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("缺少 GEMINI_API_KEY 環境變數");

  const ai = new GoogleGenAI({ apiKey: key });

  const { title = "未命名檔案", currentCode = "", prompt, history = [] } = body;

  const systemInstruction = buildSystemPrompt(title, prompt);
  const contextPrompt = buildContextPrompt(title, currentCode, prompt);

  const apiHistory = history.map((h) => ({
    role: h.role === "user" ? "user" : "model",
    parts: [{ text: h.content || "" }],
  }));
  const contents = [...apiHistory, { role: "user", parts: [{ text: contextPrompt }] }];

  const response = await ai.models.generateContent({
    model: PROVIDER_CONFIG.gemini.model,
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
  return parseJSONSafe(text);
}

// ─── OpenAI-compatible handler (NVIDIA / Meta via NVIDIA NIM) ─────────────────

async function callOpenAICompat(body: RequestBody, provider: Exclude<Provider, "gemini">): Promise<AIResult> {
  const key = process.env.NVIDIA_API_KEY;
  if (!key) throw new Error("缺少 NVIDIA_API_KEY 環境變數");

  const cfg = PROVIDER_CONFIG[provider];
  const { title = "未命名檔案", currentCode = "", prompt, history = [] } = body;

  const systemPrompt = buildSystemPrompt(title, prompt);
  const contextPrompt = buildContextPrompt(title, currentCode, prompt);

  // Build messages array
  const messages: { role: string; content: string }[] = [
    { role: "system", content: systemPrompt },
    ...history.map((h) => ({ role: h.role === "user" ? "user" : "assistant", content: h.content })),
    { role: "user", content: contextPrompt },
  ];

  // Build request body
  // Gemma on NIM does not support response_format:json_object — skip it and rely on system prompt
  const requestBody: Record<string, unknown> = {
    model: cfg.model,
    messages,
    temperature: 0.6,
    max_tokens: 4096,
    ...(cfg.noResponseFormat ? {} : { response_format: { type: "json_object" } }),
  };

  const response = await fetch(`${cfg.baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`${provider} API 錯誤 (${response.status}): ${errText}`);
  }

  const data: any = await response.json();
  const text: string = data?.choices?.[0]?.message?.content;
  if (!text) throw new Error(`${provider} 回應為空`);

  return parseJSONSafe(text);
}

// ─── Main handler ─────────────────────────────────────────────────────────────

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  const body: RequestBody = req.body;
  const { provider, prompt } = body;

  if (!prompt?.trim()) {
    return res.status(400).json({ error: "prompt 為必填內容" });
  }

  const validProviders: Provider[] = ["gemini", "nvidia-code", "nvidia", "meta"];
  if (!validProviders.includes(provider)) {
    return res.status(400).json({ error: `無效的 provider：${provider}` });
  }

  try {
    let result: AIResult;

    if (provider === "gemini") {
      result = await callGemini(body);
    } else {
      result = await callOpenAICompat(body, provider);
    }

    return res.status(200).json(result);
  } catch (error: any) {
    console.error(`[analyze][${provider}] error:`, error);
    return res.status(500).json({ error: error.message || "伺服器內部發生錯誤" });
  }
}
