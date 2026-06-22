export interface PresetFile {
  name: string;
  description: string;
  language: string;
  code: string;
}

export const PRESET_FILES: PresetFile[] = [
  {
    name: "霓虹極光動態時鐘.html",
    description: "一個具有毛玻璃質感、3D 漸層陰影與 JavaScript 實時動態更新的極光電子時鐘。",
    language: "html",
    code: `<!DOCTYPE html>
<html lang="zh-TW">
<head>
  <meta charset="UTF-8">
  <title>霓虹極光時鐘</title>
  <style>
    :root {
      --bg-color: #0c0f1d;
      --card-bg: rgba(255, 255, 255, 0.05);
      --neon-cyan: #00ffff;
      --neon-magenta: #ff007f;
      --text-color: #ffffff;
    }
    
    body {
      margin: 0;
      padding: 0;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      background-color: var(--bg-color);
      font-family: 'Segoe UI', system-ui, sans-serif;
      overflow: hidden;
      color: var(--text-color);
    }

    /* 背景極光裝飾 */
    .aurora-bg {
      position: absolute;
      width: 100%;
      height: 100%;
      top: 0;
      left: 0;
      z-index: 1;
      overflow: hidden;
    }
    .orb {
      position: absolute;
      filter: blur(120px);
      border-radius: 50%;
      opacity: 0.4;
      animation: float 12s infinite alternate ease-in-out;
    }
    .orb-1 {
      width: 400px;
      height: 400px;
      background: var(--neon-cyan);
      top: -100px;
      left: -100px;
    }
    .orb-2 {
      width: 500px;
      height: 500px;
      background: var(--neon-magenta);
      bottom: -150px;
      right: -100px;
      animation-delay: -4s;
    }

    @keyframes float {
      0% { transform: translate(0, 0) scale(1); }
      100% { transform: translate(50px, 40px) scale(1.15); }
    }

    /* 時鐘容器 */
    .clock-container {
      position: relative;
      z-index: 2;
      background: var(--card-bg);
      backdrop-filter: blur(25px);
      -webkit-backdrop-filter: blur(25px);
      border: 1px solid rgba(255, 255, 255, 0.1);
      padding: 40px 60px;
      border-radius: 24px;
      box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5),
                  inset 0 1px 0 rgba(255, 255, 255, 0.1);
      text-align: center;
      transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    }
    .clock-container:hover {
      transform: translateY(-5px);
      border-color: rgba(0, 255, 255, 0.3);
    }

    .title {
      font-size: 14px;
      letter-spacing: 4px;
      text-transform: uppercase;
      color: rgba(255, 255, 255, 0.6);
      margin-bottom: 20px;
    }

    .time-display {
      font-size: 80px;
      font-weight: 800;
      font-family: monospace;
      letter-spacing: 2px;
      background: linear-gradient(45deg, var(--neon-cyan), #ffffff, var(--neon-magenta));
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      text-shadow: 0 0 40px rgba(0, 255, 255, 0.15);
      line-height: 1;
    }

    .date-display {
      font-size: 18px;
      color: rgba(255, 255, 255, 0.75);
      margin-top: 15px;
      letter-spacing: 2px;
    }

    .seconds-bar {
      width: 100%;
      height: 4px;
      background: rgba(255, 255, 255, 0.1);
      border-radius: 2px;
      margin-top: 25px;
      overflow: hidden;
    }
    .seconds-progress {
      height: 100%;
      width: 0%;
      background: linear-gradient(90deg, var(--neon-cyan), var(--neon-magenta));
      border-radius: 2px;
      transition: width 0.1s linear;
    }
  </style>
</head>
<body>

  <div class="aurora-bg">
    <div class="orb orb-1"></div>
    <div class="orb orb-2"></div>
  </div>

  <div class="clock-container">
    <div class="title">Aurora Real-time Clock</div>
    <div class="time-display" id="time">00:00:00</div>
    <div class="date-display" id="date">YYYY 年 MM 月 DD 日</div>
    <div class="seconds-bar">
      <div class="seconds-progress" id="progress"></div>
    </div>
  </div>

  <script>
    function updateClock() {
      const now = new Date();
      
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const seconds = String(now.getSeconds()).padStart(2, '0');
      
      document.getElementById('time').textContent = \`\${hours}:\${minutes}:\${seconds}\`;
      
      const options = { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' };
      document.getElementById('date').textContent = now.toLocaleDateString('zh-TW', options);
      
      // 更新秒條進度
      const progress = (now.getSeconds() / 60) * 100;
      document.getElementById('progress').style.width = \`\${progress}%\`;
    }
    
    setInterval(updateClock, 1000);
    updateClock();
  </script>
</body>
</html>`
  },
  {
    name: "微光按鈕與輸入模組.css",
    description: "一組精緻的 CSS 按鈕與輸入框效果，包含霓虹外光暈與細微 hover 移動縮放。",
    language: "css",
    code: `/* 帶入此樣式後，可直接套用在下方的即時渲染測試區 */

.modern-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 12px 28px;
  background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
  color: #ffffff;
  font-size: 14px;
  font-weight: 600;
  border-radius: 12px;
  border: none;
  cursor: pointer;
  box-shadow: 0 4px 15px rgba(99, 102, 241, 0.35);
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  letter-spacing: 0.5px;
}

.modern-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(99, 102, 241, 0.5);
  background: linear-gradient(135deg, #818cf8 0%, #4f46e5 100%);
}

.modern-button:active {
  transform: translateY(1px);
}

.glass-input {
  width: 100%;
  padding: 14px 20px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  color: #ffffff;
  font-size: 14px;
  outline: none;
  transition: all 0.3s ease;
  box-sizing: border-box;
}

.glass-input:focus {
  border-color: #6366f1;
  background: rgba(255, 255, 255, 0.08);
  box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.15);
}

.neon-card {
  background: #1e1b4b;
  border: 1px solid rgba(99, 102, 241, 0.2);
  padding: 30px;
  border-radius: 20px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.35);
  position: relative;
  overflow: hidden;
}

.neon-card::before {
  content: '';
  position: absolute;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  background: radial-gradient(circle, rgba(99, 100, 241, 0.15) 0%, transparent 60%);
  pointer-events: none;
}`
  },
  {
    name: "3D互動旋轉方塊.html",
    description: "利用 CSS 3D 變換與 JS 滑鼠跟隨拖曳，做出一個可由滑鼠拖曳旋轉的 3D 魔術方塊。",
    language: "html",
    code: `<!DOCTYPE html>
<html lang="zh-TW">
<head>
  <meta charset="UTF-8">
  <title>3D 互動旋轉方塊</title>
  <style>
    body {
      margin: 0;
      height: 100vh;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      background: radial-gradient(circle, #2d3748 0%, #1a202c 100%);
      color: #fff;
      font-family: system-ui, sans-serif;
      overflow: hidden;
      perspective: 1000px;
    }

    h3 {
      margin: 0 0 40px 0;
      letter-spacing: 2px;
      color: #cbd5e0;
      font-size: 16px;
      text-transform: uppercase;
      text-align: center;
    }

    .scene {
      width: 200px;
      height: 200px;
      position: relative;
    }

    .cube {
      width: 100%;
      height: 100%;
      position: absolute;
      transform-style: preserve-3d;
      transform: rotateX(-20deg) rotateY(30deg);
      transition: transform 0.1s;
      cursor: grab;
    }
    
    .cube:active {
      cursor: grabbing;
    }

    .face {
      position: absolute;
      width: 200px;
      height: 200px;
      border: 2px solid rgba(255,255,255,0.7);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 32px;
      font-weight: bold;
      backface-visibility: visible;
      background: rgba(79, 70, 229, 0.45);
      backdrop-filter: blur(5px);
      box-shadow: inset 0 0 40px rgba(255,255,255,0.1);
      box-sizing: border-box;
      user-select: none;
    }

    /* 前後左右上下定位 */
    .front  { transform: rotateY(  0deg) translateZ(100px); border-color: #ff007f; background: rgba(255, 0, 127, 0.3);}
    .back   { transform: rotateY(180deg) translateZ(100px); border-color: #00ffff; background: rgba(0, 255, 255, 0.3);}
    .right  { transform: rotateY( 90deg) translateZ(100px); border-color: #39ff14; background: rgba(57, 255, 20, 0.3);}
    .left   { transform: rotateY(-90deg) translateZ(100px); border-color: #ffff00; background: rgba(255, 255, 0, 0.3);}
    .top    { transform: rotateX( 90deg) translateZ(100px); border-color: #ffaa00; background: rgba(255, 170, 0, 0.3);}
    .bottom { transform: rotateX(-90deg) translateZ(100px); border-color: #8a2be2; background: rgba(138, 43, 226, 0.3);}
  </style>
</head>
<body>

  <h3>滑鼠按住拖曳可旋轉 3D 方塊</h3>

  <div class="scene">
    <div class="cube" id="cube">
      <div class="face front">1</div>
      <div class="face back">2</div>
      <div class="face right">3</div>
      <div class="face left">4</div>
      <div class="face top">5</div>
      <div class="face bottom">6</div>
    </div>
  </div>

  <script>
    const cube = document.getElementById('cube');
    let isDragging = false;
    let previousMousePosition = { x: 0, y: 0 };
    let currentRotation = { x: -20, y: 30 };

    document.addEventListener('mousedown', (e) => {
      isDragging = true;
      previousMousePosition = { x: e.clientX, y: e.clientY };
    });

    document.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      
      const deltaMove = {
        x: e.clientX - previousMousePosition.x,
        y: e.clientY - previousMousePosition.y
      };

      currentRotation.y += deltaMove.x * 0.5;
      currentRotation.x -= deltaMove.y * 0.5;

      cube.style.transform = \`rotateX(\${currentRotation.x}deg) rotateY(\${currentRotation.y}deg)\`;

      previousMousePosition = { x: e.clientX, y: e.clientY };
    });

    document.addEventListener('mouseup', () => {
      isDragging = false;
    });
  </script>
</body>
</html>`
  }
];
