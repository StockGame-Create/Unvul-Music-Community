// api/youtube.js
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({ error: '유튜브 URL이 필요합니다' });
    }

    // 유튜브 비디오 ID 추출
    let videoId;
    try {
      const urlObj = new URL(url);
      if (urlObj.hostname.includes('youtu.be')) {
        videoId = urlObj.pathname.slice(1);
      } else if (urlObj.hostname.includes('youtube.com')) {
        videoId = urlObj.searchParams.get('v');
      }
    } catch (e) {
      return res.status(400).json({ error: '올바른 유튜브 URL이 아닙니다' });
    }

    if (!videoId) {
      return res.status(400).json({ error: '비디오 ID를 찾을 수 없습니다' });
    }

    // 무료 공개 API 사용 (cobalt.tools API)
    const cobaltResponse = await fetch('https://api.cobalt.tools/api/json', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: url,
        vCodec: 'h264',
        vQuality: '720',
        aFormat: 'mp3',
        isAudioOnly: true
      })
    });

    const cobaltData = await cobaltResponse.json();

    if (cobaltData.status !== 'stream' && cobaltData.status !== 'redirect') {
      throw new Error('다운로드 링크를 가져올 수 없습니다');
    }

    const audioUrl = cobaltData.url;

    // MP3 다운로드
    const audioResponse = await fetch(audioUrl);
    
    if (!audioResponse.ok) {
      throw new Error('오디오 다운로드 실패');
    }

    const audioBuffer = await audioResponse.arrayBuffer();
    
    // 크기 체크 (4.5MB)
    const sizeMB = audioBuffer.byteLength / (1024 * 1024);
    if (sizeMB > 4.4) {
      return res.status(400).json({ 
        error: '파일이 너무 큽니다. 더 짧은 영상을 선택해주세요.',
        size: sizeMB.toFixed(2) + 'MB'
      });
    }

    // Base64 인코딩
    const audioBase64 = Buffer.from(audioBuffer).toString('base64');

    return res.status(200).json({ 
      audioBase64,
      size: sizeMB.toFixed(2)
    });

  } catch (error) {
    console.error('YouTube download error:', error);
    return res.status(500).json({ 
      error: '다운로드 실패',
      message: error.message 
    });
  }
}
