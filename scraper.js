const axios = require('axios');
const cheerio = require('cheerio');

// 🚫 BLOCKLIST
const BLOCKED_COMPANIES = [
    'Symonis',
    'Across The Globe (ATG)',
    'Emoolar Technology Private Limited',
    'Neurasys',
    'Basti Ki Pathshala Foundation',
    'Jarurat Care',
    'Tripple One Solutions',
    'NayePankh Foundation',
    'Maxgen Technologies',
    'SKIDEV EDUTECH',
    'Meru Technosoft',
    'CareerNest',
    'She Can Foundation',
    'TSTEPS',
    'Global InfoCloud',
    'CipherSchools',
    'Ozibook Tech Solutions',
    'Medius Technologies',
    'CloudZapier',
    'Primetrade.ai',
    'International Institute Of SDGs',
    'DeepThought CultureTech',
];

const delay = (ms) => new Promise(res => setTimeout(res, ms));

function isBlocked(company = '') {
    return BLOCKED_COMPANIES.some(b => company.toLowerCase().includes(b.toLowerCase()));
}

// ─────────────────────────────────────────────────────────────────────────────
// SOURCE 1: INTERNSHALA (HTML scraping — works perfectly)
// ─────────────────────────────────────────────────────────────────────────────
async function scrapeInternshalaPage(url, type) {
    const response = await axios.get(url, {
        timeout: 15000,
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-IN,en;q=0.9',
        }
    });

    const $ = cheerio.load(response.data);
    const pageJobs = [];

    $('.individual_internship').each((_, element) => {
        const titleElement = $(element).find('.job-title-href');
        const relativeLink = titleElement.attr('href');
        const company = $(element).find('.company-name').first().text().trim() || 'Unknown Company';

        if (!titleElement.length || !relativeLink || isBlocked(company)) return;

        const title = titleElement.text().trim() || 'Internship';
        const applyLink = `https://internshala.com${relativeLink}`;
        let stipend = $(element).find('.stipend').text().trim();
        if (!stipend) stipend = $(element).find('.desktop').text().trim() || 'Competitive';
        const location = $(element).find('.location_link').text().trim()
            || $(element).find('.locations').text().trim()
            || 'Work From Home';
        const duration = $(element).find('.status-container').next().text().replace('Duration', '').trim() || 'N/A';
        const startDate = $(element).find('.start_date_container').find('.item_body').text().trim() || 'Immediate';
        const jobId = relativeLink.split('/').filter(p => p).pop() || Math.random().toString(36).substr(5);

        pageJobs.push({
            id: `internshala-${jobId}`,
            title,
            company,
            applyLink,
            stipend,
            location,
            duration,
            startDate,
            type,
            source: 'Internshala',
            sourceUrl: url
        });
    });

    return pageJobs;
}

async function fetchJobs(urls) {
    console.log(`- Scraping ${urls.length} Internshala categories (page 1 + 2) in parallel...`);

    const promises = urls.map(async (baseUrl) => {
        const type = baseUrl.includes('/jobs/') ? 'Fresher Job' : 'Internship';
        const slug = baseUrl.split('/').filter(Boolean).pop();
        try {
            // Fetch page 1 and page 2 in parallel for each category
            const [page1, page2] = await Promise.all([
                scrapeInternshalaPage(baseUrl, type).catch(() => []),
                scrapeInternshalaPage(`${baseUrl}?page=2`, type).catch(() => []),
            ]);
            const combined = [...page1, ...page2];
            console.log(`  ✅ Internshala [${slug}]: ${combined.length} (p1:${page1.length} p2:${page2.length})`);
            return combined;
        } catch (error) {
            console.warn(`  [!] Internshala failed for ${slug}: ${error.message}`);
            return [];
        }
    });

    const results = await Promise.all(promises);
    return results.flat();
}


