// api/youtube.js
import fetch from 'node-fetch';

export default async function handler(req, res) {
  // CORS 헤더 설정
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

    // yt-api.org API 호출
    const apiUrl = `https://yt-api.org/api/json/mp3/${videoId}`;
    const response = await fetch(apiUrl);
    const data = await response.json();

    if (!data || !data.url) {
      return res.status(400).json({ error: '다운로드 링크를 가져올 수 없습니다' });
    }

    // MP3 다운로드
    const audioResponse = await fetch(data.url);
    const audioBuffer = await audioResponse.arrayBuffer();

    // 크기 체크 (4.4MB 제한)
    const sizeMB = audioBuffer.byteLength / (1024 * 1024);
    if (sizeMB > 4.4) {
      return res.status(400).json({ 
        error: `파일이 너무 큽니다 (${sizeMB.toFixed(2)}MB)` 
      });
    }

    // Base64 변환
    const base64 = Buffer.from(audioBuffer).toString('base64');

    return res.status(200).json({
      success: true,
      base64: base64,
      size: sizeMB.toFixed(2)
    });

  } catch (error) {
    console.error('YouTube download error:', error);
    return res.status(500).json({ 
      error: '다운로드 중 오류가 발생했습니다: ' + error.message 
    });
  }
}
