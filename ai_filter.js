const { GoogleGenerativeAI } = require("@google/generative-ai");
const dotenv = require("dotenv");

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function filterJobs(jobs) {
    if (jobs.length === 0) return [];

    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    const prompt = `
    You are an expert recruitment assistant.
    Given a list of job/internship opportunities from Internshala, filter them based on the candidate's profile:
    - Target Skills (MANDATORY): Full Stack Development, MERN Stack, Python, Node.js, React, Javascript, AI, ML, Data Science.
    - Role Type: Only software development, coding, and AI.
    - STRICT REJECTION: 
        1. Reject any job/internship from an NGO or Foundation.
        2. MANDATORY REJECT: Titles containing "Artist", "Design", "UI/UX", "Graphics", "Animator", "Video Editor".
        3. MANDATORY REJECT: Roles containing "Volunteering", "Fundraising", "Sales", "Marketing", "HR", "Content", "Management", "NGO".
        4. No exceptions for Artist/Designer roles even if they mention technology.
    - Quality Control: Only provide coding (Frontend/Backend/Fullstack) or Data Science/AI roles.

    Return an empty JSON array [] if no truly relevant software development/AI roles are found.
    Select top 5-10 technical jobs if available.

    Input List (JSON):
    ${JSON.stringify(jobs, null, 2)}

    Output Format:
    Return only a JSON array. Each object in the array should contain 'id', 'title', 'company', 'applyLink', and 'relevanceReason'.
    The 'relevanceReason' should be 1 sentence explaining which of the candidate's skills (MERN, React, AI, etc) match this role.
    Include ONLY the JSON without any markdown formatting or extra text.
    `;

    try {
        const result = await model.generateContent(prompt);
        const responseText = result.response.text();

        // Remove markdown wrapper if present
        const cleanedResponse = responseText.replace(/```json|```/g, "").trim();
        let filteredJobs = JSON.parse(cleanedResponse);

        // EXTRA PROTECTIVE PROGRAMMATIC FILTER
        const blacklist = ["artist", "design", "ngo", "volunteering", "fundraising", "sales", "marketing", "content", "environment"];
        filteredJobs = filteredJobs.filter(job => {
            const lowTitle = job.title.toLowerCase();
            const isBlacklisted = blacklist.some(word => lowTitle.includes(word));
            return !isBlacklisted;
        });

        return filteredJobs;
    } catch (error) {
        console.error("Error filtering jobs with AI (using fallback):", error.message);
        
        // APPLY LOCAL FILTER TO FALLBACK TOO
        const blacklist = ["artist", "design", "ngo", "volunteering", "fundraising", "sales", "marketing", "content", "environment"];
        return jobs.filter(job => {
            const lowTitle = job.title.toLowerCase();
            return !blacklist.some(word => lowTitle.includes(word));
        }).slice(0, 10); 
    }
}

module.exports = { filterJobs };
