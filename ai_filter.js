const Groq = require("groq-sdk");
const dotenv = require("dotenv");

dotenv.config();

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

async function filterJobs(jobs) {
    if (!jobs || jobs.length === 0) return [];

    // Groq has per-request token limits. 
    // We will take only the first 30 jobs to ensure we don't hit the 413 error.
    const limitedJobs = jobs.slice(0, 30);
    console.log(`- Passing ${limitedJobs.length} jobs to Groq AI (Chunking to avoid 413 error).`);

    const prompt = `
        Evaluate health/tech Internshala jobs.
        Candidate: Full Stack, Node.js, React, Python, AI, ML, Automation.
        Role: Software Engineer, Web Dev, Backend, Frontend.
        
        REJECT: NGO, Fundraising, Campus Ambassador, Sales, Content Writing, HR.
        NO Graphic Design or Video Editing.

        Jobs (JSON):
        ${JSON.stringify(limitedJobs)}

        Output:
        Return ONLY valid JSON: { "matches": [{ "id": "...", "title": "...", "company": "...", "link": "...", "reason": "..." }] }.
        Return { "matches": [] } if none.
    `;

    try {
        const chatCompletion = await groq.chat.completions.create({
            messages: [{ role: "user", content: prompt }],
            model: "llama-3.3-70b-versatile",
            temperature: 0,
            response_format: { type: "json_object" }
        });

        let content = chatCompletion.choices[0].message.content;
        
        try {
            const data = JSON.parse(content);
            return data.matches || data || [];
        } catch (parseError) {
            const match = content.match(/\[.*\]/s);
            if (match) return JSON.parse(match[0]);
        }
        
        return [];

    } catch (error) {
        if (error.status === 413 || error.message.includes('Limit 12000')) {
             console.warn("Groq error: Request too large. Retrying with only 10 jobs.");
             return await filterJobs(jobs.slice(0, 10)); // Recursive retry with smaller set
        }
        console.error("GROQ CRITICAL ERROR:", error.message);
        return [];
    }
}

module.exports = { filterJobs };
