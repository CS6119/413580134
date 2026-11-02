import "./style.css";
import { auth, db } from "./firebase";
import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  onAuthStateChanged,
  signOut,
  updateProfile,
  updatePassword,
  reload,
  linkWithPopup,
  sendPasswordResetEmail,
  type User,
} from "firebase/auth";
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  runTransaction,
  serverTimestamp,
  onSnapshot,
  query,
  orderBy,
  limit,
  type Timestamp,
  type Unsubscribe,
} from "firebase/firestore";

type Status = "todo" | "doing" | "done";
type Task = {
  id: string;
  title: string;
  notes: string;
  status: Status;
  createdAt: Timestamp | null;
};
const labels: Record<Status, string> = {
  todo: "待開始",
  doing: "進行中",
  done: "已完成",
};
const root = document.querySelector<HTMLDivElement>("#app")!;
let currentUser: User | null = null;
let stopTasks: Unsubscribe | undefined;
let tasks: Task[] = [];
let mode: "login" | "register" = "login";
let filter: "all" | Status = "all";
let search = "";
let view: "tasks" | "account" = "tasks";
let ready = false;
let loadingTasks = true;
let messageTimer: ReturnType<typeof setTimeout>;
let authRevision = 0;
const google = new GoogleAuthProvider();
google.setCustomParameters({ prompt: "select_account" });

// Never interpolate user-provided text into HTML without escaping it.
const esc = (value: unknown) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[c]!,
  );
const get = <T extends HTMLElement>(selector: string) =>
  root.querySelector<T>(selector)!;
const brand = `<a class="brand" href="/" aria-label="第 04 組首頁"><span class="brand-mark">04<span>↗</span></span><span>第 04 組<small>COURSE WORKSPACE</small></span></a>`;

function toast(text: string, error = false) {
  const el = document.querySelector<HTMLDivElement>("#toast")!;
  el.textContent = text;
  el.className = `toast visible${error ? " error" : ""}`;
  clearTimeout(messageTimer);
  messageTimer = setTimeout(() => el.classList.remove("visible"), 6500);
}

function errorText(error: unknown) {
  const code = (error as { code?: string })?.code;
  const messages: Record<string, string> = {
    "auth/invalid-credential": "電子郵件或密碼不正確，請重新確認。",
    "auth/email-already-in-use":
      "這個信箱已經註冊。若曾用 Google 登入，請先用 Google 登入，再到帳號設定連結密碼。",
    "auth/weak-password": "密碼強度不足，請使用至少 8 個字元。",
    "auth/invalid-email": "請輸入有效的電子郵件地址。",
    "auth/popup-closed-by-user": "登入視窗已關閉，可以重新嘗試。",
    "auth/popup-blocked": "瀏覽器封鎖了登入視窗，請允許此網站開啟彈出式視窗。",
    "auth/unauthorized-domain": "此網站網址尚未加入 Firebase 的授權網域。",
    "auth/account-exists-with-different-credential":
      "此信箱已有其他登入方式。請先使用原本的方式登入，再到帳號設定連結 Google。",
    "auth/credential-already-in-use":
      "這個登入方式已屬於另一個帳號，無法自動合併。請先確認原本的帳號。",
    "auth/provider-already-linked": "這個登入方式已完成連結。",
    "auth/requires-recent-login":
      "為了確認身分，請登出並重新登入，再執行這項操作。",
    "auth/too-many-requests": "嘗試次數過多，請稍後再試。",
    "auth/network-request-failed": "連線失敗，請檢查網路後重試。",
    "auth/operation-not-allowed": "此登入方式尚未在 Firebase 啟用。",
    "permission-denied": "資料存取權限不足，請確認登入狀態及 Firestore 規則。",
    unavailable: "目前無法連線到資料庫，請稍後重試。",
  };
  return (
    messages[code ?? ""] ??
    `操作未完成，請稍後再試${code ? `（${code}）` : "。"}`
  );
}

async function action(button: HTMLButtonElement, task: () => Promise<unknown>) {
  button.disabled = true;
  button.setAttribute("aria-busy", "true");
  try {
    await task();
  } catch (error) {
    toast(errorText(error), true);
  } finally {
    button.disabled = false;
    button.removeAttribute("aria-busy");
  }
}

