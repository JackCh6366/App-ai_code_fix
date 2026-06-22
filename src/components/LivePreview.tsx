import React, { useState, useEffect, useRef } from "react";
import { Play, RotateCw, Terminal, Eye } from "lucide-react";

interface LivePreviewProps {
  code: string;
  language: string;
}

export default function LivePreview({ code, language }: LivePreviewProps) {
  const [key, setKey] = useState(0); // For pushing strict resets
  const [consoleLogs, setConsoleLogs] = useState<string[]>([]);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    // Clear console logs on content update
    setConsoleLogs([]);
  }, [code, language]);

  // Handle iframe message events from internal console hooks
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === "IFRAME_CONSOLE_LOG") {
        setConsoleLogs((prev) => [...prev, String(event.data.message)]);
      }
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  const refreshIFrame = () => {
    setKey((prev) => prev + 1);
    setConsoleLogs([]);
  };

  const isHtml = language?.toLowerCase() === "html" || code.trim().startsWith("<");
  const isCss = language?.toLowerCase() === "css";
  const isJavascript = ["js", "javascript", "ts", "typescript"].includes(language?.toLowerCase() || "");

  // Generate safe sandboxed HTML content depending on active structure
  const getSrcDoc = (): string => {
    // Shared console override script to communicate logs back
    const consoleHookScript = `
      <script>
        (function() {
          const originalLog = console.log;
          const originalError = console.error;
          const originalWarn = console.warn;
          
          function sendLog(type, args) {
            const msg = args.map(arg => {
              if (typeof arg === 'object') {
                try { return JSON.stringify(arg); } catch(e) { return String(arg); }
              }
              return String(arg);
            }).join(' ');
            window.parent.postMessage({ type: 'IFRAME_CONSOLE_LOG', message: \`[\${type}] \${msg}\` }, '*');
          }

          console.log = function(...args) {
            originalLog.apply(console, args);
            sendLog('Log', args);
          };
          console.error = function(...args) {
            originalError.apply(console, args);
            sendLog('Error', args);
          };
          console.warn = function(...args) {
            originalWarn.apply(console, args);
            sendLog('Warn', args);
          };
          
          window.addEventListener('error', function(e) {
            sendLog('Uncaught Error', [e.message]);
          });
        })();
      </script>
    `;

    // 1. If it's pure HTML
    if (isHtml) {
      // If it contains typical HTML scaffold
      if (code.includes("<html") || code.includes("<body")) {
        // Inject console hook into head or prepended
        return code.replace("<head>", `<head>${consoleHookScript}`).replace("<body>", `<body>${consoleHookScript}`);
      } else {
        // Bare HTML snippet - auto-wrap with Tailwind CSS support!
        return `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <script src="https://cdn.tailwindcss.com"></script>
            <style>
              body { background-color: #0c0f1d; color: #f8fafc; font-family: system-ui, sans-serif; padding: 20px; }
            </style>
            ${consoleHookScript}
          </head>
          <body>
            ${code}
          </body>
          </html>
        `;
      }
    }

    // 2. If it is pure CSS - generate a visual showcase elements playground
    if (isCss) {
      return `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <script src="https://cdn.tailwindcss.com"></script>
          <style>
            body { background-color: #0f172a; color: #f1f5f9; font-family: system-ui, sans-serif; padding: 32px 24px; }
            /* User's Dynamic CSS Custom code injected here */
            ${code}
          </style>
        </head>
        <body>
          <div class="max-w-2xl mx-auto space-y-8">
            <div>
              <h2 class="text-sm font-semibold tracking-wider text-slate-400 uppercase mb-2">CSS 樣式渲染舞台 (Dynamic Elements Showcase)</h2>
              <p class="text-xs text-slate-500">外部載入的使用者 CSS 已成功應用於下方展示，請觀察樣式變化。</p>
            </div>
            
            <div class="p-6 bg-slate-900/60 rounded-2xl border border-slate-800 space-y-6">
              <!-- 按鈕樣式展示 -->
              <div class="space-y-2">
                <span class="text-xs font-mono text-slate-500">1. 按鈕元件展示（請確認 CSS 中有 .modern-button 樣式）</span>
                <div class="flex flex-wrap gap-4 items-center">
                  <button class="modern-button">預設精美按鈕 (Class: .modern-button)</button>
                  <button class="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium transition-all">
                    對照組 Tailwind 按鈕
                  </button>
                </div>
              </div>

              <!-- 輸入框展示 -->
              <div class="space-y-2">
                <span class="text-xs font-mono text-slate-500">2. 輸入表單組（請確認 CSS 中有 .glass-input 樣式）</span>
                <div class="space-y-3">
                  <input type="text" class="glass-input" placeholder="Class: .glass-input 聚焦時看光暈" />
                  <input type="text" class="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-sm outline-none focus:border-blue-500" placeholder="對照組輸入框" />
                </div>
              </div>

              <!-- 卡片樣式展示 -->
              <div class="space-y-2">
                <span class="text-xs font-mono text-slate-500">3. 美化卡片（請確認 CSS 中有 .neon-card 樣式）</span>
                <div class="neon-card">
                  <h4 class="text-lg font-bold text-slate-100">預期卡片 (Class: .neon-card)</h4>
                  <p class="text-slate-400 text-sm mt-1">此區塊測試 3D 漸層投影與內凹發光。透過 AI 可以靈活修正色彩和圓角比例。</p>
                </div>
              </div>
            </div>
          </div>
        </body>
        </html>
      `;
    }

    // 3. Javascript or TS - generate a runnable script canvas with interactive actions
    if (isJavascript) {
      return `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <script src="https://cdn.tailwindcss.com"></script>
          <style>
            body { background-color: #0f172a; color: #f1f5f9; font-family: system-ui, sans-serif; padding: 24px; }
          </style>
          ${consoleHookScript}
        </head>
        <body>
          <div class="space-y-4">
            <div>
              <h3 class="text-slate-200 text-lg font-bold">JavaScript 沙盒執行環境</h3>
              <p class="text-slate-400 text-xs mt-1">代碼會在此處安全運行。你可以利用下方對話與 AI 修改邏輯或修復語法錯誤。</p>
            </div>
            
            <div id="canvas-container" class="p-8 bg-slate-900 rounded-2xl border border-slate-800 text-center space-y-4">
              <div id="app">
                <p class="text-sm text-slate-400">正在執行程式碼...</p>
                <div id="dynamic-output" class="p-4 bg-slate-950/60 rounded-xl font-mono text-sm text-green-400 mt-2 min-h-[40px] flex items-center justify-center border border-slate-800/80">
                  可尋找 script 控制之 DOM 或輸出
                </div>
              </div>
            </div>
          </div>

          <script>
            try {
              // Sandbox execution
              ${code}
            } catch (err) {
              console.error(err.message);
            }
          </script>
        </body>
        </html>
      `;
    }

    // 4. Default plain text viewer
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <script src="https://cdn.tailwindcss.com"></script>
        <style>
          body { background-color: #090d16; color: #94a3b8; font-family: monospace; padding: 24px; line-height: 1.6; }
        </style>
      </head>
      <body>
        <div class="max-w-xl mx-auto py-12 text-center space-y-3">
          <p class="text-slate-400 font-sans text-sm font-semibold">該程式碼格式為：${language || "純文字"}，無瀏覽器預覽可用。</p>
          <p class="text-slate-600 text-xs font-sans">請使用 AI 對話或在此面板上方切換回 HTML/CSS 來查看即時渲染效果。</p>
        </div>
      </body>
      </html>
    `;
  };

  return (
    <div id="live-preview-box" className="flex flex-col h-full bg-slate-950/95 rounded-xl border border-slate-800 overflow-hidden">
      {/* 預覽控制列 */}
      <div className="flex items-center justify-between px-4 py-2 bg-slate-900/80 border-b border-slate-800 text-slate-300">
        <div className="flex items-center gap-2">
          <Eye className="w-4 h-4 text-sky-400" />
          <span className="text-xs font-medium tracking-wide">
            即時預覽 ({isHtml ? "HTML" : isCss ? "CSS 舞台" : isJavascript ? "JS 沙盒" : "唯讀檢視"})
          </span>
        </div>
        
        <button
          id="btn-refresh-preview"
          onClick={refreshIFrame}
          className="flex items-center gap-1.5 px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 transition-colors"
          title="重新整理預覽渲染世界"
        >
          <RotateCw className="w-3.5 h-3.5" />
          <span>刷新</span>
        </button>
      </div>

      {/* Frame 呈現 */}
      <div className="flex-1 relative bg-white min-h-[220px]">
        <iframe
          id="preview-iframe"
          key={key}
          ref={iframeRef}
          srcDoc={getSrcDoc()}
          className="w-full h-full border-none bg-slate-950"
          title="預覽渲染沙盒"
          sandbox="allow-scripts allow-popups allow-modals"
        />
      </div>

      {/* 附加：開發者主機日誌 (Console Logs) - 對於 JS/TS 或者是 HTML 的 script 開發超級實用 */}
      {(consoleLogs.length > 0 || isJavascript) && (
        <div className="bg-slate-900 border-t border-slate-800 flex flex-col h-36">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-950 border-b border-slate-800 text-xs font-semibold text-slate-400 font-mono">
            <Terminal className="w-3.5 h-3.5 text-orange-400" />
            <span>主機日誌 (Sandbox Console Output)</span>
          </div>
          <div className="flex-1 overflow-auto p-3.5 font-mono text-xs text-slate-300 space-y-1 bg-slate-900">
            {consoleLogs.length === 0 ? (
              <span className="text-slate-500 italic">等待代碼輸出 console.log...</span>
            ) : (
              consoleLogs.map((log, idx) => {
                let textStyle = "text-slate-300";
                if (log.includes("[Error]") || log.includes("[Uncaught Error]")) {
                  textStyle = "text-rose-400 bg-rose-950/20";
                } else if (log.includes("[Warn]")) {
                  textStyle = "text-amber-400 bg-amber-950/10";
                }
                return (
                  <div key={idx} className={`py-0.5 px-1.5 rounded ${textStyle}`}>
                    {log}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
