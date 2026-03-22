import { Innertube } from 'youtubei.js';
import { generate } from 'youtube-po-token-generator';

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.status(200).end();

    const { youtubeUrl } = req.body;

    try {
        const videoId = youtubeUrl.match(/(?:youtu\.be\/|youtube\.com\/watch\?v=)([^&\s]+)/)?.[1];
        if (!videoId) throw new Error('비디오 ID를 찾을 수 없습니다');

        // poToken 자동 생성
        console.log('poToken 생성 중...');
        const { visitorData, poToken } = await generate();
        console.log('poToken 생성 완료');

        const yt = await Innertube.create({
            visitor_data: visitorData,
            po_token: poToken
        });

        const info = await yt.getInfo(videoId);
        const audioFormats = info.streaming_data?.adaptive_formats?.filter(f =>
            f.has_audio && !f.has_video
        ) || [];

        if (!audioFormats.length) throw new Error('오디오 포맷 없음');

        const best = audioFormats.sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0))[0];
        const streamUrl = best.decipher(yt.session.player);

        return res.status(200).json({ streamUrl });
    } catch (err) {
        console.error('오류:', err.message);
        return res.status(500).json({ error: err.message });
    }
}
