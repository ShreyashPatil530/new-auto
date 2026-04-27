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
        Evaluate these job/internship opportunities from Internshala.
        
        CRITICAL SKILLS (High Priority): 
        - Full Stack Development (MERN Stack, Next.js, React, Node.js, Python, Django)
        - Artificial Intelligence (AI), Machine Learning (ML), Deep Learning
        - Data Science, Data Analytics
        - Software Development (Technical roles)
        
        BLOCKLIST (Always Reject these companies):
        - Symonis, Tripple One Solutions, CareerNest, Alphabt, CloudZapier, Basti Ki Pathshala Foundation, Emoolar Technology Private Limited, Pawzz Foundation, JP IT STAFFING LLC, Medius Technologies Private Limited.

        REJECT (Strictly skip these):
        - NGO, Fundraising, Social Media Marketing, Sales, Business Development, Campus Ambassador.
        - Roles that are purely non-technical or involve door-to-door activities.
        - "Software Development" roles that don't mention any modern tech stack.
        - Any company in the BLOCKLIST.

        ACCEPT:
        - Both Internships and Full-time Jobs that match the technical skills.
        - Roles that offer a "Job Offer Post-Internship" are highly preferred.

        Input JSON:
        ${JSON.stringify(limitedJobs)}

        Output Format (STRICT JSON):
        Return an array: [{ "id": "...", "title": "...", "company": "...", "applyLink": "...", "type": "...", "salary": "...", "jobOffer": "...", "relevanceReason": "..." }]
        - Use "relevanceReason" to briefly explain why it matches (e.g., "MERN Stack opportunity" or "AI/ML role").
        - If none match, return [].
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
                // Ensure all items have necessary fields
                return filtered.map(job => ({
                    ...job,
                    applyLink: job.applyLink || job.link || "",
                    type: job.type || "Internship/Job",
                    salary: job.salary || "Not Disclosed",
                    jobOffer: job.jobOffer || ""
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
