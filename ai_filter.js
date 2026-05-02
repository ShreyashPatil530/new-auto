const axios = require('axios');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const Groq = require('groq-sdk');
const dotenv = require('dotenv');

dotenv.config();

const genAI = process.env.GEMINI_API_KEY ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY) : null;
const groq = process.env.GROQ_API_KEY ? new Groq({ apiKey: process.env.GROQ_API_KEY }) : null;

/**
 * Filters jobs using AI to find the most relevant opportunities.
 * Returns jobs with an added `reason` field explaining why they matched.
 */
async function filterJobs(jobs) {
    if (!jobs || jobs.length === 0) return [];

    // Process in chunks of 40 so we don't miss jobs when hundreds come in
    const CHUNK_SIZE = 40;
    const allResults = [];

    for (let i = 0; i < jobs.length; i += CHUNK_SIZE) {
        const chunk = jobs.slice(i, i + CHUNK_SIZE);
        console.log(`- AI Analysis: Chunk ${Math.floor(i/CHUNK_SIZE)+1}/${Math.ceil(jobs.length/CHUNK_SIZE)} — evaluating ${chunk.length} jobs...`);
        const chunkResults = await filterChunk(chunk);
        allResults.push(...chunkResults);

        // Stop early if we already have enough good matches
        if (allResults.length >= 15) {
            console.log(`  ✋ Found ${allResults.length} matches — stopping early.`);
            break;
        }
    }

    return allResults;
}

async function filterChunk(limitedJobs) {
    // Minimal job data to reduce token usage
    const jobSummaries = limitedJobs.map(j => ({
        id: j.id,
        title: j.title,
        company: j.company,
        type: j.type,
        source: j.source || 'Unknown'
    }));

    const prompt = `You are a job relevance filter for a FRESHER Full-Stack/AI Developer (0 experience, just graduated).

CANDIDATE SKILLS: MERN Stack (MongoDB, Express, React, Node.js), Next.js, JavaScript, Python, AI/ML, REST APIs, AI Workflows (n8n, Zapier, Make), LLM integrations.

TASK: From the list below, return ONLY jobs suitable for a FRESHER (0 experience). Be strict on experience requirements.

HARD REJECT (any of these = reject):
- Requires 1+ year experience, 2+ years, "minimum 1 year", "at least 1 year"
- NGO, Social Work, Marketing, Sales, HR, Campus Ambassador, BPO, Data Entry
- Non-tech roles, customer support, operations

ACCEPT (fresher-friendly tech roles only):
- MERN Stack, React, Next.js, Node.js, Express, MongoDB
- Full Stack, Frontend, Backend (0 exp / fresher / entry-level / internship)
- Python, Django, FastAPI roles for freshers
- AI/ML Engineer, AI Developer, LLM, Generative AI (fresher/intern level)
- AI Workflow Automation (n8n, Zapier, Make, Langchain, AutoGPT)
- Software Developer Intern, Junior Developer, Trainee Developer
- DevOps, Cloud (fresher level), QA/Testing (fresher level)

INPUT JOBS:
${JSON.stringify(jobSummaries, null, 2)}

RESPOND WITH ONLY a valid JSON array of objects. No markdown, no explanation. Format:
[{"id": "job_id_here", "reason": "Short reason why this matches a fresher MERN/AI dev"}]

If no jobs are relevant, return: []`;

    // Strategy 1: Groq (Primary - Fast)
    if (groq) try {
        console.log('  - Using Groq (Llama-3.3)...');
        const completion = await groq.chat.completions.create({
            model: 'llama-3.3-70b-versatile',
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.1,
            max_tokens: 2000,
        });
        const content = completion.choices[0].message.content;
        const result = parseAIResponse(content, limitedJobs);
        if (result.length > 0) return result;
        console.warn('  ! Groq returned 0 results, trying Gemini...');
    } catch (error) {
        console.warn(`  ! Groq failed: ${error.message}. Switching to Gemini...`);
    }

    // Strategy 2: Gemini Fallback
    if (genAI) try {
        console.log('  - Using Gemini 1.5 Flash...');
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
        const result = await model.generateContent(prompt);
        const content = result.response.text();
        const parsed = parseAIResponse(content, limitedJobs);
        if (parsed.length > 0) return parsed;
        console.warn('  ! Gemini returned 0 results, trying Agent Router...');
    } catch (error) {
        console.warn(`  ! Gemini failed: ${error.message}. Switching to Agent Router...`);
    }

    // Strategy 3: Agent Router Fallback
    try {
        console.log('  - Using Agent Router (DeepSeek)...');
        const response = await axios({
            method: 'post',
            url: `${process.env.AGENT_ROUTER_BASE_URL}/chat/completions`,
            headers: {
                'Authorization': `Bearer ${process.env.AGENT_ROUTER_API_KEY}`,
                'Content-Type': 'application/json'
            },
            data: {
                model: 'deepseek-v3.1',
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.1,
            },
            timeout: 15000
        });
        const content = response.data.choices[0].message.content;
        return parseAIResponse(content, limitedJobs);
    } catch (error) {
        console.error(`  !!! All AI strategies failed: ${error.message}`);
    }

    // Final Fallback: Return top 5 jobs unfiltered for manual review
    console.log('  ⚠️ AI Engine stalled. Returning top 5 jobs for manual review.');
    return limitedJobs.slice(0, 5).map(j => ({
        ...j,
        reason: 'Manual review required - AI filter unavailable'
    }));
}


/**
 * Robust parser: handles AI returning JSON with or without markdown fences,
 * both [{id, reason}] format and legacy ["id1","id2"] format.
 */
function parseAIResponse(content, originalJobs) {
    if (!content) return [];

    // Strip markdown code fences if present
    const cleaned = content
        .replace(/```json\s*/gi, '')
        .replace(/```\s*/g, '')
        .trim();

    // Try to extract a JSON array from the response
    const arrayMatch = cleaned.match(/\[[\s\S]*\]/);
    if (!arrayMatch) {
        console.warn(`  ! AI response has no JSON array. Snippet: ${content.substring(0, 150)}`);
        return [];
    }

    try {
        const parsed = JSON.parse(arrayMatch[0]);

        if (!Array.isArray(parsed) || parsed.length === 0) return [];

        // Format 1: [{id, reason}] — preferred new format
        if (typeof parsed[0] === 'object' && parsed[0] !== null && 'id' in parsed[0]) {
            const idReasonMap = {};
            parsed.forEach(item => {
                if (item.id) idReasonMap[item.id] = item.reason || 'Relevant tech role for fresher';
            });
            return originalJobs
                .filter(job => idReasonMap[job.id])
                .map(job => ({ ...job, reason: idReasonMap[job.id] }));
        }

        // Format 2: ["id1", "id2"] — legacy format
        if (typeof parsed[0] === 'string') {
            return originalJobs
                .filter(job => parsed.includes(job.id))
                .map(job => ({ ...job, reason: 'Relevant tech role for fresher' }));
        }

        return [];
    } catch (e) {
        console.error('  ! JSON parse failed for AI response:', content.substring(0, 200));
        return [];
    }
}

module.exports = { filterJobs };
