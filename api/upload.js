import ytdl from 'ytdl-core';

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const { filename, content, youtubeUrl, title, iconBase64 } = req.body;

    // 유튜브 방식
    if (youtubeUrl) {
        try {
            // ytdl-core로 오디오 스트림 URL 추출
            const info = await ytdl.getInfo(youtubeUrl);
            const audioFormat = ytdl.chooseFormat(info.formats, { 
                quality: 'highestaudio',
                filter: 'audioonly'
            });
            
            const streamUrl = audioFormat.url; // 직접 재생 가능한 URL

            // songs.json 업데이트
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

            songs.push({
                title,
                src: streamUrl,  // 직접 재생 가능한 URL 저장
                icon: iconBase64 ? true : false
            });

            await fetch(
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

            // 앨범 아트 저장
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

            return res.status(200).json({ success: true });

        } catch (err) {
            return res.status(500).json({ error: err.message });
        }
    }

    // 기존 MP3 방식
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
