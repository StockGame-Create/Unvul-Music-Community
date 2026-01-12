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
    const { videoId } = req.body;

    if (!videoId) {
      return res.status(400).json({ error: '비디오 ID가 필요합니다' });
    }

    // ytdl 사용 (vercel에 ytdl-core 설치 필요)
    const ytdl = require('ytdl-core');
    
    const info = await ytdl.getInfo(videoId);
    const format = ytdl.chooseFormat(info.formats, { 
      quality: 'lowestaudio',
      filter: 'audioonly'
    });

    if (!format) {
      return res.status(400).json({ error: '오디오 형식을 찾을 수 없습니다' });
    }

    // 스트림으로 다운로드
    const stream = ytdl(videoId, { format: format });
    const chunks = [];

    stream.on('data', (chunk) => chunks.push(chunk));
    
    await new Promise((resolve, reject) => {
      stream.on('end', resolve);
      stream.on('error', reject);
    });

    const buffer = Buffer.concat(chunks);
    const sizeMB = buffer.length / (1024 * 1024);

    if (sizeMB > 4.4) {
      return res.status(400).json({ 
        error: `파일이 너무 큽니다 (${sizeMB.toFixed(2)}MB). 4분 이하 영상을 선택해주세요.` 
      });
    }

    const base64 = buffer.toString('base64');

    return res.status(200).json({
      success: true,
      base64: base64,
      size: sizeMB.toFixed(2),
      title: info.videoDetails.title
    });

  } catch (error) {
    console.error('YouTube Error:', error);
    return res.status(500).json({ 
      error: '다운로드 실패: ' + error.message 
    });
  }
}