// ─────────────────────────────────────────────────────────────────────────────
// SOURCE 2: REMOTIVE API — Free, no auth required
// https://remotive.com/api/remote-jobs
// ─────────────────────────────────────────────────────────────────────────────
// Dev-relevant keywords for client-side filtering
const DEV_KEYWORDS = [
    'software', 'developer', 'engineer', 'frontend', 'backend', 'full stack', 'fullstack',
    'react', 'next', 'next.js', 'nextjs', 'node', 'express', 'mern', 'mongodb',
    'python', 'django', 'flask', 'fastapi',
    'javascript', 'typescript', 'java', 'devops', 'cloud', 'aws', 'gcp', 'azure',
    'data science', 'data analyst', 'machine learning', 'deep learning',
    'artificial intelligence', 'ai ', 'ml ', 'llm', 'generative', 'langchain',
    'ai agent', 'agentic', 'rag', 'vector', 'openai', 'gemini', 'groq',
    'n8n', 'workflow automation', 'zapier', 'make.com', 'automation',
    'flutter', 'android', 'ios', 'mobile', 'app development',
    'api', 'web', 'intern', 'fresher', 'trainee', 'junior', 'entry level'
];

function isDevRole(title = '') {
    const lower = title.toLowerCase();
    return DEV_KEYWORDS.some(kw => lower.includes(kw));
}

async function fetchRemotiveJobs() {
    const categories = ['software-dev', 'data', 'devops-sysadmin', 'product'];
    console.log(`- Remotive API: Fetching jobs...`);
    const allJobs = [];

    for (const category of categories) {
        try {
            const url = `https://remotive.com/api/remote-jobs?category=${category}&limit=30`;
            const response = await axios.get(url, {
                timeout: 12000,
                headers: { 'Accept': 'application/json', 'User-Agent': 'JobBot/1.0' }
            });

            const jobs = response.data?.jobs || [];
            jobs.forEach(job => {
                if (!job.title || !job.url || isBlocked(job.company_name)) return;
                if (!isDevRole(job.title)) return;
                const posted = new Date(job.publication_date);
                const ageInDays = (Date.now() - posted.getTime()) / (1000 * 60 * 60 * 24);
                if (ageInDays > 30) return;

                allJobs.push({
                    id: `remotive-${job.id}`,
                    title: job.title,
                    company: job.company_name || 'Remote Company',
                    applyLink: job.url,
                    stipend: job.salary || 'Competitive',
                    location: job.candidate_required_location || 'Remote / Worldwide',
                    duration: 'Full-time',
                    startDate: posted.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
                    type: 'Remote Job',
                    source: 'Remotive',
                    sourceUrl: url
                });
            });
        } catch (e) {
            console.warn(`  [!] Remotive "${category}" failed: ${e.message}`);
        }
    }

    console.log(`  ✅ Remotive: ${allJobs.length} jobs`);
    return allJobs;
}


// ─────────────────────────────────────────────────────────────────────────────
// SOURCE 3: JOBICY API — Free, no auth required
// https://jobicy.com/api/v2/remote-jobs
// ─────────────────────────────────────────────────────────────────────────────
async function fetchJobicyJobs() {
    console.log(`- Jobicy API: Fetching jobs...`);
    try {
        const url = `https://jobicy.com/api/v2/remote-jobs?count=50`;
        const response = await axios.get(url, {
            timeout: 12000,
            headers: { 'Accept': 'application/json', 'User-Agent': 'JobBot/1.0' }
        });

        const jobs = response.data?.jobs || [];
        const allJobs = [];

        jobs.forEach(job => {
            if (!job.jobTitle || !job.url) return;
            if (isBlocked(job.companyName || '')) return;
            if (!isDevRole(job.jobTitle)) return;

            const posted = job.pubDate ? new Date(job.pubDate) : new Date();
            const ageInDays = (Date.now() - posted.getTime()) / (1000 * 60 * 60 * 24);
            if (ageInDays > 30) return;

            allJobs.push({
                id: `jobicy-${job.id}`,
                title: job.jobTitle,
                company: job.companyName || 'Remote Company',
                applyLink: job.url,
                stipend: job.annualSalaryMin
                    ? `$${Math.round(job.annualSalaryMin / 1000)}k–$${Math.round(job.annualSalaryMax / 1000)}k/yr`
                    : 'Competitive',
                location: job.jobGeo || 'Remote / Worldwide',
                duration: 'Full-time',
                startDate: posted.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
                type: 'Remote Job',
                source: 'Jobicy',
                sourceUrl: url
            });
        });

        console.log(`  ✅ Jobicy: ${allJobs.length} jobs`);
        return allJobs;
    } catch (e) {
        console.warn(`  [!] Jobicy failed: ${e.message}`);
        return [];
    }
}


