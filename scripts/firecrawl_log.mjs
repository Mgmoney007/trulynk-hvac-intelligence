// Log a Firecrawl MCP call that is not a scrape fallback (e.g. search). Usage:
// node scripts/firecrawl_log.mjs <tool> <credits> <purpose> [searchId]
import path from 'node:path';
import { ROOT, nowIso, appendJsonl } from './lib/util.mjs';
const [tool, credits, purpose, id] = process.argv.slice(2);
await appendJsonl(path.join(ROOT, 'logs/firecrawl_usage.jsonl'), { at: nowIso(), tool, creditsUsed: Number(credits), purpose, requestId: id || null });
console.log('logged');
