/**
 * LaTeX Derleyici — SPA logic
 *
 * Yapı:
 *  - Clerk JS yükle (publishable key window.__APP_CONFIG__ üzerinden)
 *  - Monaco editor başlat (çok dosyalı: dosya başına ayrı model)
 *  - Sol panelde Overleaf tarzı dosya ağacı (ekle / sil / yeniden adlandır / ana yap)
 *  - Görsel (PNG/JPG vb.) yükleme → base64 ile files'a binary olarak girer
 *  - "Derle" → /api/compile çağır (tüm proje tek files objesinde, auth Clerk'ten)
 *  - PDF.js ile sonuç PDF'ini render
 *  - Log paneli ile durum bildir
 *
 * Dosyalar şu an SADECE tarayıcı belleğinde yaşar (oturum-içi). Sayfa yenilenince
 * sıfırlanır. Kalıcı depolama (R2/D1) sonraki aşamada eklenecek.
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
// Şablonlar — yeni projede seçilebilir (içerikleri R2'ye yazılır).
// Hepsinin entry'si 'main.tex'.
// ──────────────────────────────────────────────────────────────────
const TEMPLATES = {
  empty: {
    label: 'Boş',
    files: {
      'main.tex': `\\documentclass{article}\n\\usepackage[utf8]{inputenc}\n\\begin{document}\n\n\\end{document}\n`,
    },
  },
  article: {
    label: 'Makale',
    files: { 'main.tex': DEFAULT_TEX },
  },
  letter: {
    label: 'Mektup',
    files: {
      'main.tex': `\\documentclass{letter}\n\\usepackage[utf8]{inputenc}\n\\signature{Furkan Başoğlu}\n\\address{İstanbul, Türkiye}\n\\begin{document}\n\\begin{letter}{Sayın Alıcı\\\\ Adres satırı}\n\\opening{Sayın Yetkili,}\n\nMektubun gövdesi burada.\n\n\\closing{Saygılarımla,}\n\\end{letter}\n\\end{document}\n`,
    },
  },
  beamer: {
    label: 'Sunum (Beamer)',
    files: {
      'main.tex': `\\documentclass{beamer}\n\\usepackage[utf8]{inputenc}\n\\usetheme{Madrid}\n\\title{Sunum Başlığı}\n\\author{Furkan}\n\\date{\\today}\n\\begin{document}\n\\frame{\\titlepage}\n\\begin{frame}{Giriş}\n\\begin{itemize}\n\\item Birinci madde\n\\item İkinci madde\n\\end{itemize}\n\\end{frame}\n\\begin{frame}{Sonuç}\nÖzet ve kapanış.\n\\end{frame}\n\\end{document}\n`,
    },
  },
};

// ──────────────────────────────────────────────────────────────────
// DOM elements
// ──────────────────────────────────────────────────────────────────
const els = {
  editorHost: document.getElementById('editor'),
  binaryPreview: document.getElementById('binary-preview'),
  editorTitle: document.getElementById('editor-title'),
  editorMeta: document.getElementById('editor-meta'),
  treeList: document.getElementById('file-tree'),
  btnNewFile: document.getElementById('btn-new-file'),
  btnUpload: document.getElementById('btn-upload'),
  uploadInput: document.getElementById('upload-input'),
  btnCompile: document.getElementById('btn-compile'),
  engineSelect: document.getElementById('engine-select'),
  btnDownload: document.getElementById('btn-download'),
  btnSignIn: document.getElementById('btn-sign-in'),
  btnSignUp: document.getElementById('btn-sign-up'),
  btnSignOut: document.getElementById('btn-sign-out'),
  btnUpgrade: document.getElementById('btn-upgrade'),
  btnClearLogs: document.getElementById('btn-clear-logs'),
  authLoading: document.getElementById('auth-loading'),
  authSignedOut: document.getElementById('auth-signed-out'),
  authSignedIn: document.getElementById('auth-signed-in'),
  userEmail: document.getElementById('user-email'),
  tierBadge: document.getElementById('tier-badge'),
  logsBody: document.getElementById('logs-body'),
  pdfViewer: document.getElementById('pdf-viewer'),
  pdfMeta: document.getElementById('pdf-meta'),
  pdfZoomOut: document.getElementById('pdf-zoom-out'),
  pdfZoomBadge: document.getElementById('pdf-zoom-badge'),
  pdfZoomIn: document.getElementById('pdf-zoom-in'),
  pdfFitWidth: document.getElementById('pdf-fit-width'),
  pdfPrev: document.getElementById('pdf-prev'),
  pdfPageInput: document.getElementById('pdf-page-input'),
  pdfPageTotal: document.getElementById('pdf-page-total'),
  pdfNext: document.getElementById('pdf-next'),
  pdfFitPage: document.getElementById('pdf-fit-page'),
  pdfSearch: document.getElementById('pdf-search'),
  pdfSearchPrev: document.getElementById('pdf-search-prev'),
  pdfSearchNext: document.getElementById('pdf-search-next'),
  pdfSearchCount: document.getElementById('pdf-search-count'),
  outlineList: document.getElementById('outline-list'),
  modalSelect: document.getElementById('modal-select'),
  modalSelectLabel: document.getElementById('modal-select-label'),
};

let editor = null;
let lastPdfBlob = null;
let clerk = null;

// Proje durumu (oturum-içi)
//  files: [{ name, kind:'text'|'binary', model?(Monaco), data?(base64), mime?, isMain }]
const project = { files: [], activeName: null };

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
// Proje / dosya ağacı
// ──────────────────────────────────────────────────────────────────
function findFile(name) { return project.files.find((f) => f.name === name); }

function validName(n) {
  if (!n || n.length > 120) return false;
  if (n.includes('..') || n.startsWith('/') || n.includes('\\') || n.includes('\0')) return false;
  return /^[A-Za-z0-9._/-]+$/.test(n);
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(',')[1] || '');
    r.onerror = () => reject(new Error('Dosya okunamadı'));
    r.readAsDataURL(file);
  });
}

function approxBytes(b64) { return Math.round((b64 ? b64.length : 0) * 3 / 4); }

function setMainSilent(name) {
  const f = findFile(name);
  if (!f || f.kind !== 'text') return;
  project.files.forEach((x) => { x.isMain = (x === f); });
}

function setMain(name) {
  setMainSilent(name);
  renderTree();
  log(`Ana dosya: ${name}`, 'info');
}

function getEntry() {
  const m = project.files.find((f) => f.isMain && f.kind === 'text');
  if (m) return m.name;
  const t = project.files.find((f) => f.kind === 'text');
  return t ? t.name : 'main.tex';
}

function addTextFile(name, content, opts = {}) {
  const model = monaco.editor.createModel(content, 'latex');
  const file = { name, kind: 'text', model, isMain: false };
  project.files.push(file);
  if (opts.main) setMainSilent(name);
  return file;
}

function addBinaryFile(name, b64, mime) {
  const file = { name, kind: 'binary', data: b64, mime: mime || 'application/octet-stream', isMain: false };
  project.files.push(file);
  return file;
}

function buildCompileFiles() {
  const files = {};
  for (const f of project.files) {
    if (f.kind === 'text') files[f.name] = f.model.getValue();
    else files[f.name] = { encoding: 'base64', data: f.data };
  }
  return files;
}

function openFile(name) {
  const f = findFile(name);
  if (!f) return;
  project.activeName = name;
  els.editorTitle.textContent = name;
  if (f.kind === 'text') {
    els.binaryPreview.style.display = 'none';
    els.editorHost.style.display = 'block';
    editor.setModel(f.model);
    editor.layout();
  } else {
    els.editorHost.style.display = 'none';
    els.binaryPreview.style.display = 'flex';
    els.binaryPreview.innerHTML = '';
    const img = document.createElement('img');
    img.src = `data:${f.mime};base64,${f.data}`;
    img.alt = name;
    els.binaryPreview.appendChild(img);
  }
  updateEditorMeta();
  renderTree();
  refreshOutline();
}

async function deleteFile(name) {
  const f = findFile(name);
  if (!f) return;
  if (project.files.length <= 1) { log('Son dosya silinemez.', 'warn'); return; }
  if (f.isMain) { log('Ana dosya silinemez. Önce başka bir dosyayı ana yap.', 'warn'); return; }
  if (!(await uiConfirm(`"${name}" silinsin mi?`, { okText: 'Sil', danger: true }))) return;
  if (f.kind === 'text' && f.model) f.model.dispose();
  project.files = project.files.filter((x) => x !== f);
  if (project.activeName === name) openFile(getEntry());
  else renderTree();
  log(`Silindi: ${name}`, 'info');
}

async function renameFile(name) {
  const f = findFile(name);
  if (!f) return;
  const input = await uiPrompt('Yeni ad:', name);
  if (input == null) return;
  const clean = input.trim();
  if (clean === name) return;
  if (!validName(clean)) { log('Geçersiz dosya adı.', 'warn'); return; }
  if (findFile(clean)) { log('Bu isimde dosya zaten var.', 'warn'); return; }
  f.name = clean;
  if (project.activeName === name) {
    project.activeName = clean;
    els.editorTitle.textContent = clean;
  }
  renderTree();
}

function mkBtn(text, title, onclick) {
  const b = document.createElement('button');
  b.className = 'row-btn';
  b.type = 'button';
  b.title = title;
  b.textContent = text;
  b.addEventListener('click', onclick);
  return b;
}

function renderTree() {
  els.treeList.innerHTML = '';
  for (const f of project.files) {
    const li = document.createElement('li');
    li.className = 'file-item' + (f.name === project.activeName ? ' active' : '');

    const nameWrap = document.createElement('span');
    nameWrap.className = 'file-name';

    const icon = document.createElement('span');
    icon.className = 'file-icon';
    icon.textContent = f.kind === 'binary' ? '🖼' : '📄';
    nameWrap.appendChild(icon);

    const label = document.createElement('span');
    label.className = 'file-label';
    label.textContent = f.name;
    nameWrap.appendChild(label);

    if (f.isMain) {
      const badge = document.createElement('span');
      badge.className = 'main-badge';
      badge.textContent = 'ana';
      nameWrap.appendChild(badge);
    }
    nameWrap.addEventListener('click', () => openFile(f.name));
    li.appendChild(nameWrap);

    const actions = document.createElement('span');
    actions.className = 'file-row-actions';
    if (f.kind === 'text' && !f.isMain) {
      actions.appendChild(mkBtn('★', 'Ana dosya yap', (e) => { e.stopPropagation(); setMain(f.name); }));
    }
    actions.appendChild(mkBtn('✎', 'Yeniden adlandır', (e) => { e.stopPropagation(); renameFile(f.name); }));
    actions.appendChild(mkBtn('🗑', 'Sil', (e) => { e.stopPropagation(); deleteFile(f.name); }));
    li.appendChild(actions);

    els.treeList.appendChild(li);
  }
}

function initProject() {
  project.files = [];
  project.activeName = null;
  addTextFile('main.tex', DEFAULT_TEX, { main: true });
  renderTree();
  openFile('main.tex');
}

// Dosya ağacı araç çubuğu
els.btnNewFile.addEventListener('click', async () => {
  if (!editor) return;
  const input = await uiPrompt('Yeni dosya adı (örn. bolum1.tex, sections/intro.tex):');
  if (input == null) return;
  const clean = input.trim();
  if (!validName(clean)) { log('Geçersiz dosya adı.', 'warn'); return; }
  if (findFile(clean)) { log('Bu isimde dosya zaten var.', 'warn'); return; }
  addTextFile(clean, '');
  renderTree();
  openFile(clean);
});

els.btnUpload.addEventListener('click', () => els.uploadInput.click());

els.uploadInput.addEventListener('change', async (e) => {
  const files = e.target.files;
  if (files && files.length) await ingestFiles(files);
  e.target.value = '';
});

// ──────────────────────────────────────────────────────────────────
// Dosya alma (upload + sürükle-bırak ortak yolu)
// ──────────────────────────────────────────────────────────────────
const TEXT_EXTS = ['tex', 'bib', 'cls', 'sty', 'txt', 'md', 'tikz', 'def', 'bbl'];
const BIN_EXTS = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'pdf'];

function extOf(name) {
  const m = name.toLowerCase().match(/\.([a-z0-9]+)$/);
  return m ? m[1] : '';
}

function readText(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(new Error('Dosya okunamadı'));
    r.readAsText(file);
  });
}

async function ingestFiles(fileList) {
  if (!editor) { log('Editör henüz hazır değil.', 'warn'); return; }
  for (const file of Array.from(fileList)) {
    const ext = extOf(file.name);
    let name = file.name.replace(/\s+/g, '_');
    if (!validName(name)) name = 'dosya_' + Date.now();
    if (findFile(name)) name = Date.now() + '_' + name;
    try {
      if (TEXT_EXTS.includes(ext)) {
        if (file.size > 2 * 1024 * 1024) { log(`Çok büyük metin dosyası: ${file.name}`, 'warn'); continue; }
        addTextFile(name, await readText(file));
        log(`Eklendi: ${name}`, 'ok');
      } else if (BIN_EXTS.includes(ext)) {
        if (file.size > 8 * 1024 * 1024) { log(`Görsel/PDF çok büyük: ${file.name}`, 'warn'); continue; }
        addBinaryFile(name, await fileToBase64(file), file.type || 'application/octet-stream');
        log(`Eklendi: ${name} (${(file.size / 1024).toFixed(1)} KB)`, 'ok');
      } else {
        log(`Desteklenmeyen uzantı: ${file.name} (.${ext})`, 'warn');
        continue;
      }
      renderTree();
      openFile(name);
    } catch (err) {
      log(`Eklenemedi (${file.name}): ${err?.message || err}`, 'error');
    }
  }
}

function initDropZone() {
  const zone = document.querySelector('.panel-files');
  if (!zone) return;
  ['dragenter', 'dragover'].forEach((ev) => zone.addEventListener(ev, (e) => {
    e.preventDefault();
    e.stopPropagation();
    zone.classList.add('drag-over');
  }));
  ['dragleave', 'dragend'].forEach((ev) => zone.addEventListener(ev, (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (ev === 'dragleave' && zone.contains(e.relatedTarget)) return;
    zone.classList.remove('drag-over');
  }));
  zone.addEventListener('drop', async (e) => {
    e.preventDefault();
    e.stopPropagation();
    zone.classList.remove('drag-over');
    const files = e.dataTransfer && e.dataTransfer.files;
    if (files && files.length) await ingestFiles(files);
  });
}

// ──────────────────────────────────────────────────────────────────
// Boyutlandırılabilir paneller (sürüklenebilir ayraçlar)
//  --w-files: dosya paneli genişliği (px)
//  --f-editor / --f-pdf: editör/PDF flex-grow oranı
//  --h-logs: log paneli yüksekliği (px)
// ──────────────────────────────────────────────────────────────────
function setupVResizer(gutter, kind) {
  if (!gutter) return;
  let startX = 0, startFilesW = 0, startEditorW = 0, startPdfW = 0;
  const onMove = (e) => {
    const dx = e.clientX - startX;
    if (kind === 'files') {
      const w = Math.min(520, Math.max(120, startFilesW + dx));
      document.documentElement.style.setProperty('--w-files', w + 'px');
    } else {
      const eW = Math.max(160, startEditorW + dx);
      const pW = Math.max(160, startPdfW - dx);
      document.documentElement.style.setProperty('--f-editor', String(eW));
      document.documentElement.style.setProperty('--f-pdf', String(pW));
    }
    if (editor) editor.layout();
  };
  const onUp = () => {
    document.removeEventListener('mousemove', onMove);
    document.removeEventListener('mouseup', onUp);
    document.body.classList.remove('resizing');
  };
  gutter.addEventListener('mousedown', (e) => {
    e.preventDefault();
    startX = e.clientX;
    startFilesW = document.querySelector('.panel-files').getBoundingClientRect().width;
    startEditorW = document.querySelector('.panel-editor').getBoundingClientRect().width;
    startPdfW = document.querySelector('.panel-pdf').getBoundingClientRect().width;
    document.body.classList.add('resizing');
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  });
}

function setupHResizer(gutter) {
  if (!gutter) return;
  let startY = 0, startH = 0;
  const onMove = (e) => {
    const dy = e.clientY - startY;
    const h = Math.min(window.innerHeight * 0.7, Math.max(60, startH - dy));
    document.documentElement.style.setProperty('--h-logs', h + 'px');
    if (editor) editor.layout();
  };
  const onUp = () => {
    document.removeEventListener('mousemove', onMove);
    document.removeEventListener('mouseup', onUp);
    document.body.classList.remove('resizing');
  };
  gutter.addEventListener('mousedown', (e) => {
    e.preventDefault();
    startY = e.clientY;
    startH = document.querySelector('.logs').getBoundingClientRect().height;
    document.body.classList.add('resizing');
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  });
}

function initResizers() {
  setupVResizer(document.getElementById('gutter-1'), 'files');
  setupVResizer(document.getElementById('gutter-2'), 'split');
  setupHResizer(document.getElementById('gutter-logs'));
}

// ──────────────────────────────────────────────────────────────────
// Monaco editor
//
// ÖNEMLİ: Monaco'nun AMD loader'ı (require.config + define) Clerk SDK ile
// çakışıyor ("Can only have one anonymous define call per script file").
// Bu yüzden Monaco loader.js'i index.html'de DEĞİL, burada — Clerk init
// bittikten sonra — yüklüyoruz. Sıra bootstrap'ta korunmalı.
// ──────────────────────────────────────────────────────────────────
// LaTeX snippet'leri — Monaco completion provider.
// '\\' yazınca ya da kelime başlangıcında tetiklenir.
function registerLatexCompletions() {
  if (!window.monaco) return;
  try { monaco.languages.register({ id: 'latex' }); } catch { /* zaten kayıtlı olabilir */ }
  monaco.languages.registerCompletionItemProvider('latex', {
    triggerCharacters: ['\\'],
    provideCompletionItems(model, position) {
      const word = model.getWordUntilPosition(position);
      const range = {
        startLineNumber: position.lineNumber,
        endLineNumber: position.lineNumber,
        startColumn: word.startColumn,
        endColumn: word.endColumn,
      };
      const Kind = monaco.languages.CompletionItemKind;
      const Rules = monaco.languages.CompletionItemInsertTextRule;
      const snip = (label, insertText, doc) => ({
        label, kind: Kind.Snippet, insertText,
        insertTextRules: Rules.InsertAsSnippet, range,
        documentation: doc || ('\\' + label),
      });
      return {
        suggestions: [
          // Yapı
          snip('section', 'section{$1}'),
          snip('subsection', 'subsection{$1}'),
          snip('subsubsection', 'subsubsection{$1}'),
          snip('chapter', 'chapter{$1}'),
          snip('paragraph', 'paragraph{$1}'),
          // Ortamlar
          snip('begin', 'begin{${1:env}}\n\t$0\n\\end{${1:env}}', 'Genel ortam'),
          snip('itemize', 'begin{itemize}\n\t\\item $0\n\\end{itemize}', 'Madde işaretli liste'),
          snip('enumerate', 'begin{enumerate}\n\t\\item $0\n\\end{enumerate}', 'Numaralı liste'),
          snip('equation', 'begin{equation}\n\t$0\n\\end{equation}', 'Numaralı denklem'),
          snip('align', 'begin{align}\n\t$0\n\\end{align}', 'Hizalı denklemler'),
          snip('figure', 'begin{figure}[h]\n\t\\centering\n\t\\includegraphics[width=0.7\\textwidth]{$1}\n\t\\caption{$2}\n\t\\label{fig:$3}\n\\end{figure}', 'Figür + caption + label'),
          snip('table', 'begin{table}[h]\n\t\\centering\n\t\\begin{tabular}{$1}\n\t\t$0\n\t\\end{tabular}\n\t\\caption{$2}\n\t\\label{tab:$3}\n\\end{table}', 'Tablo + caption'),
          snip('item', 'item $0'),
          // Referanslar
          snip('label', 'label{$1}'),
          snip('ref', 'ref{$1}'),
          snip('cite', 'cite{$1}'),
          snip('includegraphics', 'includegraphics[width=$1\\textwidth]{$2}'),
          // Biçim
          snip('textbf', 'textbf{$1}', 'Kalın'),
          snip('textit', 'textit{$1}', 'İtalik'),
          snip('emph', 'emph{$1}', 'Vurgu'),
          snip('underline', 'underline{$1}', 'Altı çizili'),
          snip('texttt', 'texttt{$1}', 'Monospace'),
          // Matematik
          snip('frac', 'frac{$1}{$2}', 'Kesir'),
          snip('sqrt', 'sqrt{$1}', 'Karekök'),
          snip('sum', 'sum_{$1}^{$2}', 'Toplam'),
          snip('int', 'int_{$1}^{$2}', 'İntegral'),
          snip('lim', 'lim_{$1}', 'Limit'),
          snip('prod', 'prod_{$1}^{$2}', 'Çarpım'),
          // Preamble
          snip('documentclass', 'documentclass{$1}'),
          snip('usepackage', 'usepackage{$1}'),
          snip('title', 'title{$1}'),
          snip('author', 'author{$1}'),
          snip('date', 'date{\\today}'),
          snip('maketitle', 'maketitle'),
          snip('bibliography', 'bibliography{$1}'),
          snip('bibliographystyle', 'bibliographystyle{$1}'),
        ],
      };
    },
  });
}

