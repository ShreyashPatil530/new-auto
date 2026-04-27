const axios = require('axios');
const cheerio = require('cheerio');

async function fetchJobs(urls) {
    const allJobs = [];
    const seenIds = new Set();

    for (const url of urls) {
        try {
            console.log(`- Fetching from: ${url}`);
            const response = await axios.get(url, {
                timeout: 5000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                }
            });

            const $ = cheerio.load(response.data);

            $('.individual_internship, .individual_job').each((index, element) => {
                const titleElement = $(element).find('.job-title-href');
                const relativeLink = titleElement.attr('href');
                
                if (titleElement.length > 0 && relativeLink) {
                    const title = titleElement.text().trim() || "Internship";
                    const company = $(element).find('.company-name').first().text().trim() || "Unknown Company";
                    const applyLink = `https://internshala.com${relativeLink}`;
                    
                    // Extra Details
                    const isJob = $(element).hasClass('individual_job');
                    const type = isJob ? "Full-time Job" : "Internship";
                    
                    // Extract Salary/Stipend
                    let salary = $(element).find('.stipend, .salary').find('.item_body').first().text().trim();
                    salary = salary || "Not Disclosed";

                    // Extract Job Offer Details
                    const hasJobOffer = $(element).find('.job_offer_details').length > 0;
                    const jobOfferText = hasJobOffer ? "✅ Job Offer Post-Internship" : "";

                    // Robust Job ID Extraction
                    const jobId = relativeLink.split('/').filter(p => p).pop() || Math.random().toString(36).substr(5);

                    if (!seenIds.has(jobId)) {
                        seenIds.add(jobId);
                        allJobs.push({
                            id: jobId,
                            title,
                            company,
                            applyLink,
                            type,
                            salary,
                            jobOffer: jobOfferText
                        });
                    }
                }
            });
        } catch (error) {
            console.warn(`Warning: Could not fetch from ${url}. Error: ${error.message}`);
        }
    }

    return allJobs;
}

module.exports = { fetchJobs };
