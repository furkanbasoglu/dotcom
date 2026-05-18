/**
 * LaTeX Derleyici — SPA logic
 *
 * Yapı:
 *  - Clerk JS yükle (publishable key window.__APP_CONFIG__ üzerinden)
 *  - Monaco editor başlat (default LaTeX template)
 *  - "Derle" → /api/compile çağır (auth header'ı Clerk'ten)
 *  - PDF.js ile sonuç PDF'ini render
 *  - Log paneli ile durum bildir
 *
 * Stub aşaması (Tunnel + VM API henüz yok):
 *  - /api/compile şu an 503 dönüyor
 *  - Kullanıcı yine de UI'da derleme akışını test edebilir
 */

const CONFIG = window.__APP_CONFIG__ || { CLERK_PUBLISHABLE_KEY: '', API_BASE: '/api' };

const DEFAULT_TEX = `\\documentclass{article}
\\usepackage[utf8]{inputenc}
\\usepackage[T1]{fontenc}

\\title{Merhaba LaTeX}
\\author{Furkan}

\\begin{document}
\\maketitle

\\section{Giriş}
Bu basit bir LaTeX deneme dosyasıdır. Düzenle, "Derle" tuşuna bas.

\\section{Matematik}
Klasik bir denklem:
$$E = mc^2$$

İntegrale ne dersin?
$$\\int_0^\\infty e^{-x^2}\\,dx = \\frac{\\sqrt{\\pi}}{2}$$

\\end{document}
`;

// ──────────────────────────────────────────────────────────────────
// DOM elements
// ──────────────────────────────────────────────────────────────────
const els = {
  editorHost: document.getElementById('editor'),
  editorMeta: document.getElementById('editor-meta'),
  btnCompile: document.getElementById('btn-compile'),
  btnDownload: document.getElementById('btn-download'),
  btnSignIn: document.getElementById('btn-sign-in'),
  btnSignUp: document.getElementById('btn-sign-up'),
  btnSignOut: document.getElementById('btn-sign-out'),
  btnClearLogs: document.getElementById('btn-clear-logs'),
  authLoading: document.getElementById('auth-loading'),
  authSignedOut: document.getElementById('auth-signed-out'),
  authSignedIn: document.getElementById('auth-signed-in'),
  userEmail: document.getElementById('user-email'),
  tierBadge: document.getElementById('tier-badge'),
  logsBody: document.getElementById('logs-body'),
  pdfViewer: document.getElementById('pdf-viewer'),
  pdfMeta: document.getElementById('pdf-meta'),
};

let editor = null;
let lastPdfBlob = null;
let clerk = null;

// ──────────────────────────────────────────────────────────────────
// Logging
// ──────────────────────────────────────────────────────────────────
function log(msg, level = 'info') {
  const time = new Date().toTimeString().slice(0, 8);
  const cls = `log-${level}`;
  const line = document.createElement('span');
  line.className = cls;
  line.textContent = `[${time}] ${msg}\n`;
  els.logsBody.appendChild(line);
  els.logsBody.scrollTop = els.logsBody.scrollHeight;
}

els.btnClearLogs.addEventListener('click', () => { els.logsBody.textContent = ''; });

// ──────────────────────────────────────────────────────────────────
// Monaco editor
// ──────────────────────────────────────────────────────────────────
function initEditor() {
  return new Promise((resolve) => {
    require.config({
      paths: { vs: 'https://cdn.jsdelivr.net/npm/monaco-editor@0.45.0/min/vs' }
    });
    require(['vs/editor/editor.main'], () => {
      editor = monaco.editor.create(els.editorHost, {
        value: DEFAULT_TEX,
        language: 'latex',
        theme: 'vs-dark',
        fontSize: 13,
        fontFamily: '"JetBrains Mono", "Courier New", monospace',
        minimap: { enabled: false },
        scrollBeyondLastLine: false,
        wordWrap: 'on',
        automaticLayout: true,
        renderLineHighlight: 'gutter',
        padding: { top: 8 },
      });
      updateEditorMeta();
      editor.onDidChangeModelContent(updateEditorMeta);
      log('Editor hazır.', 'ok');
      resolve();
    });
  });
}

function updateEditorMeta() {
  if (!editor) return;
  const model = editor.getModel();
  const lines = model.getLineCount();
  const chars = model.getValueLength();
  const kb = (chars / 1024).toFixed(1);
  els.editorMeta.textContent = `${kb} KB · ${lines} satır`;
}

