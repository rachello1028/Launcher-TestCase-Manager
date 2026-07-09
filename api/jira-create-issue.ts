import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

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
