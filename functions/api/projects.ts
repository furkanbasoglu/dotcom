/**
 * functions/api/projects.ts
 *
 *   GET  /api/projects   → giriş yapan kullanıcının projelerini listeler
 *   POST /api/projects   → yeni proje oluşturur  body: { name }
 *
 * Kimlik + tier ortak _auth modülünden gelir (Clerk JWT + D1 lazy upsert).
 * Dosya içerikleri burada DEĞİL — onlar R2'de yaşayacak (sonraki adım: [id].ts).
 * Bu uç sadece proje META kayıtlarını (D1.projects) yönetir.
 */

import { authenticate, json } from './_auth';
import type { AuthEnv, TierName } from './_auth';

interface Env extends AuthEnv {}

// Tier başına izin verilen proje sayısı
const PROJECT_LIMIT: Record<TierName, number> = {
  free: 1,
  pro: 1,
  unlimited: 1000,
};

// ── GET /api/projects — listele
export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const a = await authenticate(request, env);
  if ('error' in a) return a.error;
  const { userId, tier } = a.auth;

  try {
    const res = await env.DB.prepare(
      `SELECT id, name, entry, engine, created_at, updated_at
       FROM projects
       WHERE owner_id = ?1
       ORDER BY updated_at DESC;`,
    ).bind(userId).all();
    return json({ projects: res.results || [], tier });
  } catch (e: any) {
    return json({ error: 'Projeler okunamadı.', detail: String(e?.message || e) }, 500);
  }
};

// ── POST /api/projects — oluştur
export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const a = await authenticate(request, env);
  if ('error' in a) return a.error;
  const { userId, tier } = a.auth;

  let body: { name?: string } = {};
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Geçersiz JSON.' }, 400);
  }
  const name = String(body.name || '').trim();
  if (!name || name.length > 120) {
    return json({ error: 'Proje adı gerekli (en fazla 120 karakter).' }, 400);
  }

  // Tier proje limiti
  try {
    const cnt = await env.DB.prepare(`SELECT COUNT(*) AS n FROM projects WHERE owner_id = ?1;`)
      .bind(userId)
      .first<{ n: number }>();
    const used = cnt?.n || 0;
    if (used >= PROJECT_LIMIT[tier]) {
      return json(
        { error: `Proje limitine ulaştın (${tier}: ${PROJECT_LIMIT[tier]}). Yükseltme gerekli.`, tier },
        403,
      );
    }
  } catch (e: any) {
    return json({ error: 'Limit kontrolü başarısız.', detail: String(e?.message || e) }, 500);
  }

  const id = crypto.randomUUID();
  const now = Date.now();
  try {
    await env.DB.prepare(
      `INSERT INTO projects (id, owner_id, name, entry, engine, created_at, updated_at)
       VALUES (?1, ?2, ?3, 'main.tex', 'pdflatex', ?4, ?4);`,
    ).bind(id, userId, name, now).run();
  } catch (e: any) {
    return json({ error: 'Proje oluşturulamadı.', detail: String(e?.message || e) }, 500);
  }

  return json(
    { project: { id, name, entry: 'main.tex', engine: 'pdflatex', created_at: now, updated_at: now } },
    201,
  );
};