// ──────────────────────────────────────────────────────────────────
// Clerk auth
// ──────────────────────────────────────────────────────────────────
/**
 * Clerk publishable key formatı: pk_<env>_<base64(frontend-api-url + "$")>
 * Örn: pk_test_cHJldHHR5LXRpZ2V... → "pretty-tiger-XX.clerk.accounts.dev$"
 *
 * Frontend API URL'i decode edip oradan Clerk script'ini yüklüyoruz.
 * (jsdelivr CDN'inde @clerk/clerk-js'in .mjs build'i artık yok; resmi yol bu.)
 */
function decodeClerkFrontendApi(publishableKey) {
  const parts = publishableKey.split('_');
  if (parts.length < 3) return null;
  const b64 = parts.slice(2).join('_');
  try {
    const decoded = atob(b64.replace(/-/g, '+').replace(/_/g, '/'));
    return decoded.replace(/\$$/, '');
  } catch {
    return null;
  }
}

function loadScript(src, attrs = {}) {
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = src;
    s.crossOrigin = 'anonymous';
    s.async = false;
    for (const [k, v] of Object.entries(attrs)) s.setAttribute(k, v);
    s.onload = () => resolve();
    s.onerror = () => reject(new Error(`Script yüklenemedi: ${src}`));
    document.head.appendChild(s);
  });
}

async function initClerk() {
  if (!CONFIG.CLERK_PUBLISHABLE_KEY) {
    log('Clerk publishable key ayarlanmamış. Auth devre dışı (geliştirme modu).', 'warn');
    showSignedOutState();
    return;
  }

  const frontendApi = decodeClerkFrontendApi(CONFIG.CLERK_PUBLISHABLE_KEY);
  if (!frontendApi) {
    log('Clerk publishable key formatı geçersiz.', 'error');
    showSignedOutState();
    return;
  }

  try {
    // Resmi script tag yöntemi — Clerk kendi instance URL'inden yüklenir
    await loadScript(
      `https://${frontendApi}/npm/@clerk/clerk-js@5/dist/clerk.browser.js`,
      { 'data-clerk-publishable-key': CONFIG.CLERK_PUBLISHABLE_KEY },
    );

    // window.Clerk'in hazır olmasını bekle (script onload sonrası kısa bir gecikme olabilir)
    const start = Date.now();
    while (Date.now() - start < 5000) {
      if (typeof window.Clerk !== 'undefined') break;
      await new Promise(r => setTimeout(r, 50));
    }

    if (typeof window.Clerk === 'undefined') {
      log('Clerk script yüklendi ama window.Clerk 5sn içinde hazır olmadı.', 'error');
      showSignedOutState();
      return;
    }

    // window.Clerk constructor mu yoksa zaten instance mı? İkisini de destekle.
    if (typeof window.Clerk === 'function') {
      clerk = new window.Clerk(CONFIG.CLERK_PUBLISHABLE_KEY);
      await clerk.load();
    } else {
      clerk = window.Clerk;
      // Auto-init varsa zaten loaded olabilir
      if (!clerk.loaded) {
        await clerk.load();
      }
    }

    clerk.addListener(({ user }) => {
      if (user) showSignedInState(user);
      else showSignedOutState();
    });

    if (clerk.user) showSignedInState(clerk.user);
    else showSignedOutState();

    log('Clerk hazır.', 'ok');
  } catch (err) {
    log('Clerk yüklenemedi: ' + (err?.message || err), 'error');
    showSignedOutState();
  }
}

function showSignedOutState() {
  els.authLoading.style.display = 'none';
  els.authSignedOut.style.display = 'flex';
  els.authSignedIn.style.display = 'none';
  els.btnCompile.disabled = true;
  els.btnCompile.title = 'Derlemek için giriş yap';
  els.tierBadge.textContent = '—';
  els.tierBadge.removeAttribute('data-tier');
}

function showSignedInState(user) {
  els.authLoading.style.display = 'none';
  els.authSignedOut.style.display = 'none';
  els.authSignedIn.style.display = 'flex';
  const email = user?.primaryEmailAddress?.emailAddress || user?.emailAddresses?.[0]?.emailAddress || user?.id || 'Kullanıcı';
  els.userEmail.textContent = email;
  els.btnCompile.disabled = false;
  els.btnCompile.title = '';
  // Tier şu an Clerk'ten gelmez; ileride D1'den çekilecek
  els.tierBadge.textContent = 'Free';
  els.tierBadge.setAttribute('data-tier', 'free');
}