async function initEditor() {
  // 1. Monaco loader.js'i dinamik yükle (AMD global'ini şimdi kuruyor)
  await loadScript('https://cdn.jsdelivr.net/npm/monaco-editor@0.45.0/min/vs/loader.js');

  // 2. AMD require ile editor.main'i çek
  return new Promise((resolve) => {
    require.config({
      paths: { vs: 'https://cdn.jsdelivr.net/npm/monaco-editor@0.45.0/min/vs' },
    });
    require(['vs/editor/editor.main'], () => {
      registerLatexCompletions();
      editor = monaco.editor.create(els.editorHost, {
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
      editor.onDidChangeModelContent(updateEditorMeta);
      initProject();
      log('Editor hazır.', 'ok');
      resolve();
    });
  });
}

function updateEditorMeta() {
  const f = findFile(project.activeName);
  if (!f) return;
  if (f.kind === 'text') {
    const model = f.model;
    const lines = model.getLineCount();
    const kb = (model.getValueLength() / 1024).toFixed(1);
    els.editorMeta.textContent = `${kb} KB · ${lines} satır`;
  } else {
    const kb = (approxBytes(f.data) / 1024).toFixed(1);
    els.editorMeta.textContent = `görsel · ${kb} KB`;
  }
}

// ──────────────────────────────────────────────────────────────────
// Clerk auth
// ──────────────────────────────────────────────────────────────────
/**
 * Clerk publishable key formatı: pk_<env>_<base64(frontend-api-url + "$")>
 * Frontend API URL'i decode edip oradan Clerk script'ini yüklüyoruz.
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
    // v6 yöntemi: ÖNCE UI bundle, SONRA clerk-js SDK.
    log('Clerk UI bundle yükleniyor…', 'info');
    await loadScript(
      `https://${frontendApi}/npm/@clerk/ui@1/dist/ui.browser.js`,
    );

    log('Clerk SDK yükleniyor…', 'info');
    await loadScript(
      `https://${frontendApi}/npm/@clerk/clerk-js@6/dist/clerk.browser.js`,
      { 'data-clerk-publishable-key': CONFIG.CLERK_PUBLISHABLE_KEY },
    );

    const start = Date.now();
    while (Date.now() - start < 5000) {
      if (typeof window.Clerk !== 'undefined') break;
      await new Promise((r) => setTimeout(r, 50));
    }

    if (typeof window.Clerk === 'undefined') {
      log('Clerk script yüklendi ama window.Clerk 5sn içinde hazır olmadı.', 'error');
      showSignedOutState();
      return;
    }

    if (typeof window.Clerk === 'function') {
      clerk = new window.Clerk(CONFIG.CLERK_PUBLISHABLE_KEY);
    } else {
      clerk = window.Clerk;
    }

    if (!clerk.loaded) {
      await clerk.load({
        ui: { ClerkUI: window.__internal_ClerkUICtor },
      });
    }

    // Clerk listener her session güncellemesinde fırlar (token refresh, profile load).
    // Yalnız kullanıcı KİMLİĞİ değiştiğinde dashboard'a dön — aynı user için no-op.
    // Aksi halde compile sırasında getToken() listener'ı tetikleyip projeden atıyor.
    let lastUserId; // undefined = henüz hiç çağrılmadı
    clerk.addListener(({ user }) => {
      const newId = user?.id || null;
      const userChanged = lastUserId !== undefined && lastUserId !== newId;
      if (user) showSignedInState(user);
      else showSignedOutState();
      if (userChanged) enterDashboard();
      lastUserId = newId;
    });

    if (clerk.user) { showSignedInState(clerk.user); lastUserId = clerk.user.id; }
    else { showSignedOutState(); lastUserId = null; }
    enterDashboard(); // ilk açılışta her hâlükârda dashboard ekranı

    log('Clerk hazır.', 'ok');
  } catch (err) {
    log('Clerk yüklenemedi: ' + (err?.message || err), 'error');
    showSignedOutState();
  }
}

// NOT: bu iki fonksiyon SADECE üst bar UI'sini günceller. Dashboard navigasyonu
// listener'da (user değişimine bağlı) ya da bootstrap'ta yapılır.
function showSignedOutState() {
  els.authLoading.style.display = 'none';
  els.authSignedOut.style.display = 'flex';
  els.authSignedIn.style.display = 'none';
  els.btnCompile.disabled = true;
  els.btnCompile.title = 'Derlemek için giriş yap';
  els.tierBadge.textContent = '—';
  els.tierBadge.removeAttribute('data-tier');
  if (els.btnUpgrade) els.btnUpgrade.style.display = 'none';
}

function showSignedInState(user) {
  els.authLoading.style.display = 'none';
  els.authSignedOut.style.display = 'none';
  els.authSignedIn.style.display = 'flex';
  const email = user?.primaryEmailAddress?.emailAddress || user?.emailAddresses?.[0]?.emailAddress || user?.id || 'Kullanıcı';
  els.userEmail.textContent = email;
  els.btnCompile.disabled = false;
  els.btnCompile.title = '';
  if (els.btnUpgrade) els.btnUpgrade.style.display = '';
  // Gerçek tier dashboard'daki /api/projects yanıtından gelir (D1).
}

els.btnSignIn.addEventListener('click', () => {
  if (!clerk) { log('Auth servisi hazır değil.', 'warn'); return; }
  clerk.openSignIn();
});

els.btnSignUp.addEventListener('click', () => {
  if (!clerk) { log('Auth servisi hazır değil.', 'warn'); return; }
  clerk.openSignUp();
});

els.btnSignOut.addEventListener('click', async () => {
  if (!clerk) return;
  await clerk.signOut();
  log('Çıkış yapıldı.', 'info');
});

// ──────────────────────────────────────────────────────────────────
// LaTeX log parse + tıklanabilir hata satırı
//
// Backend `error.log` döndürüyor (compile.ts). Burada iki yaygın formatı
// parse ediyoruz:
//   1) Varsayılan TeX: `! Error msg` + sonraki satırlarda `l.NN ...`
//   2) latexmk -file-line-error: `./main.tex:42: LaTeX Error: ...`
// Ek olarak `LaTeX Warning: ... on input line NN` uyarıları.
//
// Dosya bağlamı izleme (parens ile) LaTeX log formatında notoryze karışık;
// MVP'de yalnız fallback olarak entry dosyasını kullanıyoruz. Sonra geliştirilebilir.
// ──────────────────────────────────────────────────────────────────
function parseLatexLog(logText, entryFile) {
  const diagnostics = [];
  if (!logText) return diagnostics;
  const lines = String(logText).split('\n');
  const fallbackFile = entryFile || 'main.tex';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Format 1: file:line: error
    const fileLine = line.match(/^(?:\.\/|\/)?([^\s:()]+\.(?:tex|sty|cls|bib|aux)):(\d+):\s*(.+)$/);
    if (fileLine) {
      diagnostics.push({
        severity: 'error',
        file: fileLine[1],
        line: parseInt(fileLine[2], 10),
        message: fileLine[3].trim(),
      });
      continue;
    }

    // Format 2: ! ... + sonraki satırlarda l.NN
    if (line.startsWith('! ')) {
      const message = line.slice(2).trim();
      let lineNum = null;
      for (let j = i + 1; j < Math.min(i + 12, lines.length); j++) {
        const m = lines[j].match(/^l\.(\d+)/);
        if (m) { lineNum = parseInt(m[1], 10); break; }
        if (lines[j].startsWith('! ')) break;
      }
      diagnostics.push({
        severity: 'error',
        file: fallbackFile,
        line: lineNum,
        message,
      });
      continue;
    }

    // LaTeX Warning: ... (rakam mesajın herhangi bir yerinde olabilir)
    const warn = line.match(/^(?:LaTeX|Package\s+\S+)\s+Warning:\s+(.+)$/);
    if (warn) {
      const msg = warn[1].trim();
      const lineMatch = msg.match(/on input line (\d+)/);
      diagnostics.push({
        severity: 'warning',
        file: fallbackFile,
        line: lineMatch ? parseInt(lineMatch[1], 10) : null,
        message: msg,
      });
    }
  }
  return diagnostics;
}

function jumpToError(file, line) {
  if (!editor) return;
  if (file) {
    const f = findFile(file);
    if (f && f.kind === 'text') openFile(file);
  }
  if (line != null && Number.isFinite(line)) {
    setTimeout(() => {
      try {
        editor.revealLineInCenter(line);
        editor.setPosition({ lineNumber: line, column: 1 });
        editor.focus();
      } catch { /* satır model dışıysa sessiz geç */ }
    }, 50);
  }
}

