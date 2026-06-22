import React from "react";

interface DiffViewProps {
  oldCode: string;
  newCode: string;
  oldTitle?: string;
  newTitle?: string;
}

interface DiffLine {
  type: "addition" | "deletion" | "normal";
  content: string;
  leftLineNum?: number;
  rightLineNum?: number;
}

export default function DiffView({
  oldCode,
  newCode,
  oldTitle = "選取的歷史版本",
  newTitle = "當前代碼內容"
}: DiffViewProps) {
  // 將兩段代碼依行切開
  const oldLines = oldCode.split(/\r?\n/);
  const newLines = newCode.split(/\r?\n/);

  // 使用簡單且堅固的 Line-by-Line 局部比對與展示機制 (Myers-like or LCS simpler variant)
  const diffLines: DiffLine[] = [];
  
  let i = 0;
  let j = 0;

  while (i < oldLines.length || j < newLines.length) {
    if (i < oldLines.length && j < newLines.length) {
      if (oldLines[i] === newLines[j]) {
        // 內容相同
        diffLines.push({
          type: "normal",
          content: oldLines[i],
          leftLineNum: i + 1,
          rightLineNum: j + 1
        });
        i++;
        j++;
      } else {
        // 偵測前方是否有對齊行（簡單順推，尋找一小段看能不能重新對齊，確保插補對準）
        let lookAheadMatched = false;
        const scanRange = 6; // 掃描範圍 6 行

        for (let k = 1; k <= scanRange; k++) {
          if (i + k < oldLines.length && oldLines[i + k] === newLines[j]) {
            // 在 oldLines 中發現後面行能與目前的 newLines[j] 對齊 -> 說明這中間的 lines 被刪除了
            for (let d = 0; d < k; d++) {
              diffLines.push({
                type: "deletion",
                content: oldLines[i + d],
                leftLineNum: i + d + 1
              });
            }
            i += k;
            lookAheadMatched = true;
            break;
          } else if (j + k < newLines.length && oldLines[i] === newLines[j + k]) {
            // 在 newLines 中發現後面行能與目前的 oldLines[i] 對齊 -> 說明這中間的 lines 是新增的
            for (let a = 0; a < k; a++) {
              diffLines.push({
                type: "addition",
                content: newLines[j + a],
                rightLineNum: j + a + 1
              });
            }
            j += k;
            lookAheadMatched = true;
            break;
          }
        }

        if (!lookAheadMatched) {
          // 如果前方都沒有發現對齊，則默認視為 old[i] 被刪除而 new[j] 被添加
          diffLines.push({
            type: "deletion",
            content: oldLines[i],
            leftLineNum: i + 1
          });
          diffLines.push({
            type: "addition",
            content: newLines[j],
            rightLineNum: j + 1
          });
          i++;
          j++;
        }
      }
    } else if (i < oldLines.length) {
      // 剩餘 oldLines 全是刪除
      diffLines.push({
        type: "deletion",
        content: oldLines[i],
        leftLineNum: i + 1
      });
      i++;
    } else if (j < newLines.length) {
      // 剩餘 newLines 全是新增
      diffLines.push({
        type: "addition",
        content: newLines[j],
        rightLineNum: j + 1
      });
      j++;
    }
  }

  return (
    <div id="diff-container" className="flex flex-col h-full bg-slate-900 rounded-xl overflow-hidden text-sm border border-slate-800">
      {/* 標頭對比 */}
      <div className="flex items-center justify-between px-4 py-2 bg-slate-950 border-b border-slate-800 text-xs text-slate-400 font-mono">
        <div className="flex items-center gap-2">
          <span className="inline-block w-2 h-2 rounded-full bg-rose-500"></span>
          <span>- {oldTitle}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-500"></span>
          <span>+ {newTitle}</span>
        </div>
      </div>

      {/* 程式碼差異顯示區 */}
      <div className="flex-1 overflow-auto font-mono p-3 leading-relaxed text-slate-300">
        <div className="min-w-fit">
          {diffLines.length === 0 ? (
            <p className="text-slate-500 text-center py-8">檔案無任何內容，請先載入或編輯代碼。</p>
          ) : (
            diffLines.map((line, idx) => {
              const { type, content, leftLineNum, rightLineNum } = line;
              let bgClass = "hover:bg-slate-800/40";
              let textClass = "text-slate-300";
              let prefix = " ";

              if (type === "addition") {
                bgClass = "bg-emerald-950/40 border-l-2 border-emerald-500 hover:bg-emerald-950/60";
                textClass = "text-emerald-300";
                prefix = "+";
              } else if (type === "deletion") {
                bgClass = "bg-rose-950/30 border-l-2 border-rose-500 hover:bg-rose-950/50 line-through decoration-rose-500/50";
                textClass = "text-rose-300";
                prefix = "-";
              }

              return (
                <div
                  id={`diff-line-${idx}`}
                  key={idx}
                  className={`flex items-start py-0.5 px-2 transition-colors duration-150 ${bgClass}`}
                >
                  {/* 左行號 */}
                  <span className="w-10 select-none text-right text-slate-600 text-xs pr-2.5">
                    {leftLineNum !== undefined ? leftLineNum : ""}
                  </span>
                  {/* 右行號 */}
                  <span className="w-10 select-none text-right text-slate-600 text-xs pr-4 border-r border-slate-800">
                    {rightLineNum !== undefined ? rightLineNum : ""}
                  </span>
                  {/* 標記 (+/-) */}
                  <span className={`w-6 select-none text-center font-bold font-mono pl-2 text-xs ${textClass}`}>
                    {prefix}
                  </span>
                  {/* 程式碼內容 */}
                  <pre className={`flex-1 overflow-visible whitespace-pre-wrap break-all pl-1 ${textClass}`}>
                    {content || " "}
                  </pre>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
