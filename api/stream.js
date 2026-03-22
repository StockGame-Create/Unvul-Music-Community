import { Innertube } from 'youtubei.js';

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.status(200).end();

    const { youtubeUrl } = req.body;

    try {
        const yt = await Innertube.create({ client_type: 'TV' });
        const videoId = youtubeUrl.match(/(?:youtu\.be\/|youtube\.com\/watch\?v=)([^&\s]+)/)?.[1];
        if (!videoId) throw new Error('비디오 ID를 찾을 수 없습니다');

        const info = await yt.getInfo(videoId);
        
        // 모든 포맷 로그
        console.log('포맷 수:', info.streaming_data?.adaptive_formats?.length);
        
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