function logClickable(diag) {
  const time = new Date().toTimeString().slice(0, 8);
  const span = document.createElement('span');
  const sev = diag.severity === 'warning' ? 'warn' : 'error';
  span.className = `log-${sev} log-clickable`;
  const where = diag.file + (diag.line != null ? `:${diag.line}` : '');
  span.textContent = `[${time}] ▸ ${where}  ${diag.message}\n`;
  span.title = diag.line != null ? 'Editörde bu satıra git' : 'Satır bilgisi yok';
  if (diag.line != null) span.addEventListener('click', () => jumpToError(diag.file, diag.line));
  els.logsBody.appendChild(span);
  els.logsBody.scrollTop = els.logsBody.scrollHeight;
}

// Hata logunu yapılandırılmış göster: önce tıklanabilir tanılar, sonra ham log.
function renderCompileErrorLog(rawLog, entryFile) {
  const diags = parseLatexLog(rawLog, entryFile);
  if (diags.length) {
    log(`Bulunan tanılar (${diags.length}) — satıra atlamak için tıkla:`, 'info');
    for (const d of diags) logClickable(d);
    log('— Ham log:', 'info');
  }
  log(rawLog, 'error');
}

// ──────────────────────────────────────────────────────────────────
// Compile flow
// ──────────────────────────────────────────────────────────────────
els.btnCompile.addEventListener('click', async () => {
  if (!editor) return;

  const entry = getEntry();
  const files = buildCompileFiles();

  if (!files[entry] || typeof files[entry] !== 'string') {
    log('Ana dosya bir .tex metin dosyası olmalı. Bir dosyayı ★ ile ana yap.', 'warn');
    return;
  }
  if (!files[entry].trim()) {
    log('Ana dosya boş.', 'warn');
    return;
  }
  // Hafif metin boyutu kontrolü (gerçek limitler edge + backend'de)
  const totalText = project.files.reduce((acc, f) => acc + (f.kind === 'text' ? f.model.getValueLength() : 0), 0);
  if (totalText > 2_000_000) {
    log('Toplam metin çok büyük (>2MB). Şimdilik küçük tutalım.', 'warn');
    return;
  }

  els.btnCompile.disabled = true;
  els.btnDownload.disabled = true;
  log(`Derleme isteği gönderiliyor… (ana: ${entry}, ${project.files.length} dosya)`, 'info');

  try {
    const token = clerk?.session ? await clerk.session.getToken() : null;
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`${CONFIG.API_BASE}/compile`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ files, entry, engine: currentEngine }),
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
      log('Çok fazla istek ya da süren bir derlemen var. Birazdan tekrar dene.', 'warn');
      return;
    }
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      log('Hata: ' + (data.error || res.statusText), 'error');
      if (data.log) renderCompileErrorLog(data.log, entry);
      return;
    }

    const ct = res.headers.get('Content-Type') || '';
    if (ct.includes('application/pdf')) {
      const blob = await res.blob();
      lastPdfBlob = blob;
      await renderPdf(blob);
      els.btnDownload.disabled = false;
      log(`Derleme başarılı (${(blob.size / 1024).toFixed(1)} KB).`, 'ok');
    } else {
      const data = await res.json().catch(() => ({}));
      if (data.log) renderCompileErrorLog(data.log, entry);
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
  a.download = getEntry().replace(/\.tex$/i, '') + '.pdf';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});

