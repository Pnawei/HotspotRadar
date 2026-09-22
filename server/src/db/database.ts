// SQLite 数据库层：连接初始化 + 建表 + 数据访问函数
// 注意：创建数据目录必须先于 new Database()，否则可能出现 SQLITE_CANTOPEN

import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { config } from '../config.js';

const dbPath = path.isAbsolute(config.dbPath)
  ? config.dbPath
  : path.resolve(process.cwd(), config.dbPath);

fs.mkdirSync(path.dirname(dbPath), { recursive: true });

export const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS events (
    event_id        TEXT PRIMARY KEY,
    title           TEXT NOT NULL,
    category        TEXT NOT NULL,
    hot_value       INTEGER NOT NULL DEFAULT 0,
    hot_display     TEXT NOT NULL DEFAULT '',
    rank            INTEGER NOT NULL DEFAULT 0,
    excerpt         TEXT,
    first_seen_at   TEXT NOT NULL,
    updated_at      TEXT NOT NULL,
    ai_detail       TEXT,
    ai_verified     INTEGER NOT NULL DEFAULT 0,
    ai_generated_at TEXT
  );

  CREATE TABLE IF NOT EXISTS sources (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    event_id      TEXT NOT NULL,
    platform      TEXT NOT NULL,
    platform_name TEXT NOT NULL,
    url           TEXT NOT NULL,
    hot_value     INTEGER NOT NULL DEFAULT 0,
    raw_rank      INTEGER NOT NULL DEFAULT 0,
    created_at    TEXT NOT NULL,
    UNIQUE(event_id, platform, url)
  );

  CREATE TABLE IF NOT EXISTS trend_samples (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    event_id   TEXT NOT NULL,
    sample_at  TEXT NOT NULL,
    heat_score INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS crawl_log (
    platform    TEXT PRIMARY KEY,
    status      TEXT NOT NULL,
    item_count  INTEGER NOT NULL DEFAULT 0,
    response_ms INTEGER NOT NULL DEFAULT 0,
    updated_at  TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS related_cache (
    event_id   TEXT PRIMARY KEY,
    payload    TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS translation_cache (
    text_hash    TEXT PRIMARY KEY,
    source_text  TEXT NOT NULL,
    translated   TEXT NOT NULL,
    updated_at   TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_events_category ON events(category);
  CREATE INDEX IF NOT EXISTS idx_sources_event ON sources(event_id);
  CREATE INDEX IF NOT EXISTS idx_trend_event_time ON trend_samples(event_id, sample_at);
`);

// ---------- 轻量迁移：为旧库补充 AI 扩充字段 ----------

function ensureEventsColumn(column: string, ddl: string): void {
  const columns = db.prepare('PRAGMA table_info(events)').all() as Array<{ name: string }>;
  if (!columns.some((c) => c.name === column)) {
    db.exec(`ALTER TABLE events ADD COLUMN ${ddl}`);
  }
}

ensureEventsColumn('ai_detail', 'ai_detail TEXT');
ensureEventsColumn('ai_verified', 'ai_verified INTEGER NOT NULL DEFAULT 0');
ensureEventsColumn('ai_generated_at', 'ai_generated_at TEXT');

// ---------- 行类型 ----------

export interface EventRow {
  event_id: string;
  title: string;
  category: string;
  hot_value: number;
  hot_display: string;
  rank: number;
  excerpt: string | null;
  first_seen_at: string;
  updated_at: string;
  ai_detail: string | null;
  ai_verified: number;
  ai_generated_at: string | null;
}

export interface SourceRow {
  platform: string;
  platform_name: string;
  url: string;
  hot_value: number;
  raw_rank: number;
}

export interface TrendSampleRow {
  sample_at: string;
  heat_score: number;
}

export interface CrawlLogRow {
  platform: string;
  status: 'online' | 'slow' | 'offline';
  item_count: number;
  response_ms: number;
  updated_at: string;
}

// ---------- events ----------

const stmtUpsertEvent = db.prepare(`
  INSERT INTO events (event_id, title, category, hot_value, hot_display, rank, excerpt, first_seen_at, updated_at)
  VALUES (@event_id, @title, @category, @hot_value, @hot_display, @rank, @excerpt, @first_seen_at, @updated_at)
  ON CONFLICT(event_id) DO UPDATE SET
    title       = excluded.title,
    category    = excluded.category,
    hot_value   = excluded.hot_value,
    hot_display = excluded.hot_display,
    rank        = excluded.rank,
    excerpt     = excluded.excerpt,
    updated_at  = excluded.updated_at
`);

export function upsertEvent(
  event: Omit<
    EventRow,
    'first_seen_at' | 'updated_at' | 'ai_detail' | 'ai_verified' | 'ai_generated_at'
  > & { first_seen_at?: string; updated_at: string },
): void {
  const existing = stmtGetEvent.get(event.event_id) as EventRow | undefined;
  stmtUpsertEvent.run({
    ...event,
    first_seen_at: existing?.first_seen_at || event.first_seen_at || event.updated_at,
    excerpt: event.excerpt ?? null,
  });
}

const stmtGetEvent = db.prepare('SELECT * FROM events WHERE event_id = ?');

export function getEvent(eventId: string): EventRow | undefined {
  return stmtGetEvent.get(eventId) as EventRow | undefined;
}

const stmtListSources = db.prepare(`
  SELECT platform, platform_name, url, hot_value, raw_rank
  FROM sources WHERE event_id = ? ORDER BY raw_rank ASC
`);

export function listSources(eventId: string): SourceRow[] {
  return stmtListSources.all(eventId) as SourceRow[];
}

const stmtDeleteSources = db.prepare('DELETE FROM sources WHERE event_id = ?');
const stmtInsertSource = db.prepare(`
  INSERT INTO sources (event_id, platform, platform_name, url, hot_value, raw_rank, created_at)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`);

export function replaceSources(eventId: string, sources: SourceRow[], now: string): void {
  stmtDeleteSources.run(eventId);
  for (const s of sources) {
    stmtInsertSource.run(eventId, s.platform, s.platform_name, s.url, s.hot_value, s.raw_rank, now);
  }
}

// ---------- trend_samples ----------

const stmtInsertSample = db.prepare(`
  INSERT INTO trend_samples (event_id, sample_at, heat_score) VALUES (?, ?, ?)
`);

export function insertTrendSample(eventId: string, sampleAt: string, heatScore: number): void {
  stmtInsertSample.run(eventId, sampleAt, heatScore);
}

const stmtPruneSamples = db.prepare('DELETE FROM trend_samples WHERE sample_at < ?');

export function pruneTrendSamples(beforeIso: string): void {
  stmtPruneSamples.run(beforeIso);
}

// 返回最近的 N 条采样，按时间升序
const stmtRecentSamples = db.prepare(`
  SELECT sample_at, heat_score FROM (
    SELECT sample_at, heat_score FROM trend_samples
    WHERE event_id = ? ORDER BY sample_at DESC LIMIT ?
  ) ORDER BY sample_at ASC
`);

export function getRecentSamples(eventId: string, limit: number): TrendSampleRow[] {
  return stmtRecentSamples.all(eventId, limit) as TrendSampleRow[];
}

// ---------- 列表查询 ----------

export function listEvents(category: string | undefined, limit: number, offset: number): EventRow[] {
  if (category) {
    return db
      .prepare('SELECT * FROM events WHERE category = ? ORDER BY rank ASC LIMIT ? OFFSET ?')
      .all(category, limit, offset) as EventRow[];
  }
  return db
    .prepare('SELECT * FROM events ORDER BY rank ASC LIMIT ? OFFSET ?')
    .all(limit, offset) as EventRow[];
}

export function countEvents(category: string | undefined): number {
  const row = category
    ? (db.prepare('SELECT COUNT(*) AS c FROM events WHERE category = ?').get(category) as { c: number })
    : (db.prepare('SELECT COUNT(*) AS c FROM events').get() as { c: number });
  return row.c;
}

export function topEvents(limit: number): EventRow[] {
  return db.prepare('SELECT * FROM events ORDER BY rank ASC LIMIT ?').all(limit) as EventRow[];
}

// 批量查询多个事件的来源汇总（一次查询，避免 N+1）
export function getSourceSummary(
  eventIds: string[],
): Map<string, { count: number; names: string[] }> {
  const result = new Map<string, { count: number; names: string[] }>();
  if (eventIds.length === 0) return result;

  const placeholders = eventIds.map(() => '?').join(',');
  const rows = db
    .prepare(
      `SELECT event_id, COUNT(*) AS count, GROUP_CONCAT(platform_name) AS names
       FROM sources WHERE event_id IN (${placeholders}) GROUP BY event_id`,
    )
    .all(...eventIds) as Array<{ event_id: string; count: number; names: string }>;

  for (const row of rows) {
    result.set(row.event_id, {
      count: row.count,
      names: row.names ? row.names.split(',') : [],
    });
  }
  return result;
}

// ---------- crawl_log ----------

const stmtUpsertCrawlLog = db.prepare(`
  INSERT INTO crawl_log (platform, status, item_count, response_ms, updated_at)
  VALUES (@platform, @status, @item_count, @response_ms, @updated_at)
  ON CONFLICT(platform) DO UPDATE SET
    status      = excluded.status,
    item_count  = excluded.item_count,
    response_ms = excluded.response_ms,
    updated_at  = excluded.updated_at
`);

export function upsertCrawlLog(log: Omit<CrawlLogRow, 'updated_at'> & { updated_at?: string }): void {
  stmtUpsertCrawlLog.run({ updated_at: new Date().toISOString(), ...log });
}

const stmtAllCrawlLogs = db.prepare('SELECT * FROM crawl_log');

export function allCrawlLogs(): CrawlLogRow[] {
  return stmtAllCrawlLogs.all() as CrawlLogRow[];
}

// ---------- AI 扩充任务 ----------

const stmtListPendingEnrichment = db.prepare(`
  SELECT event_id, title, category FROM events
  WHERE ai_generated_at IS NULL OR ai_generated_at < ?
  ORDER BY rank ASC
  LIMIT ?
`);

export interface PendingEnrichment {
  event_id: string;
  title: string;
  category: string;
}

// 列出需要扩充的事件：从未生成 或 内容已超过 TTL
export function listEventsNeedingEnrichment(limit: number, ttlMs: number): PendingEnrichment[] {
  const cutoff = new Date(Date.now() - ttlMs).toISOString();
  return stmtListPendingEnrichment.all(cutoff, limit) as PendingEnrichment[];
}

const stmtSetEnrichment = db.prepare(`
  UPDATE events SET ai_detail = ?, ai_verified = ?, ai_generated_at = ?
  WHERE event_id = ?
`);

// aiVerified: 0=未证实/信息不足 1=已证实
export function setEventEnrichment(
  eventId: string,
  aiDetail: string,
  aiVerified: number,
  now: string,
): void {
  stmtSetEnrichment.run(aiDetail, aiVerified, now, eventId);
}

// ---------- 相关内容缓存 ----------

const stmtGetRelatedCache = db.prepare(`
  SELECT payload, updated_at FROM related_cache WHERE event_id = ?
`);

export function getRelatedCache(
  eventId: string,
): { payload: string; updated_at: string } | undefined {
  return stmtGetRelatedCache.get(eventId) as
    | { payload: string; updated_at: string }
    | undefined;
}

const stmtUpsertRelatedCache = db.prepare(`
  INSERT INTO related_cache (event_id, payload, updated_at)
  VALUES (@event_id, @payload, @updated_at)
  ON CONFLICT(event_id) DO UPDATE SET
    payload    = excluded.payload,
    updated_at = excluded.updated_at
`);

export function setRelatedCache(eventId: string, payload: string, now: string): void {
  stmtUpsertRelatedCache.run({ event_id: eventId, payload, updated_at: now });
}

// ---------- 翻译缓存 ----------

const stmtGetTranslation = db.prepare(
  'SELECT translated FROM translation_cache WHERE text_hash = ?',
);

export function getTranslation(hash: string): string | undefined {
  const row = stmtGetTranslation.get(hash) as { translated: string } | undefined;
  return row?.translated;
}

const stmtUpsertTranslation = db.prepare(`
  INSERT INTO translation_cache (text_hash, source_text, translated, updated_at)
  VALUES (@text_hash, @source_text, @translated, @updated_at)
  ON CONFLICT(text_hash) DO UPDATE SET
    source_text = excluded.source_text,
    translated  = excluded.translated,
    updated_at  = excluded.updated_at
`);

export function setTranslation(
  hash: string,
  sourceText: string,
  translated: string,
  now: string,
): void {
  stmtUpsertTranslation.run({
    text_hash: hash,
    source_text: sourceText,
    translated,
    updated_at: now,
  });
}
