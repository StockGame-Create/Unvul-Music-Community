export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { filename, content } = req.body;
  
  const response = await fetch(
    `https://api.github.com/repos/StockGame-Create/Unvul-Music/contents/${filename}`,
    {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${process.env.GITHUB_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: `Upload ${filename}`,
        content: content
      })
    }
  );

  const data = await response.json();
  return res.status(response.status).json(data);
}
