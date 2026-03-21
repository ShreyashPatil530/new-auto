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

    const jobRows = jobs.map(job => `
        <div style="margin-bottom: 20px; padding: 15px; border: 1px solid #ddd; border-radius: 8px; font-family: sans-serif;">
            <h3 style="margin: 0 0 10px 0; color: #1a73e8;">${job.title}</h3>
            <p style="margin: 0 0 5px 0;"><strong>Company:</strong> ${job.company}</p>
            <p style="margin: 0 0 10px 0; font-size: 0.9em; color: #555;"><i>Reason:</i> ${job.relevanceReason || 'Highly relevant skill match'}</p>
            <a href="${job.applyLink}" style="display: inline-block; padding: 10px 20px; color: white; background-color: #1a73e8; text-decoration: none; border-radius: 5px; font-weight: bold;">Apply Now</a>
        </div>
    `).join("");

    const mailOptions = {
        from: `"Job Alert System" <${process.env.EMAIL_USER}>`,
        to: process.env.RECIPIENT_EMAIL,
        subject: `Latest Internshala Jobs - ${new Date().toLocaleDateString()}`,
        html: `
            <div style="max-width: 600px; margin: auto; padding: 20px; background-color: #f9f9f9; border: 1px solid #eee;">
                <h2 style="text-align: center; color: #333;">New Career Opportunities Matched!</h2>
                <p style="text-align: center; color: #666;">Hey! We've found the following high-relevance jobs/internships for you:</p>
                <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
                ${jobRows}
                <p style="font-size: 0.8em; color: #888; text-align: center; margin-top: 30px;">
                    This is an automated alert. System runs every hour.
                </p>
            </div>
        `,
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log("Email sent successfully: ", info.messageId);
    } catch (error) {
        console.error("Error sending email:", error.message);
        throw error;
    }
}

module.exports = { sendEmail };
