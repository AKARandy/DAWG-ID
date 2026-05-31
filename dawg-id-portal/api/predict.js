export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const endpoint = process.env.AZURE_ML_ENDPOINT;
  const apiKey = process.env.AZURE_ML_API_KEY;

  if (!endpoint || !apiKey) {
    return res.status(500).json({ error: 'Azure ML endpoint not configured' });
  }

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(req.body),
    });

    if (!response.ok) {
      const err = await response.text();
      return res.status(response.status).json({ error: `Azure ML error: ${err}` });
    }

    const data = await response.json();
    return res.status(200).json(data);
  } catch (err) {
    return res.status(500).json({ error: `Request failed: ${err.message}` });
  }
}
