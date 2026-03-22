import { YtdlCore } from '@ybd-project/ytdl-core/serverless';

const ytdl = new YtdlCore({});

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.status(200).end();

    const { youtubeUrl } = req.body;
    console.log('받은 URL:', youtubeUrl);

    try {
        const info = await ytdl.getBasicInfo(youtubeUrl);
        console.log('전체 포맷 수:', info.formats?.length);
        console.log('포맷 샘플:', JSON.stringify(info.formats?.[0]));

        // 필터 조건 완화 - url만 있으면 됨
        const formats = info.formats.filter(f => f.url);
        console.log('url 있는 포맷 수:', formats.length);

        // 오디오만 있는 포맷 우선, 없으면 전체에서 선택
        const audioOnly = formats.filter(f => f.mimeType?.includes('audio'));
        const target = audioOnly.length > 0 ? audioOnly : formats;

        const best = target.sort((a, b) => (b.audioBitrate || 0) - (a.audioBitrate || 0))[0];

        if (!best) throw new Error('재생 가능한 포맷 없음');

        console.log('선택된 포맷:', best.mimeType, best.audioBitrate);
        return res.status(200).json({ streamUrl: best.url });

    } catch (err) {
        console.error('상세 오류:', err.message);
        return res.status(500).json({ error: err.message });
    }
}
