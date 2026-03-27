const Groq = require("groq-sdk");
const dotenv = require("dotenv");

dotenv.config();

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

async function filterJobs(jobs) {
    if (!jobs || jobs.length === 0) return [];

    // Limit jobs to avoid token limit issues (413 error)
    const limitedJobs = jobs.slice(0, 30);
    console.log(`- Filtering ${limitedJobs.length} jobs via Groq AI...`);

    const prompt = `
        Evaluate these Internshala jobs. 
        Skills: React, Node.js, Full Stack, Python, AI, ML.
        REJECT: NGO, Fundraising, Sales, Campus Ambassador.

        Input JSON:
        ${JSON.stringify(limitedJobs)}

        Output Format (STRICT JSON):
        Return an array: [{ "id": "...", "title": "...", "company": "...", "applyLink": "...", "reason": "..." }]
        Ensure you use "applyLink" exactly as provided in the input.
        If none match, return [].
    `;

    try {
        const chatCompletion = await groq.chat.completions.create({
            messages: [{ role: "user", content: prompt }],
            model: "llama-3.3-70b-versatile",
            temperature: 0,
            // We'll parse the array directly or handle the object
        });

        const content = chatCompletion.choices[0].message.content;
        
        try {
            // Find JSON array in the response
            const jsonMatch = content.match(/\[[\s\S]*\]/);
            if (jsonMatch) {
                const filtered = JSON.parse(jsonMatch[0]);
                // Ensure all items have applyLink
                return filtered.map(job => ({
                    ...job,
                    applyLink: job.applyLink || job.link || "" 
                })).filter(job => job.applyLink);
            }
        } catch (e) {
            console.error("AI Parsing Error:", e.message);
        }
        
        return [];

    } catch (error) {
        console.error("GROQ ERROR:", error.message);
        return [];
    }
}

module.exports = { filterJobs };
