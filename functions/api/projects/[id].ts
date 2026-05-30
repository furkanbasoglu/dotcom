/**
 * functions/api/projects/[id].ts
 *
 *   GET    /api/projects/:id   → projeyi aç (D1 meta + R2 içerikler)
 *   PUT    /api/projects/:id   → kaydet (TAM SENKRON: gönderilen dosya seti nihaidir)
 *   DELETE /api/projects/:id   → sil (R2 nesneleri + D1 satırı; CASCADE R2'yi bilmez)
 *
 * Dosya içerikleri R2'de yaşar; anahtar düzeni: <owner_id>/<project_id>/<dosya_adı>
 * D1.files yalnızca metadata tutar (name, kind, r2_key, size).
 *
 * Dosya gösterimi (frontend ile aynı sözleşme):
 *   - metin  → JSON string
 *   - binary → { encoding: 'base64', data: '<base64>' }
 *
 * Gerekli binding'ler: DB (D1), PROJECTS_BUCKET (R2)
 */

import { authenticate, json } from '../_auth';
import type { AuthEnv, TierName } from '../_auth';

// ── Minimal R2 tipleri (global types'a bağımlı kalmamak için)
interface R2ObjectBody {
  text(): Promise<string>;
  arrayBuffer(): Promise<ArrayBuffer>;
}
interface R2ListResult {
  objects: { key: string }[];
  truncated: boolean;
  cursor?: string;
}
interface R2Bucket {
  get(key: string): Promise<R2ObjectBody | null>;
  put(key: string, value: string | ArrayBuffer | ArrayBufferView): Promise<unknown>;
  delete(key: string | string[]): Promise<void>;
  list(opts?: { prefix?: string; cursor?: string }): Promise<R2ListResult>;
}

interface Env extends AuthEnv {
  PROJECTS_BUCKET: R2Bucket;
}

// Tier başına toplam proje boyutu (compile.ts ile tutarlı)
const TIER_MAX_BYTES: Record<TierName, number> = {
  free: 10 * 1024 * 1024,
  pro: 100 * 1024 * 1024,
  unlimited: 500 * 1024 * 1024,
};

const MAX_FILES = 200;

type FileValue = string | { encoding: 'base64'; data: string };
interface SaveBody {
  name?: string;
  entry?: string;
  engine?: string;
  files?: Record<string, FileValue>;
}

// ── Yardımcılar
function safeName(name: string): boolean {
  if (!name || name.length > 200) return false;
  if (name.includes('..') || name.startsWith('/') || name.includes('\\')) return false;
  return /^[A-Za-z0-9._\-/]+$/.test(name);
}

function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

function bytesToBase64(bytes: Uint8Array): string {
  let bin = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode(...bytes.subarray(i, Math.min(i + chunk, bytes.length)));
  }
  return btoa(bin);
}

// Projeyi getir + sahiplik doğrula. Sahip değilse/yoksa null.
async function ownedProject(env: Env, userId: string, id: string) {
  return env.DB.prepare(
    `SELECT id, name, entry, engine, created_at, updated_at
     FROM projects WHERE id = ?1 AND owner_id = ?2;`,
  ).bind(id, userId).first<{
    id: string; name: string; entry: string; engine: string; created_at: number; updated_at: number;
  }>();
}

