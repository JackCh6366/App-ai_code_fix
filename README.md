<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/a440520e-b3ff-4cae-888a-35adadcd455f

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in `.env` to your Gemini API key
3. Run the app:
   `npm run dev`

## Deploy to Vercel

這個專案已經針對 Vercel 部署進行了調整與設定：
1. 新增了 `api/gemini/modify.ts` 作為 Vercel Serverless Function 處理後端 API 請求。
2. 新增了 `vercel.json` 進行路由與重定向設定。
3. 在 `package.json` 中加入了 `vercel-build` 指令，優化 Vercel 上的打包流程。

### 部署步驟

1. **上傳至 GitHub / GitLab / Bitbucket**：將此專案推送到您的 Git 儲存庫。
2. **在 Vercel 建立專案**：
   - 登入 Vercel 後點擊 **Add New** -> **Project**。
   - 選擇並匯入您的 Git 儲存庫。
3. **設定環境變數 (Environment Variables)**：
   - 在專案設定的 **Environment Variables** 欄位中，新增一個環境變數：
     - **Key**: `GEMINI_API_KEY`
     - **Value**: 您的 Gemini API Key (可從 Google AI Studio 取得)。
4. **完成部署**：
   - 點擊 **Deploy**。Vercel 會自動執行 `vercel-build` 並將前端與 Serverless Functions 部署上線。

