const Groq = require("groq-sdk");
const dotenv = require("dotenv");

dotenv.config();

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

async function filterJobs(jobs) {
    if (!jobs || jobs.length === 0) return [];

    const prompt = `
        Evaluate these Internshala internships/jobs.
        Target Skills: React, Node.js, Full Stack, Python, AI, ML, Automation.
        Target Roles: Tech Interns, Software Engineers, Web Dev.
        REJECT: NGO, Fundraising, Campus Ambassador, Sales, Content Writing.

        JOBS:
        ${JSON.stringify(jobs)}

        Response format:
        Return ONLY valid JSON in this format: { "matches": [{ "id": "...", "title": "...", "company": "...", "link": "...", "reason": "..." }] }.
        If none match, return { "matches": [] }.
    `;

    try {
        const chatCompletion = await groq.chat.completions.create({
            messages: [{ role: "user", content: prompt }],
            model: "llama-3.3-70b-versatile",
            temperature: 0,
            response_format: { type: "json_object" }
        });

        let content = chatCompletion.choices[0].message.content;
        console.log("AI Response Received.");
        
        try {
            const data = JSON.parse(content);
            if (data.matches && Array.isArray(data.matches)) {
                return data.matches;
            }
            if (Array.isArray(data)) return data;
        } catch (parseError) {
            console.error("AI JSON Parse Error:", parseError.message);
            // Fallback: try to find array in text if somehow output wasn't clean
            const match = content.match(/\[.*\]/s);
            if (match) return JSON.parse(match[0]);
        }
        
        return [];

    } catch (error) {
        console.error("GROQ CRITICAL ERROR:", error.message);
        return [];
    }
}

module.exports = { filterJobs };
