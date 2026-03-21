const axios = require('axios');
const cheerio = require('cheerio');

async function fetchJobs(urls) {
    const allJobs = [];
    const seenIds = new Set();

    for (const url of urls) {
        try {
            console.log(`- Fetching from: ${url}`);
            const response = await axios.get(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                }
            });

            const $ = cheerio.load(response.data);

            $('.individual_internship').each((index, element) => {
                const titleElement = $(element).find('.job-title-href');
                if (titleElement.length > 0) {
                    const title = titleElement.text().trim();
                    const relativeLink = titleElement.attr('href');
                    const applyLink = `https://internshala.com${relativeLink}`;
                    const company = $(element).find('.company-name').text().trim();
                    
                    // Extract Job ID
                    const jobId = relativeLink.split('/').pop();

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
            console.error(`Error fetching from ${url}:`, error.message);
        }
    }

    return allJobs;
}

module.exports = { fetchJobs };
