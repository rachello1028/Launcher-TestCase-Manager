interface JiraResult {
  success: true;
  key: string;
  url: string;
}

interface JiraError {
  success: false;
  message: string;
}

export async function createJiraIssue(
  summary: string,
  description: string,
): Promise<JiraResult | JiraError> {
  try {
    const res = await fetch('/api/jira-create-issue', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ summary, description }),
    });

    const data = await res.json();

    if (!res.ok) {
      const msg = typeof data.error === 'string'
        ? data.error
        : JSON.stringify(data.error?.errors || data.error);
      return { success: false, message: msg };
    }

    return { success: true, key: data.key, url: data.url };
  } catch (err: any) {
    return { success: false, message: err.message || '網路錯誤' };
  }
}
