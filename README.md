# 🚀 AI-Powered Internshala Job Alert Automation

A fully automated job/internship alert system that scrapes Internshala, filters opportunities using Gemini AI, and sends personalized alerts via email every hour.

## ✨ Features
- **Scraping:** Fetches latest work-from-home internships from Internshala.
- **AI Filtering:** Uses Google Gemini 1.5 Flash to pick only the most relevant jobs based on your skills (Full Stack, AI, Automation, etc.).
- **Duplicate Prevention:** Tracks already sent jobs in `sent_jobs.json` to avoid notification fatigue.
- **Continuous Running:** Runs automatically every 1 hour (configurable).
- **GitHub Actions Ready:** Deploys easily with continuous tracking.

## 🛠️ Setup Instructions

### 1. Requirements
- Node.js (v18+)
- A Google Gemini API Key
- A Gmail account (using App Passwords for SMTP)

### 2. Local Setup
1. Clone the repository.
2. Create a `.env` file with the following:
   ```env
   GEMINI_API_KEY=your_gemini_key
   EMAIL_HOST=smtp.gmail.com
   EMAIL_PORT=587
   EMAIL_USER=your_gmail@gmail.com
   EMAIL_PASS=your_gmail_app_password
   RECIPIENT_EMAIL=where_to_send_alerts@gmail.com
   INTERNSHALA_WFH_URL=https://internshala.com/internships/work-from-home-internships/
   ```
3. Install dependencies:
   ```bash
   npm install
   ```
4. Start the system:
   ```bash
   node index.js
   ```

### 3. Deployment on GitHub Actions
1. Push this code to a private/public GitHub repository.
2. Go to **Settings > Secrets and variables > Actions**.
3. Add the following repository secrets:
    - `GEMINI_API_KEY`
    - `EMAIL_HOST`
    - `EMAIL_PORT`
    - `EMAIL_USER`
    - `EMAIL_PASS`
    - `RECIPIENT_EMAIL`
4. The system will automatically run every hour based on `.github/workflows/job-alert.yml`.

## 📦 Tech Stack
- **Node.js**: Main engine.
- **Axios & Cheerio**: For high-speed scraping.
- **Google Generative AI SDK**: For intelligent job filtering.
- **Nodemailer**: For sending professional email reports.
- **Node-cron**: For local automation.