els.btnSignIn.addEventListener('click', () => {
  if (!clerk) {
    log('Auth servisi hazır değil.', 'warn');
    return;
  }
  clerk.openSignIn();
});

els.btnSignUp.addEventListener('click', () => {
  if (!clerk) {
    log('Auth servisi hazır değil.', 'warn');
    return;
  }
  clerk.openSignUp();
});

els.btnSignOut.addEventListener('click', async () => {
  if (!clerk) return;
  await clerk.signOut();
  log('Çıkış yapıldı.', 'info');
});

// ──────────────────────────────────────────────────────────────────
// Compile flow
// ──────────────────────────────────────────────────────────────────
els.btnCompile.addEventListener('click', async () => {
  if (!editor) return;
  const source = editor.getValue();
  if (!source.trim()) {
    log('Editör boş.', 'warn');
    return;
  }
  if (source.length > 500_000) {
    log('Dosya çok büyük (>500KB). Şimdilik küçük tutalım.', 'warn');
    return;
  }

  els.btnCompile.disabled = true;
  els.btnDownload.disabled = true;
  log('Derleme isteği gönderiliyor…', 'info');

  try {
    const token = clerk?.session ? await clerk.session.getToken() : null;
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`${CONFIG.API_BASE}/compile`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        files: { 'main.tex': source },
        entry: 'main.tex',
        engine: 'pdflatex',
      }),
    });

    if (res.status === 503) {
      const data = await res.json().catch(() => ({}));
      log('Servis henüz hazırlanma aşamasında: ' + (data.detail || 'derleme motoru bağlı değil'), 'warn');
      return;
    }
    if (res.status === 401) {
      log('Yetkisiz. Lütfen giriş yap.', 'error');
      return;
    }
    if (res.status === 429) {
      log('Çok fazla istek. Birazdan tekrar dene.', 'warn');
      return;
    }
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      log('Hata: ' + (data.error || res.statusText), 'error');
      return;
    }

    // Content type'a göre ayır:
    //  - application/pdf  → direkt PDF
    //  - application/json → log/hata
    const ct = res.headers.get('Content-Type') || '';
    if (ct.includes('application/pdf')) {
      const blob = await res.blob();
      lastPdfBlob = blob;
      await renderPdf(blob);
      els.btnDownload.disabled = false;
      log(`Derleme başarılı (${(blob.size / 1024).toFixed(1)} KB).`, 'ok');
    } else {
      const data = await res.json().catch(() => ({}));
      if (data.log) log(data.log, 'error');
      else log('Beklenmedik yanıt.', 'error');
    }
  } catch (err) {
    log('Ağ hatası: ' + (err?.message || err), 'error');
  } finally {
    els.btnCompile.disabled = false;
  }
});

els.btnDownload.addEventListener('click', () => {
  if (!lastPdfBlob) return;
  const url = URL.createObjectURL(lastPdfBlob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'main.pdf';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});

// ──────────────────────────────────────────────────────────────────
// PDF rendering (PDF.js)
// ──────────────────────────────────────────────────────────────────
async function renderPdf(blob) {
  els.pdfViewer.innerHTML = '';
  const buf = await blob.arrayBuffer();

  // PDF.js'i dinamik import et
  const pdfjs = await import('https://cdn.jsdelivr.net/npm/pdfjs-dist@4.7.76/build/pdf.min.mjs');
  pdfjs.GlobalWorkerOptions.workerSrc =
    'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.7.76/build/pdf.worker.min.mjs';

  const doc = await pdfjs.getDocument({ data: buf }).promise;
  els.pdfMeta.textContent = `${doc.numPages} sayfa · ${(blob.size / 1024).toFixed(1)} KB`;

  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const scale = 1.5;
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement('canvas');
    canvas.className = 'pdf-canvas';
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext('2d');
    els.pdfViewer.appendChild(canvas);
    await page.render({ canvasContext: ctx, viewport }).promise;
  }
}

// ──────────────────────────────────────────────────────────────────
// Bootstrap
// ──────────────────────────────────────────────────────────────────
(async () => {
  log('Sistem başlatılıyor…', 'info');
  await initEditor();
  await initClerk();
})();
