const express = require('express');
const axios = require('axios');
const dotenv = require('dotenv');
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

const GITHUB_REPO = process.env.GITHUB_REPO;
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

const triggering = new Set();

app.get('/apply', async (req, res) => {
    const { jobId, applyLink, title, company } = req.query;

    if (!jobId || !applyLink || !title || !company) {
        return res.status(400).send(htmlPage('❌ Error', 'Missing job details in the request.'));
    }

    if (!GITHUB_REPO || !GITHUB_TOKEN) {
        return res.status(500).send(htmlPage('⚙️ Not Configured', 'GITHUB_REPO or GITHUB_TOKEN is missing on server.'));
    }

    if (triggering.has(jobId)) {
        return res.send(htmlPage(
            '⏳ Already In Progress',
            `Auto-apply for <strong>${title}</strong> at <strong>${company}</strong> is already running. Check your email for confirmation.`
        ));
    }

    res.send(htmlPage(
        '🚀 Auto-Apply Triggered!',
        `GitHub Actions is now filling the application for <strong>${title}</strong> at <strong>${company}</strong>.<br/><br/>
        You'll receive a <strong>confirmation email</strong> once done. You can close this tab.`
    ));

    triggering.add(jobId);
    try {
        await axios.post(
            `https://api.github.com/repos/${GITHUB_REPO}/actions/workflows/auto-apply.yml/dispatches`,
            {
                ref: 'main',
                inputs: { jobId, applyLink, title, company }
            },
            {
                headers: {
                    'Authorization': `Bearer ${GITHUB_TOKEN}`,
                    'Accept': 'application/vnd.github.v3+json',
                    'Content-Type': 'application/json'
                }
            }
        );
        console.log(`✅ GitHub Actions triggered: "${title}" @ ${company}`);
    } catch (err) {
        console.error('❌ Failed to trigger GitHub Actions:', err.response?.data || err.message);
    } finally {
        setTimeout(() => triggering.delete(jobId), 2 * 60 * 1000);
    }
});

app.get('/health', (_, res) => res.send('OK'));

app.listen(PORT, () => {
    console.log(`🚀 Apply server running on port ${PORT}`);
});

function htmlPage(heading, body) {
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>${heading}</title>
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; background: #f0f4f8; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; }
    .card { background: #fff; border-radius: 12px; padding: 40px 48px; max-width: 500px; text-align: center; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
    h2 { color: #1a1a2e; margin-bottom: 16px; font-size: 1.5em; }
    p { color: #555; line-height: 1.6; font-size: 1em; }
  </style>
</head>
<body>
  <div class="card">
    <h2>${heading}</h2>
    <p>${body}</p>
  </div>
</body>
</html>`;
}