// ─────────────────────────────────────────────────────────────────────────────
// SOURCE 4: WE WORK REMOTELY RSS — Free, no auth required
// https://weworkremotely.com/remote-jobs.rss
// ─────────────────────────────────────────────────────────────────────────────
async function fetchWWRJobs() {
    const feeds = [
        'https://weworkremotely.com/categories/remote-programming-jobs.rss',
        'https://weworkremotely.com/categories/remote-devops-sysadmin-jobs.rss',
        'https://weworkremotely.com/categories/remote-data-science-jobs.rss',
    ];
    console.log(`- We Work Remotely RSS: Fetching...`);
    const allJobs = [];
    const seen = new Set();

    for (const feedUrl of feeds) {
        try {
            const response = await axios.get(feedUrl, {
                timeout: 12000,
                maxRedirects: 10,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (compatible; JobBot/1.0)',
                    'Accept': 'application/rss+xml, application/xml, text/xml, */*',
                }
            });

            const $ = cheerio.load(response.data, { xmlMode: true });

            $('item').each((_, item) => {
                const rawTitle = $(item).find('title').first().text().trim();
                if (!rawTitle || rawTitle.toLowerCase() === 'featured') return;
                const cleanTitle = rawTitle.replace(/^\[.*?\]\s*/, '');
                const colonIdx = cleanTitle.indexOf(': ');
                const company = colonIdx > -1 ? cleanTitle.substring(0, colonIdx).trim() : 'WWR Company';
                const title = colonIdx > -1 ? cleanTitle.substring(colonIdx + 2).trim() : cleanTitle;

                const link = $(item).find('link').next().text().trim() || $(item).find('guid').text().trim();
                const region = $(item).find('region').text().trim() || 'Worldwide';
                const pubDate = $(item).find('pubDate').text().trim();

                if (!title || !link || isBlocked(company) || seen.has(link)) return;
                seen.add(link);

                const posted = pubDate ? new Date(pubDate) : new Date();
                const ageInDays = (Date.now() - posted.getTime()) / (1000 * 60 * 60 * 24);
                if (ageInDays > 30) return;

                const idMatch = link.match(/\/(\d+)\//);
                const jobId = idMatch ? idMatch[1] : Buffer.from(link).toString('base64').substr(0, 12);

                allJobs.push({
                    id: `wwr-${jobId}`,
                    title,
                    company,
                    applyLink: link.startsWith('http') ? link : `https://weworkremotely.com${link}`,
                    stipend: 'Competitive',
                    location: region,
                    duration: 'Full-time',
                    startDate: posted.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
                    type: 'Remote Job',
                    source: 'WeWorkRemotely',
                    sourceUrl: feedUrl
                });
            });
        } catch (e) {
            console.warn(`  [!] WeWorkRemotely RSS failed: ${e.message}`);
        }
    }

    console.log(`  ✅ We Work Remotely: ${allJobs.length} jobs`);
    return allJobs;
}


// ─────────────────────────────────────────────────────────────────────────────
// SOURCE 6: ARBEITNOW API — Free, no auth, good tech job coverage
// https://arbeitnow.com/api/job-board-api
// ─────────────────────────────────────────────────────────────────────────────
async function fetchArbeitnowJobs() {
    console.log(`- Arbeitnow API: Fetching jobs...`);
    try {
        const url = `https://arbeitnow.com/api/job-board-api`;
        const response = await axios.get(url, {
            timeout: 12000,
            headers: { 'Accept': 'application/json', 'User-Agent': 'JobBot/1.0' }
        });

        const rawJobs = response.data?.data || [];
        const seen = new Set();
        const allJobs = [];

        rawJobs.forEach(job => {
            if (!job.title || !job.url || seen.has(job.slug)) return;
            if (isBlocked(job.company_name || '')) return;
            if (!isDevRole(job.title)) return;
            seen.add(job.slug);

            const posted = job.created_at ? new Date(job.created_at * 1000) : new Date();
            const ageInDays = (Date.now() - posted.getTime()) / (1000 * 60 * 60 * 24);
            if (ageInDays > 30) return;

            allJobs.push({
                id: `arbeitnow-${job.slug}`,
                title: job.title,
                company: job.company_name || 'Tech Company',
                applyLink: job.url,
                stipend: 'Competitive',
                location: job.location || (job.remote ? 'Remote' : 'On-site'),
                duration: 'Full-time',
                startDate: posted.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
                type: 'Remote Job',
                source: 'Arbeitnow',
                sourceUrl: url
            });
        });

        console.log(`  ✅ Arbeitnow: ${allJobs.length} jobs`);
        return allJobs;
    } catch (e) {
        console.warn(`  [!] Arbeitnow failed: ${e.message}`);
        return [];
    }
}


