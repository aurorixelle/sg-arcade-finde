// ---------------------------------------------------------------------------
// Firebase 配置 —— 只需粘贴一次
//
// 步骤：
// 1. 打开 https://console.firebase.google.com/ → 创建项目（免费 Spark 层）
// 2. 项目设置 → 常规 → 「您的应用」→ 添加应用 → 选 Web(</>) → 注册
// 3. 复制弹出的 firebaseConfig 对象，整体替换下面内容（保留 PASTE_HERE 结构外的注释即可）
//
// 注意：这个 apiKey 不是机密（Firebase 前端标识符），安全由 Firestore 规则
// 和 Auth 控制，写在代码里是官方推荐做法。
// 在粘贴真实配置之前，网站以「无账户模式」运行（数据用内置快照，功能完整）。
// ---------------------------------------------------------------------------
export const firebaseConfig = {
  apiKey: "PASTE_HERE",
  authDomain: "PASTE_HERE",
  projectId: "PASTE_HERE",
  storageBucket: "PASTE_HERE",
  messagingSenderId: "PASTE_HERE",
  appId: "PASTE_HERE",
};

// 验证邮件点击后跳回的地址（GitHub Pages 线上地址）
export const SITE_URL = "https://abc12354a.github.io/sg-arcade-finde/";
