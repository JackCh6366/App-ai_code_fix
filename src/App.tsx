import React, { useState, useEffect, useRef } from "react";
import {
  FileCode,
  Sparkles,
  History,
  Play,
  Share2,
  Upload,
  RotateCcw,
  Maximize2,
  FileText,
  Copy,
  Check,
  Send,
  Loader2,
  HelpCircle,
  Code,
  Layers,
  Flame,
  ChevronRight,
  RefreshCw,
  Terminal,
  Download,
  GitBranch,
  Laptop
} from "lucide-react";
import { PRESET_FILES, PresetFile } from "./presets";
import { ChatMessage, Version } from "./types";
import LivePreview from "./components/LivePreview";
import DiffView from "./components/DiffView";

// ─── AI Provider 設定 ────────────────────────────────────────────────────────
type AIProvider = "gemini" | "nvidia-code" | "nvidia" | "meta";

const AI_PROVIDERS: { value: AIProvider; label: string; model: string; color: string; badge: string }[] = [
  { value: "gemini",      label: "Google Gemini",      model: "gemini-3.1-flash-lite",           color: "#4285F4", badge: "bg-blue-900/60 text-blue-300 border-blue-800" },
  { value: "nvidia-code", label: "Google Gemma 3 27B",    model: "gemma-3-27b-it",              color: "#4285F4", badge: "bg-sky-900/60 text-sky-300 border-sky-800" },
  { value: "nvidia",      label: "Nemotron Super 49B",  model: "llama-3.3-nemotron-super-49b",   color: "#84cc16", badge: "bg-lime-900/60 text-lime-300 border-lime-800" },
  { value: "meta",        label: "Meta Llama 3.3",     model: "llama-3.3-70b-instruct",         color: "#0668E1", badge: "bg-indigo-900/60 text-indigo-300 border-indigo-800" },
];

// ─── 根據 provider 取得對應的 API Key 名稱 ───────────────────────────────────
function getApiKeyName(provider: AIProvider): string {
  return provider === "gemini" ? "GEMINI_API_KEY" : "NVIDIA_API_KEY";
}