// ─────────────────────────────────────────────────────────────────────────────
// SOURCE 5: REMOTEOK — Free, no auth required (keeping as bonus)
// ─────────────────────────────────────────────────────────────────────────────
async function fetchRemoteOKJobs(tags = ['javascript', 'python', 'react', 'node', 'full-stack']) {
    const allJobs = [];
    const seen = new Set();
    console.log(`- RemoteOK API: Fetching jobs...`);

    for (const tag of tags) {
        try {
            const url = `https://remoteok.com/api?tag=${encodeURIComponent(tag)}`;
            const response = await axios.get(url, {
                timeout: 10000,
                headers: { 'User-Agent': 'Mozilla/5.0 (compatible; JobBot/1.0)', 'Accept': 'application/json' }
            });

            const rawJobs = Array.isArray(response.data) ? response.data.slice(1) : [];
            rawJobs.forEach(job => {
                if (!job.position || !job.url || seen.has(job.id)) return;
                if (isBlocked(job.company || '')) return;
                seen.add(job.id);

                const posted = job.date ? new Date(job.date) : new Date();
                const ageInDays = (Date.now() - posted.getTime()) / (1000 * 60 * 60 * 24);
                if (ageInDays > 30) return;

                const salary = (job.salary_min && job.salary_max)
                    ? `$${Math.round(job.salary_min / 1000)}k–$${Math.round(job.salary_max / 1000)}k/yr`
                    : (job.salary || 'Competitive');

                allJobs.push({
                    id: `remoteok-${job.id || job.slug}`,
                    title: job.position,
                    company: job.company || 'Remote Company',
                    applyLink: job.url.startsWith('http') ? job.url : `https://remoteok.com${job.url}`,
                    stipend: salary,
                    location: 'Remote / Worldwide',
                    duration: 'Full-time',
                    startDate: posted.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
                    type: 'Remote Job',
                    source: 'RemoteOK',
                    sourceUrl: url
                });
            });

            await delay(400);
        } catch (e) {
            console.warn(`  [!] RemoteOK "${tag}" failed: ${e.message}`);
        }
    }

    console.log(`  ✅ RemoteOK: ${allJobs.length} jobs`);
    return allJobs;
}


