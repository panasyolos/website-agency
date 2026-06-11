const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const baseDir = __dirname;
const submissionsFile = path.join(baseDir, 'submissions.json');
const mimeTypes = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
};

function readSubmissions() {
  try {
    if (!fs.existsSync(submissionsFile)) {
      fs.writeFileSync(submissionsFile, '[]', 'utf8');
      return [];
    }
    const raw = fs.readFileSync(submissionsFile, 'utf8');
    return JSON.parse(raw || '[]');
  } catch (error) {
    console.error('Unable to read submissions.json:', error);
    return [];
  }
}

function writeSubmissions(submissions) {
  fs.writeFileSync(submissionsFile, JSON.stringify(submissions, null, 2), 'utf8');
}

function sendJson(res, status, payload) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(payload));
}

const server = http.createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/submit') {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
    });
    req.on('end', () => {
      try {
        const contentTypeHeader = (req.headers['content-type'] || '').toLowerCase();
        const contentType = contentTypeHeader.split(';')[0].trim();
        let submission = {};

        if (contentType === 'application/json') {
          submission = JSON.parse(body || '{}');
        } else if (contentType === 'application/x-www-form-urlencoded') {
          submission = Object.fromEntries(new URLSearchParams(body));
        } else if (body.trim().startsWith('{')) {
          submission = JSON.parse(body);
        } else {
          submission = Object.fromEntries(new URLSearchParams(body));
        }

        if (!submission || typeof submission !== 'object' || Array.isArray(submission)) {
          sendJson(res, 400, { success: false, error: 'Invalid submission data.' });
          return;
        }

        submission.submittedAt = submission.submittedAt || new Date().toISOString();

        const existing = readSubmissions();
        existing.push(submission);
        writeSubmissions(existing);

        if (contentType === 'application/json') {
          sendJson(res, 201, { success: true });
        } else {
          res.writeHead(303, { Location: '/contact.html?submitted=1' });
          res.end();
        }
      } catch (error) {
        sendJson(res, 400, { success: false, error: 'Invalid submission payload.' });
      }
    });
    return;
  }

  if (req.method === 'GET') {
    const requestedPath = req.url === '/' ? '/index.html' : req.url.split('?')[0];
    const filePath = path.join(baseDir, decodeURIComponent(requestedPath));

    if (!filePath.startsWith(baseDir)) {
      res.writeHead(403);
      res.end('Forbidden');
      return;
    }

    fs.readFile(filePath, (error, data) => {
      if (error) {
        res.writeHead(404);
        res.end('Not found');
        return;
      }
      const contentType = mimeTypes[path.extname(filePath).toLowerCase()] || 'application/octet-stream';
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(data);
    });
    return;
  }

  res.writeHead(405);
  res.end('Method Not Allowed');
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running at http://localhost:${PORT}`);
  console.log(`Server listening on port ${PORT} on all network interfaces.`);
  console.log('Make sure the site is published using this Node server so /submit can save submissions.');
});
