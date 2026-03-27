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

            $('.individual_internship').each((index, element) => {
                const titleElement = $(element).find('.job-title-href');
                const relativeLink = titleElement.attr('href');
                
                if (titleElement.length > 0 && relativeLink) {
                    const title = titleElement.text().trim() || "Internship";
                    const company = $(element).find('.company-name').first().text().trim() || "Unknown Company";
                    const applyLink = `https://internshala.com${relativeLink}`;
                    
                    // Robust Job ID Extraction
                    const jobId = relativeLink.split('/').filter(p => p).pop() || Math.random().toString(36).substr(5);

                    if (!seenIds.has(jobId)) {
                        seenIds.add(jobId);
                        allJobs.push({
                            id: jobId,
                            title,
                            company,
                            applyLink
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
