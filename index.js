const cron = require('node-cron');
const { fetchJobs } = require('./scraper');
const { filterJobs } = require('./ai_filter');
const { sendEmail } = require('./email_sender');
const { filterSentJobs, saveSentJobs } = require('./storage');
const dotenv = require('dotenv');

dotenv.config();

const TECHNICAL_URLS = [
    'https://internshala.com/jobs/full-stack-development-jobs/',
    'https://internshala.com/jobs/web-development-jobs/',
    'https://internshala.com/jobs/node-js-development-jobs/',
    'https://internshala.com/jobs/python-django-jobs/',
    'https://internshala.com/jobs/machine-learning-jobs/',
    'https://internshala.com/jobs/data-science-jobs/',
    'https://internshala.com/jobs/artificial-intelligence-ai-jobs/',
    'https://internshala.com/jobs/software-development-jobs/',
    'https://internshala.com/jobs/java-development-jobs/',
    'https://internshala.com/jobs/computer-science-jobs/'
];

const COMPANY_BLOCKLIST = [
    'Symonis', 'Tripple One Solutions', 'CareerNest', 'Alphabt', 'CloudZapier', 
    'Basti Ki Pathshala Foundation', 'Emoolar Technology Private Limited', 
    'Pawzz Foundation', 'JP IT STAFFING LLC', 'Medius Technologies Private Limited'
];

async function runJobSearch() {
    console.log(`[${new Date().toLocaleString()}] Starting job search...`);
    
    try {
        // Step 1: Fetch Latest Jobs from Multiple Categories
        const allJobs = await fetchJobs(TECHNICAL_URLS);
        console.log(`- Scraped ${allJobs.length} potential technical jobs.`);

        // Step 2: Handle Duplicates & Blocklist
        let freshJobs = filterSentJobs(allJobs);
        
        // Apply Company Blocklist
        const beforeBlockCount = freshJobs.length;
        freshJobs = freshJobs.filter(job => 
            !COMPANY_BLOCKLIST.some(blocked => 
                job.company.toLowerCase().includes(blocked.toLowerCase())
            )
        );
        const blockedCount = beforeBlockCount - freshJobs.length;

        if (blockedCount > 0) {
            console.log(`- Removed ${blockedCount} jobs from blocked companies.`);
        }

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
        console.error('CRITICAL ERROR:', error.message);
        console.error(error.stack);
        throw error; // Re-throw so GitHub Actions actually catches the failure
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
        console.log(`Tracking ${TECHNICAL_URLS.length} categories.`);
        console.log('Frequency: Every 1 hour');
        
        // Run immediately once on start
        await runJobSearch().catch(err => console.error('Initial run failed:', err.message));

        // Schedule every 1 hour (0 minutes past every hour)
        cron.schedule('0 * * * *', () => {
            runJobSearch();
        });
    }
})();
