// ---------------------------------------------------------------------------
// Firebase 配置（来自控制台，2026-08-30）
//
// apiKey 是公开的前端标识符（不是机密）——访问控制由 Auth + Firestore
// 安全规则（firestore.rules）负责，这是 Firebase 官方推荐做法。
// ---------------------------------------------------------------------------
export const firebaseConfig = {
  apiKey: "AIzaSyAY_aDI7Z2NuJBvE_xRzJ_WQ6Dkkt0Sd7c",
  authDomain: "sg-arcade-finder.firebaseapp.com",
  databaseURL: "https://sg-arcade-finder-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "sg-arcade-finder",
  storageBucket: "sg-arcade-finder.firebasestorage.app",
  messagingSenderId: "856744861485",
  appId: "1:856744861485:web:39c587f4f53408c2ebfda4",
};

// 验证邮件点击后跳回的地址（GitHub Pages 线上地址）
export const SITE_URL = "https://abc12354a.github.io/sg-arcade-finde/";
