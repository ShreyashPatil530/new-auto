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
