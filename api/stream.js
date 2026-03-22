import { Innertube } from 'youtubei.js';

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.status(200).end();

    const { youtubeUrl } = req.body;

    try {
        const videoId = youtubeUrl.match(/(?:youtu\.be\/|youtube\.com\/watch\?v=)([^&\s]+)/)?.[1];
        if (!videoId) throw new Error('비디오 ID를 찾을 수 없습니다');

        // 여러 클라이언트 순서대로 시도
        const clients = ['IOS', 'ANDROID', 'WEB', 'TV_EMBEDDED'];
        
        for (const client of clients) {
            try {
                console.log('시도 중:', client);
                const yt = await Innertube.create({ client_type: client });
                const info = await yt.getInfo(videoId);
                
                const audioFormats = info.streaming_data?.adaptive_formats?.filter(f => 
                    f.has_audio && !f.has_video
                ) || [];

                if (!audioFormats.length) {
                    console.log(client, '오디오 포맷 없음');
                    continue;
                }

                const best = audioFormats.sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0))[0];
                const streamUrl = best.decipher(yt.session.player);
                
                console.log('성공:', client);
                return res.status(200).json({ streamUrl, client });

            } catch (e) {
                console.log(client, '실패:', e.message);
                continue;
            }
        }

        throw new Error('모든 클라이언트 실패');

    } catch (err) {
        console.error('최종 오류:', err.message);
        return res.status(500).json({ error: err.message });
    }
}
