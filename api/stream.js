export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.status(200).end();

    const { youtubeUrl } = req.body;

    try {
        const videoId = youtubeUrl.match(/(?:youtu\.be\/|youtube\.com\/watch\?v=)([^&\s]+)/)?.[1];
        if (!videoId) throw new Error('비디오 ID를 찾을 수 없습니다');

        // Piped 공개 인스턴스 여러개 시도
        const instances = [
            'https://pipedapi.kavin.rocks',
            'https://piped-api.garudalinux.org',
            'https://api.piped.projectsegfau.lt'
        ];

        let streamUrl = null;

        for (const instance of instances) {
            try {
                const r = await fetch(`${instance}/streams/${videoId}`);
                if (!r.ok) continue;
                const data = await r.json();
                const audio = data.audioStreams
                    ?.filter(s => !s.videoOnly)
                    ?.sort((a, b) => b.bitrate - a.bitrate)?.[0];
                if (audio?.url) {
                    streamUrl = audio.url;
                    break;
                }
            } catch (e) {
                continue;
            }
        }

        if (!streamUrl) throw new Error('스트림 URL을 찾을 수 없습니다');
        return res.status(200).json({ streamUrl });

    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
}