// ──────────────────────────────────────────────────────────────────
// PDF rendering (PDF.js) — zoom + sayfa gezinme
//
// State:
//   pdfState = { doc, pages: PageProxy[], canvases: HTMLCanvas[], scale, currentPage }
//
// Tüm sayfalar üst üste #pdf-viewer içine canvas olarak render edilir.
// Zoom değişince tüm canvas'lar yeniden çizilir (kalite için CSS scale değil).
// Scroll → ortadaki canvas → currentPage. Page input yalnız Enter/blur'da goto.
// ──────────────────────────────────────────────────────────────────
let pdfState = null;
let pdfBlob = null;
let pdfjsModule = null;

async function loadPdfJs() {
  if (pdfjsModule) return pdfjsModule;
  pdfjsModule = await import('https://cdn.jsdelivr.net/npm/pdfjs-dist@4.7.76/build/pdf.min.mjs');
  pdfjsModule.GlobalWorkerOptions.workerSrc =
    'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.7.76/build/pdf.worker.min.mjs';
  return pdfjsModule;
}

function setPdfToolbarEnabled(on) {
  for (const b of [
    els.pdfZoomOut, els.pdfZoomIn, els.pdfFitWidth, els.pdfFitPage,
    els.pdfPrev, els.pdfNext, els.pdfPageInput,
    els.pdfSearch, els.pdfSearchPrev, els.pdfSearchNext,
  ]) {
    if (b) b.disabled = !on;
  }
}

