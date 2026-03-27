const Groq = require("groq-sdk");
const dotenv = require("dotenv");

dotenv.config();

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

async function filterJobs(jobs) {
    if (jobs.length === 0) return [];

    const prompt = `
        You are an expert technical recruiter matching candidates for High-Quality Tech Internships and Entry-Level Roles.
        
        Candidate Profile:
        Skills: Full Stack Development (MERN, Node.js, React), AI, Automation, Python.
        Looking for: Software Engineer Internships, Web Development, Backend/Frontend, AI/ML roles.
        
        CRITICAL REJECTION RULES (Return ONLY matching tech jobs):
        - REJECT NGO, Fundraising, Social Work, or Non-Profit roles.
        - REJECT Teaching, Content Writing, Graphic Design, or Sales.
        - REJECT "1 Week Fundraising", "Campus Ambassador", or "Mental Health Outreach".
        - ONLY ACCEPT: MERN, Node.js, React, Python, Django, Flask, Java, C++, AI, ML, Data Science roles.

        Jobs to evaluate (JSON):
        ${JSON.stringify(jobs)}

        Format your response EXCLUSIVELY as a JSON array of objects. 
        Each object MUST have:
        - "id": The original job ID.
        - "title": Job title.
        - "company": Company name.
        - "link": Apply link.
        - "reason": A 1st-person single sentence why this matches (e.g., "Matches your MERN stack skills perfectly").

        If NO jobs match, return an empty array [].
    `;

    try {
        const chatCompletion = await groq.chat.completions.create({
            messages: [
                {
                    role: "user",
                    content: prompt,
                },
            ],
            model: "llama-3.3-70b-versatile",
            temperature: 0,
            response_format: { type: "json_object" }
        });

        const rawResponse = chatCompletion.choices[0].message.content;
        
        // Groq sometimes wraps in an object with a key like "jobs" if response_format is used
        let result = JSON.parse(rawResponse);
        
        if (result.jobs && Array.isArray(result.jobs)) {
            return result.jobs;
        } else if (Array.isArray(result)) {
            return result;
        } else {
            // Handle common keys like "matches" or search for the array
            const key = Object.keys(result).find(k => Array.isArray(result[k]));
            return key ? result[key] : [];
        }

    } catch (error) {
        console.error("GROQ API ERROR:", error.message);
        return [];
    }
}

module.exports = { filterJobs };
