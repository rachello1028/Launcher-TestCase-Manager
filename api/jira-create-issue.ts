import { timingSafeEqual } from 'node:crypto';
import type { VercelRequest, VercelResponse } from '@vercel/node';

// 要帶 X-App-Token，值須等於 Vercel 環境變數 APP_WRITE_TOKEN；沒設定就一律拒絕（避免任何人用存好的帳號開 Jira 單）
function hasWriteToken(req: VercelRequest, res: VercelResponse): boolean {
  const expected = process.env.APP_WRITE_TOKEN ?? '';
  if (!expected) {
    res.status(503).json({ error: '伺服器未設定 APP_WRITE_TOKEN' });
    return false;
  }
  const got = Buffer.from(String(req.headers['x-app-token'] ?? ''));
  const want = Buffer.from(expected);
  if (got.length !== want.length || !timingSafeEqual(got, want)) {
    res.status(401).json({ error: '需要團隊存取碼' });
    return false;
  }
  return true;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  if (!hasWriteToken(req, res)) return;

  const { summary, description } = req.body;
  if (!summary) {
    return res.status(400).json({ error: 'summary is required' });
  }

  const email = process.env.JIRA_EMAIL;
  const token = process.env.JIRA_TOKEN;
  const baseUrl = process.env.JIRA_BASE_URL;
  const projectKey = process.env.JIRA_PROJECT_KEY;
  const assigneeId = process.env.JIRA_ASSIGNEE_ID;

  if (!email || !token || !baseUrl || !projectKey) {
    return res.status(500).json({ error: 'Jira env vars not configured' });
  }

  const auth = Buffer.from(`${email}:${token}`).toString('base64');

  try {
    const jiraRes = await fetch(`${baseUrl}/rest/api/3/issue`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        fields: {
          project: { key: projectKey },
          summary,
          description: {
            type: 'doc',
            version: 1,
            content: [
              {
                type: 'paragraph',
                content: [{ type: 'text', text: description || '' }],
              },
            ],
          },
          issuetype: { name: 'Bug' },
          ...(assigneeId ? { assignee: { accountId: assigneeId } } : {}),
        },
      }),
    });

    const data = await jiraRes.json();

    if (!jiraRes.ok) {
      return res.status(jiraRes.status).json({ error: data });
    }

    return res.status(200).json({
      key: data.key,
      url: `${baseUrl}/browse/${data.key}`,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}
