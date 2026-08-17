const https = require('https');
const key = 'AIzaSyBsWhAEb7UaJcjGYiVZ0obLJPj3olo77Cw';

const models = [
  'gemini-3.7-flash',
  'gemini-3.5-flash',
  'gemini-3.1-flash-lite',
  'gemini-flash-latest',
  'gemini-flash-lite-latest',
  'gemini-2.5-flash-lite'
];

async function testModel(mod) {
  return new Promise(resolve => {
    const payload = JSON.stringify({
      contents: [{ parts: [{ text: "Trả lời câu hỏi trắc nghiệm: Ứng dụng định danh điện tử của Bộ Công An là gì? [0] PC-Covid [1] VNeID [2] VssID. Trả về JSON: {\"best_index\": 1}" }] }]
    });

    const req = https.request({
      hostname: 'generativelanguage.googleapis.com',
      path: `/v1beta/models/${mod}:generateContent?key=${key}`,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) }
    }, res => {
      let body = '';
      res.on('data', d => body += d);
      res.on('end', () => {
        resolve({ model: mod, status: res.statusCode, body });
      });
    });
    req.on('error', e => resolve({ model: mod, error: e.message }));
    req.write(payload);
    req.end();
  });
}

(async () => {
  for (const m of models) {
    const r = await testModel(m);
    console.log(`[${m}] Status: ${r.status}`);
    if (r.status === 200) {
      console.log(`  -> SUCCESS! Response:`, JSON.parse(r.body).candidates[0].content.parts[0].text);
      break;
    } else {
      console.log(`  -> Error:`, r.body ? r.body.slice(0, 150) : r.error);
    }
  }
})();