// ─────────────────────────────────────────────────────────────────────────────
// SOURCE 7: INDEED RSS — India fresher tech jobs (last 1 day)
// ─────────────────────────────────────────────────────────────────────────────
async function fetchIndeedJobs() {
    const queries = [
        'fresher+full+stack+developer',
        'fresher+react+developer',
        'fresher+python+developer',
        'fresher+nodejs+developer',
        'fresher+mern+stack',
        'junior+software+developer+india',
        'fresher+AI+developer',
    ];

    console.log(`- Indeed RSS: Fetching fresher jobs...`);
    const allJobs = [];
    const seen = new Set();

    for (const q of queries) {
        try {
            const url = `https://in.indeed.com/rss?q=${q}&l=India&sort=date&fromage=1`;
            const response = await axios.get(url, {
                timeout: 12000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
                    'Accept': 'application/rss+xml, application/xml, text/xml, */*',
                }
            });

            const $ = cheerio.load(response.data, { xmlMode: true });

            $('item').each((_, item) => {
                const title = $(item).find('title').first().text().trim();
                const link  = $(item).find('link').next().text().trim() || $(item).find('link').text().trim();
                const company = $(item).find('source').text().trim() || 'Company on Indeed';
                const pubDate = $(item).find('pubDate').text().trim();
                const location = $(item).find('location').text().trim() || 'India';
                const guid = $(item).find('guid').text().trim();

                if (!title || !link || seen.has(guid || link)) return;
                if (isBlocked(company)) return;
                if (!isDevRole(title)) return;
                seen.add(guid || link);

                const posted = pubDate ? new Date(pubDate) : new Date();

                allJobs.push({
                    id: `indeed-${Buffer.from(guid || link).toString('base64').substr(0, 16)}`,
                    title,
                    company,
                    applyLink: link,
                    stipend: 'As per industry',
                    location,
                    duration: 'Full-time',
                    startDate: posted.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
                    type: 'Fresher Job',
                    source: 'Indeed',
                    sourceUrl: url
                });
            });

            await delay(300);
        } catch (e) {
            console.warn(`  [!] Indeed RSS "${q}" failed: ${e.message}`);
        }
    }

    console.log(`  ✅ Indeed: ${allJobs.length} jobs`);
    return allJobs;
}


// ─────────────────────────────────────────────────────────────────────────────
// MASTER AGGREGATOR
// ─────────────────────────────────────────────────────────────────────────────
async function fetchAllJobs(config) {
    const { internshalaUrls = [] } = config;
    console.log(`\n- Starting multi-source job fetch...`);

    const [
        internshalaJobs,
        remotiveJobs,
        jobicyJobs,
        wwrJobs,
        remoteOKJobs,
        arbeitnowJobs,
    ] = await Promise.all([
        internshalaUrls.length > 0 ? fetchJobs(internshalaUrls) : Promise.resolve([]),
        fetchRemotiveJobs(),
        fetchJobicyJobs(),
        fetchWWRJobs(),
        fetchRemoteOKJobs(),
        fetchArbeitnowJobs(),
    ]);

    const allJobs = [
        ...internshalaJobs,
        ...remotiveJobs,
        ...jobicyJobs,
        ...wwrJobs,
        ...remoteOKJobs,
        ...arbeitnowJobs,
    ];

    // Deduplicate by ID
    const uniqueMap = new Map();
    allJobs.forEach(job => {
        const key = job.id || `${job.company}-${job.title}`.toLowerCase().replace(/\s+/g, '-');
        if (!uniqueMap.has(key)) uniqueMap.set(key, job);
    });

    // ── Round-robin interleave by source ──────────────────────────────────────
    // Groups jobs by source, then picks one from each source in rotation.
    // This ensures AI sees a MIX of Internshala + remote jobs, not just Internshala.
    const grouped = {};
    Array.from(uniqueMap.values()).forEach(job => {
        const src = job.source || 'Unknown';
        if (!grouped[src]) grouped[src] = [];
        grouped[src].push(job);
    });

    const sources = Object.keys(grouped);
    const interleaved = [];
    let remaining = true;
    let i = 0;
    while (remaining) {
        remaining = false;
        for (const src of sources) {
            if (grouped[src][i]) {
                interleaved.push(grouped[src][i]);
                remaining = true;
            }
        }
        i++;
    }

    const uniqueJobs = interleaved;

    console.log(`\n📊 Source Breakdown:`);
    console.log(`   Internshala      : ${internshalaJobs.length}`);
    console.log(`   Remotive         : ${remotiveJobs.length}`);
    console.log(`   Jobicy           : ${jobicyJobs.length}`);
    console.log(`   WeWorkRemotely   : ${wwrJobs.length}`);
    console.log(`   RemoteOK         : ${remoteOKJobs.length}`);
    console.log(`   Arbeitnow        : ${arbeitnowJobs.length}`);
    console.log(`   ─────────────────────────`);
    console.log(`   Total Unique     : ${uniqueJobs.length}`);

    return uniqueJobs;
}

module.exports = { fetchJobs, fetchRemotiveJobs, fetchJobicyJobs, fetchWWRJobs, fetchRemoteOKJobs, fetchArbeitnowJobs, fetchAllJobs };
