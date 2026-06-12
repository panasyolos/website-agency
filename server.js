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
          if (!hasEmailConfig) {
            sendJson(res, 500, { success: false, error: 'Email service is not configured.' });
            return;
          }

          try {
            await sendBookingEmail(submission);
          } catch (emailError) {
            console.error('Email send error:', emailError);
            sendJson(res, 500, { success: false, error: 'Submission received but email send failed.' });
            return;
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
  console.log(`Saving submissions to ${submissionsFile}`);
  console.log('Make sure the site is published using this Node server so /submit can save submissions.');
});
