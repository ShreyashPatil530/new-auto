// Entry point for GitHub Actions auto-apply
// Reads job details from environment variables set by the workflow
const { autoApply } = require('./auto_apply');
const { sendConfirmationEmail } = require('./email_sender');
const dotenv = require('dotenv');
dotenv.config();

(async () => {
    const job = {
        id:        process.env.JOB_ID,
        applyLink: process.env.APPLY_LINK,
        title:     process.env.JOB_TITLE,
        company:   process.env.COMPANY,
    };

    if (!job.id || !job.applyLink) {
        console.error('❌ Missing JOB_ID or APPLY_LINK env vars');
        process.exit(1);
    }

    const result = await autoApply(job);
    await sendConfirmationEmail(result);

    process.exit(result.success ? 0 : 1);
})();