function updateZoomBadge() {
  if (!els.pdfZoomBadge) return;
  els.pdfZoomBadge.textContent = pdfState ? `${Math.round(pdfState.scale * 100)}%` : '—';
}

function updatePageBadge() {
  if (!pdfState) {
    if (els.pdfPageInput) els.pdfPageInput.value = '1';
    if (els.pdfPageTotal) els.pdfPageTotal.textContent = '/ —';
    return;
  }
  if (els.pdfPageInput) {
    els.pdfPageInput.value = String(pdfState.currentPage);
    els.pdfPageInput.max = String(pdfState.pages.length);
  }
  if (els.pdfPageTotal) els.pdfPageTotal.textContent = `/ ${pdfState.pages.length}`;
}

async function renderTextLayerForPage(pdfjs, page, viewport, container) {
  try {
    const textContent = await page.getTextContent();
    // PDF.js v4+ TextLayer sınıfı varsa onu kullan, yoksa eski renderTextLayer
    if (typeof pdfjs.TextLayer === 'function') {
      const tl = new pdfjs.TextLayer({ textContentSource: textContent, container, viewport });
      await tl.render();
    } else if (typeof pdfjs.renderTextLayer === 'function') {
      const r = pdfjs.renderTextLayer({ textContent, container, viewport, textDivs: [] });
      if (r && r.promise) await r.promise;
    }
  } catch { /* text layer kritik değil, görmezden gel */ }
}

async function renderAllPages() {
  if (!pdfState) return;
  els.pdfViewer.innerHTML = '';
  pdfState.canvases = [];
  pdfState.textLayers = [];
  for (let i = 0; i < pdfState.pages.length; i++) {
    const page = pdfState.pages[i];
    const viewport = page.getViewport({ scale: pdfState.scale });

    const wrapper = document.createElement('div');
    wrapper.className = 'pdf-page-wrapper';
    wrapper.style.width = viewport.width + 'px';
    wrapper.style.height = viewport.height + 'px';
    wrapper.dataset.page = String(i + 1);

    const canvas = document.createElement('canvas');
    canvas.className = 'pdf-canvas';
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    wrapper.appendChild(canvas);

    const textLayerDiv = document.createElement('div');
    textLayerDiv.className = 'pdf-text-layer';
    textLayerDiv.style.width = viewport.width + 'px';
    textLayerDiv.style.height = viewport.height + 'px';
    wrapper.appendChild(textLayerDiv);

    els.pdfViewer.appendChild(wrapper);
    pdfState.canvases.push(canvas);
    pdfState.textLayers.push(textLayerDiv);

    const ctx = canvas.getContext('2d');
    await page.render({ canvasContext: ctx, viewport }).promise;
    await renderTextLayerForPage(pdfjsModule, page, viewport, textLayerDiv);
  }
}

async function renderPdf(blob) {
  pdfBlob = blob;
  els.pdfViewer.innerHTML = '';
  const buf = await blob.arrayBuffer();
  const pdfjs = await loadPdfJs();
  const doc = await pdfjs.getDocument({ data: buf }).promise;

  // tüm sayfa proxy'lerini önden çek (re-render için lazım)
  const pages = [];
  for (let i = 1; i <= doc.numPages; i++) pages.push(await doc.getPage(i));

  pdfState = { doc, pages, canvases: [], scale: 1.5, currentPage: 1 };
  els.pdfMeta.textContent = `${doc.numPages} sayfa · ${(blob.size / 1024).toFixed(1)} KB`;

  await renderAllPages();
  setPdfToolbarEnabled(true);
  updateZoomBadge();
  updatePageBadge();
  clearPdfSearch();
  if (els.pdfSearch) els.pdfSearch.value = '';
  els.pdfViewer.scrollTop = 0;
}

function setZoom(newScale) {
  if (!pdfState) return;
  const clamped = Math.max(0.25, Math.min(5, newScale));
  if (Math.abs(clamped - pdfState.scale) < 0.001) return;
  pdfState.scale = clamped;
  renderAllPages().then(() => {
    updateZoomBadge();
    // Mevcut arama varsa highlight'ları yeniden uygula; yoksa mevcut sayfaya scroll'u koru
    if (pdfSearchState && pdfSearchState.query) {
      const wasCurrent = pdfSearchState.current;
      const q = pdfSearchState.query;
      buildPdfSearch(q);
      if (pdfSearchState && pdfSearchState.matches.length && wasCurrent >= 0) {
        pdfSearchState.current = Math.min(wasCurrent, pdfSearchState.matches.length - 1);
        updateSearchCount();
        goToCurrentMatch();
      }
    } else {
      goToPage(pdfState.currentPage, { smooth: false });
    }
  });
}

function fitWidth() {
  if (!pdfState || !pdfState.pages.length) return;
  const containerW = els.pdfViewer.clientWidth - 32; // ~margin
  const baseVp = pdfState.pages[0].getViewport({ scale: 1 });
  if (containerW > 0 && baseVp.width > 0) setZoom(containerW / baseVp.width);
}

function fitPage() {
  if (!pdfState || !pdfState.pages.length) return;
  const W = els.pdfViewer.clientWidth - 32;
  const H = els.pdfViewer.clientHeight - 32; // pdf-canvas margin: 1rem
  const baseVp = pdfState.pages[0].getViewport({ scale: 1 });
  if (W <= 0 || H <= 0) return;
  setZoom(Math.min(W / baseVp.width, H / baseVp.height));
}

// ──────────────────────────────────────────────────────────────────
// PDF metin arama (in-page vurgu)
//
// TextLayer DOM'unda match içeren span'ları .pdf-hit ile sarar; aktif eşleşmeye
// .pdf-hit-active. Aktife scrollIntoView. Zoom değişip TextLayer yeniden
// kurulduğunda highlight'ları geri kurar.
// ──────────────────────────────────────────────────────────────────
let pdfSearchState = null; // { query, matches: [{ pageIdx, hitEl }], current }

function clearHighlights() {
  if (!pdfState || !pdfState.textLayers) return;
  for (const tl of pdfState.textLayers) {
    if (!tl) continue;
    const hits = tl.querySelectorAll('.pdf-hit');
    for (const hit of hits) {
      const text = document.createTextNode(hit.textContent || '');
      hit.parentNode && hit.parentNode.replaceChild(text, hit);
    }
    tl.normalize();
  }
}

function clearPdfSearch() {
  clearHighlights();
  pdfSearchState = null;
  if (els.pdfSearchCount) els.pdfSearchCount.textContent = '—';
}

