const nodemailer = require('nodemailer');
const dotenv = require('dotenv');

dotenv.config();

const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT),
    secure: false,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

// Color map per source
const TYPE_COLORS = {
    'Internship'  : '#2ecc71',
    'Fresher Job' : '#e67e22',
    'Indeed Job'  : '#3498db',
    'Naukri Job'  : '#9b59b6',
    'Remote Job'  : '#1abc9c',
    'default'     : '#7f8c8d',
};

const SOURCE_ICONS = {
    'Internshala' : '🎓',
    'Indeed RSS'  : '🔍',
    'Naukri'      : '💼',
    'RemoteOK'    : '🌐',
    'default'     : '📋',
};

function getTypeColor(type = '') {
    return TYPE_COLORS[type] || TYPE_COLORS['default'];
}

function getSourceIcon(source = '') {
    return SOURCE_ICONS[source] || SOURCE_ICONS['default'];
}

/**
 * Sends a rich HTML email with all matched job cards.
 */
async function sendEmail(jobs) {
    if (!jobs || jobs.length === 0) return;

    const jobRows = jobs.map(job => {
        const typeColor  = getTypeColor(job.type);
        const sourceIcon = getSourceIcon(job.source);
        const salaryLabel = (job.type === 'Fresher Job' || job.type === 'Naukri Job') ? 'Salary' : 'Stipend';
        const reason = job.reason || job.relevanceReason || 'Strong technical skill match';
        const startDate = job.startDate || 'Immediate';
        const location  = job.location  || 'Remote / India';
        const stipend   = job.stipend   || 'Competitive';
        const company   = job.company   || 'Unknown Company';

        return `
        <div style="margin-bottom: 22px; padding: 20px; background: #ffffff; border:1px solid #e8ecef; border-left: 4px solid ${typeColor}; border-radius: 10px; font-family: 'Segoe UI', Arial, sans-serif; box-shadow: 0 2px 6px rgba(0,0,0,0.06);">

            <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:10px; flex-wrap:wrap; gap:8px;">
                <h3 style="margin:0; color:#1a1a2e; font-size:1.1em; font-weight:700;">${job.title}</h3>
                <div>
                    <span style="display:inline-block; padding:3px 10px; background:${typeColor}; color:#fff; border-radius:20px; font-size:0.7em; font-weight:700; text-transform:uppercase; letter-spacing:0.5px;">
                        ${job.type || 'Job'}
                    </span>
                </div>
            </div>

            <p style="margin:0 0 12px 0; color:#555; font-size:1em; font-weight:600;">
                ${sourceIcon} ${company}
            </p>

            <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:14px; background:#f8fafc; padding:12px; border-radius:8px;">
                <div style="font-size:0.88em; color:#555;">
                    <strong>💸 ${salaryLabel}:</strong><br/>
                    <span style="color:#27ae60; font-weight:700;">${stipend}</span>
                </div>
                <div style="font-size:0.88em; color:#555;">
                    <strong>📍 Location:</strong><br/>
                    <span>${location}</span>
                </div>
                <div style="font-size:0.88em; color:#555;">
                    <strong>📅 Posted / Start:</strong><br/>
                    <span>${startDate}</span>
                </div>
                <div style="font-size:0.88em; color:#555;">
                    <strong>🗂 Source:</strong><br/>
                    <span>${job.source || job.type || 'Job Portal'}</span>
                </div>
            </div>

            <p style="margin:0 0 14px 0; font-size:0.85em; color:#666; background:#fffbf0; border-left:3px solid #f39c12; padding:8px 12px; border-radius:4px; line-height:1.5;">
                <strong>🤖 AI Reason:</strong> ${reason}
            </p>

            <div style="text-align:right; display:flex; gap:10px; justify-content:flex-end; flex-wrap:wrap;">
                <a href="${job.applyLink}"
                   style="display:inline-block; padding:10px 22px; color:${typeColor}; background:#fff; border:2px solid ${typeColor}; text-decoration:none; border-radius:6px; font-weight:700; font-size:0.85em;">
                    View Job →
                </a>
                ${job.source === 'Internshala' && process.env.SERVER_URL ? `
                <a href="${process.env.SERVER_URL}/apply?jobId=${encodeURIComponent(job.id)}&applyLink=${encodeURIComponent(job.applyLink)}&title=${encodeURIComponent(job.title)}&company=${encodeURIComponent(job.company)}"
                   style="display:inline-block; padding:10px 22px; color:#fff; background:#e74c3c; text-decoration:none; border-radius:6px; font-weight:700; font-size:0.85em;">
                    🤖 Auto Apply
                </a>` : ''}
            </div>
        </div>
        `;
    }).join('');

    // Group summary by source
    const sourceCounts = jobs.reduce((acc, j) => {
        const s = j.source || j.type || 'Unknown';
        acc[s] = (acc[s] || 0) + 1;
        return acc;
    }, {});

    const summaryRows = Object.entries(sourceCounts)
        .map(([src, count]) => `<span style="margin-right:14px;">${getSourceIcon(src)} <strong>${src}</strong>: ${count}</span>`)
        .join('');

    const mailOptions = {
        from: `"⚡ Job Automation Engine" <${process.env.EMAIL_USER}>`,
        to: process.env.RECIPIENT_EMAIL,
        subject: `🔥 ${jobs.length} New High-Match Jobs — ${new Date().toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' })}`,
        html: `
        <div style="max-width:660px; margin:auto; padding:30px 20px; background:#f0f4f8; font-family:'Segoe UI',Arial,sans-serif; color:#333;">

            <!-- Header -->
            <div style="text-align:center; margin-bottom:28px; padding:28px 20px; background:linear-gradient(135deg,#1a1a2e,#16213e); border-radius:12px;">
                <h1 style="margin:0 0 6px 0; color:#ffffff; font-size:1.7em; letter-spacing:0.5px;">🎯 Career Match Report</h1>
                <p style="margin:0; color:#a0aec0; font-size:0.95em;">
                    ${jobs.length} high-relevance opportunities · ${new Date().toLocaleString('en-IN')}
                </p>
            </div>

            <!-- Source Summary -->
            <div style="background:#fff; border-radius:8px; padding:14px 18px; margin-bottom:22px; font-size:0.88em; color:#555; border:1px solid #e2e8f0;">
                <strong>📊 Sources:</strong>&nbsp;&nbsp;${summaryRows}
            </div>

            <!-- Job Cards -->
            ${jobRows}

            <!-- Footer -->
            <div style="text-align:center; margin-top:30px; padding-top:20px; border-top:1px solid #dde2e8;">
                <p style="font-size:0.78em; color:#999; line-height:1.6;">
                    Automated by <strong>Shreyash's Job Automation Engine</strong><br/>
                    Powered by Llama-3.3 · Gemini · MongoDB<br/>
                    Scan time: ${new Date().toLocaleTimeString('en-IN')}
                </p>
            </div>
        </div>
        `,
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log(`✅ Email sent: ${info.messageId}`);
    } catch (error) {
        console.error('❌ Email send failed:', error.message);
        throw error;
    }
}

