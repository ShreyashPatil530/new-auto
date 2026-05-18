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

    const prompt = `You are a strict job relevance filter for a FRESHER developer applying to internships and entry-level jobs.

CANDIDATE PROFILE:
- Final-year B.Tech CSE student (TKIET, graduating May 2026, CGPA 7.75)
- Currently interning: MERN Stack Developer at MAYASABHAXR Technologies
- Full Stack Skills: React.js, Next.js, TypeScript, Node.js, Express.js, MongoDB, MySQL, Firebase, REST APIs, JWT, NestJS
- AI/ML Skills: Python, CrewAI, LangGraph, RAG, Groq LLaMA, OpenAI, Gemini, browser-use, Puppeteer, LangChain
- Data Science Skills: Pandas, NumPy, Scikit-learn, XGBoost, LightGBM, Power BI, SQL
- Projects: Kaggle Bronze Medal (ML), 2 live freelance client websites, AI agent systems

TASK: From the list below, return ONLY jobs that match the candidate's skills. Be VERY STRICT.

HARD REJECT — return [] for these:
- Sales, Business Development, Marketing, Social Media, Content, SEO/SEM
- HR, Recruiter, Operations, BPO, Data Entry, Customer Support
- Finance, Accounting, CA, Legal, Architecture, Civil, Mechanical
- Hotel, Hospitality, Fashion, Medical, Pharmacy
- Crypto Trader, Stock Analyst, Trading, Investment
- Influencer, Graphic Design (non-UI/UX), Video Editing
- Any role requiring 1+ years experience

ACCEPT only these:
- Full Stack / MERN / React / Next.js / Node.js / TypeScript Developer (fresher/intern)
- Frontend / Backend Developer (fresher/intern)
- Python / Django / Flask / FastAPI Developer (fresher/intern)
- AI Engineer / ML Engineer / AI Developer / LLM Developer (fresher/intern)
- Data Scientist / Data Analyst (fresher/intern)
- AI Agent Developer / Automation Developer (n8n, LangChain, CrewAI)
- Software Engineer / Software Developer (fresher/intern/trainee/junior)
- DevOps / Cloud Engineer (fresher/intern)
- Flutter / Android / Mobile Developer (fresher/intern)

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

    // Final Fallback: Skip this chunk — don't send unfiltered non-tech jobs
    console.log('  ⚠️ AI Engine stalled. Skipping chunk to avoid non-tech job spam.');
    return [];
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