function buildPdfSearch(query) {
  if (!pdfState || !query) { clearPdfSearch(); return; }
  clearHighlights();
  const q = query.toLowerCase();
  const matches = [];
  for (let i = 0; i < (pdfState.textLayers || []).length; i++) {
    const tl = pdfState.textLayers[i];
    if (!tl) continue;
    const spans = tl.querySelectorAll('span');
    for (const span of spans) {
      // Yalnız text node taşıyan span'lar (zaten parse edilmiş .pdf-hit yok burada)
      const txt = span.textContent || '';
      if (!txt) continue;
      const lower = txt.toLowerCase();
      const segs = [];
      let from = 0;
      while (true) {
        const idx = lower.indexOf(q, from);
        if (idx === -1) break;
        segs.push([idx, idx + q.length]);
        from = idx + q.length;
      }
      if (!segs.length) continue;
      // span içeriğini yeniden kur: düz metin parçaları + .pdf-hit wrapları
      span.textContent = '';
      let last = 0;
      for (const [a, b] of segs) {
        if (a > last) span.appendChild(document.createTextNode(txt.substring(last, a)));
        const hit = document.createElement('span');
        hit.className = 'pdf-hit';
        hit.textContent = txt.substring(a, b);
        span.appendChild(hit);
        matches.push({ pageIdx: i, hitEl: hit });
        last = b;
      }
      if (last < txt.length) span.appendChild(document.createTextNode(txt.substring(last)));
    }
  }
  pdfSearchState = { query: q, matches, current: matches.length ? 0 : -1 };
  updateSearchCount();
  if (matches.length) goToCurrentMatch();
}

function updateSearchCount() {
  if (!els.pdfSearchCount) return;
  if (!pdfSearchState) { els.pdfSearchCount.textContent = '—'; return; }
  if (!pdfSearchState.matches.length) { els.pdfSearchCount.textContent = '0/0'; return; }
  els.pdfSearchCount.textContent = `${pdfSearchState.current + 1}/${pdfSearchState.matches.length}`;
}

function goToCurrentMatch() {
  if (!pdfSearchState || !pdfSearchState.matches.length) return;
  // önceki aktifi temizle
  if (pdfState && pdfState.textLayers) {
    for (const tl of pdfState.textLayers) {
      if (!tl) continue;
      tl.querySelectorAll('.pdf-hit-active').forEach((el) => el.classList.remove('pdf-hit-active'));
    }
  }
  const m = pdfSearchState.matches[pdfSearchState.current];
  m.hitEl.classList.add('pdf-hit-active');
  m.hitEl.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
  if (pdfState) {
    pdfState.currentPage = m.pageIdx + 1;
    updatePageBadge();
  }
}

function nextSearchMatch(dir = 1) {
  if (!pdfSearchState || !pdfSearchState.matches.length) return;
  const len = pdfSearchState.matches.length;
  pdfSearchState.current = (pdfSearchState.current + dir + len) % len;
  updateSearchCount();
  goToCurrentMatch();
}

function goToPage(n, { smooth = true } = {}) {
  if (!pdfState) return;
  const clamped = Math.max(1, Math.min(pdfState.pages.length, Math.floor(n)));
  pdfState.currentPage = clamped;
  const canvas = pdfState.canvases[clamped - 1];
  if (canvas) canvas.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto', block: 'start' });
  updatePageBadge();
}

// scroll → currentPage (rAF throttled, input feedback loop'undan kaçınır)
let pdfScrollRaf = false;
function onPdfScroll() {
  if (pdfScrollRaf || !pdfState || !pdfState.canvases.length) return;
  pdfScrollRaf = true;
  requestAnimationFrame(() => {
    pdfScrollRaf = false;
    const mid = els.pdfViewer.scrollTop + els.pdfViewer.clientHeight / 2;
    for (let i = 0; i < pdfState.canvases.length; i++) {
      const c = pdfState.canvases[i];
      const top = c.offsetTop;
      const bot = top + c.offsetHeight;
      if (top <= mid && bot >= mid) {
        if (pdfState.currentPage !== i + 1) {
          pdfState.currentPage = i + 1;
          if (els.pdfPageInput) els.pdfPageInput.value = String(i + 1);
        }
        return;
      }
    }
  });
}

// ── Toolbar event wiring (DOM elemanları index.html'de var)
if (els.pdfZoomOut) els.pdfZoomOut.addEventListener('click', () => pdfState && setZoom(pdfState.scale / 1.2));
if (els.pdfZoomIn)  els.pdfZoomIn.addEventListener('click',  () => pdfState && setZoom(pdfState.scale * 1.2));
if (els.pdfFitWidth) els.pdfFitWidth.addEventListener('click', fitWidth);
if (els.pdfFitPage) els.pdfFitPage.addEventListener('click', fitPage);
if (els.pdfPrev) els.pdfPrev.addEventListener('click', () => pdfState && goToPage(pdfState.currentPage - 1));
if (els.pdfNext) els.pdfNext.addEventListener('click', () => pdfState && goToPage(pdfState.currentPage + 1));
if (els.pdfSearch) {
  els.pdfSearch.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const q = els.pdfSearch.value.trim();
      if (!q) { clearPdfSearch(); return; }
      if (pdfSearchState && pdfSearchState.query === q.toLowerCase()) nextSearchMatch(1);
      else buildPdfSearch(q.toLowerCase());
    } else if (e.key === 'Escape') { els.pdfSearch.blur(); }
  });
  els.pdfSearch.addEventListener('input', () => {
    // sorgu değişince state'i sıfırla; tekrar Enter ile arama tetiklenir
    if (pdfSearchState && pdfSearchState.query !== els.pdfSearch.value.trim().toLowerCase()) clearPdfSearch();
  });
}
if (els.pdfSearchPrev) els.pdfSearchPrev.addEventListener('click', () => nextSearchMatch(-1));
if (els.pdfSearchNext) els.pdfSearchNext.addEventListener('click', () => nextSearchMatch(1));
if (els.pdfPageInput) {
  els.pdfPageInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const n = parseInt(els.pdfPageInput.value, 10);
      if (Number.isFinite(n)) goToPage(n);
    }
  });
  els.pdfPageInput.addEventListener('blur', () => {
    if (!pdfState) return;
    const n = parseInt(els.pdfPageInput.value, 10);
    if (Number.isFinite(n) && n !== pdfState.currentPage) goToPage(n);
    else els.pdfPageInput.value = String(pdfState.currentPage); // geçersizse geri al
  });
}
if (els.pdfViewer) els.pdfViewer.addEventListener('scroll', onPdfScroll);

// ──────────────────────────────────────────────────────────────────
// Özel modal (native prompt/confirm yerine ortada çıkan kutu)
// ──────────────────────────────────────────────────────────────────
function uiModal({
  title = '', message = '', input = false, defaultValue = '',
  selectOptions = null, selectLabel = '', selectDefault = '',
  okText = 'Tamam', cancelText = 'İptal', danger = false,
}) {
  return new Promise((resolve) => {
    const overlay = document.getElementById('modal-overlay');
    const titleEl = document.getElementById('modal-title');
    const msgEl = document.getElementById('modal-message');
    const inputEl = document.getElementById('modal-input');
    const selectEl = document.getElementById('modal-select');
    const selectLabelEl = document.getElementById('modal-select-label');
    const okBtn = document.getElementById('modal-ok');
    const cancelBtn = document.getElementById('modal-cancel');
    if (!overlay) { resolve(input ? null : false); return; }

    titleEl.textContent = title;
    titleEl.style.display = title ? 'block' : 'none';
    msgEl.textContent = message;
    msgEl.style.display = message ? 'block' : 'none';
    inputEl.style.display = input ? 'block' : 'none';
    if (input) inputEl.value = defaultValue;

    const hasSelect = Array.isArray(selectOptions) && selectOptions.length > 0;
    if (selectEl && selectLabelEl) {
      if (hasSelect) {
        selectEl.innerHTML = '';
        for (const opt of selectOptions) {
          const o = document.createElement('option');
          o.value = opt.value; o.textContent = opt.label;
          selectEl.appendChild(o);
        }
        selectEl.value = selectDefault || selectOptions[0].value;
        selectEl.style.display = 'block';
        selectLabelEl.textContent = selectLabel;
        selectLabelEl.style.display = selectLabel ? 'block' : 'none';
      } else {
        selectEl.style.display = 'none';
        selectLabelEl.style.display = 'none';
      }
    }

    okBtn.textContent = okText;
    cancelBtn.textContent = cancelText;
    okBtn.classList.toggle('btn-danger', !!danger);

    overlay.style.display = 'flex';
    setTimeout(() => { if (input) { inputEl.focus(); inputEl.select(); } else okBtn.focus(); }, 0);

    function cleanup(result) {
      overlay.style.display = 'none';
      okBtn.removeEventListener('click', onOk);
      cancelBtn.removeEventListener('click', onCancel);
      overlay.removeEventListener('mousedown', onBackdrop);
      document.removeEventListener('keydown', onKey, true);
      resolve(result);
    }
    function buildOkResult() {
      if (input && hasSelect) return { input: inputEl.value, select: selectEl.value };
      if (input) return inputEl.value;
      if (hasSelect) return selectEl.value;
      return true;
    }
    function buildCancelResult() {
      if (input && hasSelect) return null;
      if (input) return null;
      if (hasSelect) return null;
      return false;
    }
    function onOk() { cleanup(buildOkResult()); }
    function onCancel() { cleanup(buildCancelResult()); }
    function onBackdrop(e) { if (e.target === overlay) onCancel(); }
    function onKey(e) {
      if (e.key === 'Escape') { e.preventDefault(); onCancel(); }
      else if (e.key === 'Enter') { e.preventDefault(); onOk(); }
    }
    okBtn.addEventListener('click', onOk);
    cancelBtn.addEventListener('click', onCancel);
    overlay.addEventListener('mousedown', onBackdrop);
    document.addEventListener('keydown', onKey, true);
  });
}

