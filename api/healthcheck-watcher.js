// /api/healthcheck-watcher.js
//
// Cron-triggered watcher. Runs once a week (see vercel.json crons).
// Calls /api/healthcheck internally and — if anything is unhealthy —
// creates (or reopens) a GitHub issue on the cosmic-reader repo so you
// get a notification.
//
// Triggered by Vercel Cron only. The CRON_SECRET env var lets us reject
// random callers; Vercel's own scheduler passes Authorization: Bearer
// <CRON_SECRET> automatically when configured.
//
// PURE ADDITIVE — single new file, never called by any page, cannot
// affect users or anything visible on the site.
//
// Required env vars (set in Vercel project settings):
//   GITHUB_TOKEN   — fine-grained personal access token with "Issues: read & write"
//                    on the erikotik-ux/cosmic-reader repo. Without this, the
//                    watcher logs the failure but cannot file an issue.
//   CRON_SECRET    — any random string. Used to reject non-Vercel callers.
//                    Vercel auto-passes this in the Authorization header for
//                    crons that match a CRON_SECRET env var.
//
// Behaviour:
//   - Healthcheck reports "All systems nominal" → watcher returns 200 silently.
//   - Healthcheck reports failures → watcher checks if a matching open issue
//     already exists. If not, creates a new one. If yes, posts a follow-up
//     comment with the latest failure (so you don't get duplicate issues).

const REPO_OWNER = 'erikotik-ux';
const REPO_NAME  = 'cosmic-reader';
const ISSUE_LABEL = 'healthcheck-failure';

async function callHealthcheck(host) {
  const r = await fetch(`${host}/api/healthcheck`, {
    headers: { 'User-Agent': 'CosmicReaderHealthcheckWatcher/1.0' },
    signal: AbortSignal.timeout(20000),
  });
  if (!r.ok) throw new Error(`healthcheck endpoint returned ${r.status}`);
  return r.json();
}

async function findOpenIssue(token) {
  const q = encodeURIComponent(`repo:${REPO_OWNER}/${REPO_NAME} is:issue is:open label:${ISSUE_LABEL}`);
  const r = await fetch(`https://api.github.com/search/issues?q=${q}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'CosmicReaderHealthcheckWatcher/1.0',
    },
    signal: AbortSignal.timeout(10000),
  });
  if (!r.ok) return null;
  const data = await r.json();
  return (data.items && data.items[0]) || null;
}

async function createIssue(token, title, body) {
  const r = await fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/issues`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type': 'application/json',
      'User-Agent': 'CosmicReaderHealthcheckWatcher/1.0',
    },
    body: JSON.stringify({ title, body, labels: [ISSUE_LABEL] }),
    signal: AbortSignal.timeout(10000),
  });
  if (!r.ok) {
    const err = await r.text().catch(() => '');
    throw new Error(`GitHub createIssue failed: ${r.status} ${err.slice(0, 200)}`);
  }
  return r.json();
}

async function commentOnIssue(token, issueNumber, body) {
  const r = await fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/issues/${issueNumber}/comments`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type': 'application/json',
      'User-Agent': 'CosmicReaderHealthcheckWatcher/1.0',
    },
    body: JSON.stringify({ body }),
    signal: AbortSignal.timeout(10000),
  });
  if (!r.ok) {
    const err = await r.text().catch(() => '');
    throw new Error(`GitHub commentOnIssue failed: ${r.status} ${err.slice(0, 200)}`);
  }
  return r.json();
}

function buildIssueBody(health) {
  const lines = [];
  lines.push(`**Cron timestamp:** ${health.timestamp}`);
  lines.push(`**Summary:** ${health.summary}`);
  lines.push('');
  lines.push('## Publisher CDN status');
  for (const [source, info] of Object.entries(health.publisher_cdns || {})) {
    const mark = info.ok ? '✓' : '✗';
    const detail = info.ok
      ? `${info.status} · ${info.ms}ms`
      : `${info.status || '—'} ${info.error || ''}`.trim();
    lines.push(`- ${mark} **${source}** — ${detail}`);
  }
  lines.push('');
  lines.push('## Own endpoints');
  if (health.own_spacenews) {
    const m = health.own_spacenews.ok ? '✓' : '✗';
    lines.push(`- ${m} /api/spacenews — ${health.own_spacenews.status || '—'} (${health.own_spacenews.ms}ms)`);
  }
  if (health.own_og) {
    const m = health.own_og.ok ? '✓' : '✗';
    lines.push(`- ${m} /api/og — ${health.own_og.status || '—'} (${health.own_og.ms}ms)`);
  }
  lines.push('');
  lines.push('## Raw JSON');
  lines.push('```json');
  lines.push(JSON.stringify(health, null, 2));
  lines.push('```');
  lines.push('');
  lines.push('---');
  lines.push('_Filed automatically by `/api/healthcheck-watcher` (weekly cron). Close this issue when the underlying source recovers and you\'ve confirmed via `/api/healthcheck?pretty=1`._');
  return lines.join('\n');
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  // Reject anyone who isn't Vercel's cron scheduler.
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = req.headers.authorization || '';
    if (auth !== `Bearer ${cronSecret}`) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
  }

  const host = `https://${req.headers.host || 'cosmicreader.app'}`;
  let health;
  try {
    health = await callHealthcheck(host);
  } catch (e) {
    // If the healthcheck itself is unreachable, that IS the alert.
    health = {
      timestamp: new Date().toISOString(),
      summary: 'Healthcheck endpoint unreachable: ' + (e.message || e),
      publisher_cdns: {},
      own_spacenews: null,
      own_og: null,
    };
  }

  // Healthy → exit quietly.
  if (health.summary && health.summary.startsWith('All systems nominal')) {
    return res.status(200).json({ ok: true, action: 'silent', timestamp: health.timestamp });
  }

  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    // Without a token we can't file an issue. Surface it in the logs.
    console.error('[healthcheck-watcher] failure detected, but GITHUB_TOKEN not set:', health.summary);
    return res.status(200).json({ ok: false, reason: 'GITHUB_TOKEN missing', health });
  }

  try {
    const existing = await findOpenIssue(token);
    const today = new Date().toISOString().slice(0, 10);
    const title = `Healthcheck failure — ${health.summary}`.slice(0, 240);

    if (existing) {
      await commentOnIssue(token, existing.number, `**${today}** — still failing.\n\n${buildIssueBody(health)}`);
      return res.status(200).json({ ok: true, action: 'comment', issue: existing.number });
    } else {
      const created = await createIssue(token, title, buildIssueBody(health));
      return res.status(200).json({ ok: true, action: 'created', issue: created.number, url: created.html_url });
    }
  } catch (e) {
    console.error('[healthcheck-watcher] GitHub API error:', e.message);
    return res.status(200).json({ ok: false, error: e.message, health });
  }
}
