const express = require('express');
const { autoApply } = require('./auto_apply');
const { sendConfirmationEmail } = require('./email_sender');
const dotenv = require('dotenv');
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Prevent double-apply for same job
const applying = new Set();

// ─────────────────────────────────────────────────────────────────────────────
// GET /apply?jobId=xxx&applyLink=yyy&title=zzz&company=aaa
// Triggered when user clicks "Auto Apply" button in email
// ─────────────────────────────────────────────────────────────────────────────
app.get('/apply', async (req, res) => {
    const { jobId, applyLink, title, company } = req.query;

    if (!jobId || !applyLink || !title || !company) {
        return res.status(400).send(htmlPage('❌ Error', 'Missing job details in the request.'));
    }

    if (applying.has(jobId)) {
        return res.send(htmlPage(
            '⏳ Already Applying...',
            `Application for <strong>${title}</strong> at <strong>${company}</strong> is already in progress. Check your email for confirmation.`
        ));
    }

    // Respond immediately — don't make user wait for Puppeteer
    res.send(htmlPage(
        '🤖 Applying Now!',
        `Puppeteer is filling the form for <strong>${title}</strong> at <strong>${company}</strong>.<br/><br/>
        You'll receive a confirmation email once done. You can close this tab.`
    ));

    // Run apply in background
    applying.add(jobId);
    try {
        const result = await autoApply({ id: jobId, applyLink, title, company });
        await sendConfirmationEmail(result);
    } catch (err) {
        console.error('Auto-apply pipeline error:', err.message);
        await sendConfirmationEmail({
            success: false, title, company, applyLink,
            error: err.message
        }).catch(() => {});
    } finally {
        applying.delete(jobId);
    }
});

// Health check
app.get('/health', (_, res) => res.send('OK'));

app.listen(PORT, () => {
    console.log(`🚀 Apply server running → http://localhost:${PORT}`);
    console.log(`   Click "Auto Apply" in any job email to trigger it.`);
});

// ─────────────────────────────────────────────────────────────────────────────
// Simple HTML response page
// ─────────────────────────────────────────────────────────────────────────────
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
