const http = require('http');
const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');

const PORT = process.env.PORT || 3000;
const baseDir = __dirname;
const submissionsFile = process.env.SUBMISSIONS_FILE || path.join(baseDir, 'submissions.json');
const bookingLink = process.env.BOOKING_LINK || 'https://calendly.com/panas-website-agency/book-call';
const emailFrom = process.env.EMAIL_FROM || 'Panas Website Agency <no-reply@panaswebsite.agency>';
const adminEmail = process.env.ADMIN_EMAIL;
const adminToken = process.env.ADMIN_TOKEN;
const geminiApiKey = process.env.GEMINI_API_KEY;
const cloudflareAccountId = process.env.CLOUDFLARE_ACCOUNT_ID;
const cloudflareApiToken = process.env.CLOUDFLARE_API_TOKEN;

const CHAT_SYSTEM_PROMPT =
  "You are the AI Lead Agent widget embedded on Panas Website Agency's own site (panaswebsite.agency). " +
  "This is a live, working demo of the exact AI chatbot product the agency sells to independent and " +
  "family-run car dealerships. The person chatting with you is almost always a dealership owner evaluating " +
  "whether to hire the agency, not a car buyer — this site has no real vehicle inventory, so never invent or " +
  "pretend to list cars for sale. Your job: (1) demonstrate what the AI Lead Agent product does and how it " +
  "would engage a car buyer on a client's site, (2) answer questions about Panas Website Agency's services — " +
  "Dealer Site Redesign ($500-$1,200 one-time, built and live in 24 hours, first redesign done free with no " +
  "commitment), AI Lead Agent and Lead Dashboard as add-ons priced on a call, (3) mention the founder, " +
  "Panagiotis Thomadakis, if asked who runs the agency, and (4) when someone seems interested, encourage them " +
  "to request a free 15-minute call via the Contact page. Keep replies short — 2 to 4 sentences, friendly, " +
  "concrete, no filler.";

const CLOUDFLARE_MODEL = '@cf/meta/llama-3.1-8b-instruct';
const GEMINI_MODEL = 'gemini-2.0-flash';
const CHAT_MAX_HISTORY = 10;
const CHAT_MAX_TOKENS = 300;

const hasCloudflareAi = Boolean(cloudflareAccountId && cloudflareApiToken);

function cleanHistory(messages) {
  return messages
    .filter((m) => m && typeof m.content === 'string' && (m.role === 'user' || m.role === 'assistant'))
    .slice(-CHAT_MAX_HISTORY);
}

async function callCloudflareAi(cleaned) {
  const url = `https://api.cloudflare.com/client/v4/accounts/${cloudflareAccountId}/ai/run/${CLOUDFLARE_MODEL}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${cloudflareApiToken}`,
    },
    body: JSON.stringify({
      messages: [{ role: 'system', content: CHAT_SYSTEM_PROMPT }, ...cleaned],
      max_tokens: CHAT_MAX_TOKENS,
    }),
  });

  if (!res.ok) {
    const errBody = await res.text().catch(() => '');
    console.error('Cloudflare AI error:', res.status, errBody);
    const err = new Error('AI request failed.');
    err.statusCode = 502;
    throw err;
  }

  const data = await res.json();
  return data?.result?.response?.trim();
}

async function callGemini(cleaned) {
  const contents = cleaned.map((m) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }));

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${geminiApiKey}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents,
      systemInstruction: { parts: [{ text: CHAT_SYSTEM_PROMPT }] },
      generationConfig: { maxOutputTokens: CHAT_MAX_TOKENS },
    }),
  });

  if (!res.ok) {
    const errBody = await res.text().catch(() => '');
    console.error('Gemini API error:', res.status, errBody);
    const err = new Error('AI request failed.');
    err.statusCode = 502;
    throw err;
  }

  const data = await res.json();
  return data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
}

async function getChatReply(messages) {
  if (!hasCloudflareAi && !geminiApiKey) {
    const err = new Error("The AI Lead Agent isn't connected yet.");
    err.statusCode = 503;
    throw err;
  }

  const cleaned = cleanHistory(messages);

  if (cleaned.length === 0) {
    const err = new Error('No valid message provided.');
    err.statusCode = 400;
    throw err;
  }

  const reply = hasCloudflareAi ? await callCloudflareAi(cleaned) : await callGemini(cleaned);

  if (!reply) {
    const err = new Error('No reply generated.');
    err.statusCode = 502;
    throw err;
  }

  return reply;
}

const hasEmailConfig = Boolean(
  process.env.EMAIL_HOST &&
  process.env.EMAIL_PORT &&
  process.env.EMAIL_USER &&
  process.env.EMAIL_PASS
);

const transporter = hasEmailConfig
  ? nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: Number(process.env.EMAIL_PORT),
      secure: process.env.EMAIL_SECURE === 'true',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    })
  : null;

async function sendBookingEmail(submission) {
  if (!hasEmailConfig || !transporter) {
    throw new Error('Email service is not configured.');
  }

  const recipientEmail = String(submission.email || '').trim();
  const recipientName = String(submission.name || '').trim();
  if (!recipientEmail) {
    throw new Error('Submission is missing a recipient email address.');
  }

  const userSubject = 'Your call booking request with Panas Website Agency';
  const userBody = `Hi ${recipientName || 'there'},\n\nThanks for reaching out to Panas Website Agency. We received your message and will follow up by email to book a call. You can also immediately schedule a time here:\n\n${bookingLink}\n\nBest,\nPanas Website Agency`;

  const mailOptions = {
    from: emailFrom,
    to: recipientEmail,
    subject: userSubject,
    text: userBody,
  };

  if (adminEmail) {
    mailOptions.cc = adminEmail;
  }

  await transporter.sendMail(mailOptions);
}