/**
 * Sends a confirmation email after auto-apply succeeds or fails.
 */
async function sendConfirmationEmail(result) {
    const { success, title, company, applyLink, error } = result;

    const subject = success
        ? `✅ Auto-Applied: ${title} @ ${company}`
        : `❌ Auto-Apply Failed: ${title} @ ${company}`;

    const bodyColor = success ? '#27ae60' : '#e74c3c';
    const icon = success ? '✅' : '❌';
    const message = success
        ? `Your application was successfully submitted!`
        : `Something went wrong: <code>${error}</code><br/>Please apply manually.`;

    const html = `
    <div style="max-width:560px; margin:auto; padding:30px 20px; font-family:'Segoe UI',Arial,sans-serif; background:#f0f4f8;">
        <div style="background:#fff; border-radius:12px; padding:30px; border-left:5px solid ${bodyColor}; box-shadow:0 2px 10px rgba(0,0,0,0.08);">
            <h2 style="margin:0 0 10px; color:#1a1a2e;">${icon} Auto-Apply Report</h2>
            <p style="margin:0 0 16px; font-size:1em; color:#555;">${message}</p>
            <div style="background:#f8fafc; border-radius:8px; padding:14px; font-size:0.9em; color:#444;">
                <strong>Role:</strong> ${title}<br/>
                <strong>Company:</strong> ${company}<br/>
                <strong>Link:</strong> <a href="${applyLink}" style="color:#3498db;">${applyLink}</a>
            </div>
        </div>
        <p style="text-align:center; font-size:0.75em; color:#999; margin-top:16px;">
            Shreyash's Job Automation Engine
        </p>
    </div>`;

    try {
        await transporter.sendMail({
            from: `"⚡ Job Automation Engine" <${process.env.EMAIL_USER}>`,
            to: process.env.RECIPIENT_EMAIL,
            subject,
            html,
        });
        console.log(`📧 Confirmation email sent: ${subject}`);
    } catch (err) {
        console.error('Confirmation email failed:', err.message);
    }
}

module.exports = { sendEmail, sendConfirmationEmail };
