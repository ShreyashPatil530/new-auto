const Groq = require('groq-sdk');
const dotenv = require('dotenv');
dotenv.config();

const PROFILE = require('./profile.json');
const groq = process.env.GROQ_API_KEY ? new Groq({ apiKey: process.env.GROQ_API_KEY }) : null;

// Detect job type: 'aiagent' | 'data' | 'fullstack'
function detectJobType(jobTitle = '') {
    const t = jobTitle.toLowerCase();
    const isAIAgent = ['ai agent', 'agentic', 'llm', 'langchain', 'langgraph', 'crewai',
        'generative ai', 'gen ai', 'genai', 'rag', 'openai', 'groq', 'gemini',
        'ai engineer', 'ai developer', 'ml engineer', 'nlp engineer',
        'prompt engineer', 'ai automation', 'ai intern'].some(k => t.includes(k));
    const isData = ['data scientist', 'data analyst', 'machine learning', 'business analyst',
        'data engineer', 'deep learning', 'power bi', 'tableau', 'analytics',
        'business intelligence'].some(k => t.includes(k));
    const isFullStack = ['full stack', 'fullstack', 'mern', 'react', 'node', 'next.js',
        'nextjs', 'frontend', 'backend', 'web developer', 'javascript', 'typescript',
        'software engineer', 'software developer'].some(k => t.includes(k));

    if (isAIAgent) return 'aiagent';
    if (isData && !isFullStack) return 'data';
    if (isFullStack && !isData) return 'fullstack';
    return 'fullstack'; // default
}

function getProfile(jobTitle) {
    const type = detectJobType(jobTitle);
    const p = type === 'aiagent' ? PROFILE.aiAgent
             : type === 'data'   ? PROFILE.dataScience
             : PROFILE.fullstack;
    const proj = p.projects.slice(0, 2).map(pr => `${pr.name} (${pr.tech}): ${pr.desc}`).join(' | ');
    return { type, summary: p.summary, skills: p.skills, projects: proj, certs: p.certifications.slice(0, 2).join(', ') };
}

async function generateCoverLetter(jobTitle, company) {
    const { type, summary, skills, projects } = getProfile(jobTitle);

    if (!groq) return defaultCoverLetter(jobTitle, company, type);

    const prompt = `Write a short, genuine cover letter for ${PROFILE.name} applying to "${jobTitle}" at "${company}".

Candidate Profile:
- ${PROFILE.education.degree}, ${PROFILE.education.college} (CGPA: ${PROFILE.education.cgpa}, graduating ${PROFILE.education.graduation})
- Current: ${PROFILE.experience.title} at ${PROFILE.experience.company} (${PROFILE.experience.duration})
- Skills: ${skills}
- Key Projects: ${projects}
- Portfolio: ${PROFILE.portfolio} | GitHub: ${PROFILE.github}

Rules:
- Under 120 words
- Sound human and enthusiastic, NOT robotic or templated
- Mention 2-3 skills most relevant to "${jobTitle}"
- Reference 1 specific project or achievement that fits this role
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
        console.log(`  ✅ Cover letter generated (${type} profile) for "${jobTitle}" at ${company}`);
        return text;
    } catch (e) {
        console.warn('  ! Cover letter AI failed, using default:', e.message);
        return defaultCoverLetter(jobTitle, company, type);
    }
}

function defaultCoverLetter(jobTitle, company, type) {
    if (type === 'aiagent') {
        return `I'm a final-year B.Tech CSE student specializing in AI agent development. I've built production-ready multi-agent systems using CrewAI and LangGraph (for resume tailoring pipelines), a RAG-powered PDF Q&A bot with vector embeddings, and browser-use AI agents for autonomous web tasks including CAPTCHA solving and faculty data scraping. I also built a full Internshala auto-apply system using Puppeteer + Groq LLaMA with AI-generated cover letters.

The ${jobTitle} role at ${company} perfectly matches my hands-on experience in LLM integrations, agentic workflows, and AI automation. Available to join immediately.`;
    }
    if (type === 'data') {
        return `I'm a final-year B.Tech CSE student at TKIET with strong expertise in Python, SQL, Machine Learning, and Power BI. I won a Bronze Medal on Kaggle (Road Accident Risk Prediction) achieving RMSE 0.0554 on 172k+ data points, and built production-ready dashboards analyzing 100,000+ transactions with 20–60% reduction in reporting time.

The ${jobTitle} role at ${company} is a perfect match for my skills in data analysis, feature engineering, and business intelligence. I'm passionate about turning raw data into actionable insights and available to join immediately.`;
    }
    return `I'm a final-year B.Tech CSE student currently interning as a MERN Stack Developer at MAYASABHAXR Technologies, where I build scalable full-stack applications using React.js, Next.js, TypeScript, Node.js, and MongoDB. I've delivered 20+ real-world projects including admin dashboards with JWT/RBAC authentication, a Store Rating Platform (NestJS + Prisma + PostgreSQL), and AI-integrated web apps.

The ${jobTitle} role at ${company} aligns perfectly with my hands-on experience. I bring strong skills in REST API integration, clean architecture, and Agile development. Available to join immediately.`;
}

