import { YtdlCore } from '@ybd-project/ytdl-core/serverless';

const ytdl = new YtdlCore({});

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.status(200).end();

    const { youtubeUrl } = req.body;

    try {
        const info = await ytdl.getBasicInfo(youtubeUrl);
        const formats = info.formats.filter(f => f.mimeType?.includes('audio') && f.url);
        const best = formats.sort((a, b) => (b.audioBitrate || 0) - (a.audioBitrate || 0))[0];

        if (!best) throw new Error('오디오 포맷을 찾을 수 없습니다');

        return res.status(200).json({ streamUrl: best.url });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
}
