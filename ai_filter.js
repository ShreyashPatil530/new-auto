const Groq = require("groq-sdk");
const dotenv = require("dotenv");

dotenv.config();

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

async function filterJobs(jobs) {
    if (jobs.length === 0) return [];

    const prompt = `
        You are an AI specialized in technical job matching. Evaluate these internships/jobs from Internshala.
        
        CRITESIA:
        - Match for skills: Full Stack Development, Node.js, React, MERN, Python, AI, Automation, Java, C++, Software Engineering.
        - Accept: Internships, Entry-level roles, Technical Product Management.
        - REJECT: NGO, Fundraising, Content Writing, Graphic Design, Sales, Marketing, Campus Ambassador, Mental Health, NGO operations.

        JOBS (JSON Format):
        ${JSON.stringify(jobs)}

        RETURN format:
        Return ONLY a JSON object with a key "matches" containing an array of matched jobs.
        Example: { "matches": [{ "id": "...", "title": "...", "company": "...", "link": "...", "reason": "..." }] }
    `;

    try {
        const chatCompletion = await groq.chat.completions.create({
            messages: [{ role: "user", content: prompt }],
            model: "llama-3.3-70b-versatile",
            temperature: 0.1,
            response_format: { type: "json_object" }
        });

        let content = chatCompletion.choices[0].message.content;
        console.log("DEBUG: Raw AI Response:", content);

        let data = JSON.parse(content);
        
        // Handle various possible JSON structures from LLM
        if (data.matches && Array.isArray(data.matches)) {
            return data.matches;
        } else if (Array.isArray(data)) {
            return data;
        } else if (data.jobs && Array.isArray(data.jobs)) {
            return data.jobs;
        }
        
        return [];

    } catch (error) {
        console.error("GROQ FILTER ERROR:", error.message);
        return [];
    }
}

module.exports = { filterJobs };
