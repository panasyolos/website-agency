const http = require('http');
const data = JSON.stringify({
  name: 'Render Test',
  email: 'rendertest@example.com',
  'current-offer': 'Beats',
  message: 'Testing submission endpoint',
  submittedAt: new Date().toISOString(),
});

const req = http.request(
  {
    hostname: 'localhost',
    port: 3000,
    path: '/submit',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(data),
    },
  },
  (res) => {
    console.log('STATUS', res.statusCode);
    let body = '';
    res.on('data', (chunk) => (body += chunk));
    res.on('end', () => {
      console.log('BODY', body);
      process.exit(0);
    });
  }
);

req.on('error', (error) => {
  console.error('ERROR', error);
  process.exit(1);
});
req.write(data);
req.end();