export default function App() {
  // 核心代碼狀態
  const [currentCode, setCurrentCode] = useState<string>(PRESET_FILES[0].code);
  const [fileName, setFileName] = useState<string>(PRESET_FILES[0].name);
  const [language, setLanguage] = useState<string>(PRESET_FILES[0].language);

  // 搜尋與匯入狀態
  const [dragOver, setDragOver] = useState(false);
  const [copied, setCopied] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // AI 溝通狀態
  const [prompt, setPrompt] = useState("");
  const [selectedProvider, setSelectedProvider] = useState<AIProvider>("gemini");
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "model",
      content: `您好！我是您的 AI 前端程式碼助手。您可以：
1. 在左側挑選內建的精美程式範本，或**拖入您的代碼檔案**。
2. 在下方選擇 AI 服務（Gemini / NVIDIA / Meta），再輸入調整需求。
3. 觀察右方的**「即時預覽」**或進行**「Diff 版本比對」**。`,
      timestamp: new Date()
    }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  
  // 版本控制核心歷史狀態
  const [versions, setVersions] = useState<Version[]>([
    {
      id: "v-initial",
      timestamp: new Date(Date.now() - 3600000), // 1小時前
      title: "預載初始範本",
      code: PRESET_FILES[0].code,
      note: "系統自動載入的預設「霓虹極光動態時鐘」",
      language: PRESET_FILES[0].language
    }
  ]);
  const [selectedVersionId, setSelectedVersionId] = useState<string>("v-initial");
  
  // 檢視模式控制
  const [editorTab, setEditorTab] = useState<"edit" | "diff">("edit");
  const [showPresetsMenu, setShowPresetsMenu] = useState(false);
  const [activePresetIndex, setActivePresetIndex] = useState(0);

  // 滾動與專注元件輔助
  const chatBottomRef = useRef<HTMLDivElement>(null);
  const codeEditorRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory]);

  // 工具：自動複製
  const handleCopyCode = () => {
    navigator.clipboard.writeText(currentCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // 載入預設載入範本
  const handleLoadPreset = (preset: PresetFile, index: number) => {
    setCurrentCode(preset.code);
    setFileName(preset.name);
    setLanguage(preset.language);
    setActivePresetIndex(index);

    // 新增一條版本歷史
    const nextVerId = `v-${Date.now()}`;
    const newVer: Version = {
      id: nextVerId,
      timestamp: new Date(),
      title: `載入範本：${preset.name}`,
      code: preset.code,
      note: `載入系統預置 ${preset.language.toUpperCase()} 範本`,
      language: preset.language
    };
    setVersions(prev => [newVer, ...prev]);
    setSelectedVersionId(nextVerId);
  };

  // 檔案拖曳與讀取處理
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    
    const file = e.dataTransfer.files[0];
    if (file) {
      readFile(file);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      readFile(file);
    }
  };

  const readFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content !== undefined) {
        const ext = file.name.split(".").pop() || "txt";
        
        let detectedLang = "html";
        if (["css"].includes(ext)) {
          detectedLang = "css";
        } else if (["js", "jsx"].includes(ext)) {
          detectedLang = "javascript";
        } else if (["ts", "tsx"].includes(ext)) {
          detectedLang = "typescript";
        } else if (["json"].includes(ext)) {
          detectedLang = "json";
        }

        setFileName(file.name);
        setCurrentCode(content);
        setLanguage(detectedLang);

        const newVerId = `v-upload-${Date.now()}`;
        const newVer: Version = {
          id: newVerId,
          timestamp: new Date(),
          title: `匯入：${file.name}`,
          code: content,
          note: `手動拖入/選取本機檔案。大小: ${Math.round(file.size / 1024)} KB`,
          language: detectedLang
        };
        setVersions(prev => [newVer, ...prev]);
        setSelectedVersionId(newVerId);
      }
    };
    reader.readAsText(file);
  };

  // 手動變更程式碼內容 (使用者可在文字框中做出微調，自動保留給目前版本)
  const handleCodeChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newCode = e.target.value;
    setCurrentCode(newCode);

    // 靜態更新選取當前最新版本為這個內容（如果不希望過度頻繁產生新 Commit，可以直接修改當前綁定版本）
    setVersions(prev => prev.map(v => v.id === selectedVersionId ? { ...v, code: newCode } : v));
  };

  // 發送給 AI 修改程式碼
  const handleSendMessage = async (e?: React.FormEvent, customPrompt?: string) => {
    if (e) e.preventDefault();
    
    const finalPrompt = customPrompt || prompt;
    if (!finalPrompt.trim()) return;

    if (customPrompt) {
      setPrompt(""); // 清除快速指令
    } else {
      setPrompt("");
    }

    // 1. 建立 User 訊息
    const userMsg: ChatMessage = {
      id: `usr-${Date.now()}`,
      role: "user",
      content: finalPrompt,
      timestamp: new Date()
    };

    setChatHistory(prev => [...prev, userMsg]);
    setIsLoading(true);

    try {
      // 構建傳送至 server 的對話紀錄(僅保留幾輪，防止 tokens 過大)
      const formattedHistory = chatHistory
        .slice(-6)
        .map(msg => ({
          role: msg.role === "user" ? "user" : "model",
          content: msg.content
        }));

      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: selectedProvider,
          title: fileName,
          currentCode: currentCode,
          prompt: finalPrompt,
          history: formattedHistory
        })
      });

      if (!res.ok) {
        let errMsg = `伺服器錯誤 (${res.status})`;
        try {
          const errData = await res.json();
          errMsg = errData.error || errMsg;
        } catch (_) {}
        throw new Error(errMsg);
      }

      const data = await res.json();
      
      const aiReplyId = `ai-${Date.now()}`;
      const aiMsg: ChatMessage = {
        id: aiReplyId,
        role: "model",
        content: data.explanation || "修改完成，請參考右側即時效果！",
        timestamp: new Date(),
        explanation: data.explanation,
        changedCode: data.changed ? data.modifiedCode : undefined
      };

      setChatHistory(prev => [...prev, aiMsg]);

      // 如果代碼發生實質改動，保存並新增一筆版本歷史
      if (data.changed && data.modifiedCode) {
        const nextVerId = `v-ai-${Date.now()}`;
        const newVer: Version = {
          id: nextVerId,
          timestamp: new Date(),
          title: `AI：${finalPrompt.slice(0, 16)}${finalPrompt.length > 16 ? "..." : ""}`,
          code: data.modifiedCode,
          note: `由 AI 調整：${finalPrompt}`,
          language: data.language || language
        };

        setVersions(prev => [newVer, ...prev]);
        setSelectedVersionId(nextVerId);
        setCurrentCode(data.modifiedCode);
        if (data.language) {
          setLanguage(data.language);
        }
      }

    } catch (err: any) {
      console.error(err);

      // ✅ 修正：根據當前選取的 provider 動態提示對應的 API Key 名稱
      const apiKeyHint = getApiKeyName(selectedProvider);

      setChatHistory(prev => [...prev, {
        id: `err-${Date.now()}`,
        role: "system",
        content: `抱歉，調整過程中發生了錯誤：${err.message || err}。請確認您的 ${apiKeyHint} 已正確設定，且網路一切正常。`,
        timestamp: new Date()
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  // 還原版本或加載舊版本
  const handleRevertToVersion = (version: Version) => {
    setCurrentCode(version.code);
    setLanguage(version.language);
    setSelectedVersionId(version.id);

    // 新增一筆記錄
    const nextVerId = `v-revert-${Date.now()}`;
    const newVer: Version = {
      id: nextVerId,
      timestamp: new Date(),
      title: `還原：${version.title.replace("還原：", "")}`,
      code: version.code,
      note: `手動恢復歷史版本 (${version.note})`,
      language: version.language
    };
    setVersions(prev => [newVer, ...prev]);
    setSelectedVersionId(nextVerId);
  };

  // 當選擇歷史的版本點選時直接用於 Diff 比對
  const getSelectedVersionCode = (): string => {
    const ver = versions.find(v => v.id === selectedVersionId);
    return ver ? ver.code : "";
  };

  // 快捷 Prompt 清單
  const QUICK_PROMPTS = [
    { label: "✨ 微流光效果", prompt: "為此時鐘/頁面的主要卡片與主要按鈕添加一層霓虹微流光 (animation gradient) 渲染邊框效果，並將其色調調整為星空藍紫" },
    { label: "🛠️ 語法檢修", prompt: "詳細檢查並檢修目前程式碼是否存在潛在的 JavaScript 邏輯漏洞、缺少閉合標籤或排版失調問題，修復後請回傳格式漂亮的完整程式碼" },
    { label: "📱 RWD 響應式優化", prompt: "請優化當前 HTML 的排版，讓它在手機版小螢幕與寬螢幕上都呈現完美置中的容器大小，同時加上舒適的內邊距(Padding)與精緻圓角" },
    { label: "💬 中文提示與註解", prompt: "請把這段寫好的程式碼內文所有的英文註釋或關鍵 UI 標籤更貼心地翻譯成繁體中文，且在程式細節處加上詳盡的中文關鍵註解描述" }
  ];

  // ✅ 取得當前 provider 的顯示名稱
  const currentProviderLabel = AI_PROVIDERS.find(p => p.value === selectedProvider)?.label ?? "AI";

  return (
    <div id="bento-container" className="flex flex-col min-h-screen w-full bg-[#07070a] text-neutral-300 font-sans p-2 md:p-3 gap-2 md:gap-3 overflow-x-hidden select-none">
      
      {/* 頂部導覽 Header Section */}
      <header id="bento-header" className="flex flex-wrap items-center justify-between gap-2 px-3 md:px-5 py-2.5 bg-[#0f1019] border border-neutral-800 rounded-xl shadow-lg">
        <div className="flex items-center gap-4">
          <div className="w-9 h-9 bg-gradient-to-tr from-[#6366f1] to-[#10b981] rounded-lg flex items-center justify-center shadow-md">
            <Sparkles className="text-white w-5 h-5 animate-pulse" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">Active File:</span>
              <input
                id="active-file-name"
                type="text"
                value={fileName}
                onChange={(e) => setFileName(e.target.value)}
                className="text-sm font-semibold text-neutral-200 bg-transparent border-b border-transparent hover:border-neutral-700 focus:border-indigo-500 focus:outline-none py-0.5 px-1 truncate w-48 transition-all"
                title="點擊此處可自訂作用中檔案名稱"
              />
              <span className="text-[10px] bg-indigo-950 text-indigo-300 px-2 py-0.5 rounded-full border border-indigo-800">
                {language.toUpperCase()}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Preset 快捷下拉清單 */}
          <div className="relative">
            <button
              id="btn-preset-toggle"
              onClick={() => setShowPresetsMenu(!showPresetsMenu)}
              className="flex items-center gap-2 px-3 py-1.5 bg-[#171825] hover:bg-[#1f2033] border border-neutral-800 rounded-lg text-xs font-semibold text-neutral-300 transition-all cursor-pointer"
            >
              <Layers className="w-3.5 h-3.5 text-indigo-400" />
              <span>程式範本</span>
            </button>
            {showPresetsMenu && (
              <div id="preset-menu" className="absolute right-0 mt-2 w-72 bg-[#121320] border border-neutral-800 rounded-xl shadow-2xl z-50 p-2 space-y-1">
                <div className="px-3 py-1.5 text-[10px] font-bold text-neutral-500 uppercase tracking-widest border-b border-neutral-800/60">
                  載入內建高畫質範例
                </div>
                {PRESET_FILES.map((preset, idx) => (
                  <button
                    key={preset.name}
                    onClick={() => {
                      handleLoadPreset(preset, idx);
                      setShowPresetsMenu(false);
                    }}
                    className={`w-full text-left p-2.5 rounded-lg flex flex-col gap-0.5 transition-colors cursor-pointer ${
                      activePresetIndex === idx ? "bg-indigo-950/40 border-l-2 border-indigo-500" : "hover:bg-neutral-850"
                    }`}
                  >
                    <span className="text-xs font-semibold text-neutral-200">{preset.name}</span>
                    <span className="text-[10px] text-neutral-500 line-clamp-1">{preset.description}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            id="btn-copy-main"
            onClick={handleCopyCode}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#171825] hover:bg-[#1f2033] border border-neutral-800 rounded-lg text-xs font-semibold text-neutral-300 transition-all cursor-pointer"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-neutral-400" />}
            <span>{copied ? "已複製 !" : "複製代碼"}</span>
          </button>

          {/* 手動觸發檔案選取 */}
          <button
            id="btn-upload-trigger"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 rounded-lg text-xs font-semibold text-neutral-100 transition-all cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5 text-sky-400" />
            <span>讀入檔案</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileSelect}
            accept=".html,.css,.js,.jsx,.ts,.tsx,.json,.txt"
            className="hidden"
          />
        </div>
      </header>

      {/* Main Bento Grid - RWD: mobile=stack, md=2col, lg=3-panel bento */}
      <main id="bento-main" className="grid grid-cols-1 md:grid-cols-12 gap-2 md:gap-3 flex-grow lg:h-0 pb-1">
        
        {/* Bento Cell 1: 檔案與拖曳區 (左下側) - span 3, row-span 12 */}
        <aside
          id="bento-explorer"
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`md:col-span-3 md:row-span-12 bg-[#0f1019] border rounded-2xl p-4 flex flex-col gap-4 transition-all duration-300 ${
            dragOver ? "border-indigo-500 bg-indigo-950/20 shadow-[0_0_20px_rgba(99,102,241,0.2)]" : "border-neutral-800"
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="text-[11px] font-bold text-neutral-500 uppercase tracking-widest flex items-center gap-1.5">
              <FileCode className="w-3.5 h-3.5 text-sky-400" />
              <span>工作台資源 (Files)</span>
            </div>
            <span className="text-[10px] text-neutral-600 font-mono">Drag & Drop</span>
          </div>

          {/* 拖曳感應與上傳區 */}
          <div
            id="drag-drop-box"
            onClick={() => fileInputRef.current?.click()}
            className={`border border-dashed rounded-xl p-4.5 text-center flex flex-col items-center justify-center gap-2 cursor-pointer transition-all duration-200 ${
              dragOver ? "border-indigo-400 bg-indigo-950/40 text-indigo-300" : "border-neutral-800 hover:border-neutral-600 bg-neutral-900/40"
            }`}
          >
            <Upload className={`w-8 h-8 text-neutral-500 transition-transform duration-300 ${dragOver ? "scale-125 text-indigo-400" : ""}`} />
            <div className="space-y-1">
              <p className="text-xs font-semibold text-neutral-300">拖曳或點選載入程式檔</p>
              <p className="text-[10px] text-neutral-600">支援 .html, .css, .js, .ts, .tsx 格式</p>
            </div>
          </div>

          <hr className="border-neutral-800/80" />

          {/* 前端作用語言別切換 */}
          <div className="space-y-2">
            <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest block">預覽語法類型：</span>
            <div className="grid grid-cols-2 gap-2">
              {[
                { name: "HTML", value: "html" },
                { name: "CSS 樣式", value: "css" },
                { name: "JavaScript", value: "javascript" },
                { name: "React TSX", value: "tsx" }
              ].map((lang) => (
                <button
                  key={lang.value}
                  onClick={() => setLanguage(lang.value)}
                  className={`py-1.5 px-2 rounded-lg text-xs font-mono font-medium transition-all cursor-pointer ${
                    language === lang.value ? "bg-indigo-600 text-white shadow-md font-bold" : "bg-neutral-900 text-neutral-400 hover:bg-neutral-800"
                  }`}
                >
                  {lang.name}
                </button>
              ))}
            </div>
          </div>

          <hr className="border-neutral-800/80" />

          {/* 系統特點簡介卡 (Bento Decorative Block) */}
          <div className="flex-grow flex flex-col justify-end">
            <div className="p-3.5 bg-gradient-to-br from-[#121322] to-[#0d0d14] border border-indigo-950 rounded-xl space-y-2">
              <div className="flex items-center gap-1.5 text-xs text-indigo-400 font-bold">
                <Flame className="w-4 h-4 text-amber-500 animate-bounce" />
                {/* ✅ 修正：動態顯示當前選取的 AI 模型名稱，不再寫死 Gemini */}
                <span>{currentProviderLabel} 智慧賦能</span>
              </div>
              <p className="text-[10px] text-neutral-400 leading-relaxed">
                每次 AI 修改後均會**自動儲存原狀態為嶄新 Timeline 節點**。您可以自由點擊右側歷程還原任意時刻、甚至直接對照檢視修補細節。
              </p>
            </div>
          </div>
        </aside>

        {/* Bento Cell 2: 程式碼編輯器 */}
        <section id="bento-editor" className="md:col-span-5 md:row-span-8 min-h-[320px] lg:min-h-0 bg-[#0f1019] border border-neutral-800 rounded-2xl relative overflow-hidden flex flex-col">
          {/* 編輯器分頁標頭 */}
          <div className="flex items-center justify-between px-4 py-2 border-b border-neutral-800 bg-[#0c0d14]">
            <div className="flex items-center gap-1 bg-[#171825] p-1 rounded-lg">
              <button
                id="tab-edit"
                onClick={() => setEditorTab("edit")}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-all cursor-pointer ${
                  editorTab === "edit" ? "bg-indigo-600 text-white font-bold" : "text-neutral-400 hover:text-white"
                }`}
              >
                代碼編輯
              </button>
              <button
                id="tab-diff"
                onClick={() => setEditorTab("diff")}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-all cursor-pointer ${
                  editorTab === "diff" ? "bg-indigo-600 text-white font-bold" : "text-neutral-400 hover:text-white2"
                }`}
              >
                變更對比 (Diff)
              </button>
            </div>

            <div className="flex items-center gap-3 text-xs font-mono text-neutral-500">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>即時渲染中</span>
              </span>
              <span className="border-l border-neutral-800 h-3"></span>
              <span>UTF-8</span>
            </div>
          </div>

          {/* 編輯器主呈現區 */}
          <div className="flex-1 overflow-hidden relative">
            {editorTab === "edit" ? (
              <div className="w-full h-full flex font-mono text-xs bg-[#0b0c12]">
                {/* 行號 */}
                <div className="w-11 bg-[#07080d] text-neutral-600 select-none text-right pr-3.5 py-4 flex flex-col gap-1 overflow-hidden border-r border-neutral-800">
                  {Array.from({ length: Math.max(1, currentCode.split("\n").length) }).map((_, i) => (
                    <span id={`line-num-${i + 1}`} key={i}>{i + 1}</span>
                  ))}
                </div>
                {/* 核心編輯文字區 */}
                <textarea
                  id="code-textarea"
                  ref={codeEditorRef}
                  value={currentCode}
                  onChange={handleCodeChange}
                  className="flex-1 h-full p-4 bg-transparent text-neutral-200 placeholder-neutral-600 resize-none outline-none overflow-auto font-mono text-xs leading-relaxed"
                  placeholder="// 請在此處輸入或拖放您的程式碼項目..."
                  spellCheck="false"
                />
              </div>
            ) : (
              // 歷史 Diff 對比
              <DiffView
                oldCode={getSelectedVersionCode()}
                newCode={currentCode}
                oldTitle={versions.find(v => v.id === selectedVersionId)?.title || "選取的歷史版本"}
                newTitle="當前編輯代碼"
              />
            )}
          </div>

          <div className="px-4 py-2 bg-[#0c0d14] border-t border-neutral-800 flex items-center justify-between text-[11px] text-neutral-500 font-mono">
            <span>
              總行數：{currentCode.split("\n").length} 行 (計 {currentCode.length} 字元)
            </span>
            <span>支援雙向直接手動編輯</span>
          </div>
        </section>

        {/* Bento Cell 3: 即時預覽舞台 */}
        <section id="bento-preview" className="md:col-span-4 md:row-span-6 min-h-[280px] lg:min-h-0 bg-[#0f1019] border border-neutral-800 rounded-2xl overflow-hidden flex flex-col">
          <LivePreview code={currentCode} language={language} />
        </section>

        {/* Bento Cell 4: 歷程 Timeline 與版本控制 */}
        <section id="bento-timeline" className="md:col-span-4 md:row-span-6 min-h-[200px] lg:min-h-0 bg-[#0f1019] border border-neutral-800 rounded-2xl p-4 flex flex-col gap-3 overflow-hidden">
          <div className="flex items-center justify-between">
            <div className="text-[11px] font-bold text-neutral-500 uppercase tracking-widest flex items-center gap-1.5">
              <History className="w-3.5 h-3.5 text-emerald-400" />
              <span>版本控制紀錄門檻 (Timeline)</span>
            </div>
            <span className="text-[10px] bg-emerald-950/80 text-emerald-300 border border-emerald-900 px-2 py-0.5 rounded-full font-mono">
              {versions.length} 個檢查點
            </span>
          </div>

          {/* 滾動的時間軸內容列表 */}
          <div id="timeline-scroll-area" className="flex-1 overflow-y-auto pr-1 space-y-3 relative">
            {/* 時間軸垂直引導線 */}
            <div className="absolute left-[13px] top-2 bottom-2 w-[1.5px] bg-[#1a1b2d]"></div>

            {versions.map((ver, idx) => {
              const isSelected = selectedVersionId === ver.id;
              return (
                <div
                  id={`version-card-${ver.id}`}
                  key={ver.id}
                  onClick={() => setSelectedVersionId(ver.id)}
                  className={`flex gap-3.5 items-start relative cursor-pointer group p-2 rounded-xl border transition-all ${
                    isSelected
                      ? "bg-slate-900/60 border-slate-700 shadow-sm"
                      : "bg-transparent border-transparent hover:bg-neutral-900/40"
                  }`}
                >
                  {/* 圖示按紐，點選可做 Diff 對比或倒回到這個程式碼 */}
                  <div
                    className={`w-6.5 h-6.5 rounded-full flex-shrink-0 z-10 flex items-center justify-center text-[10px] font-mono font-bold border transition-colors ${
                      isSelected
                        ? "bg-emerald-500 border-emerald-400 text-black shadow-md shadow-emerald-500/10"
                        : "bg-neutral-800 border-neutral-700 text-neutral-400 group-hover:bg-neutral-700 group-hover:text-white"
                    }`}
                  >
                    {versions.length - idx}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-xs text-white font-semibold truncate block">
                        {ver.title}
                      </span>
                      <span className="text-[9px] text-neutral-600 block shrink-0 font-mono">
                        {new Date(ver.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </span>
                    </div>

                    <p className="text-[10px] text-neutral-400 mt-0.5 line-clamp-1">
                      {ver.note}
                    </p>

                    {/* Action 浮動操作區：還原以及切至對比 */}
                    <div className="flex gap-2.5 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRevertToVersion(ver);
                        }}
                        className="text-[9px] font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-0.5 bg-indigo-950/40 px-1.5 py-0.5 rounded border border-indigo-900/60"
                        title="將編輯區還原成這個版本的代碼且存檔"
                      >
                        <RotateCcw className="w-2.5 h-2.5" />
                        <span>快速還原</span>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedVersionId(ver.id);
                          setEditorTab("diff");
                        }}
                        className="text-[9px] font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-0.5 bg-emerald-950/40 px-1.5 py-0.5 rounded border border-emerald-900/60"
                        title="切換到比對視角觀察此版本與編輯區的差異"
                      >
                        <Code className="w-2.5 h-2.5" />
                        <span>載入 Diff 對照</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Bento Cell 5: AI 對話與代碼修正控制 */}
        <section id="bento-ai-chat" className="md:col-span-5 md:row-span-4 min-h-[300px] lg:min-h-0 bg-gradient-to-br from-[#0f1019] to-[#0a0a10] border border-neutral-800 rounded-2xl flex flex-col p-4 shadow-inner overflow-visible">
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-indigo-400 animate-spin" />
                <span>AI 自然語言溝通調整</span>
              </span>
            </div>
            <div className="h-[1px] flex-grow bg-indigo-500/10 mx-3"></div>

            {/* AI 服務選擇 - 使用原生 select 避免 overflow-hidden 裁切問題 */}
            <div className="flex items-center gap-1.5">
              <span className="text-[9px] text-neutral-500 font-semibold shrink-0 hidden sm:block">模型：</span>
              <select
                id="provider-select"
                value={selectedProvider}
                onChange={(e) => setSelectedProvider(e.target.value as AIProvider)}
                className={`text-[10px] font-bold border rounded-lg px-2 py-1 cursor-pointer outline-none transition-all ${
                  AI_PROVIDERS.find(p => p.value === selectedProvider)?.badge || ""
                } bg-[#121320]`}
              >
                {AI_PROVIDERS.map((p) => (
                  <option key={p.value} value={p.value} className="bg-[#121320] text-neutral-200 font-normal">
                    {p.label} ({p.model})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* AI 對話框對答區 */}
          <div id="chat-messages" className="flex-1 overflow-y-auto pr-1 space-y-2.5 text-xs py-1">
            {chatHistory.map((msg) => {
              const isAi = msg.role === "model";
              const isSys = msg.role === "system";
              return (
                <div
                  id={`chat-msg-${msg.id}`}
                  key={msg.id}
                  className={`flex gap-3 leading-relaxed ${isAi ? "" : "flex-row-reverse"}`}
                >
                  {/* 圖示 */}
                  <div
                    className={`w-6 h-6 rounded flex-shrink-0 flex items-center justify-center font-bold text-[9px] ${
                      isAi
                        ? "bg-gradient-to-tr from-indigo-600 to-emerald-500 text-white"
                        : isSys
                        ? "bg-amber-950/60 border border-amber-800 text-amber-400"
                        : "bg-neutral-800 text-neutral-200"
                    }`}
                  >
                    {isAi ? "AI" : isSys ? "!" : "使用者"}
                  </div>

                  {/* 內容盒 */}
                  <div className={`flex flex-col max-w-[85%] ${isAi ? "" : "items-end"}`}>
                    <div
                      className={`p-2.5 rounded-xl border leading-relaxed break-words whitespace-pre-wrap ${
                        isAi
                          ? "bg-[#151624] border-indigo-900/40 rounded-tl-none text-neutral-200"
                          : isSys
                          ? "bg-amber-950/20 border-amber-900/40 rounded-tl-none text-amber-200"
                          : "bg-indigo-600 text-white border-indigo-500 rounded-tr-none"
                      }`}
                    >
                      {msg.content}
                    </div>
                    <span className="text-[9px] text-neutral-600 mt-1 font-mono px-1">
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              );
            })}
            {isLoading && (
              <div id="ai-typing-loader" className="flex gap-3 items-center">
                <div className="w-6 h-6 rounded bg-gradient-to-tr from-indigo-600 to-emerald-500 text-white flex items-center justify-center text-[9px] font-bold">
                  AI
                </div>
                <div className="p-2.5 bg-[#151624] border border-indigo-900/40 rounded-xl rounded-tl-none text-xs text-neutral-400 flex items-center gap-2">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-400" />
                  <span>正在深度理解需求，進行程式碼優化並重建中，請稍候...</span>
                </div>
              </div>
            )}
            <div ref={chatBottomRef} />
          </div>

          <hr className="border-neutral-800/80 my-2" />

          {/* 快捷推薦 Prompts 橫列 */}
          <div id="quick-presets-chips" className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none select-none">
            <span className="text-[9px] text-neutral-500 font-semibold shrink-0">快捷建議：</span>
            {QUICK_PROMPTS.map((qp, idx) => (
              <button
                key={idx}
                onClick={() => handleSendMessage(undefined, qp.prompt)}
                disabled={isLoading}
                className="shrink-0 text-[10px] bg-neutral-900 hover:bg-neutral-800 text-indigo-300 hover:text-indigo-200 border border-neutral-800/80 rounded-full px-2.5 py-0.5 transition-colors cursor-pointer disabled:opacity-50"
              >
                {qp.label}
              </button>
            ))}
          </div>

          {/* AI 終端輸入與遞交 */}
          <form id="ai-chat-form" onSubmit={handleSendMessage} className="flex gap-2">
            <div className="flex-grow bg-neutral-900 border border-neutral-700 rounded-xl px-3.5 py-1.5 text-neutral-400 flex items-center justify-between">
              <input
                id="ai-prompt-input"
                type="text"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="在此輸入您不滿意的代碼部分，像是：(加入流光按鈕樣式、幫我改為中文化)..."
                disabled={isLoading}
                className="w-full bg-transparent text-xs text-neutral-100 placeholder-neutral-500 outline-none pr-2"
              />
              <div className="flex gap-1.5 items-center shrink-0">
                <kbd className="px-1.5 py-0.5 bg-neutral-800 text-[9px] text-neutral-500 rounded border border-neutral-700">Ctrl</kbd>
                <kbd className="px-1.5 py-0.5 bg-neutral-800 text-[9px] text-neutral-500 rounded border border-neutral-700">Enter</kbd>
              </div>
            </div>
            <button
              id="btn-send-prompt"
              type="submit"
              disabled={isLoading || !prompt.trim()}
              className="w-11 h-9 bg-indigo-600 hover:bg-indigo-500 disabled:bg-neutral-850 disabled:text-neutral-500 rounded-xl flex items-center justify-center text-white transition-colors cursor-pointer"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </section>

      </main>

      {/* 底部狀態欄 Footer Bar */}
      <footer id="bento-footer" className="flex items-center gap-6 px-4 py-1.5 text-[10px] bg-[#0c0d14] border border-neutral-800/50 rounded-lg font-mono text-neutral-500">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-indigo-505 bg-indigo-500 animate-pulse"></span>
          <span className="font-semibold text-neutral-400">目前分支 (Branch) :</span>
          <span className="text-neutral-500">main*</span>
        </div>
        
        <div className="flex items-center gap-1">
          <GitBranch className="w-3 h-3 text-neutral-500" />
          <span>本地快照沙盒機制</span>
        </div>

        <div className="ml-auto flex items-center gap-5">
          <div className="flex items-center gap-1 text-neutral-600">
            <span>AI 引擎：</span>
            <span className={`font-semibold ${ AI_PROVIDERS.find(p => p.value === selectedProvider)?.badge.split(" ")[1] || "text-neutral-500" }`}>
              {AI_PROVIDERS.find(p => p.value === selectedProvider)?.label}
            </span>
          </div>
          <div className="border-l border-neutral-800 h-2.5"></div>
          <div>React 19.x</div>
          <div>Vite 6.x</div>
          <div>Serverless API</div>
        </div>
      </footer>
    </div>
  );
}