// ──────────────────────────────────────────────────────────────────
// GET — projeyi aç
// ──────────────────────────────────────────────────────────────────
export const onRequestGet: PagesFunction<Env> = async ({ params, request, env }) => {
  const a = await authenticate(request, env);
  if ('error' in a) return a.error;
  const { userId } = a.auth;
  const id = String(params.id);

  const project = await ownedProject(env, userId, id);
  if (!project) return json({ error: 'Proje bulunamadı.' }, 404);

  let rows: { name: string; kind: string; r2_key: string | null }[];
  try {
    const res = await env.DB.prepare(
      `SELECT name, kind, r2_key FROM files WHERE project_id = ?1 ORDER BY name;`,
    ).bind(id).all<{ name: string; kind: string; r2_key: string | null }>();
    rows = res.results || [];
  } catch (e: any) {
    return json({ error: 'Dosya listesi okunamadı.', detail: String(e?.message || e) }, 500);
  }

  const files: Record<string, FileValue> = {};
  try {
    for (const r of rows) {
      if (!r.r2_key) continue;
      const obj = await env.PROJECTS_BUCKET.get(r.r2_key);
      if (!obj) {
        files[r.name] = r.kind === 'binary' ? { encoding: 'base64', data: '' } : '';
        continue;
      }
      if (r.kind === 'binary') {
        const buf = new Uint8Array(await obj.arrayBuffer());
        files[r.name] = { encoding: 'base64', data: bytesToBase64(buf) };
      } else {
        files[r.name] = await obj.text();
      }
    }
  } catch (e: any) {
    return json({ error: 'İçerik okunamadı (R2).', detail: String(e?.message || e) }, 500);
  }

  return json({
    project: {
      id: project.id, name: project.name, entry: project.entry,
      engine: project.engine, created_at: project.created_at, updated_at: project.updated_at,
    },
    files,
  });
};

// ──────────────────────────────────────────────────────────────────
// PUT — kaydet (tam senkron)
// ──────────────────────────────────────────────────────────────────
export const onRequestPut: PagesFunction<Env> = async ({ params, request, env }) => {
  const a = await authenticate(request, env);
  if ('error' in a) return a.error;
  const { userId, tier } = a.auth;
  const id = String(params.id);

  const project = await ownedProject(env, userId, id);
  if (!project) return json({ error: 'Proje bulunamadı.' }, 404);

  let body: SaveBody;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Geçersiz JSON.' }, 400);
  }

  const files = body.files;
  if (!files || typeof files !== 'object') {
    return json({ error: 'files alanı zorunlu.' }, 400);
  }
  const names = Object.keys(files);
  if (names.length === 0) return json({ error: 'En az bir dosya gerekli.' }, 400);
  if (names.length > MAX_FILES) return json({ error: `Çok fazla dosya (max ${MAX_FILES}).` }, 400);

  const entry = body.entry || project.entry || 'main.tex';
  if (!files[entry]) return json({ error: `Ana dosya bulunamadı: ${entry}` }, 400);

  const engine = body.engine || project.engine || 'pdflatex';
  if (!['pdflatex', 'xelatex', 'lualatex'].includes(engine)) {
    return json({ error: 'Geçersiz engine.' }, 400);
  }

  // 1. Geçiş: doğrula + içerikleri hazırla + toplam boyutu hesapla
  const enc = new TextEncoder();
  const prepared: { name: string; kind: 'text' | 'binary'; payload: string | Uint8Array; size: number }[] = [];
  let totalBytes = 0;
  for (const name of names) {
    if (!safeName(name)) return json({ error: `Geçersiz dosya adı: ${name}` }, 400);
    const val = files[name];
    if (typeof val === 'string') {
      const size = enc.encode(val).length;
      prepared.push({ name, kind: 'text', payload: val, size });
      totalBytes += size;
    } else if (val && val.encoding === 'base64' && typeof val.data === 'string') {
      const bytes = base64ToBytes(val.data);
      prepared.push({ name, kind: 'binary', payload: bytes, size: bytes.length });
      totalBytes += bytes.length;
    } else {
      return json({ error: `Geçersiz dosya içeriği: ${name}` }, 400);
    }
  }
  if (totalBytes > TIER_MAX_BYTES[tier]) {
    return json({ error: `Toplam boyut tier sınırını aşıyor (${tier}: ${TIER_MAX_BYTES[tier]} byte).`, tier }, 413);
  }

  const now = Date.now();

  // Mevcut dosya seti (silinecekleri bulmak için)
  let existing: { name: string; r2_key: string | null }[] = [];
  try {
    const res = await env.DB.prepare(`SELECT name, r2_key FROM files WHERE project_id = ?1;`)
      .bind(id).all<{ name: string; r2_key: string | null }>();
    existing = res.results || [];
  } catch (e: any) {
    return json({ error: 'Mevcut dosyalar okunamadı.', detail: String(e?.message || e) }, 500);
  }
  const incoming = new Set(names);

  // 2. Geçiş: R2'ye yaz + D1 upsert
  try {
    for (const f of prepared) {
      const key = `${userId}/${id}/${f.name}`;
      await env.PROJECTS_BUCKET.put(key, f.payload);
      await env.DB.prepare(
        `INSERT INTO files (id, project_id, name, kind, r2_key, size, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)
         ON CONFLICT(project_id, name)
         DO UPDATE SET kind = ?4, r2_key = ?5, size = ?6, updated_at = ?7;`,
      ).bind(crypto.randomUUID(), id, f.name, f.kind, key, f.size, now).run();
    }
  } catch (e: any) {
    return json({ error: 'Kaydetme başarısız (yazma).', detail: String(e?.message || e) }, 500);
  }

  // 3. Geçiş: artık olmayan dosyaları sil (R2 + D1)
  try {
    for (const ex of existing) {
      if (!incoming.has(ex.name)) {
        if (ex.r2_key) await env.PROJECTS_BUCKET.delete(ex.r2_key);
        await env.DB.prepare(`DELETE FROM files WHERE project_id = ?1 AND name = ?2;`)
          .bind(id, ex.name).run();
      }
    }
  } catch (e: any) {
    return json({ error: 'Eski dosyalar temizlenemedi.', detail: String(e?.message || e) }, 500);
  }

  // Proje meta güncelle
  try {
    const newName = (body.name && body.name.trim()) ? body.name.trim().slice(0, 120) : project.name;
    await env.DB.prepare(
      `UPDATE projects SET name = ?1, entry = ?2, engine = ?3, updated_at = ?4 WHERE id = ?5;`,
    ).bind(newName, entry, engine, now, id).run();
    return json({
      ok: true,
      project: { id, name: newName, entry, engine, updated_at: now },
      fileCount: prepared.length,
    });
  } catch (e: any) {
    return json({ error: 'Proje meta güncellenemedi.', detail: String(e?.message || e) }, 500);
  }
};

