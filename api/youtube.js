// api/youtube.js — Cobalt 인스턴스를 통해 YouTube MP3 추출
// 키 불필요, 무료, Vercel 제한 우회 가능

export default async function handler(req, res) {
  // CORS 헤더
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: '허용되지 않는 메소드입니다.' });
  }

  const { videoId } = req.body;
  if (!videoId) {
    return res.status(400).json({ error: 'videoId가 필요합니다.' });
  }

  const youtubeUrl = `https://www.youtube.com/watch?v=${videoId}`;

  // 1단계: instances.cobalt.best에서 YouTube 지원 인스턴스 목록 가져오기
  let instances = [];
  try {
    const instanceRes = await fetch('https://instances.cobalt.best/instances.json', {
      headers: {
        'User-Agent': 'unvul-music/1.0 (+https://github.com/StockGame-Create/Unvul-Music-Community)',
        'Accept': 'application/json'
      },
      signal: AbortSignal.timeout(5000)
    });

    if (instanceRes.ok) {
      const data = await instanceRes.json();
      // YouTube 지원하고 CORS 허용되고 온라인인 인스턴스만 필터
      instances = data
        .filter(inst =>
          inst.online === true &&
          inst.services?.youtube === true &&
          inst.info?.cors === true &&
          inst.score !== undefined
        )
        .sort((a, b) => (b.score || 0) - (a.score || 0))
        .slice(0, 5); // 상위 5개만
    }
  } catch (e) {
    console.warn('인스턴스 목록 가져오기 실패, 백업 사용:', e.message);
  }

  // 백업 인스턴스 (알려진 공개 인스턴스들)
  const fallbackInstances = [
    'co.eepy.moe',
    'cobalt.ayo.wtf',
    'cobalt.flick.ws',
    'api.cobalt.best',
  ];

  // 인스턴스 URL 목록 조합
  const apiUrls = [
    ...instances.map(inst => `${inst.protocol || 'https'}://${inst.api}`),
    ...fallbackInstances.map(h => `https://${h}`)
  ];

  let lastError = null;

  // 2단계: 각 인스턴스에 순서대로 요청
  for (const apiBase of apiUrls) {
    try {
      const cobaltRes = await fetch(`${apiBase}/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'User-Agent': 'unvul-music/1.0 (+https://github.com/StockGame-Create/Unvul-Music-Community)'
        },
        body: JSON.stringify({
          url: youtubeUrl,
          audioFormat: 'mp3',
          audioBitrate: '128',
          downloadMode: 'audio',
          filenameStyle: 'basic'
        }),
        signal: AbortSignal.timeout(8000)
      });

      if (!cobaltRes.ok) {
        lastError = `${apiBase}: HTTP ${cobaltRes.status}`;
        continue;
      }

      const cobaltData = await cobaltRes.json();

      // Cobalt 응답 처리
      if (cobaltData.status === 'tunnel' || cobaltData.status === 'redirect') {
        const mp3Url = cobaltData.url;
        if (!mp3Url) {
          lastError = `${apiBase}: URL 없음`;
          continue;
        }

        // 3단계: MP3 URL에서 실제 파일 다운로드
        const mp3Res = await fetch(mp3Url, {
          signal: AbortSignal.timeout(25000),
          headers: {
            'User-Agent': 'unvul-music/1.0 (+https://github.com/StockGame-Create/Unvul-Music-Community)'
          }
        });

        if (!mp3Res.ok) {
          lastError = `${apiBase}: MP3 다운로드 실패 (${mp3Res.status})`;
          continue;
        }

        // 크기 체크
        const contentLength = mp3Res.headers.get('content-length');
        if (contentLength && parseInt(contentLength) > 4.5 * 1024 * 1024) {
          return res.status(400).json({
            error: `파일이 너무 큽니다 (${(parseInt(contentLength) / 1024 / 1024).toFixed(1)}MB). 3분 이하 영상을 사용해주세요.`
          });
        }

        // ArrayBuffer → Base64
        const arrayBuffer = await mp3Res.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // 크기 재확인
        if (buffer.length > 4.5 * 1024 * 1024) {
          return res.status(400).json({
            error: `파일이 너무 큽니다 (${(buffer.length / 1024 / 1024).toFixed(1)}MB). 3분 이하 영상을 사용해주세요.`
          });
        }

        const base64 = buffer.toString('base64');
        return res.status(200).json({
          base64,
          instance: apiBase,
          size: buffer.length
        });

      } else if (cobaltData.status === 'error') {
        lastError = `${apiBase}: ${cobaltData.error?.code || '알 수 없는 오류'}`;
        continue;
      } else {
        lastError = `${apiBase}: 예상치 못한 상태 (${cobaltData.status})`;
        continue;
      }

    } catch (e) {
      lastError = `${apiBase}: ${e.message}`;
      continue;
    }
  }

  // 모든 인스턴스 실패
  return res.status(500).json({
    error: `모든 인스턴스에서 실패했습니다. 마지막 오류: ${lastError || '알 수 없음'}`,
    tip: '잠시 후 다시 시도하거나, MP3 파일을 직접 업로드해주세요.'
  });
}
