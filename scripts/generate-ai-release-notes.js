#!/usr/bin/env node
/*
  Generate AI-crafted release notes in a specific format.
  - Reads commits since previous tag to the target tag (or HEAD)
  - Loads optional config from .github/release-notes.config.json
  - Calls OpenRouter (OpenAI-compatible) with configured model
  - Writes RELEASE_NOTES.md

  Env:
    OPENROUTER_API_KEY (required for AI)
    OPENROUTER_MODEL   (optional, default: openai/gpt-4o-mini)
*/

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Lazy require to keep build light if not available in some contexts
let OpenAI;
try { OpenAI = require('openai'); } catch { OpenAI = null; }

const REPO_ROOT = process.cwd();
const NOTES_PATH = path.join(REPO_ROOT, 'RELEASE_NOTES.md');
const CONFIG_PATH = path.join(REPO_ROOT, '.github', 'release-notes.config.json');

function sh(cmd) {
  return execSync(cmd, { encoding: 'utf8' }).trim();
}

function safeSh(cmd) {
  try { return sh(cmd); } catch { return ''; }
}

function getCurrentRef(argTag) {
  if (argTag) return argTag;
  const envRef = process.env.GITHUB_REF_NAME;
  if (envRef) return envRef;
  const tag = safeSh('git describe --tags --abbrev=0');
  return tag || 'HEAD';
}

function getPrevTag(currentRef) {
  // previous tag before currentRef
  const prev = safeSh(`git describe --tags --abbrev=0 "${currentRef}^"`);
  if (prev) return prev;
  // fallback: just find latest tag if currentRef is HEAD
  if (currentRef === 'HEAD') {
    const t = safeSh('git describe --tags --abbrev=0');
    return t || '';
  }
  return '';
}

function getCommitData(range) {
  // subject, body, author, short sha
  const format = ['%h', '%s', '%b', '%an', '%ad'].join('%x1f');
  const raw = range
    ? safeSh(`git log ${range} --no-merges --date=short --pretty=format:"${format}"`)
    : safeSh(`git log --no-merges -n 50 --date=short --pretty=format:"${format}"`);
  if (!raw) return [];
  return raw.split('\n').map(line => {
    const [sha, subject, body, author, date] = line.split('\x1f');
    return { sha, subject, body: (body||'').trim(), author, date };
  });
}

function getDiffStat(range) {
  if (!range) return '';
  return safeSh(`git diff --shortstat ${range}`);
}

function loadConfig() {
  if (fs.existsSync(CONFIG_PATH)) {
    try { return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8')); } catch {}
  }
  // Default config
  return {
    title: "What's new",
    sections: [
      { key: 'highlights', heading: 'Highlights', max: 5 },
      { key: 'features', heading: 'Features', match: '(^feat|feature)', max: 10 },
      { key: 'fixes', heading: 'Fixes', match: '(^fix|bug|hotfix)', max: 10 },
      { key: 'ui', heading: 'UI/UX', match: '(ui|ux|design|layout|style|css)', max: 10 },
      { key: 'performance', heading: 'Performance', match: '(^perf|performance)', max: 10 },
      { key: 'other', heading: 'Other changes', max: 10 }
    ],
    footer: 'This release was generated automatically.',
    markdown: true,
    bullets: true
  };
}

async function callAI({ commits, diffStat, currentRef, prevTag, config }) {
  if (!OpenAI) throw new Error('openai package not installed');
  const apiKey = process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('Missing OPENROUTER_API_KEY (or OPENAI_API_KEY)');
  const baseURL = process.env.OPENAI_API_BASE || 'https://openrouter.ai/api/v1';
  const model = process.env.OPENROUTER_MODEL || 'openai/gpt-4o-mini';

  const client = new OpenAI({ apiKey, baseURL });

  const sys = `You are an expert release notes writer.
Return ONLY valid Markdown following the provided format constraints.
Keep it concise, scannable and action-focused.
Do not fabricate changes; only use the provided commits.
`;

  const template = `
Generate release notes for tag ${currentRef} ${prevTag ? `(changes since ${prevTag})` : ''}.

Strict format rules:
- Title: "## ${config.title}"
- Section order and headings exactly:
${config.sections.map(s => `  - "## ${s.heading}"`).join('\n')}
- Each section uses bullet points only, one line per item.
- Max bullets per section:
${config.sections.map(s => `  - ${s.heading}: ${s.max || 8}`).join('\n')}
- Prefer grouping commits by semantics roughly matching:
${config.sections.filter(s=>s.match).map(s=>`  - ${s.heading}: ${s.match}`).join('\n') || '  - Use best judgement'}
- If a section would be empty, omit that entire section.
- Avoid duplicates across sections.
- Rewrite commit subjects into user-facing language (no ticket IDs, no imperative verbs like "add", "fix"; use simple present).
- No trailing periods. No code blocks unless absolutely necessary.
- Keep overall length under ~200 lines.

Repo signals:
- Diff summary: ${diffStat || 'n/a'}
- Commits (JSON):
${JSON.stringify(commits).slice(0, 120000)}
`;

  const res = await client.chat.completions.create({
    model,
    messages: [
      { role: 'system', content: sys },
      { role: 'user', content: template }
    ],
    temperature: 0.3,
    max_tokens: 2000
  });

  const content = res.choices?.[0]?.message?.content?.trim();
  if (!content) throw new Error('Empty AI response');
  return content;
}

function fallbackNotes({ currentRef, prevTag, commits, config }) {
  const lines = [];
  lines.push(`## ${config.title}`);
  lines.push(prevTag ? `_Changes since ${prevTag}_\n` : `_Recent changes_\n`);
  const take = (arr, n) => arr.slice(0, n);
  const feats = commits.filter(c=>/^feat|feature/i.test(c.subject));
  const fixes = commits.filter(c=>/^fix|hotfix|bug/i.test(c.subject));
  const other = commits.filter(c=>!feats.includes(c) && !fixes.includes(c));
  const bullets = [
    { h: 'Features', arr: feats, m: 10 },
    { h: 'Fixes', arr: fixes, m: 10 },
    { h: 'Other changes', arr: other, m: 10 },
  ];
  for (const b of bullets) {
    if (b.arr.length === 0) continue;
    lines.push(`\n## ${b.h}`);
    for (const c of take(b.arr, b.m)) {
      const txt = c.subject.replace(/^[A-Za-z]+\:?\s*/, '').replace(/\.$/, '');
      lines.push(`- ${txt}`);
    }
  }
  return lines.join('\n');
}

async function main() {
  const argTag = process.argv[2];
  const currentRef = getCurrentRef(argTag);
  const prevTag = getPrevTag(currentRef);
  const range = prevTag ? `${prevTag}..${currentRef}` : '';
  const commits = getCommitData(range);
  const diffStat = getDiffStat(range);
  const config = loadConfig();

  let md = '';
  try {
    md = await callAI({ commits, diffStat, currentRef, prevTag, config });
  } catch (err) {
    console.warn('[release-notes] AI generation failed, using fallback:', err.message);
    md = fallbackNotes({ currentRef, prevTag, commits, config });
  }

  fs.writeFileSync(NOTES_PATH, md, 'utf8');
  console.log(`Wrote ${NOTES_PATH}`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