async function generateAnswer(question, jobTitle, company) {
    const { type, skills, projects } = getProfile(jobTitle);

    if (!groq) return defaultAnswer(question, type);

    const prompt = `Answer this internship/job application question as ${PROFILE.name}, a fresher developer.

Question: "${question}"
Job: ${jobTitle} at ${company}

Candidate:
- Final-year B.Tech CSE, TKIET (CGPA 7.75, graduating May 2026)
- Currently: ${PROFILE.experience.title} at ${PROFILE.experience.company}
- Skills: ${skills}
- Projects: ${projects}
- GitHub: ${PROFILE.github} | Portfolio: ${PROFILE.portfolio}

Rules:
- 2-4 sentences only
- Sound genuine and specific, NOT robotic
- For yes/no questions, answer Yes with a brief technical reason
- Be specific to the question, reference real skills/projects when relevant

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
        return defaultAnswer(question, type);
    }
}

function defaultAnswer(question, type = 'fullstack') {
    const q = question.toLowerCase();

    if (q.includes('laptop') || q.includes('internet') || q.includes('device') || q.includes('system'))
        return 'Yes, I have a reliable laptop with stable high-speed internet. I have been working remotely in my current internship without any connectivity issues.';

    if (q.includes('available') || q.includes('join') || q.includes('start'))
        return 'Yes, I am available to join immediately with zero notice period.';

    if (q.includes('experience') || q.includes('background') || q.includes('tell us about')) {
        if (type === 'aiagent')
            return 'I am a final-year B.Tech CSE student specializing in AI agent development. I have built multi-agent systems using CrewAI and LangGraph, a RAG PDF Q&A bot with vector embeddings, browser-use AI agents for autonomous web tasks, and an Internshala auto-apply system using Puppeteer and Groq LLaMA.';
        if (type === 'data')
            return 'I am a final-year B.Tech CSE student with hands-on experience in Python, SQL, Machine Learning, and Power BI. I won a Kaggle Bronze Medal for Road Accident Risk Prediction (RMSE 0.0554, ranked 1,751 among 1000+ participants) and built dashboards processing 100,000+ transactions.';
        return 'I am a final-year B.Tech CSE student currently interning as a MERN Stack Developer at MAYASABHAXR Technologies, building scalable full-stack applications with React.js, TypeScript, Node.js, and MongoDB. I have delivered 20+ real-world projects including admin dashboards and AI-integrated platforms.';
    }

    if (q.includes('project') || q.includes('built') || q.includes('developed')) {
        if (type === 'aiagent')
            return 'I built a CrewAI + Groq LLaMA multi-agent resume pipeline, a LangGraph resume tailoring agent, a RAG-powered PDF Q&A bot, and browser-use agents for CAPTCHA solving and faculty data scraping. I also built a full Internshala auto-apply bot with AI-generated cover letters.';
        if (type === 'data')
            return 'I built an ensemble ML model (XGBoost + LightGBM) winning Kaggle Bronze Medal (RMSE 0.0554, ranked 1,751/1000+), a Blinkit Sales Dashboard analyzing 100,000+ transactions with 15+ Power BI KPIs, and a Diabetes Prediction model with 78%+ accuracy.';
        return 'I built a full-stack college management platform (MERN + TypeScript, live at college-fe.onrender.com), a Store Rating Platform (NestJS + Prisma + PostgreSQL), and a SEO-optimized Next.js tourism site. Currently building production features at MAYASABHAXR Technologies.';
    }

    if (q.includes('why') && (q.includes('hire') || q.includes('you') || q.includes('us'))) {
        if (type === 'aiagent')
            return 'I bring hands-on experience building production AI agent systems with CrewAI, LangGraph, RAG, and browser-use. I have shipped real working agentic pipelines, not just tutorials. I am a fast learner passionate about the LLM space and available to join immediately.';
        if (type === 'data')
            return 'I bring proven ML competition results (Kaggle Bronze Medal), strong Python and SQL skills, and real Power BI dashboards in production. I turn raw data into business decisions and I am available to join immediately.';
        return 'I bring hands-on MERN Stack internship experience, 20+ real-world projects, and strong skills in React.js, TypeScript, Node.js, and MongoDB. I write clean, production-ready code and I am available to join immediately.';
    }

    if (q.includes('llm') || q.includes('langchain') || q.includes('openai') || q.includes('ai agent') || q.includes('groq') || q.includes('rag'))
        return 'Yes, I have hands-on experience with LLM integrations using Groq LLaMA, OpenAI GPT-4, and Gemini. I built multi-agent systems with CrewAI and LangGraph, a RAG pipeline with vector embeddings, and production agentic workflows for real use cases.';

    if (q.includes('sql') || q.includes('database') || q.includes('query'))
        return 'Yes, I have strong SQL skills with HackerRank SQL Intermediate certification. I have worked with MySQL, PostgreSQL, and MongoDB building optimized schemas and complex aggregation queries across multiple projects.';

    if (q.includes('python'))
        return 'Yes, Python is my primary language. I use it for AI agent development (CrewAI, LangGraph, RAG), data analysis (Pandas, NumPy), machine learning (Scikit-learn, XGBoost), and backend APIs (Flask). I have a HackerRank Python certification and Kaggle Bronze Medal.';

    if (q.includes('react') || q.includes('frontend'))
        return 'Yes, I have hands-on React.js experience building admin dashboards and dynamic UIs with TypeScript, hooks, and REST API integration in my current internship at MAYASABHAXR Technologies.';

    if (q.includes('node') || q.includes('backend') || q.includes('express'))
        return 'Yes, I work with Node.js and Express.js daily in my current internship, building RESTful APIs, JWT authentication systems, and MongoDB-backed backends for production applications.';

    if (q.includes('hour') || q.includes('time') || q.includes('devote') || q.includes('10 am') || q.includes('10am') || q.includes('7 pm') || q.includes('7pm') || q.includes('shift'))
        return 'I can devote 9+ hours per day and working from 10 am to 7 pm suits me perfectly. I am fully available and committed to this internship as my primary focus right now.';

    if (q.includes('macbook') || q.includes('mac') || q.includes('laptop') || q.includes('system') || q.includes('device'))
        return 'I have a reliable Windows laptop with stable high-speed internet. I use VS Code and have been working remotely in my current internship without any issues.';

    if (q.includes('golang') || q.includes('go lang') || q.includes(' go ') || q.includes('fiber') || q.includes('gin '))
        return 'I have not worked with Golang professionally, but I have strong backend fundamentals with Node.js, Express.js, and REST APIs. I am a fast learner and can pick up Golang quickly given my experience with typed languages like TypeScript.';

    if (q.includes('java ') || q.includes('spring') || q.includes('kotlin'))
        return 'I have not worked with Java/Spring in production, but I have strong OOP fundamentals and hands-on experience with Node.js, TypeScript, and REST API design. I adapt to new backend stacks quickly.';

    if (q.includes('php') || q.includes('laravel') || q.includes('wordpress'))
        return 'I primarily work with the MERN Stack, but I have worked with HTML/CSS/JavaScript-based CMS projects. I can adapt to PHP-based stacks given my strong web development fundamentals.';

    if (q.includes('flutter') || q.includes('mobile') || q.includes('android') || q.includes('ios') || q.includes('react native'))
        return 'I have explored Flutter and React Native basics. My primary expertise is in full-stack web development (MERN Stack, Next.js), and I am comfortable learning mobile development frameworks quickly.';

    if (q.includes('currently') && (q.includes('work') || q.includes('intern') || q.includes('employ')))
        return 'I am currently interning as a MERN Stack Developer at MAYASABHAXR Technologies (Dec 2025 – Present), where I build scalable full-stack applications. I am a final-year B.Tech CSE student graduating in May 2026.';

    if (q.includes('salary') || q.includes('stipend') || q.includes('expect') || q.includes('ctc'))
        return 'I am open to the stipend/salary offered for this role. My primary focus is gaining hands-on experience and contributing to a real product. I am flexible and happy to discuss.';

    if (type === 'aiagent')
        return 'Yes, I can handle this effectively. I have built production AI agent systems with CrewAI, LangGraph, RAG, and browser-use automation, and I am comfortable with the full LLM stack from prompt engineering to deployment.';
    if (type === 'data')
        return 'Yes, I am confident I can handle this. I have hands-on experience with Python, SQL, ML modeling, and Power BI, and I am a fast learner who adapts quickly to new data challenges.';
    return 'Yes, I am confident I can handle this. I have hands-on MERN Stack internship experience, strong skills in React.js, Node.js, TypeScript, and MongoDB, and I deliver production-ready features. Available to join immediately.';
}

module.exports = { generateCoverLetter, generateAnswer };
