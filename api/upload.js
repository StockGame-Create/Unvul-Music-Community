export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { filename, content, youtubeUrl, title, iconBase64 } = req.body;

  // 유튜브 링크 방식
  if (youtubeUrl) {
    try {
      // 1. 기존 songs.json 불러오기
      const getRes = await fetch(
        `https://api.github.com/repos/StockGame-Create/Unvul-Music/contents/community/songs.json`,
        { headers: { 'Authorization': `Bearer ${process.env.GITHUB_TOKEN}` } }
      );

      let songs = [];
      let sha = null;

      if (getRes.ok) {
        const existing = await getRes.json();
        sha = existing.sha;
        songs = JSON.parse(atob(existing.content.replace(/\n/g, '')));
      }

      // 2. 새 노래 추가
      songs.push({
        title: title,
        youtubeUrl: youtubeUrl,
        icon: null // 나중에 iconBase64로 확장 가능
      });

      // 3. songs.json 업데이트
      const updateRes = await fetch(
        `https://api.github.com/repos/StockGame-Create/Unvul-Music/contents/community/songs.json`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${process.env.GITHUB_TOKEN}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: `Add song: ${title}`,
            content: btoa(unescape(encodeURIComponent(JSON.stringify(songs, null, 2)))),
            ...(sha && { sha })
          })
        }
      );

      // 4. 앨범 아트 저장 (있을 경우)
      if (iconBase64) {
        await fetch(
          `https://api.github.com/repos/StockGame-Create/Unvul-Music/contents/community/${title}.jpg`,
          {
            method: 'PUT',
            headers: {
              'Authorization': `Bearer ${process.env.GITHUB_TOKEN}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              message: `Add icon: ${title}`,
              content: iconBase64
            })
          }
        );
      }

      const data = await updateRes.json();
      return res.status(updateRes.status).json(data);

    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  // 기존 MP3 파일 방식 (그대로 유지)
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
