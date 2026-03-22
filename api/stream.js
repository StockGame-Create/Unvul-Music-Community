import ytdl from 'ytdl-core';

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.status(200).end();

    const { youtubeUrl } = req.body;

    try {
        const info = await ytdl.getInfo(youtubeUrl);
        const format = ytdl.chooseFormat(info.formats, {
            quality: 'highestaudio',
            filter: 'audioonly'
        });
        return res.status(200).json({ streamUrl: format.url });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
}
