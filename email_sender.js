const nodemailer = require("nodemailer");
const dotenv = require("dotenv");

dotenv.config();

const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT),
    secure: false, // true for 465, false for other ports
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

async function sendEmail(jobs) {
    if (jobs.length === 0) {
        console.log("No relevant jobs found, skipping email.");
        return;
    }

    const jobRows = jobs.map(job => {
        const isJob = job.type && job.type.includes("Job");
        const badgeColor = isJob ? "#28a745" : "#17a2b8";
        
        return `
        <div style="margin-bottom: 20px; padding: 20px; border: 1px solid #e0e0e0; border-radius: 12px; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: white; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
            <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 10px;">
                <span style="display: inline-block; padding: 4px 12px; font-size: 11px; font-weight: bold; color: white; background-color: ${badgeColor}; border-radius: 50px; text-transform: uppercase;">${job.type || 'Opportunity'}</span>
                ${job.jobOffer ? `<span style="font-size: 11px; font-weight: bold; color: #f39c12;">${job.jobOffer}</span>` : ''}
            </div>
            <h3 style="margin: 0 0 8px 0; color: #1a73e8; font-size: 18px;">${job.title}</h3>
            <p style="margin: 0 0 12px 0; font-weight: 600; color: #333;">🏢 ${job.company}</p>
            
            <div style="background-color: #f8f9fa; padding: 12px; border-radius: 8px; margin-bottom: 15px;">
                <p style="margin: 0 0 5px 0; color: #666; font-size: 13px;"><strong>💰 Salary/Stipend:</strong> ${job.salary || 'Not Disclosed'}</p>
                <p style="margin: 0; color: #666; font-size: 13px;"><strong>🎯 Why matched:</strong> ${job.relevanceReason || 'Matches your target tech stack'}</p>
            </div>
            
            <a href="${job.applyLink || job.link || '#'}" style="display: block; text-align: center; padding: 12px; color: white; background-color: #1a73e8; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 14px; transition: background-color 0.3s;">View and Apply</a>
        </div>
    `}).join("");

    const mailOptions = {
        from: `"🚀 Job Alert System" <${process.env.EMAIL_USER}>`,
        to: process.env.RECIPIENT_EMAIL,
        subject: `🎯 New Job Opportunities - ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`,
        html: `
            <!DOCTYPE html>
            <html>
            <head>
                <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet">
            </head>
            <body style="margin: 0; padding: 0; background-color: #f4f7f9; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                <div style="max-width: 650px; margin: 40px auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.08); border: 1px solid #e1e8ed;">
                    <!-- Header -->
                    <div style="background: linear-gradient(135deg, #1a73e8 0%, #0d47a1 100%); padding: 40px 20px; text-align: center; color: white;">
                        <h1 style="margin: 0; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">New Matches Found! 🚀</h1>
                        <p style="margin: 10px 0 0 0; opacity: 0.9; font-size: 16px;">We've analyzed the latest listings to find the best fits for your career.</p>
                    </div>

                    <!-- Content -->
                    <div style="padding: 30px;">
                        <p style="color: #4a5568; font-size: 16px; line-height: 1.6; margin-bottom: 25px;">
                            Hey Shreyash! We found <strong>${jobs.length}</strong> high-relevance opportunities that match your technical profile.
                        </p>
                        
                        ${jobRows}

                        <!-- Footer -->
                        <div style="margin-top: 40px; padding-top: 30px; border-top: 1px solid #edf2f7; text-align: center;">
                            <p style="font-size: 13px; color: #718096; margin-bottom: 8px;">
                                🤖 This is an automated alert from your Job Automation System.
                            </p>
                            <p style="font-size: 12px; color: #a0aec0; margin: 0;">
                                System checks Internshala every hour for Full Stack, AI, and ML roles.
                            </p>
                        </div>
                    </div>
                </div>
            </body>
            </html>
        `,
    };

    try {
        // Verify connection before sending
        await transporter.verify();
        const info = await transporter.sendMail(mailOptions);
        console.log("✅ Email sent successfully: ", info.messageId);
    } catch (error) {
        console.error("❌ Error sending email:", error.message);
        if (error.code === 'EAUTH') {
            console.error("Auth Error: Check if your App Password is correct.");
        }
        throw error;
    }
}

module.exports = { sendEmail };
