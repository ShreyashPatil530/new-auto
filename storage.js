const fs = require('fs');
const path = require('path');

const STORAGE_FILE = path.join(__dirname, 'sent_jobs.json');

function loadSentJobs() {
    if (!fs.existsSync(STORAGE_FILE)) {
        return [];
    }
    const data = fs.readFileSync(STORAGE_FILE, 'utf8');
    try {
        return JSON.parse(data);
    } catch (error) {
        console.error('Error parsing storage file:', error.message);
        return [];
    }
}

function saveSentJobs(jobIds) {
    const existingIds = loadSentJobs();
    const updatedIds = [...new Set([...existingIds, ...jobIds])];
    
    // Limit to last 500 jobs to avoid growing infinitely
    const trimmedIds = updatedIds.slice(-500);
    fs.writeFileSync(STORAGE_FILE, JSON.stringify(trimmedIds, null, 2));
}

function filterSentJobs(jobs) {
    const sentIds = loadSentJobs();
    return jobs.filter(job => !sentIds.includes(job.id));
}

module.exports = { saveSentJobs, filterSentJobs };