function renderLogin() {
  root.innerHTML = `<div class="login-page"><header>${brand}<span class="header-note">人工智慧增強軟體工程 · 小組作業</span></header>
    <main class="login-layout"><section class="intro"><span class="eyebrow">GROUP 04 / 一起把想法做好</span>
      <h1>讓每一份努力，<br>都有<span>進度。</span></h1>
      <p>整理課堂任務，記下下一步。<br>從登入開始，讓今天的想法接上明天的行動。</p>
      <div class="preview-card" aria-hidden="true"><div class="preview-top"><span>本週的下一步</span><span>↗</span></div><div class="sample-task"><b>✓</b><span>準備專案開發環境<small>把基礎打好，再往前走</small></span><i>已完成</i></div><div class="sample-task"><b class="outlined">↗</b><span>完成登入與資料庫<small>讓每一次進度都被保存</small></span><i class="amber">進行中</i></div><div class="preview-progress"><span></span></div><small>一步一步，讓事情發生。</small></div>
      <div class="intro-footer"><span>01 / 整理</span><span>02 / 行動</span><span>03 / 完成</span></div>
    </section><section class="auth-card" aria-labelledby="auth-title"><span class="eyebrow">YOUR NEXT STEP STARTS HERE</span>
      <h2 id="auth-title">${mode === "login" ? "歡迎回來" : "開始你的第一步"}</h2><p>${mode === "login" ? "登入你的帳號，接續上次的進度。" : "建立帳號，讓你的任務有個家。"}</p>
      <div class="auth-tabs"><button id="login-tab" class="${mode === "login" ? "selected" : ""}" aria-pressed="${mode === "login"}">登入</button><button id="register-tab" class="${mode === "register" ? "selected" : ""}" aria-pressed="${mode === "register"}">註冊帳號</button></div>
      <button class="google-button" id="google-login"><b class="google-g">G</b>使用 Google 帳號${mode === "login" ? "登入" : "繼續"}</button>
      <div class="divider"><span>或使用電子郵件</span></div>
      <form id="auth-form">${mode === "register" ? '<label>顯示名稱<input name="name" autocomplete="nickname" maxlength="80" required placeholder="你希望大家怎麼稱呼你？"></label>' : ""}
      <label>電子郵件<input name="email" type="email" autocomplete="email" maxlength="254" required placeholder="you@example.com"></label>
      <label>密碼<input name="password" type="password" autocomplete="${mode === "login" ? "current-password" : "new-password"}" ${mode === "register" ? 'minlength="8"' : ""} maxlength="128" required placeholder="${mode === "login" ? "輸入你的密碼" : "至少 8 個字元"}"></label>
      ${mode === "login" ? '<button type="button" class="text-button forgot" id="forgot">忘記密碼？</button>' : ""}
      <button type="submit" class="primary full">${mode === "login" ? "登入工作台" : "建立帳號"}<span>↗</span></button></form>
      <p class="auth-footnote">你的待辦資料僅供自己的帳號存取。<br>Google 與密碼可在登入後連結為同一個帳號。</p>
    </section></main><footer class="login-footer">第 04 組 · 把每一步，變成看得見的進度。<span>2026 COURSE PROJECT</span></footer></div><div id="toast" role="status" aria-live="polite" class="toast"></div>`;
  get<HTMLButtonElement>("#login-tab").onclick = () => {
    mode = "login";
    renderLogin();
  };
  get<HTMLButtonElement>("#register-tab").onclick = () => {
    mode = "register";
    renderLogin();
  };
  get<HTMLButtonElement>("#google-login").onclick = (e) =>
    action(e.currentTarget as HTMLButtonElement, () =>
      signInWithPopup(auth, google),
    );
  get<HTMLFormElement>("#auth-form").onsubmit = (e) => {
    e.preventDefault();
    const form = e.currentTarget as HTMLFormElement;
    const data = new FormData(form);
    const email = String(data.get("email")).trim();
    const password = String(data.get("password"));
    const name = String(data.get("name") ?? "").trim();
    void action(form.querySelector('button[type="submit"]')!, async () => {
      if (mode === "register") {
        if (!name) {
          toast("請輸入顯示名稱。", true);
          return;
        }
        const result = await createUserWithEmailAndPassword(
          auth,
          email,
          password,
        );
        await updateProfile(result.user, { displayName: name });
        await ensureProfile(result.user);
        if (currentUser?.uid === result.user.uid) renderWorkspace();
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    });
  };
  const forgot = root.querySelector<HTMLButtonElement>("#forgot");
  if (forgot)
    forgot.onclick = () => {
      const email = get<HTMLInputElement>('input[name="email"]');
      if (!email.value || !email.checkValidity()) {
        email.reportValidity();
        email.focus();
        toast("請先輸入有效的電子郵件地址。", true);
        return;
      }
      if (!window.confirm(`要寄送密碼重設郵件至 ${email.value.trim()} 嗎？`))
        return;
      void action(forgot, async () => {
        await sendPasswordResetEmail(auth, email.value.trim());
        toast("若此信箱有可用帳號，你將收到密碼重設郵件。");
      });
    };
}

async function ensureProfile(user: User) {
  const ref = doc(db, "users", user.uid);
  const displayName = (
    user.displayName ||
    user.email?.split("@")[0] ||
    "使用者"
  ).slice(0, 80);
  await runTransaction(db, async (transaction) => {
    const existing = await transaction.get(ref);
    if (existing.exists())
      transaction.update(ref, { displayName, updatedAt: serverTimestamp() });
    else
      transaction.set(ref, {
        uid: user.uid,
        displayName,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
  });
}

function renderWorkspace() {
  const user = currentUser!;
  const name = user.displayName || user.email?.split("@")[0] || "使用者";
  root.innerHTML = `<div class="workspace"><aside class="sidebar">${brand}<span class="nav-caption">我的工作空間</span><nav aria-label="工作台導覽"><button id="nav-tasks" class="nav-button ${view === "tasks" ? "active" : ""}"><span>▦</span>我的任務<span class="nav-arrow">↗</span></button><button id="nav-account" class="nav-button ${view === "account" ? "active" : ""}"><span>◉</span>帳號設定</button></nav><div class="sidebar-note"><span>MAKE IT HAPPEN</span><p>好的進度，<br>從下一小步開始。</p><div class="tiny-line"></div></div><div class="sidebar-user"><span class="avatar">${esc(Array.from(name)[0])}</span><div><b>${esc(name)}</b><small>個人工作空間</small></div><button id="logout" class="icon-button" aria-label="登出">↪</button></div></aside>
    <div class="workspace-body"><header class="workspace-header"><span>第 04 組 <span class="slash">/</span> ${view === "tasks" ? "我的任務" : "帳號設定"}</span><span class="connection" id="connection">${ready ? "已連線" : "正在連接資料庫"}</span></header><main id="workspace-main"></main><footer class="workspace-footer">GROUP 04 · COURSE WORKSPACE<span>一小步，也是一種前進。</span></footer></div></div><div id="toast" role="status" aria-live="polite" class="toast"></div>`;
  get<HTMLButtonElement>("#nav-tasks").onclick = () => {
    view = "tasks";
    renderWorkspace();
  };
  get<HTMLButtonElement>("#nav-account").onclick = () => {
    view = "account";
    renderWorkspace();
  };
  get<HTMLButtonElement>("#logout").onclick = (e) =>
    action(e.currentTarget as HTMLButtonElement, () => signOut(auth));
  if (view === "tasks") renderTasksPage();
  else renderAccount();
}

function renderTasksPage() {
  get<HTMLElement>("#workspace-main").innerHTML =
    `<section class="page-heading"><div><span class="eyebrow">A LITTLE PROGRESS, EVERY DAY</span><h1>今天，往前一點。</h1><p>把想法整理成任務，把任務慢慢變成完成。</p></div><span class="date-badge">${esc(new Intl.DateTimeFormat("zh-TW", { month: "long", day: "numeric", weekday: "long" }).format(new Date()))}</span></section>
    <section class="stats" aria-label="任務統計"><article><span>全部任務</span><b id="count-all">—</b><small>每個想法的起點</small></article><article><span><i class="dot amber-dot"></i>進行中</span><b id="count-doing">—</b><small>專注在眼前這一步</small></article><article><span><i class="dot"></i>已完成</span><b id="count-done">—</b><small>值得記下的小小成就</small></article></section>
    <section class="task-section"><div class="section-heading"><h2>我的任務<span> / MY TASKS</span></h2><button class="primary" id="new-task" ${ready ? "" : "disabled"}>＋ 新增任務</button></div><div class="task-toolbar"><div class="filters" role="group" aria-label="任務狀態篩選">${(["all", "todo", "doing", "done"] as const).map((s) => `<button data-filter="${s}" class="${filter === s ? "selected" : ""}" aria-pressed="${filter === s}">${s === "all" ? "全部" : labels[s]}</button>`).join("")}</div><label class="search"><span>⌕</span><input id="search" type="search" placeholder="搜尋任務" aria-label="搜尋任務" value="${esc(search)}"></label></div><div id="task-list" aria-live="polite"></div><p class="list-note">顯示最近 100 筆任務 · 僅供自己的帳號存取</p></section>`;
  get<HTMLButtonElement>("#new-task").onclick = () => openTaskDialog();
  root.querySelectorAll<HTMLButtonElement>("[data-filter]").forEach(
    (button) =>
      (button.onclick = () => {
        filter = button.dataset.filter as typeof filter;
        root
          .querySelectorAll<HTMLButtonElement>("[data-filter]")
          .forEach((b) => {
            b.classList.toggle("selected", b === button);
            b.setAttribute("aria-pressed", String(b === button));
          });
        renderTaskList();
      }),
  );
  get<HTMLInputElement>("#search").oninput = (e) => {
    search = (e.currentTarget as HTMLInputElement).value;
    renderTaskList();
  };
  renderTaskList();
}

function renderTaskList() {
  if (!currentUser || view !== "tasks" || !root.querySelector("#task-list"))
    return;
  get<HTMLElement>("#count-all").textContent = loadingTasks
    ? "—"
    : String(tasks.length);
  get<HTMLElement>("#count-doing").textContent = loadingTasks
    ? "—"
    : String(tasks.filter((t) => t.status === "doing").length);
  get<HTMLElement>("#count-done").textContent = loadingTasks
    ? "—"
    : String(tasks.filter((t) => t.status === "done").length);
  const visible = tasks.filter(
    (t) =>
      (filter === "all" || t.status === filter) &&
      `${t.title} ${t.notes}`
        .toLocaleLowerCase()
        .includes(search.toLocaleLowerCase()),
  );
  get<HTMLElement>("#task-list").innerHTML = loadingTasks
    ? '<div class="empty-state"><span class="empty-icon">⋯</span><h3>正在讀取你的任務</h3><p>稍候一下，進度馬上就到。</p></div>'
    : !visible.length
      ? `<div class="empty-state"><span class="empty-icon">${tasks.length ? "⌕" : "↗"}</span><h3>${tasks.length ? "沒有符合的任務" : "從第一個小目標開始"}</h3><p>${tasks.length ? "試試其他關鍵字或狀態。" : "點選「新增任務」，為今天留下一個開始。"}</p></div>`
      : visible
          .map(
            (t) =>
              `<article class="task-row ${t.status === "done" ? "completed" : ""}"><span class="task-symbol">${t.status === "done" ? "✓" : t.status === "doing" ? "↗" : "○"}</span><div class="task-copy"><h3>${esc(t.title)}</h3>${t.notes ? `<p>${esc(t.notes)}</p>` : ""}<small>${t.createdAt ? esc(t.createdAt.toDate().toLocaleDateString("zh-TW")) : "正在儲存…"}</small></div><label class="status-control"><span class="sr-only">${esc(t.title)}的狀態</span><select data-status="${esc(t.id)}">${Object.entries(
                labels,
              )
                .map(
                  ([value, label]) =>
                    `<option value="${value}" ${t.status === value ? "selected" : ""}>${label}</option>`,
                )
                .join(
                  "",
                )}</select></label><button class="icon-button" data-edit="${esc(t.id)}" aria-label="編輯 ${esc(t.title)}">✎</button><button class="icon-button delete" data-delete="${esc(t.id)}" aria-label="刪除 ${esc(t.title)}">×</button></article>`,
          )
          .join("");
  root.querySelectorAll<HTMLSelectElement>("[data-status]").forEach(
    (select) =>
      (select.onchange = async () => {
        select.disabled = true;
        try {
          await updateDoc(
            doc(db, "users", currentUser!.uid, "tasks", select.dataset.status!),
            { status: select.value, updatedAt: serverTimestamp() },
          );
        } catch (error) {
          toast(errorText(error), true);
          renderTaskList();
        } finally {
          select.disabled = false;
        }
      }),
  );
  root
    .querySelectorAll<HTMLButtonElement>("[data-edit]")
    .forEach(
      (button) =>
        (button.onclick = () =>
          openTaskDialog(tasks.find((t) => t.id === button.dataset.edit))),
    );
  root.querySelectorAll<HTMLButtonElement>("[data-delete]").forEach(
    (button) =>
      (button.onclick = () => {
        const task = tasks.find((t) => t.id === button.dataset.delete)!;
        if (!window.confirm(`確定刪除「${task.title}」？此操作無法復原。`))
          return;
        void action(button, async () => {
          await deleteDoc(doc(db, "users", currentUser!.uid, "tasks", task.id));
          toast("任務已刪除。");
        });
      }),
  );
}

function openTaskDialog(task?: Task) {
  const dialog = document.createElement("dialog");
  dialog.className = "task-dialog";
  dialog.innerHTML = `<form><div class="dialog-heading"><h2>${task ? "編輯任務" : "新增一個小目標"}</h2><button type="button" class="icon-button" id="close-dialog" aria-label="關閉">×</button></div><label>任務名稱<input name="title" required maxlength="160" placeholder="接下來想完成什麼？" value="${esc(task?.title ?? "")}"></label><label>補充說明 <span class="optional">選填</span><textarea name="notes" maxlength="2000" rows="4" placeholder="記下需要留意的細節…">${esc(task?.notes ?? "")}</textarea></label><label>狀態<select name="status">${Object.entries(
    labels,
  )
    .map(
      ([value, label]) =>
        `<option value="${value}" ${(task?.status ?? "todo") === value ? "selected" : ""}>${label}</option>`,
    )
    .join(
      "",
    )}</select></label><div class="dialog-actions"><button type="button" class="secondary" id="cancel-dialog">取消</button><button type="submit" class="primary">${task ? "儲存變更" : "新增任務"} ↗</button></div><p class="form-error" role="alert"></p></form>`;
  document.body.append(dialog);
  dialog.addEventListener("close", () => dialog.remove());
  dialog.querySelector<HTMLButtonElement>("#close-dialog")!.onclick = () =>
    dialog.close();
  dialog.querySelector<HTMLButtonElement>("#cancel-dialog")!.onclick = () =>
    dialog.close();
  dialog.querySelector("form")!.onsubmit = async (e) => {
    e.preventDefault();
    const form = e.currentTarget as HTMLFormElement;
    const data = new FormData(form);
    const title = String(data.get("title")).trim();
    const error = form.querySelector<HTMLElement>(".form-error")!;
    if (!title) {
      error.textContent = "任務名稱不能只有空白。";
      return;
    }
    const button = form.querySelector<HTMLButtonElement>(
      'button[type="submit"]',
    )!;
    button.disabled = true;
    try {
      if (!currentUser || !ready) throw new Error("not-ready");
      const fields = {
        title,
        notes: String(data.get("notes")).trim(),
        status: String(data.get("status")),
        updatedAt: serverTimestamp(),
      };
      if (task)
        await updateDoc(
          doc(db, "users", currentUser.uid, "tasks", task.id),
          fields,
        );
      else
        await addDoc(collection(db, "users", currentUser.uid, "tasks"), {
          ...fields,
          ownerUid: currentUser.uid,
          createdAt: serverTimestamp(),
        });
      dialog.close();
      toast(task ? "變更已儲存。" : "任務已新增，往前一步！");
    } catch (err) {
      error.textContent = errorText(err);
    } finally {
      button.disabled = false;
    }
  };
  dialog.showModal();
}

function renderAccount() {
  const user = currentUser!;
  const hasGoogle = user.providerData.some(
    (p) => p.providerId === "google.com",
  );
  const hasPassword = user.providerData.some(
    (p) => p.providerId === "password",
  );
  get<HTMLElement>("#workspace-main").innerHTML =
    `<section class="page-heading"><div><span class="eyebrow">ONE ACCOUNT, YOUR PROGRESS</span><h1>你的帳號，你的進度。</h1><p>連結登入方式，讓資料始終留在同一個帳號。</p></div></section><section class="account-card"><h2>帳號資訊</h2><dl><div><dt>電子郵件</dt><dd>${esc(user.email)}</dd></div><div><dt>使用者 ID</dt><dd class="uid">${esc(user.uid)}</dd></div></dl><div class="provider"><div><b>Google 帳號</b><p>${hasGoogle ? "已連結，可使用 Google 登入。" : "連結後可用 Google 登入相同帳號。"}</p></div>${hasGoogle ? '<span class="provider-badge">已連結 ✓</span>' : '<button class="secondary" id="link-google">連結 Google</button>'}</div><div class="provider"><div><b>電子郵件與密碼</b><p>${hasPassword ? "已連結，可使用電子郵件與密碼登入。" : "為目前的 Google 帳號新增密碼登入方式。"}</p></div>${hasPassword ? '<span class="provider-badge">已連結 ✓</span>' : ""}</div>${!hasPassword ? '<form id="link-password"><label>新增密碼<input name="password" type="password" autocomplete="new-password" minlength="8" maxlength="128" required placeholder="至少 8 個字元"></label><label>確認密碼<input name="confirm" type="password" autocomplete="new-password" minlength="8" maxlength="128" required placeholder="再輸入一次密碼"></label><button class="primary" type="submit">連結密碼登入 ↗</button></form>' : '<p class="account-help">若忘記密碼，可登出後在登入頁面申請重設。</p>'}<div class="account-note">連結時會驗證你對登入方式的控制權，不會僅憑相同信箱合併兩個既有帳號。連結成功後，兩種登入方式使用相同的使用者 ID 與待辦資料。</div></section>`;
  const linkGoogle = root.querySelector<HTMLButtonElement>("#link-google");
  if (linkGoogle)
    linkGoogle.onclick = () =>
      action(linkGoogle, async () => {
        await linkWithPopup(user, google);
        renderAccount();
        toast("Google 已連結，原本的任務資料會保留。");
      });
  const passwordForm = root.querySelector<HTMLFormElement>("#link-password");
  if (passwordForm)
    passwordForm.onsubmit = (e) => {
      e.preventDefault();
      const data = new FormData(passwordForm);
      const password = String(data.get("password"));
      if (password !== data.get("confirm")) {
        toast("兩次密碼輸入不一致。", true);
        return;
      }
      void action(
        passwordForm.querySelector<HTMLButtonElement>("button")!,
        async () => {
          // Set a password on the signed-in Google user. This keeps the same UID
          // and avoids the linkWithCredential email-already-in-use SDK issue.
          await updatePassword(user, password);
          await reload(user);
          passwordForm.reset();
          renderAccount();
          toast("密碼登入已連結，兩種方式會使用同一個帳號。");
        },
      );
    };
}

root.innerHTML = '<main class="loading-screen">正在開啟第 04 組工作台…</main>';
onAuthStateChanged(auth, async (user) => {
  const revision = ++authRevision;
  stopTasks?.();
  stopTasks = undefined;
  document.querySelectorAll("dialog").forEach((d) => d.remove());
  tasks = [];
  ready = false;
  loadingTasks = true;
  currentUser = user;
  if (!user) {
    view = "tasks";
    filter = "all";
    search = "";
    renderLogin();
    return;
  }
  renderWorkspace();
  try {
    await ensureProfile(user);
    if (revision !== authRevision) return;
    ready = true;
    get<HTMLElement>("#connection").textContent = "已連線";
    const newButton = root.querySelector<HTMLButtonElement>("#new-task");
    if (newButton) newButton.disabled = false;
    stopTasks = onSnapshot(
      query(
        collection(db, "users", user.uid, "tasks"),
        orderBy("createdAt", "desc"),
        limit(100),
      ),
      { includeMetadataChanges: true },
      (snapshot) => {
        if (revision !== authRevision) return;
        tasks = snapshot.docs.map((d) => ({ ...d.data(), id: d.id }) as Task);
        loadingTasks = false;
        get<HTMLElement>("#connection").textContent = snapshot.metadata
          .hasPendingWrites
          ? "正在同步…"
          : snapshot.metadata.fromCache
            ? "正在連線…"
            : "已同步至雲端";
        renderTaskList();
      },
      (error) => {
        loadingTasks = false;
        ready = false;
        get<HTMLElement>("#connection").textContent = "資料連線失敗";
        const button = root.querySelector<HTMLButtonElement>("#new-task");
        if (button) button.disabled = true;
        renderTaskList();
        toast(errorText(error), true);
      },
    );
  } catch (error) {
    if (revision !== authRevision) return;
    loadingTasks = false;
    get<HTMLElement>("#connection").textContent = "資料連線失敗";
    renderTaskList();
    toast(`${errorText(error)} 請重新整理頁面以重試。`, true);
  }
});
