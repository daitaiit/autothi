const https = require('https');
const key = 'AIzaSyBsWhAEb7UaJcjGYiVZ0obLJPj3olo77Cw';

https.get(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`, res => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => {
    try {
      const data = JSON.parse(body);
      console.log('Available models:', (data.models || []).map(m => ({ name: m.name, supportedMethods: m.supportedGenerationMethods })));
    } catch(e) {
      console.log('Raw:', body);
    }
  });
});
