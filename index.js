const cron = require('node-cron');
const { fetchAllJobs } = require('./scraper');
const { filterJobs } = require('./ai_filter');
const { sendEmail } = require('./email_sender');
const { initStorage, filterSentJobs, saveSentJobs } = require('./storage');
const dotenv = require('dotenv');

dotenv.config();

// Internshala URLs (HTML scraping works fine here)
const TECHNICAL_URLS = [
    // ── WFH Internships ──────────────────────────────────────────────────────
    'https://internshala.com/internships/work-from-home-full-stack-development-internships/',
    'https://internshala.com/internships/work-from-home-web-development-internships/',
    'https://internshala.com/internships/work-from-home-reactjs-internships/',
    'https://internshala.com/internships/work-from-home-nodejs-internships/',
    'https://internshala.com/internships/work-from-home-javascript-development-internships/',
    'https://internshala.com/internships/work-from-home-python-django-internships/',
    'https://internshala.com/internships/work-from-home-machine-learning-internships/',
    'https://internshala.com/internships/work-from-home-artificial-intelligence-internships/',
    'https://internshala.com/internships/work-from-home-data-science-internships/',
    'https://internshala.com/internships/work-from-home-computer-science-internships/',

    // ── All-India Internships (Hybrid + On-site — previously MISSING) ─────────
    'https://internshala.com/internships/mern-stack-internships/',
    'https://internshala.com/internships/full-stack-development-internships/',
    'https://internshala.com/internships/web-development-internships/',
    'https://internshala.com/internships/reactjs-internships/',
    'https://internshala.com/internships/nodejs-internships/',
    'https://internshala.com/internships/next-js-internships/',
    'https://internshala.com/internships/python-internships/',
    'https://internshala.com/internships/artificial-intelligence-internships/',
    'https://internshala.com/internships/machine-learning-internships/',
    'https://internshala.com/internships/data-science-internships/',
    'https://internshala.com/internships/generative-ai-internships/',
    'https://internshala.com/internships/typescript-internships/',
    'https://internshala.com/internships/flutter-internships/',
    'https://internshala.com/internships/android-app-development-internships/',

    // ── Fresher Jobs ──────────────────────────────────────────────────────────
    'https://internshala.com/jobs/full-stack-development-jobs/',
    'https://internshala.com/jobs/web-development-jobs/',
    'https://internshala.com/jobs/reactjs-jobs/',
    'https://internshala.com/jobs/node-js-development-jobs/',
    'https://internshala.com/jobs/mern-stack-jobs/',
    'https://internshala.com/jobs/next-js-jobs/',
    'https://internshala.com/jobs/python-development-jobs/',
    'https://internshala.com/jobs/artificial-intelligence-jobs/',
    'https://internshala.com/jobs/machine-learning-jobs/',
    'https://internshala.com/jobs/data-science-jobs/',
    'https://internshala.com/jobs/generative-ai-jobs/',
    'https://internshala.com/jobs/typescript-jobs/',
];

async function runJobSearch() {
    const startTime = Date.now();
    console.log(`\n🚀 [${new Date().toLocaleString()}] INITIATING ADVANCED JOB SEARCH CYCLE`);
    console.log(`────────────────────────────────────────────────────────────`);

    let stats = { scraped: 0, new: 0, relevant: 0, failed: false };

    try {
        // Step 0: Connect to DB
        await initStorage();

        // Step 1: Fetch from all sources
        const allJobs = await fetchAllJobs({
            internshalaUrls: TECHNICAL_URLS,
        });
        stats.scraped = allJobs.length;

        // Step 2: Filter already-sent jobs
        const freshJobs = await filterSentJobs(allJobs);
        stats.new = freshJobs.length;

        if (freshJobs.length === 0) {
            console.log('✅ Cycle Skip: No new job postings detected since last run.');
            return stats;
        }

        // Step 3: AI Relevance Filter
        console.log(`- Analysis: Running AI on ${freshJobs.length} new opportunities...`);
        const filteredJobs = await filterJobs(freshJobs);
        stats.relevant = filteredJobs.length;

        // Step 4: Notify + Archive
        if (filteredJobs.length > 0) {
            console.log(`🎯 Found ${filteredJobs.length} HIGH-RELEVANCE matches!`);
            await sendEmail(filteredJobs);
            console.log('✅ Notifications: Email delivered.');
            await saveSentJobs(filteredJobs);
        } else {
            console.log('⚖️ No jobs met the AI relevance threshold this cycle.');
        }

    } catch (error) {
        console.error('❌ CRITICAL ENGINE FAILURE:', error.message);
        stats.failed = true;
        throw error;
    } finally {
        const duration = ((Date.now() - startTime) / 1000).toFixed(2);
        console.log(`────────────────────────────────────────────────────────────`);
        console.log(`🏁 CYCLE COMPLETE IN ${duration}s | Scraped: ${stats.scraped} | New: ${stats.new} | Relevant: ${stats.relevant}`);
        console.log(`────────────────────────────────────────────────────────────\n`);
    }

    return stats;
}

// System Entry
(async () => {
    const isSingleRun = process.argv.includes('--single-run');

    if (isSingleRun) {
        console.log('--- ADVANCED JOB SERVICE (CLOUD MODE) ---');
        await runJobSearch().catch(() => process.exit(1));
        process.exit(0);
    } else {
        console.log('--- ADVANCED JOB SERVICE (SERVER MODE) ---');
        console.log(`Active Internshala Categories: ${TECHNICAL_URLS.length}`);
        console.log('Interval: Hourly');

        await runJobSearch().catch(err => console.error('Initial cycle crashed:', err.message));
        cron.schedule('0 * * * *', runJobSearch);
    }
})();