function uiPrompt(message, defaultValue = '', title = '') {
  return uiModal({ title, message, input: true, defaultValue, okText: 'Tamam', cancelText: 'İptal' });
}

function uiConfirm(message, { okText = 'Tamam', cancelText = 'Vazgeç', danger = false, title = '' } = {}) {
  return uiModal({ title, message, input: false, okText, cancelText, danger });
}

// ──────────────────────────────────────────────────────────────────
// Projelerim (dashboard) + kalıcı projeler (D1/R2)
//   - giriş yapınca dashboard; proje seç → editör; "Kaydet" → PUT; "Projelerim" → geri
//   - tier rozeti /api/projects yanıtından (D1)
// ──────────────────────────────────────────────────────────────────
const dash = {
  screen: document.getElementById('dashboard'),
  list: document.getElementById('dash-list'),
  btnNew: document.getElementById('dash-new'),
  status: document.getElementById('dash-status'),
  signedOut: document.getElementById('dash-signed-out'),
};
const btnSave = document.getElementById('btn-save');
const btnProjects = document.getElementById('btn-projects');

let currentProjectId = null;
let currentTier = 'free';
let currentEngine = 'pdflatex';
let dirty = false;
let dirtyListenerAttached = false;

// ── Otomatik kaydetme (debounced 2 sn)
let autosaveTimer = null;
const AUTOSAVE_DEBOUNCE_MS = 2000;
function scheduleAutosave() {
  if (!currentProjectId) return;
  clearTimeout(autosaveTimer);
  autosaveTimer = setTimeout(() => {
    if (dirty && currentProjectId) saveProject(true).catch(() => {});
  }, AUTOSAVE_DEBOUNCE_MS);
}
function cancelAutosave() { clearTimeout(autosaveTimer); autosaveTimer = null; }

function markDirty() {
  if (!currentProjectId) return;
  dirty = true;
  updateSaveState();
  scheduleAutosave();
}

function setEngine(eng, { markDirty: shouldMarkDirty = false } = {}) {
  const valid = ['pdflatex', 'xelatex', 'lualatex'];
  const next = valid.includes(eng) ? eng : 'pdflatex';
  currentEngine = next;
  if (els.engineSelect) els.engineSelect.value = next;
  if (shouldMarkDirty) markDirty();
}

if (els.engineSelect) {
  els.engineSelect.addEventListener('change', (e) => {
    setEngine(e.target.value, { markDirty: true });
  });
}

function setTierBadge(tier) {
  const label = tier === 'unlimited' ? 'Unlimited' : tier === 'pro' ? 'Pro' : 'Free';
  els.tierBadge.textContent = label;
  els.tierBadge.setAttribute('data-tier', tier);
}

function guessMime(name) {
  const e = (name.split('.').pop() || '').toLowerCase();
  return ({ png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp', pdf: 'application/pdf' })[e] || 'application/octet-stream';
}

async function authToken() {
  return clerk?.session ? await clerk.session.getToken() : null;
}

async function api(path, opts = {}) {
  const token = await authToken();
  const headers = Object.assign({}, opts.headers || {});
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (opts.body && !headers['Content-Type']) headers['Content-Type'] = 'application/json';
  return fetch(`${CONFIG.API_BASE}${path}`, { ...opts, headers });
}

function updateSaveState() {
  if (btnSave) btnSave.textContent = dirty ? 'Kaydet •' : 'Kaydet';
}

function attachDirtyListener() {
  if (dirtyListenerAttached || !editor) return;
  editor.onDidChangeModelContent(() => { markDirty(); scheduleOutlineRefresh(); });
  dirtyListenerAttached = true;
}

// ──────────────────────────────────────────────────────────────────
// Outline — \section / \subsection / \subsubsection / \chapter / \part
//  - aktif metin dosyasını parse eder
//  - dosya açılınca anında, içerik değişiminde 400ms debounce ile yenilenir
// ──────────────────────────────────────────────────────────────────
function parseOutline(text) {
  const items = [];
  if (!text) return items;
  const lines = text.split('\n');
  const re = /^\s*\\((?:sub){0,2}section|chapter|part)\*?\{([^}]+)\}/;
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(re);
    if (!m) continue;
    const tag = m[1];
    let level = 0;
    if (tag.startsWith('sub')) level = (tag.match(/sub/g) || []).length;
    items.push({ line: i + 1, level, title: m[2] });
  }
  return items;
}

function getActiveTextContent() {
  if (!project.activeName) return '';
  const f = findFile(project.activeName);
  return (f && f.kind === 'text' && f.model) ? f.model.getValue() : '';
}

let outlineRefreshTimer = null;
function scheduleOutlineRefresh(delay = 400) {
  clearTimeout(outlineRefreshTimer);
  outlineRefreshTimer = setTimeout(refreshOutline, delay);
}

function refreshOutline() {
  if (!els.outlineList) return;
  const items = parseOutline(getActiveTextContent());
  els.outlineList.innerHTML = '';
  if (!items.length) {
    const li = document.createElement('li');
    li.className = 'outline-empty';
    li.textContent = '—';
    els.outlineList.appendChild(li);
    return;
  }
  for (const it of items) {
    const li = document.createElement('li');
    li.className = `outline-l${Math.min(it.level, 2)}`;
    li.textContent = it.title;
    li.title = it.title;
    li.addEventListener('click', () => {
      if (!editor) return;
      editor.revealLineInCenter(it.line);
      editor.setPosition({ lineNumber: it.line, column: 1 });
      editor.focus();
    });
    els.outlineList.appendChild(li);
  }
}

function enterEditor() {
  if (dash.screen) dash.screen.style.display = 'none';
  document.querySelector('.workspace').style.display = 'flex';
  document.getElementById('gutter-logs').style.display = '';
  document.getElementById('logs-panel').style.display = '';
  if (btnSave) btnSave.style.display = '';
  if (btnProjects) btnProjects.style.display = '';
  els.btnCompile.style.display = '';
  els.btnDownload.style.display = '';
  if (els.engineSelect) { els.engineSelect.style.display = ''; els.engineSelect.disabled = false; }
  attachDirtyListener();
  updateSaveState();
  if (editor) editor.layout();
}

function enterDashboard() {
  if (dash.screen) dash.screen.style.display = 'flex';
  document.querySelector('.workspace').style.display = 'none';
  document.getElementById('gutter-logs').style.display = 'none';
  document.getElementById('logs-panel').style.display = 'none';
  if (btnSave) btnSave.style.display = 'none';
  if (btnProjects) btnProjects.style.display = 'none';
  els.btnCompile.style.display = 'none';
  els.btnDownload.style.display = 'none';
  if (els.engineSelect) { els.engineSelect.style.display = 'none'; els.engineSelect.disabled = true; }
  cancelAutosave();
  currentProjectId = null;
  setEngine('pdflatex'); // editör dışındayken nötr varsayılan
  dirty = false;
  if (els.outlineList) els.outlineList.innerHTML = '<li class="outline-empty">—</li>';
  refreshDashboard();
}

