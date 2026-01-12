// api/youtube.js
import ytdl from 'ytdl-core';
import ffmpeg from 'fluent-ffmpeg';
import { Readable } from 'stream';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
    responseLimit: '10mb',
  },
  maxDuration: 60, // 최대 60초 실행
};

export default async function handler(req, res) {
  // CORS 설정
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

    // 유튜브 URL 검증
    if (!ytdl.validateURL(url)) {
      return res.status(400).json({ error: '올바른 유튜브 URL이 아닙니다' });
    }

    // 비디오 정보 가져오기
    const info = await ytdl.getInfo(url);
    const duration = parseInt(info.videoDetails.lengthSeconds);

    // 4분 이상이면 거부 (4.5MB 제한 고려)
    if (duration > 240) {
      return res.status(400).json({ 
        error: '영상이 너무 깁니다 (최대 4분)',
        duration: duration 
      });
    }

    // 오디오 스트림 가져오기
    const audioStream = ytdl(url, {
      quality: 'lowestaudio',
      filter: 'audioonly',
    });

    // 버퍼에 저장
    const chunks = [];
    
    await new Promise((resolve, reject) => {
      audioStream.on('data', (chunk) => chunks.push(chunk));
      audioStream.on('end', resolve);
      audioStream.on('error', reject);
    });

    const audioBuffer = Buffer.concat(chunks);

    // MP3로 변환 및 압축 (64kbps - 4분 = 약 2MB)
    const mp3Buffer = await convertToMP3(audioBuffer, 64);

    // 파일 크기 체크
    const sizeMB = mp3Buffer.length / (1024 * 1024);
    if (sizeMB > 4.4) {
      return res.status(400).json({ 
        error: '변환된 파일이 너무 큽니다',
        size: sizeMB.toFixed(2) + 'MB'
      });
    }

    // Base64로 인코딩
    const audioBase64 = mp3Buffer.toString('base64');

    return res.status(200).json({ 
      audioBase64,
      size: sizeMB.toFixed(2),
      duration
    });

  } catch (error) {
    console.error('YouTube download error:', error);
    return res.status(500).json({ 
      error: '다운로드 실패',
      message: error.message 
    });
  }
}

// MP3 변환 함수
function convertToMP3(audioBuffer, bitrate = 64) {
  return new Promise((resolve, reject) => {
    const bufferStream = new Readable();
    bufferStream.push(audioBuffer);
    bufferStream.push(null);

    const chunks = [];

    ffmpeg(bufferStream)
      .audioCodec('libmp3lame')
      .audioBitrate(bitrate)
      .format('mp3')
      .on('error', reject)
      .on('end', () => resolve(Buffer.concat(chunks)))
      .pipe()
      .on('data', (chunk) => chunks.push(chunk));
  });
}
