# 第 04 組｜課堂工作台

依照老師的 **Connect to database services** 教材，實作 Firebase 登入、帳號連結與資料庫整合。原始 repository 為空，因此本專案包含可操作的個人待辦介面，展示完整的登入及資料存取流程。

## 功能

- Google 登入、電子郵件／密碼註冊與登入、登出、密碼重設。
- Google 使用者可在「帳號設定」新增密碼；密碼使用者可連結 Google，保留同一個 Firebase UID 與資料。
- 個人任務新增、編輯、刪除、狀態切換、關鍵字搜尋與即時同步。
- 每位使用者的個人資料與任務由 Firestore Rules 隔離；組員共用資料／成員管理尚未納入此階段。
- 繁體中文介面、桌面與手機版面、明確的錯誤提示。

## 本機啟動

需要 Node.js 22.12 以上（本專案使用 Node.js 24 驗證）。

```bash
npm ci
npm run dev
```

使用 Chrome 開啟 `http://127.0.0.1:5173/`。預設連線至真正的 Firebase 作業專案，不是模擬器。

```bash
npm run build
npm run preview
```

`src/firebase-config.json` 是 Firebase Web 用戶端的公開設定，不含 Admin SDK 私鑰、登入權杖或密碼。資料存取依賴 Authentication 與已部署的 Firestore Rules，而不是隱藏 Web API key。

## Firebase 專案

| 項目                | 設定                   |
| ------------------- | ---------------------- |
| 顯示名稱            | Group 04               |
| 專案 ID             | uxd2026-413580134      |
| Firestore           | (default)，Standard 版 |
| 資料庫地區          | asia-east1（台灣）     |
| 方案                | Spark，未綁定付費方案  |
| 登入方式            | Google、電子郵件／密碼 |
| 本機 OAuth 授權網域 | localhost、127.0.0.1   |

Google Cloud 專案本身沒有一個通用的「資料地區」設定。這次明確設定的是 Firestore 的儲存區域；Firebase Authentication 不提供可直接選為台灣的相同區域選單。

Firebase CLI 已列在開發依賴中，不需要另外安裝全域版本：

```bash
npm run firebase -- login
npm run firebase -- projects:list
npm run firebase -- deploy --only firestore:rules --dry-run
npm run firebase -- deploy --only firestore:rules
```

重新設定登入供應商時，先將 `FIREBASE_SUPPORT_EMAIL` 環境變數設為專案擁有者／支援信箱，再執行 `npm run configure:auth`。腳本會建立並刪除暫存設定，避免把私人信箱提交到公開 repository。登入供應商及本機網域也可在 Firebase 控制台的 Authentication 中管理。

## 帳號連結展示

1. 使用 Google 登入。
2. 新增一筆任務，記下「帳號設定」中的使用者 ID。
3. 在「帳號設定」設定並確認密碼，讓此 Google 使用者也能用密碼登入。
4. 登出，改用相同電子郵件與剛才設定的密碼登入。
5. 確認使用者 ID 相同，任務仍存在。

反向流程：先註冊電子郵件／密碼帳號，再於登入後的「帳號設定」連結 Google。

不會單純根據相同信箱在前端合併兩個不同的既有 UID。遇到帳號衝突時，請先以原本方式登入再連結；不要另建重複帳號。Google 使用者設定密碼採用 `updatePassword`，避免部分專案中 `linkWithCredential` 的已知問題。

## 資料與安全規則

- `users/{uid}`：私有個人資料（UID、顯示名稱、建立／更新時間）。
- `users/{uid}/tasks/{taskId}`：私有任務（擁有者、標題、說明、狀態、建立／更新時間）。
- 預設拒絕，僅允許本人操作；建立與更新皆驗證完整 schema、欄位型別、字數、時間戳及不可修改欄位。
- 任務清單讀取最近 100 筆，以建立時間倒序，使用即時監聽。
- 原型規則已通過模擬器測試；正式擴大使用前仍需依實際新增功能重新檢查存取需求。

## 自動測試

需要 Java 21 以上以執行 Firestore Emulator。

```bash
npm test
```

測試僅使用 `demo-group-workspace` 模擬專案，不會建立正式測試帳號或修改正式資料：

- 兩個方向的 Google／密碼帳號連結與 UID 保留。
- 本人任務完整操作及實際使用的清單查詢。
- 未登入及另一個帳號的讀取、列出、建立、更新、刪除阻擋。
- 防止偽造擁有者、任意欄位、過長文字、錯誤型別、刪除必要欄位及竄改時間戳。
- 防止使用者自行寫入管理員權限，以及繞過父層個人資料。

## 對照老師教材

| 教材步驟                      | 本專案                                                   |
| ----------------------------- | -------------------------------------------------------- |
| 安裝 Firebase Skills          | 五個建議技能存於 `.agents/skills/`，組員拉取後可共同使用 |
| Firebase CLI／登入／列出專案  | CLI 開發依賴與上述命令                                   |
| 建立作業專案、台灣資料庫      | Group 04、asia-east1                                     |
| Google 及 email/password 登入 | 登入頁面與帳號設定                                       |
| 兩種登入方式視為同一帳號      | 已登入使用者連結，保留 UID                               |
| 啟動伺服器                    | `npm run dev`                                            |
| PR 與 main 整合               | 透過功能分支建立 Pull Request，再合併至 main             |

教材的 Copilot「Agent Merge」是工具介面名稱；此專案以相同的 GitHub 功能分支 → PR → main 流程完成整合。

## 組員之後加入

1. 在 GitHub repository 的 Settings → Collaborators 邀請組員自己的 GitHub 帳號。
2. 組員接受邀請後 clone、`npm ci`、`npm run dev`。
3. 網站使用者各自註冊／登入，目前各自的任務不互通。
4. 若需要管理 Firebase，再以各自 Google 帳號加入專案權限，依工作授予所需角色。Firebase 管理者需符合 Google 的兩步驟驗證要求；不必共用帳密。

Firebase Skills 原始來源為 [firebase/agent-skills](https://github.com/firebase/agent-skills)，授權見 `THIRD_PARTY_LICENSES/firebase-agent-skills.LICENSE`。

## 參考文件

- [Firebase 代理程式技能](https://firebase.google.com/docs/ai-assistance/agent-skills?hl=zh-tw)
- [連結不同登入方式](https://firebase.google.com/docs/auth/web/account-linking)
- [設定使用者密碼](https://firebase.google.com/docs/auth/web/manage-users#set_a_users_password)
- [Firestore 地區](https://firebase.google.com/docs/firestore/locations)
- [Firebase Web API keys](https://firebase.google.com/docs/projects/api-keys)
