import React, { useState, useEffect, useRef } from "react";
import {
  FileCode,
  Sparkles,
  History,
  Upload,
  RotateCcw,
  Copy,
  Check,
  Send,
  Loader2,
  Code,
  Layers,
  Flame,
  GitBranch,
  X,
  Menu,
  Eye,
  MessageSquare,
  ChevronDown,
} from "lucide-react";
import { PRESET_FILES, PresetFile } from "./presets";
import { ChatMessage, Version } from "./types";
import LivePreview from "./components/LivePreview";
import DiffView from "./components/DiffView";

// ─── AI Provider 設定 ────────────────────────────────────────────────────────
type AIProvider = "gemini" | "meta";

const AI_PROVIDERS: { value: AIProvider; label: string; model: string; badge: string }[] = [
  { value: "gemini", label: "Google Gemini", model: "gemini-3.1-flash-lite", badge: "bg-blue-900/60 text-blue-300 border-blue-800" },
  { value: "meta",   label: "Meta Llama 3.3", model: "llama-3.3-70b-instruct", badge: "bg-indigo-900/60 text-indigo-300 border-indigo-800" },
];

function getApiKeyName(provider: AIProvider): string {
  return provider === "gemini" ? "GEMINI_API_KEY" : "NVIDIA_API_KEY";
}

// 手機底部 Tab 定義
type MobileTab = "editor" | "preview" | "chat" | "history";
const MOBILE_TABS: { id: MobileTab; label: string; icon: React.ReactNode }[] = [
  { id: "editor",  label: "編輯",   icon: <Code className="w-4 h-4" /> },
  { id: "preview", label: "預覽",   icon: <Eye className="w-4 h-4" /> },
  { id: "chat",    label: "AI 對話", icon: <MessageSquare className="w-4 h-4" /> },
  { id: "history", label: "版本",   icon: <History className="w-4 h-4" /> },
];