// ──────────────────────────────────────────────────────────────────
// DELETE — sil
// ──────────────────────────────────────────────────────────────────
export const onRequestDelete: PagesFunction<Env> = async ({ params, request, env }) => {
  const a = await authenticate(request, env);
  if ('error' in a) return a.error;
  const { userId } = a.auth;
  const id = String(params.id);

  const project = await ownedProject(env, userId, id);
  if (!project) return json({ error: 'Proje bulunamadı.' }, 404);

  // R2'deki tüm proje nesnelerini sil (prefix ile, CASCADE R2'yi bilmez)
  try {
    const prefix = `${userId}/${id}/`;
    let cursor: string | undefined;
    do {
      const listed = await env.PROJECTS_BUCKET.list({ prefix, cursor });
      if (listed.objects.length) {
        await env.PROJECTS_BUCKET.delete(listed.objects.map((o) => o.key));
      }
      cursor = listed.truncated ? listed.cursor : undefined;
    } while (cursor);
  } catch (e: any) {
    return json({ error: 'R2 nesneleri silinemedi.', detail: String(e?.message || e) }, 500);
  }

  // D1 satırını sil (CASCADE files meta'sını da temizler)
  try {
    await env.DB.prepare(`DELETE FROM projects WHERE id = ?1 AND owner_id = ?2;`)
      .bind(id, userId).run();
  } catch (e: any) {
    return json({ error: 'Proje silinemedi (D1).', detail: String(e?.message || e) }, 500);
  }

  return json({ ok: true });
};