const mimeTypes = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.webp': 'image/webp',
};

const staticCacheControl = {
  '.html': 'no-cache',
  '.css': 'public, max-age=604800',
  '.js': 'public, max-age=604800',
  '.png': 'public, max-age=604800',
  '.jpg': 'public, max-age=604800',
  '.jpeg': 'public, max-age=604800',
  '.svg': 'public, max-age=604800',
  '.mp4': 'public, max-age=604800',
  '.webm': 'public, max-age=604800',
  '.webp': 'public, max-age=604800',
};

function readSubmissions() {
  try {
    const submissionsDir = path.dirname(submissionsFile);
    fs.mkdirSync(submissionsDir, { recursive: true });

    if (!fs.existsSync(submissionsFile)) {
      fs.writeFileSync(submissionsFile, '[]', 'utf8');
      return [];
    }
    const raw = fs.readFileSync(submissionsFile, 'utf8');
    return JSON.parse(raw || '[]');
  } catch (error) {
    console.error(`Unable to read submissions file at ${submissionsFile}:`, error);
    return [];
  }
}

function writeSubmissions(submissions) {
  const submissionsDir = path.dirname(submissionsFile);
  fs.mkdirSync(submissionsDir, { recursive: true });

  const tempFile = `${submissionsFile}.tmp`;
  fs.writeFileSync(tempFile, JSON.stringify(submissions, null, 2), 'utf8');
  fs.renameSync(tempFile, submissionsFile);
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
    req.on('end', async () => {
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
          if (hasEmailConfig) {
            try {
              await sendBookingEmail(submission);
            } catch (emailError) {
              console.error('Email send error:', emailError);
            }
          }

          sendJson(res, 201, { success: true });
        } else {
          res.writeHead(303, { Location: '/contact.html?submitted=1' });
          res.end();
        }
      } catch (error) {
        console.error('Submission processing error:', error);
        sendJson(res, 400, { success: false, error: 'Invalid submission payload.' });
      }
    });
    return;
  }

  if (req.method === 'POST' && req.url === '/api/chat') {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
    });
    req.on('end', async () => {
      try {
        const parsed = JSON.parse(body || '{}');
        const messages = Array.isArray(parsed.messages) ? parsed.messages : null;

        if (!messages || messages.length === 0) {
          sendJson(res, 400, { error: 'No message provided.' });
          return;
        }

        const reply = await getChatReply(messages);
        sendJson(res, 200, { reply });
      } catch (error) {
        const status = error.statusCode || 500;
        console.error('Chat error:', error);
        sendJson(res, status, { error: error.message || 'Something went wrong.' });
      }
    });
    return;
  }

  if (req.method === 'GET' && req.url.startsWith('/admin/submissions')) {
    if (!adminToken) {
      res.writeHead(403);
      res.end('Admin endpoint not configured.');
      return;
    }

    const urlObj = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const token = urlObj.searchParams.get('token') || req.headers['x-admin-token'];

    if (token !== adminToken) {
      res.writeHead(403, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Invalid or missing admin token.' }));
      return;
    }

    try {
      const submissions = readSubmissions();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(submissions, null, 2));
    } catch (error) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Failed to read submissions.' }));
    }
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

    fs.stat(filePath, (statErr, stat) => {
      if (statErr || !stat.isFile()) {
        res.writeHead(404);
        res.end('Not found');
        return;
      }

      const ext = path.extname(filePath).toLowerCase();
      const contentType = mimeTypes[ext] || 'application/octet-stream';
      const cacheControl = staticCacheControl[ext] || 'public, max-age=3600';
      const isVideo = ext === '.mp4' || ext === '.webm';
      const fileSize = stat.size;
      const rangeHeader = req.headers.range;

      if (isVideo && rangeHeader) {
        const match = rangeHeader.match(/bytes=(\d+)-(\d*)/);
        if (!match) {
          res.writeHead(416, { 'Content-Range': `bytes */${fileSize}` });
          res.end();
          return;
        }
        const start = parseInt(match[1], 10);
        const end = match[2] ? parseInt(match[2], 10) : Math.min(start + 1048576 - 1, fileSize - 1);

        if (start >= fileSize || end >= fileSize || start > end) {
          res.writeHead(416, { 'Content-Range': `bytes */${fileSize}` });
          res.end();
          return;
        }

        res.writeHead(206, {
          'Content-Range': `bytes ${start}-${end}/${fileSize}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': end - start + 1,
          'Content-Type': contentType,
          'Cache-Control': cacheControl,
        });
        fs.createReadStream(filePath, { start, end }).pipe(res);
      } else {
        const headers = {
          'Content-Type': contentType,
          'Content-Length': fileSize,
          'Cache-Control': cacheControl,
        };
        if (isVideo) {
          headers['Accept-Ranges'] = 'bytes';
        }
        res.writeHead(200, headers);
        fs.createReadStream(filePath).pipe(res);
      }
    });
    return;
  }

  res.writeHead(405);
  res.end('Method Not Allowed');
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running at http://localhost:${PORT}`);
  console.log(`Server listening on port ${PORT} on all network interfaces.`);
  console.log(`Saving submissions to ${submissionsFile}`);
  console.log('Make sure the site is published using this Node server so /submit can save submissions.');
});