export default function App() {
  const [currentCode, setCurrentCode] = useState<string>(PRESET_FILES[0].code);
  const [fileName, setFileName] = useState<string>(PRESET_FILES[0].name);
  const [language, setLanguage] = useState<string>(PRESET_FILES[0].language);
  const [dragOver, setDragOver] = useState(false);
  const [copied, setCopied] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [prompt, setPrompt] = useState("");
  const [selectedProvider, setSelectedProvider] = useState<AIProvider>("gemini");
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "model",
      content: `您好！我是您的 AI 前端程式碼助手。您可以：\n1. 挑選內建範本，或拖入您的代碼檔案。\n2. 選擇 AI 服務後輸入調整需求。\n3. 觀察「即時預覽」或進行「Diff 版本比對」。`,
      timestamp: new Date(),
    },
  ]);
  const [isLoading, setIsLoading] = useState(false);

  const [versions, setVersions] = useState<Version[]>([
    {
      id: "v-initial",
      timestamp: new Date(Date.now() - 3600000),
      title: "預載初始範本",
      code: PRESET_FILES[0].code,
      note: '系統自動載入的預設「霓虹極光動態時鐘」',
      language: PRESET_FILES[0].language,
    },
  ]);
  const [selectedVersionId, setSelectedVersionId] = useState<string>("v-initial");
  const [editorTab, setEditorTab] = useState<"edit" | "diff">("edit");
  const [showPresetsMenu, setShowPresetsMenu] = useState(false);
  const [activePresetIndex, setActivePresetIndex] = useState(0);
  const [showSidebar, setShowSidebar] = useState(false);

  // 手機 Tab 狀態
  const [mobileTab, setMobileTab] = useState<MobileTab>("editor");

  const chatBottomRef = useRef<HTMLDivElement>(null);
  const codeEditorRef = useRef<HTMLTextAreaElement>(null);
  const promptRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory]);

  // 自動調整 textarea 高度（手機 AI 輸入）
  useEffect(() => {
    if (promptRef.current) {
      promptRef.current.style.height = "auto";
      promptRef.current.style.height = `${Math.min(promptRef.current.scrollHeight, 120)}px`;
    }
  }, [prompt]);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(currentCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleLoadPreset = (preset: PresetFile, index: number) => {
    setCurrentCode(preset.code);
    setFileName(preset.name);
    setLanguage(preset.language);
    setActivePresetIndex(index);
    const nextVerId = `v-${Date.now()}`;
    setVersions(prev => [{ id: nextVerId, timestamp: new Date(), title: `載入範本：${preset.name}`, code: preset.code, note: `載入系統預置 ${preset.language.toUpperCase()} 範本`, language: preset.language }, ...prev]);
    setSelectedVersionId(nextVerId);
    setShowPresetsMenu(false);
    setShowSidebar(false);
  };

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setDragOver(true); };
  const handleDragLeave = () => setDragOver(false);
  const handleDrop = (e: React.DragEvent) => { e.preventDefault(); setDragOver(false); const file = e.dataTransfer.files[0]; if (file) readFile(file); };
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => { const file = e.target.files?.[0]; if (file) readFile(file); };

  const readFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content !== undefined) {
        const ext = file.name.split(".").pop() || "txt";
        let detectedLang = "html";
        if (["css"].includes(ext)) detectedLang = "css";
        else if (["js", "jsx"].includes(ext)) detectedLang = "javascript";
        else if (["ts", "tsx"].includes(ext)) detectedLang = "typescript";
        else if (["json"].includes(ext)) detectedLang = "json";
        setFileName(file.name);
        setCurrentCode(content);
        setLanguage(detectedLang);
        const newVerId = `v-upload-${Date.now()}`;
        setVersions(prev => [{ id: newVerId, timestamp: new Date(), title: `匯入：${file.name}`, code: content, note: `手動拖入/選取本機檔案。大小: ${Math.round(file.size / 1024)} KB`, language: detectedLang }, ...prev]);
        setSelectedVersionId(newVerId);
      }
    };
    reader.readAsText(file);
  };

  const handleCodeChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newCode = e.target.value;
    setCurrentCode(newCode);
    setVersions(prev => prev.map(v => v.id === selectedVersionId ? { ...v, code: newCode } : v));
  };

  const handleSendMessage = async (e?: React.FormEvent, customPrompt?: string) => {
    if (e) e.preventDefault();
    const finalPrompt = customPrompt || prompt;
    if (!finalPrompt.trim()) return;
    setPrompt("");
    const userMsg: ChatMessage = { id: `usr-${Date.now()}`, role: "user", content: finalPrompt, timestamp: new Date() };
    setChatHistory(prev => [...prev, userMsg]);
    setIsLoading(true);
    // 發送後自動切到 chat tab（手機）
    setMobileTab("chat");
    try {
      const formattedHistory = chatHistory.slice(-6).map(msg => ({ role: msg.role === "user" ? "user" : "model", content: msg.content }));
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: selectedProvider, title: fileName, currentCode, prompt: finalPrompt, history: formattedHistory }),
      });
      if (!res.ok) {
        let errMsg = `伺服器錯誤 (${res.status})`;
        try { const errData = await res.json(); errMsg = errData.error || errMsg; } catch (_) {}
        throw new Error(errMsg);
      }
      const data = await res.json();
      const aiMsg: ChatMessage = { id: `ai-${Date.now()}`, role: "model", content: data.explanation || "修改完成！", timestamp: new Date(), explanation: data.explanation, changedCode: data.changed ? data.modifiedCode : undefined };
      setChatHistory(prev => [...prev, aiMsg]);
      if (data.changed && data.modifiedCode) {
        const nextVerId = `v-ai-${Date.now()}`;
        setVersions(prev => [{ id: nextVerId, timestamp: new Date(), title: `AI：${finalPrompt.slice(0, 16)}${finalPrompt.length > 16 ? "..." : ""}`, code: data.modifiedCode, note: `由 AI 調整：${finalPrompt}`, language: data.language || language }, ...prev]);
        setSelectedVersionId(nextVerId);
        setCurrentCode(data.modifiedCode);
        if (data.language) setLanguage(data.language);
      }
    } catch (err: any) {
      const apiKeyHint = getApiKeyName(selectedProvider);
      setChatHistory(prev => [...prev, { id: `err-${Date.now()}`, role: "system", content: `錯誤：${err.message}。請確認 ${apiKeyHint} 已設定。`, timestamp: new Date() }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRevertToVersion = (version: Version) => {
    setCurrentCode(version.code);
    setLanguage(version.language);
    const nextVerId = `v-revert-${Date.now()}`;
    setVersions(prev => [{ id: nextVerId, timestamp: new Date(), title: `還原：${version.title.replace("還原：", "")}`, code: version.code, note: `手動恢復歷史版本`, language: version.language }, ...prev]);
    setSelectedVersionId(nextVerId);
  };

  const getSelectedVersionCode = (): string => versions.find(v => v.id === selectedVersionId)?.code || "";

  const QUICK_PROMPTS = [
    { label: "✨ 微流光效果", prompt: "為此頁面主要卡片與按鈕添加霓虹微流光邊框效果，色調調整為星空藍紫" },
    { label: "🛠️ 語法檢修", prompt: "詳細檢查並修復潛在的 JavaScript 邏輯漏洞、缺少閉合標籤或排版問題" },
    { label: "📱 RWD 優化", prompt: "優化當前 HTML 排版，讓它在手機版與寬螢幕上都完美顯示，並加上舒適的內邊距" },
    { label: "💬 中文化", prompt: "把程式碼內所有英文註釋與 UI 標籤翻譯成繁體中文，並加上詳盡中文注解" },
  ];

  const currentProviderLabel = AI_PROVIDERS.find(p => p.value === selectedProvider)?.label ?? "AI";

  // ─── 共用元件：AI 對話區 ───────────────────────────────────────────────
  const ChatPanel = () => (
    <div className="flex flex-col h-full">
      {/* 對話標題列 */}
      <div className="flex items-center justify-between gap-2 px-4 py-2.5 border-b border-neutral-800 bg-[#0c0d14] shrink-0">
        <span className="text-[11px] font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 animate-spin" />
          AI 自然語言調整
        </span>
        {/* Provider 選擇 */}
        <select
          value={selectedProvider}
          onChange={(e) => setSelectedProvider(e.target.value as AIProvider)}
          className={`text-[10px] font-bold border rounded-lg px-2 py-1 cursor-pointer outline-none ${AI_PROVIDERS.find(p => p.value === selectedProvider)?.badge || ""} bg-[#121320]`}
        >
          {AI_PROVIDERS.map(p => (
            <option key={p.value} value={p.value} className="bg-[#121320] text-neutral-200">{p.label}</option>
          ))}
        </select>
      </div>

      {/* 訊息列表 */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3 text-xs">
        {chatHistory.map((msg) => {
          const isAi = msg.role === "model";
          const isSys = msg.role === "system";
          return (
            <div key={msg.id} className={`flex gap-2.5 leading-relaxed ${isAi ? "" : "flex-row-reverse"}`}>
              <div className={`w-6 h-6 rounded flex-shrink-0 flex items-center justify-center font-bold text-[9px] ${isAi ? "bg-gradient-to-tr from-indigo-600 to-emerald-500 text-white" : isSys ? "bg-amber-950/60 border border-amber-800 text-amber-400" : "bg-neutral-800 text-neutral-200"}`}>
                {isAi ? "AI" : isSys ? "!" : "我"}
              </div>
              <div className={`flex flex-col max-w-[85%] ${isAi ? "" : "items-end"}`}>
                <div className={`p-2.5 rounded-xl border leading-relaxed break-words whitespace-pre-wrap text-[12px] ${isAi ? "bg-[#151624] border-indigo-900/40 rounded-tl-none text-neutral-200" : isSys ? "bg-amber-950/20 border-amber-900/40 rounded-tl-none text-amber-200" : "bg-indigo-600 text-white border-indigo-500 rounded-tr-none"}`}>
                  {msg.content}
                </div>
                <span className="text-[9px] text-neutral-600 mt-1 font-mono px-1">
                  {new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
            </div>
          );
        })}
        {isLoading && (
          <div className="flex gap-2.5 items-center">
            <div className="w-6 h-6 rounded bg-gradient-to-tr from-indigo-600 to-emerald-500 text-white flex items-center justify-center text-[9px] font-bold">AI</div>
            <div className="p-2.5 bg-[#151624] border border-indigo-900/40 rounded-xl rounded-tl-none text-xs text-neutral-400 flex items-center gap-2">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-400" />
              <span>正在分析並優化中...</span>
            </div>
          </div>
        )}
        <div ref={chatBottomRef} />
      </div>

      {/* 快捷 Prompt */}
      <div className="px-3 pt-2 pb-1 flex gap-2 overflow-x-auto scrollbar-none shrink-0 border-t border-neutral-800/60">
        <span className="text-[9px] text-neutral-500 font-semibold shrink-0 self-center">快捷：</span>
        {QUICK_PROMPTS.map((qp, idx) => (
          <button key={idx} onClick={() => handleSendMessage(undefined, qp.prompt)} disabled={isLoading}
            className="shrink-0 text-[10px] bg-neutral-900 hover:bg-neutral-800 text-indigo-300 border border-neutral-800/80 rounded-full px-2.5 py-1 transition-colors disabled:opacity-50 whitespace-nowrap">
            {qp.label}
          </button>
        ))}
      </div>

      {/* 輸入區（textarea 自動高度，支援換行）*/}
      <div className="px-3 pb-3 pt-1 shrink-0">
        <div className="flex gap-2 bg-neutral-900 border border-neutral-700 rounded-xl px-3 py-2 items-end">
          <textarea
            ref={promptRef}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }}
            placeholder="輸入修改需求（Enter 送出，Shift+Enter 換行）..."
            disabled={isLoading}
            rows={1}
            className="flex-1 bg-transparent text-xs text-neutral-100 placeholder-neutral-500 outline-none resize-none leading-relaxed py-0.5 max-h-[120px]"
          />
          <button
            onClick={() => handleSendMessage()}
            disabled={isLoading || !prompt.trim()}
            className="w-8 h-8 bg-indigo-600 hover:bg-indigo-500 disabled:bg-neutral-800 disabled:text-neutral-600 rounded-lg flex items-center justify-center text-white transition-colors shrink-0 mb-0.5">
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
        <p className="text-[9px] text-neutral-600 mt-1 text-right font-mono">Enter 送出 · Shift+Enter 換行</p>
      </div>
    </div>
  );

  // ─── 共用元件：版本歷史區 ─────────────────────────────────────────────
  const HistoryPanel = () => (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-neutral-800 bg-[#0c0d14] shrink-0">
        <div className="text-[11px] font-bold text-neutral-500 uppercase tracking-widest flex items-center gap-1.5">
          <History className="w-3.5 h-3.5 text-emerald-400" />
          版本控制 (Timeline)
        </div>
        <span className="text-[10px] bg-emerald-950/80 text-emerald-300 border border-emerald-900 px-2 py-0.5 rounded-full font-mono">
          {versions.length} 個
        </span>
      </div>
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2 relative">
        <div className="absolute left-[25px] top-4 bottom-4 w-[1.5px] bg-[#1a1b2d]" />
        {versions.map((ver, idx) => {
          const isSelected = selectedVersionId === ver.id;
          return (
            <div key={ver.id} onClick={() => setSelectedVersionId(ver.id)}
              className={`flex gap-3 items-start relative cursor-pointer group p-2.5 rounded-xl border transition-all ${isSelected ? "bg-slate-900/60 border-slate-700" : "bg-transparent border-transparent hover:bg-neutral-900/40"}`}>
              <div className={`w-6 h-6 rounded-full flex-shrink-0 z-10 flex items-center justify-center text-[10px] font-mono font-bold border transition-colors ${isSelected ? "bg-emerald-500 border-emerald-400 text-black" : "bg-neutral-800 border-neutral-700 text-neutral-400 group-hover:bg-neutral-700 group-hover:text-white"}`}>
                {versions.length - idx}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-xs text-white font-semibold truncate">{ver.title}</span>
                  <span className="text-[9px] text-neutral-600 shrink-0 font-mono">
                    {new Date(ver.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
                <p className="text-[10px] text-neutral-400 mt-0.5 line-clamp-1">{ver.note}</p>
                <div className="flex gap-2 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={(e) => { e.stopPropagation(); handleRevertToVersion(ver); }}
                    className="text-[9px] font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-0.5 bg-indigo-950/40 px-1.5 py-0.5 rounded border border-indigo-900/60">
                    <RotateCcw className="w-2.5 h-2.5" />
                    <span>還原</span>
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); setSelectedVersionId(ver.id); setEditorTab("diff"); setMobileTab("editor"); }}
                    className="text-[9px] font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-0.5 bg-emerald-950/40 px-1.5 py-0.5 rounded border border-emerald-900/60">
                    <Code className="w-2.5 h-2.5" />
                    <span>Diff</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  // ─── 共用元件：程式碼編輯器 ──────────────────────────────────────────
  const EditorPanel = () => (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-2 border-b border-neutral-800 bg-[#0c0d14] shrink-0 gap-2">
        <div className="flex items-center gap-1 bg-[#171825] p-1 rounded-lg">
          <button onClick={() => setEditorTab("edit")}
            className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${editorTab === "edit" ? "bg-indigo-600 text-white font-bold" : "text-neutral-400 hover:text-white"}`}>
            代碼
          </button>
          <button onClick={() => setEditorTab("diff")}
            className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${editorTab === "diff" ? "bg-indigo-600 text-white font-bold" : "text-neutral-400 hover:text-white"}`}>
            Diff
          </button>
        </div>
        <div className="flex items-center gap-1.5">
          <button onClick={handleCopyCode}
            className="flex items-center gap-1 px-2 py-1 bg-[#171825] hover:bg-[#1f2033] border border-neutral-800 rounded-lg text-xs text-neutral-300 transition-all">
            {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-neutral-400" />}
            <span className="hidden sm:inline">{copied ? "已複製" : "複製"}</span>
          </button>
          <span className="text-[10px] bg-indigo-950 text-indigo-300 px-2 py-0.5 rounded-full border border-indigo-800 font-mono">
            {language.toUpperCase()}
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-hidden relative">
        {editorTab === "edit" ? (
          <div className="w-full h-full flex font-mono text-xs bg-[#0b0c12]">
            <div className="w-9 bg-[#07080d] text-neutral-600 select-none text-right pr-3 py-4 flex flex-col gap-1 overflow-hidden border-r border-neutral-800 text-[10px]">
              {Array.from({ length: Math.max(1, currentCode.split("\n").length) }).map((_, i) => (
                <span key={i}>{i + 1}</span>
              ))}
            </div>
            <textarea
              ref={codeEditorRef}
              value={currentCode}
              onChange={handleCodeChange}
              className="flex-1 h-full p-4 bg-transparent text-neutral-200 placeholder-neutral-600 resize-none outline-none overflow-auto font-mono text-xs leading-relaxed"
              placeholder="// 請在此處輸入或拖放您的程式碼..."
              spellCheck={false}
            />
          </div>
        ) : (
          <DiffView oldCode={getSelectedVersionCode()} newCode={currentCode}
            oldTitle={versions.find(v => v.id === selectedVersionId)?.title || "歷史版本"}
            newTitle="當前代碼" />
        )}
      </div>

      <div className="px-3 py-1.5 bg-[#0c0d14] border-t border-neutral-800 flex items-center justify-between text-[10px] text-neutral-500 font-mono shrink-0">
        <span>{currentCode.split("\n").length} 行 · {currentCode.length} 字元</span>
        <span className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          即時渲染
        </span>
      </div>
    </div>
  );

  // ─── 側欄抽屜（手機用） ───────────────────────────────────────────────
  const Sidebar = () => (
    <>
      {/* 遮罩 */}
      {showSidebar && (
        <div className="fixed inset-0 bg-black/60 z-40 lg:hidden" onClick={() => setShowSidebar(false)} />
      )}
      {/* 側欄主體 */}
      <aside className={`fixed top-0 left-0 h-full w-72 bg-[#0d0e1a] border-r border-neutral-800 z-50 flex flex-col transform transition-transform duration-300 lg:hidden ${showSidebar ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-800">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-gradient-to-tr from-[#6366f1] to-[#10b981] rounded-lg flex items-center justify-center">
              <Sparkles className="text-white w-4 h-4" />
            </div>
            <span className="text-sm font-bold text-neutral-100">工作台</span>
          </div>
          <button onClick={() => setShowSidebar(false)} className="text-neutral-500 hover:text-neutral-200 p-1">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 檔案名稱 */}
        <div className="px-4 py-3 border-b border-neutral-800">
          <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest block mb-1.5">作用中檔案</label>
          <input type="text" value={fileName} onChange={(e) => setFileName(e.target.value)}
            className="w-full text-sm font-semibold text-neutral-200 bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 outline-none focus:border-indigo-500 transition-all" />
        </div>

        {/* 拖曳上傳 */}
        <div className="px-4 py-3 border-b border-neutral-800"
          onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}>
          <button onClick={() => fileInputRef.current?.click()}
            className={`w-full border border-dashed rounded-xl p-4 text-center flex flex-col items-center gap-2 transition-all ${dragOver ? "border-indigo-400 bg-indigo-950/40" : "border-neutral-700 hover:border-neutral-500 bg-neutral-900/40"}`}>
            <Upload className="w-6 h-6 text-neutral-500" />
            <span className="text-xs text-neutral-300 font-semibold">拖曳或點選載入程式檔</span>
            <span className="text-[10px] text-neutral-600">.html .css .js .ts .tsx</span>
          </button>
          <input ref={fileInputRef} type="file" onChange={handleFileSelect} accept=".html,.css,.js,.jsx,.ts,.tsx,.json,.txt" className="hidden" />
        </div>

        {/* 語法類型選擇 */}
        <div className="px-4 py-3 border-b border-neutral-800">
          <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest block mb-2">預覽語法類型</label>
          <div className="grid grid-cols-2 gap-2">
            {[{ name: "HTML", value: "html" }, { name: "CSS", value: "css" }, { name: "JavaScript", value: "javascript" }, { name: "React TSX", value: "tsx" }].map(lang => (
              <button key={lang.value} onClick={() => setLanguage(lang.value)}
                className={`py-2 px-2 rounded-lg text-xs font-mono font-medium transition-all ${language === lang.value ? "bg-indigo-600 text-white font-bold" : "bg-neutral-900 text-neutral-400 hover:bg-neutral-800"}`}>
                {lang.name}
              </button>
            ))}
          </div>
        </div>

        {/* 範本清單 */}
        <div className="px-4 py-3 flex-1 overflow-y-auto">
          <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest block mb-2">程式範本</label>
          <div className="space-y-1">
            {PRESET_FILES.map((preset, idx) => (
              <button key={preset.name} onClick={() => handleLoadPreset(preset, idx)}
                className={`w-full text-left p-3 rounded-xl flex flex-col gap-0.5 transition-colors ${activePresetIndex === idx ? "bg-indigo-950/40 border border-indigo-800/60" : "hover:bg-neutral-800/60 border border-transparent"}`}>
                <span className="text-xs font-semibold text-neutral-200">{preset.name}</span>
                <span className="text-[10px] text-neutral-500 line-clamp-1">{preset.description}</span>
              </button>
            ))}
          </div>
        </div>
      </aside>
    </>
  );

  return (
    <div className="flex flex-col h-screen w-full bg-[#07070a] text-neutral-300 font-sans overflow-hidden select-none">

      {/* ── 手機側欄抽屜 ── */}
      <Sidebar />

      {/* ── Header ── */}
      <header className="flex items-center justify-between gap-2 px-3 md:px-5 py-2.5 bg-[#0f1019] border-b border-neutral-800 shrink-0 z-30">
        <div className="flex items-center gap-3">
          {/* 手機漢堡選單 */}
          <button onClick={() => setShowSidebar(true)} className="lg:hidden p-1.5 rounded-lg hover:bg-neutral-800 text-neutral-400 hover:text-neutral-200 transition-colors">
            <Menu className="w-5 h-5" />
          </button>
          <div className="w-8 h-8 bg-gradient-to-tr from-[#6366f1] to-[#10b981] rounded-lg flex items-center justify-center shadow-md">
            <Sparkles className="text-white w-4 h-4 animate-pulse" />
          </div>
          {/* 桌機顯示檔名 */}
          <div className="hidden md:flex items-center gap-2">
            <input type="text" value={fileName} onChange={(e) => setFileName(e.target.value)}
              className="text-sm font-semibold text-neutral-200 bg-transparent border-b border-transparent hover:border-neutral-700 focus:border-indigo-500 focus:outline-none py-0.5 px-1 truncate w-40 lg:w-52 transition-all" />
            <span className="text-[10px] bg-indigo-950 text-indigo-300 px-2 py-0.5 rounded-full border border-indigo-800">{language.toUpperCase()}</span>
          </div>
          {/* 手機顯示截短的檔名 */}
          <span className="md:hidden text-sm font-semibold text-neutral-200 truncate max-w-[120px]">{fileName}</span>
        </div>

        <div className="flex items-center gap-2">
          {/* 桌機：範本選擇 */}
          <div className="relative hidden md:block">
            <button onClick={() => setShowPresetsMenu(!showPresetsMenu)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#171825] hover:bg-[#1f2033] border border-neutral-800 rounded-lg text-xs font-semibold text-neutral-300 transition-all">
              <Layers className="w-3.5 h-3.5 text-indigo-400" />
              <span>範本</span>
              <ChevronDown className="w-3 h-3 text-neutral-500" />
            </button>
            {showPresetsMenu && (
              <div className="absolute right-0 mt-2 w-72 bg-[#121320] border border-neutral-800 rounded-xl shadow-2xl z-50 p-2 space-y-1">
                <div className="px-3 py-1.5 text-[10px] font-bold text-neutral-500 uppercase tracking-widest border-b border-neutral-800/60">內建高畫質範例</div>
                {PRESET_FILES.map((preset, idx) => (
                  <button key={preset.name} onClick={() => handleLoadPreset(preset, idx)}
                    className={`w-full text-left p-2.5 rounded-lg flex flex-col gap-0.5 transition-colors ${activePresetIndex === idx ? "bg-indigo-950/40 border-l-2 border-indigo-500" : "hover:bg-neutral-800/60"}`}>
                    <span className="text-xs font-semibold text-neutral-200">{preset.name}</span>
                    <span className="text-[10px] text-neutral-500 line-clamp-1">{preset.description}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 複製按鈕（桌機） */}
          <button onClick={handleCopyCode}
            className="hidden md:flex items-center gap-1.5 px-3 py-1.5 bg-[#171825] hover:bg-[#1f2033] border border-neutral-800 rounded-lg text-xs font-semibold text-neutral-300 transition-all">
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-neutral-400" />}
            <span>{copied ? "已複製" : "複製"}</span>
          </button>

          {/* 上傳按鈕 */}
          <button onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 rounded-lg text-xs font-semibold text-neutral-100 transition-all">
            <Upload className="w-3.5 h-3.5 text-sky-400" />
            <span className="hidden sm:inline">讀入檔案</span>
          </button>
        </div>
      </header>

      {/* ── 主體內容區 ── */}
      <div className="flex-1 overflow-hidden min-h-0 flex flex-col">

        {/* ════ 桌機佈局（lg+）：三欄 Bento Grid ════ */}
        <div className="hidden lg:flex flex-1 min-h-0 gap-2 p-2">

          {/* 左側欄：檔案管理 */}
          <aside className="w-[180px] shrink-0 flex flex-col gap-2 min-h-0"
            onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}>
            <div className={`flex-1 bg-[#0f1019] border rounded-2xl p-3 flex flex-col gap-3 transition-all ${dragOver ? "border-indigo-500 bg-indigo-950/20" : "border-neutral-800"}`}>
              <div className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest flex items-center gap-1.5">
                <FileCode className="w-3 h-3 text-sky-400" />
                工作台
              </div>

              {/* 拖曳上傳 */}
              <div onClick={() => fileInputRef.current?.click()}
                className={`border border-dashed rounded-xl p-3 text-center flex flex-col items-center gap-1.5 cursor-pointer transition-all ${dragOver ? "border-indigo-400 bg-indigo-950/40 text-indigo-300" : "border-neutral-800 hover:border-neutral-600 bg-neutral-900/40"}`}>
                <Upload className="w-6 h-6 text-neutral-500" />
                <p className="text-[10px] font-semibold text-neutral-300">拖曳或點選載入</p>
                <p className="text-[9px] text-neutral-600">.html .css .js .ts .tsx</p>
              </div>

              <hr className="border-neutral-800/80" />

              {/* 語法類型 */}
              <div>
                <span className="text-[9px] font-bold text-neutral-500 uppercase tracking-widest block mb-1.5">語法類型</span>
                <div className="grid grid-cols-2 gap-1.5">
                  {[{ name: "HTML", value: "html" }, { name: "CSS", value: "css" }, { name: "JS", value: "javascript" }, { name: "TSX", value: "tsx" }].map(lang => (
                    <button key={lang.value} onClick={() => setLanguage(lang.value)}
                      className={`py-1.5 rounded-lg text-[10px] font-mono font-medium transition-all ${language === lang.value ? "bg-indigo-600 text-white font-bold" : "bg-neutral-900 text-neutral-400 hover:bg-neutral-800"}`}>
                      {lang.name}
                    </button>
                  ))}
                </div>
              </div>

              <hr className="border-neutral-800/80" />

              {/* 範本清單 */}
              <div className="flex-1 overflow-y-auto space-y-1">
                <span className="text-[9px] font-bold text-neutral-500 uppercase tracking-widest block mb-1.5">程式範本</span>
                {PRESET_FILES.map((preset, idx) => (
                  <button key={preset.name} onClick={() => handleLoadPreset(preset, idx)}
                    className={`w-full text-left p-2 rounded-lg flex flex-col gap-0.5 transition-colors ${activePresetIndex === idx ? "bg-indigo-950/40 border-l-2 border-indigo-500 pl-1.5" : "hover:bg-neutral-800/60 border-l-2 border-transparent"}`}>
                    <span className="text-[10px] font-semibold text-neutral-200 truncate">{preset.name}</span>
                    <span className="text-[9px] text-neutral-600 line-clamp-1">{preset.description}</span>
                  </button>
                ))}
              </div>

              {/* AI 引擎資訊 */}
              <div className="p-2.5 bg-[#121322] border border-indigo-950 rounded-xl">
                <div className="flex items-center gap-1 text-[10px] text-indigo-400 font-bold mb-1">
                  <Flame className="w-3 h-3 text-amber-500" />
                  {currentProviderLabel}
                </div>
                <p className="text-[9px] text-neutral-500 leading-relaxed">AI 修改後自動建立 Timeline 節點，可隨時還原。</p>
              </div>
            </div>
          </aside>

          {/* 中欄：編輯器（上）+ AI 對話（下）*/}
          <div className="flex-1 flex flex-col gap-2 min-h-0">
            {/* 編輯器 */}
            <div className="flex-[5] bg-[#0f1019] border border-neutral-800 rounded-2xl overflow-hidden flex flex-col min-h-0">
              <EditorPanel />
            </div>
            {/* AI 對話 */}
            <div className="flex-[4] bg-gradient-to-br from-[#0f1019] to-[#0a0a10] border border-neutral-800 rounded-2xl overflow-hidden flex flex-col min-h-0">
              <ChatPanel />
            </div>
          </div>

          {/* 右欄：預覽（上）+ 版本歷史（下）*/}
          <div className="w-[38%] shrink-0 flex flex-col gap-2 min-h-0">
            <div className="flex-[6] bg-[#0f1019] border border-neutral-800 rounded-2xl overflow-hidden flex flex-col min-h-0">
              <LivePreview code={currentCode} language={language} />
            </div>
            <div className="flex-[4] bg-[#0f1019] border border-neutral-800 rounded-2xl overflow-hidden flex flex-col min-h-0">
              <HistoryPanel />
            </div>
          </div>
        </div>

        {/* ════ 平板佈局（md ~ lg）：2欄 ════ */}
        <div className="hidden md:flex lg:hidden flex-1 min-h-0 gap-2 p-2">
          {/* 左：編輯器 */}
          <div className="flex-1 flex flex-col gap-2 min-h-0">
            <div className="flex-[6] bg-[#0f1019] border border-neutral-800 rounded-2xl overflow-hidden flex flex-col min-h-0">
              <EditorPanel />
            </div>
            <div className="flex-[4] bg-[#0f1019] border border-neutral-800 rounded-2xl overflow-hidden flex flex-col min-h-0">
              <HistoryPanel />
            </div>
          </div>
          {/* 右：預覽 + AI 對話 */}
          <div className="flex-1 flex flex-col gap-2 min-h-0">
            <div className="flex-[5] bg-[#0f1019] border border-neutral-800 rounded-2xl overflow-hidden flex flex-col min-h-0">
              <LivePreview code={currentCode} language={language} />
            </div>
            <div className="flex-[5] bg-gradient-to-br from-[#0f1019] to-[#0a0a10] border border-neutral-800 rounded-2xl overflow-hidden flex flex-col min-h-0">
              <ChatPanel />
            </div>
          </div>
        </div>

        {/* ════ 手機佈局（< md）：單欄，Tab 切換 ════ */}
        <div className="md:hidden flex-1 flex flex-col min-h-0">
          {/* Tab 內容區 */}
          <div className="flex-1 overflow-hidden bg-[#0f1019] border border-neutral-800 m-2 mb-0 rounded-2xl flex flex-col">
            {mobileTab === "editor"  && <EditorPanel />}
            {mobileTab === "preview" && <LivePreview code={currentCode} language={language} />}
            {mobileTab === "chat"    && <ChatPanel />}
            {mobileTab === "history" && <HistoryPanel />}
          </div>

          {/* 底部 Tab 導覽列 */}
          <nav className="shrink-0 flex bg-[#0c0d14] border-t border-neutral-800 m-2 mt-1 rounded-2xl overflow-hidden safe-area-bottom">
            {MOBILE_TABS.map((tab) => (
              <button key={tab.id} onClick={() => setMobileTab(tab.id)}
                className={`flex-1 flex flex-col items-center justify-center gap-1 py-3 px-1 transition-all ${mobileTab === tab.id ? "text-indigo-400 bg-indigo-950/30" : "text-neutral-500 hover:text-neutral-300 hover:bg-neutral-800/30"}`}>
                {tab.icon}
                <span className="text-[9px] font-semibold">{tab.label}</span>
                {mobileTab === tab.id && <span className="absolute -bottom-0 w-6 h-0.5 bg-indigo-500 rounded-full" />}
              </button>
            ))}
          </nav>
        </div>

      </div>

      {/* ── Footer（桌機）── */}
      <footer className="hidden lg:flex items-center gap-6 px-4 py-1.5 text-[10px] bg-[#0c0d14] border-t border-neutral-800/50 font-mono text-neutral-500 shrink-0">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
          <span className="font-semibold text-neutral-400">Branch:</span>
          <span>main*</span>
        </div>
        <div className="flex items-center gap-1">
          <GitBranch className="w-3 h-3" />
          <span>本地快照沙盒</span>
        </div>
        <div className="ml-auto flex items-center gap-4">
          <span>AI：<span className="text-neutral-400">{currentProviderLabel}</span></span>
          <span>React 19</span>
          <span>Vite 6</span>
        </div>
      </footer>

    </div>
  );
}
