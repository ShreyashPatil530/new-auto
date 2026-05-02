# 🤖 AI-Powered Job Automation System (v3.0)

An automated job alert + auto-apply system that scrapes 6 job boards, filters results using AI, emails rich HTML reports, and can auto-apply to Internshala jobs via Puppeteer.

## ✨ Features

- **6 Job Sources in Parallel:** Internshala (17 categories), Remotive, Jobicy, WeWorkRemotely RSS, RemoteOK, Arbeitnow
- **AI Relevance Filter:** Groq (Llama-3.3-70b) → Gemini 1.5 Flash → DeepSeek fallback chain
- **Rich HTML Email Alerts:** Job cards with stipend, location, AI reason, and direct apply links
- **🤖 Auto-Apply:** One-click Puppeteer automation — fills cover letter + custom Q&A using AI and submits the application
- **MongoDB Persistence:** Deduplication via Atlas; JSON fallback when offline
- **Runs Hourly:** GitHub Actions cron — fully serverless

---

## 🛠️ Setup

### 1. Clone & Install
```bash
git clone https://github.com/Jay8850jkl/Intershala-job-automations.git
cd Intershala-job-automations
npm install
```

### 2. Create `.env` File
```env
# AI Keys
GROQ_API_KEY=your_groq_key
GEMINI_API_KEY=optional_fallback
AGENT_ROUTER_BASE_URL=optional_deepseek_url
AGENT_ROUTER_API_KEY=optional_deepseek_key

# Email (Gmail App Password)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_gmail@gmail.com
EMAIL_PASS=your_app_password
RECIPIENT_EMAIL=where_to_send@gmail.com

# MongoDB (optional — falls back to sent_jobs.json)
MONGODB_URI=mongodb+srv://...

# Auto-Apply (optional)
INTERNSHALA_EMAIL=your_internshala_email
INTERNSHALA_PASSWORD=your_internshala_password
SERVER_URL=http://your-server:3001
```

### 3. Run Locally
```bash
# One-time job search + email
node index.js --single-run

# Hourly cron server mode
node index.js

# Auto-apply server (for "Auto Apply" button in email)
node apply_server.js
```

---

## 🚀 GitHub Actions Deployment

### Job Alert (Automatic — every hour)
Add these secrets in **Settings → Secrets → Actions**:

| Secret | Required |
|---|---|
| `GROQ_API_KEY` | ✅ |
| `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_USER`, `EMAIL_PASS` | ✅ |
| `RECIPIENT_EMAIL` | ✅ |
| `GEMINI_API_KEY` | Optional |
| `MONGODB_URI` | Optional |
| `SERVER_URL` | Optional (for Auto Apply button) |
| `INTERNSHALA_EMAIL`, `INTERNSHALA_PASSWORD` | Optional (for Auto Apply) |

### Auto Apply (Manual trigger)
Go to **Actions → 🤖 Auto Apply to Job → Run workflow** and fill in job details.

---

## 📁 Project Structure

```
index.js          — Main orchestrator (pipeline entry)
scraper.js        — All 6 job source scrapers
ai_filter.js      — AI filter chain (Groq → Gemini → DeepSeek)
email_sender.js   — HTML email builder + confirmation emails
storage.js        — MongoDB / JSON dedup storage
auto_apply.js     — Puppeteer auto-apply engine
apply_server.js   — Express server for email "Auto Apply" button
cover_letter.js   — AI cover letter + Q&A generator
run_apply.js      — GitHub Actions entry point for auto-apply
```

---

## 🧠 Tech Stack

- **Runtime:** Node.js v20
- **Scraping:** Axios + Cheerio + RSS parsing
- **AI:** Groq SDK (Llama-3.3-70b), Google Generative AI (Gemini)
- **Auto-Apply:** Puppeteer
- **Email:** Nodemailer (Gmail SMTP)
- **Database:** MongoDB Atlas (Mongoose)
- **CI/CD:** GitHub Actions
