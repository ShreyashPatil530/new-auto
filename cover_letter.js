const Groq = require('groq-sdk');
const dotenv = require('dotenv');
dotenv.config();

const groq = process.env.GROQ_API_KEY ? new Groq({ apiKey: process.env.GROQ_API_KEY }) : null;

async function generateCoverLetter(jobTitle, company) {
    if (!groq) return defaultCoverLetter(jobTitle, company);

    const prompt = `Write a short, genuine cover letter for a FRESHER applying to "${jobTitle}" at "${company}".

Candidate skills: MERN Stack (MongoDB, Express, React, Node.js), Next.js, Python, AI/ML, REST APIs, n8n workflow automation, LLM integrations.

Rules:
- Under 120 words
- Sound human and enthusiastic, NOT robotic
- Mention 2-3 relevant skills specific to the job title
- No "Dear Hiring Manager", no subject line — just the body
- End with: available to join immediately

Return ONLY the cover letter body text.`;

    try {
        const completion = await groq.chat.completions.create({
            model: 'llama-3.3-70b-versatile',
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.7,
            max_tokens: 250,
        });
        const text = completion.choices[0].message.content.trim();
        console.log(`  ✅ Cover letter generated for "${jobTitle}" at ${company}`);
        return text;
    } catch (e) {
        console.warn('  ! Cover letter AI failed, using default:', e.message);
        return defaultCoverLetter(jobTitle, company);
    }
}

function defaultCoverLetter(jobTitle, company) {
    return `I'm a fresher full-stack developer with hands-on experience in MERN Stack (MongoDB, Express, React, Node.js), Next.js, and AI/ML integrations. I've built production-ready applications using REST APIs, Python, and AI workflow automation tools like n8n and Langchain.

I'm genuinely excited about the ${jobTitle} role at ${company} — it aligns perfectly with my technical skills and my passion for building real-world products. I'm a fast learner who picks up new technologies quickly and loves shipping things that matter.

I'm available to join immediately and would love the opportunity to contribute to your team from day one.`;
}

/**
 * Generates a specific answer for a custom application question using AI.
 */
async function generateAnswer(question, jobTitle, company) {
    if (!groq) return defaultAnswer(question);

    const prompt = `Answer this internship application question as a fresher MERN Stack developer.

Question: "${question}"
Job: ${jobTitle} at ${company}

Candidate profile: Fresher full-stack developer. Skills: MERN Stack (MongoDB, Express, React, Node.js), Next.js, Python, AI/ML, REST APIs. Has built projects with file uploads, data processing, APIs, automation.

Rules:
- 2-4 sentences only
- Sound genuine and technical, not robotic
- For yes/no questions, say Yes with a brief reason
- Be specific to the question asked

Return ONLY the answer text, nothing else.`;

    try {
        const completion = await groq.chat.completions.create({
            model: 'llama-3.3-70b-versatile',
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.6,
            max_tokens: 150,
        });
        return completion.choices[0].message.content.trim();
    } catch (e) {
        console.warn('  ! Answer generation failed, using default:', e.message);
        return defaultAnswer(question);
    }
}

function defaultAnswer(question) {
    const q = question.toLowerCase();
    if (q.includes('laptop') || q.includes('internet') || q.includes('device'))
        return 'Yes, I have a reliable laptop and stable high-speed internet connection.';
    if (q.includes('duplicate') || q.includes('match') || q.includes('database'))
        return 'I would use fuzzy string matching (Levenshtein distance) combined with normalization (lowercase, remove punctuation) to identify duplicates. In MongoDB I would use aggregation pipelines with regex for flexible matching.';
    if (q.includes('file') || q.includes('upload') || q.includes('csv') || q.includes('excel') || q.includes('json'))
        return 'Yes, I have built a project that handled CSV and JSON file uploads using Node.js with multer and processed the data using Python pandas. The processed results were stored in MongoDB and displayed via a React dashboard.';
    if (q.includes('experience') || q.includes('project'))
        return 'I have built several full-stack projects using MERN Stack including a REST API backend with Node.js/Express, React frontend, and MongoDB database. I am comfortable with both frontend and backend development.';
    return 'Yes, I am confident I can handle this effectively. I have hands-on experience with MERN Stack, Python, and data processing, and I am a quick learner who adapts fast to new requirements.';
}

module.exports = { generateCoverLetter, generateAnswer };
