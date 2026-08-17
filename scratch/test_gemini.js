const https = require('https');
const key = 'AIzaSyBsWhAEb7UaJcjGYiVZ0obLJPj3olo77Cw';

const payload = JSON.stringify({
  contents: [
    {
      parts: [
        { text: "Nhiệm vụ: Trả lời câu hỏi trắc nghiệm sau đây và chọn đáp án đúng nhất.\n\nCâu hỏi: Ứng dụng định danh điện tử quốc gia của Bộ Công an Việt Nam có tên gọi là gì?\nCác lựa chọn:\n[0] PC-Covid\n[1] VNeID\n[2] VssID\n[3] eGov\n\nChỉ trả về JSON dạng: {\"best_index\": 1, \"answer_text\": \"VNeID\"}" }
      ]
    }
  ]
});

const req = https.request({
  hostname: 'generativelanguage.googleapis.com',
  path: '/v1beta/models/gemini-1.5-flash:generateContent?key=' + key,
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(payload)
  }
}, res => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => {
    console.log('Status Code:', res.statusCode);
    console.log('Response:', body);
  });
});

req.on('error', e => console.error('Request Error:', e));
req.write(payload);
req.end();