async function refreshDashboard() {
  if (!dash.list) return;
  if (!clerk || !clerk.user) {
    if (dash.signedOut) dash.signedOut.style.display = 'block';
    dash.list.innerHTML = '';
    if (dash.status) dash.status.textContent = '';
    if (dash.btnNew) dash.btnNew.disabled = true;
    els.tierBadge.textContent = '—';
    return;
  }
  if (dash.signedOut) dash.signedOut.style.display = 'none';
  if (dash.btnNew) dash.btnNew.disabled = false;
  if (dash.status) dash.status.textContent = 'Projeler yükleniyor…';
  try {
    const res = await api('/projects');
    const data = await res.json().catch(() => ({}));
    if (!res.ok) { if (dash.status) dash.status.textContent = data.error || 'Projeler yüklenemedi.'; return; }
    currentTier = data.tier || 'free';
    setTierBadge(currentTier);
    renderProjectList(data.projects || []);
    if (dash.status) {
      dash.status.textContent = (data.projects || []).length ? '' : 'Henüz projen yok. "Yeni Proje" ile başla.';
    }
  } catch (e) {
    if (dash.status) dash.status.textContent = 'Projeler yüklenemedi: ' + (e?.message || e);
  }
}

function renderProjectList(projects) {
  dash.list.innerHTML = '';
  for (const p of projects) {
    const li = document.createElement('li');
    li.className = 'dash-card';

    const main = document.createElement('div');
    main.className = 'dash-card-main';
    const name = document.createElement('div');
    name.className = 'dash-card-name';
    name.textContent = p.name;
    const meta = document.createElement('div');
    meta.className = 'dash-card-meta';
    const d = p.updated_at ? new Date(p.updated_at) : null;
    meta.textContent = `${p.engine || 'pdflatex'}${d ? ' · ' + d.toLocaleString('tr-TR') : ''}`;
    main.appendChild(name);
    main.appendChild(meta);
    main.addEventListener('click', () => openProject(p.id));
    li.appendChild(main);

    const del = document.createElement('button');
    del.className = 'dash-card-del';
    del.type = 'button';
    del.title = 'Sil';
    del.textContent = '🗑';
    del.addEventListener('click', (e) => { e.stopPropagation(); deleteProject(p.id, p.name); });
    li.appendChild(del);

    dash.list.appendChild(li);
  }
}

function loadProjectIntoEditor(data) {
  for (const f of project.files) { if (f.kind === 'text' && f.model) f.model.dispose(); }
  project.files = [];
  project.activeName = null;

  const files = data.files || {};
  const entry = data.project?.entry || 'main.tex';
  const names = Object.keys(files);
  if (!names.length) {
    addTextFile('main.tex', DEFAULT_TEX, { main: true });
  } else {
    for (const name of names) {
      const val = files[name];
      if (typeof val === 'string') addTextFile(name, val);
      else if (val && val.encoding === 'base64') addBinaryFile(name, val.data, guessMime(name));
    }
    setMainSilent(entry);
  }
  setEngine(data.project?.engine || 'pdflatex');
  renderTree();
  openFile(getEntry());
  dirty = false;
  updateSaveState();
}

async function openProject(id) {
  if (dash.status) dash.status.textContent = 'Proje açılıyor…';
  try {
    const res = await api(`/projects/${id}`);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) { if (dash.status) dash.status.textContent = data.error || 'Açılamadı.'; return; }
    loadProjectIntoEditor(data);
    currentProjectId = id;
    enterEditor();
    log(`Proje açıldı: ${data.project?.name || id}`, 'ok');
  } catch (e) {
    if (dash.status) dash.status.textContent = 'Açılamadı: ' + (e?.message || e);
  }
}

async function createProject() {
  const result = await uiModal({
    title: 'Yeni Proje',
    message: 'Proje adı:',
    input: true,
    defaultValue: '',
    selectOptions: Object.entries(TEMPLATES).map(([key, t]) => ({ value: key, label: t.label })),
    selectLabel: 'Şablon:',
    selectDefault: 'article',
  });
  if (result == null) return;
  const name = (result.input || '').trim();
  const templateKey = result.select || 'article';
  if (!name) return;
  const tpl = TEMPLATES[templateKey] || TEMPLATES.empty;
  if (dash.status) dash.status.textContent = 'Oluşturuluyor…';
  try {
    const res = await api('/projects', { method: 'POST', body: JSON.stringify({ name }) });
    const data = await res.json().catch(() => ({}));
    if (res.status === 403) { if (dash.status) dash.status.textContent = data.error || 'Proje limitine ulaştın.'; return; }
    if (!res.ok) { if (dash.status) dash.status.textContent = data.error || 'Oluşturulamadı.'; return; }
    loadProjectIntoEditor({ project: data.project, files: tpl.files });
    currentProjectId = data.project.id;
    enterEditor();
    log(`Proje oluşturuldu: ${data.project.name} (şablon: ${tpl.label})`, 'ok');
    await saveProject(true); // şablon dosyalarını R2'ye yaz
  } catch (e) {
    if (dash.status) dash.status.textContent = 'Oluşturulamadı: ' + (e?.message || e);
  }
}

async function deleteProject(id, name) {
  if (!(await uiConfirm(`"${name}" silinsin mi? Bu işlem geri alınamaz.`, { okText: 'Sil', danger: true }))) return;
  try {
    const res = await api(`/projects/${id}`, { method: 'DELETE' });
    if (!res.ok) { const d = await res.json().catch(() => ({})); if (dash.status) dash.status.textContent = d.error || 'Silinemedi.'; return; }
    log(`Proje silindi: ${name}`, 'info');
    refreshDashboard();
  } catch (e) {
    if (dash.status) dash.status.textContent = 'Silinemedi: ' + (e?.message || e);
  }
}

async function saveProject(silent) {
  if (!currentProjectId) { log('Açık proje yok.', 'warn'); return; }
  const entry = getEntry();
  const files = buildCompileFiles();
  if (!files[entry] || typeof files[entry] !== 'string') {
    log('Ana dosya bir .tex metin dosyası olmalı.', 'warn');
    return;
  }
  if (!silent) log('Kaydediliyor…', 'info');
  if (btnSave) btnSave.disabled = true;
  try {
    const res = await api(`/projects/${currentProjectId}`, {
      method: 'PUT',
      body: JSON.stringify({ entry, engine: currentEngine, files }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.status === 413) { log(data.error || 'Boyut limiti aşıldı.', 'error'); return; }
    if (!res.ok) { log('Kaydedilemedi: ' + (data.error || res.statusText), 'error'); return; }
    dirty = false;
    updateSaveState();
    if (!silent) log(`Kaydedildi (${data.fileCount} dosya).`, 'ok');
  } catch (e) {
    log('Kaydetme hatası: ' + (e?.message || e), 'error');
  } finally {
    if (btnSave) btnSave.disabled = false;
  }
}

async function backToProjects() {
  if (dirty && currentProjectId) {
    if (await uiConfirm('Kaydedilmemiş değişiklikler var. Önce kaydedilsin mi?', { okText: 'Kaydet', cancelText: 'Kaydetme' })) await saveProject(false);
  }
  enterDashboard();
}

if (dash.btnNew) dash.btnNew.addEventListener('click', createProject);
if (btnSave) btnSave.addEventListener('click', () => saveProject(false));
if (btnProjects) btnProjects.addEventListener('click', backToProjects);

document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
    const inEditor = dash.screen && dash.screen.style.display === 'none';
    if (currentProjectId && inEditor) { e.preventDefault(); saveProject(false); }
  }
});

// ──────────────────────────────────────────────────────────────────
// Bootstrap — Clerk ÖNCE yüklenmeli (AMD/define çakışması nedeniyle).
// ──────────────────────────────────────────────────────────────────
(async () => {
  log('Sistem başlatılıyor…', 'info');
  await initClerk();
  await initEditor();
  initResizers();
  initDropZone();
})();
