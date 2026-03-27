const cron = require('node-cron');
const { fetchJobs } = require('./scraper');
const { filterJobs } = require('./ai_filter');
const { sendEmail } = require('./email_sender');
const { filterSentJobs, saveSentJobs } = require('./storage');
const dotenv = require('dotenv');

dotenv.config();

const TECHNICAL_URLS = [
    'https://internshala.com/internships/work-from-home-computer-science-internships/',
    'https://internshala.com/internships/work-from-home-web-development-internships/',
    'https://internshala.com/internships/work-from-home-full-stack-development-internships/',
    'https://internshala.com/internships/work-from-home-python-django-internships/',
    'https://internshala.com/internships/work-from-home-data-science-internships/',
    'https://internshala.com/internships/work-from-home-machine-learning-internships/',
    'https://internshala.com/internships/work-from-home-javascript-development-internships/',
    'https://internshala.com/internships/node-js-development-internship/',
    'https://internshala.com/internships/software-development-internship/'
];

async function runJobSearch() {
    console.log(`[${new Date().toLocaleString()}] Starting job search...`);
    
    try {
        // Step 1: Fetch Latest Jobs from Multiple Categories
        const allJobs = await fetchJobs(TECHNICAL_URLS);
        console.log(`- Scraped ${allJobs.length} potential technical jobs.`);

        // Step 2: Handle Duplicates
        const freshJobs = filterSentJobs(allJobs);
        console.log(`- Found ${freshJobs.length} new jobs to process.`);

        if (freshJobs.length === 0) {
            console.log('No new jobs found. Skipping AI filtering and email.');
            return;
        }

        // Step 3: AI Filtering
        console.log('- Running AI relevance check...');
        const filteredJobs = await filterJobs(freshJobs);
        console.log(`- AI selected ${filteredJobs.length} relevant opportunities.`);

        // Step 4: Email Sending
        if (filteredJobs.length > 0) {
            await sendEmail(filteredJobs);
            console.log('- Sent email successfully.');
            
            // Mark as sent
            saveSentJobs(filteredJobs.map(job => job.id));
        } else {
            console.log('- No highly relevant jobs according to AI.');
        }

    } catch (error) {
        console.error('CRITICAL: System error in job search run:', error.message);
    }
    
    console.log(`[${new Date().toLocaleString()}] Cycle complete.\n`);
}

// Run system
(async () => {
    // Check if --single-run flag is present (useful for GitHub Actions)
    const isSingleRun = process.argv.includes('--single-run');

    if (isSingleRun) {
        console.log('--- Job Automation Service (SINGLE RUN MODE) ---');
        await runJobSearch();
        process.exit(0);
    } else {
        console.log('--- Job Automation System (CONTINUOUS MODE) ---');
        console.log(`Tracking URL: ${INTERNSHALA_URL}`);
        console.log('Frequency: Every 1 hour');
        
        // Run immediately once on start
        await runJobSearch().catch(err => console.error('Initial run failed:', err.message));

        // Schedule every 1 hour (0 minutes past every hour)
        cron.schedule('0 * * * *', () => {
            runJobSearch();
        });
    }
})();
