const puppeteer = require('puppeteer');
const { generateCoverLetter, generateAnswer } = require('./cover_letter');
const dotenv = require('dotenv');
dotenv.config();

const PROFILE = require('./profile.json');

const delay = (ms) => new Promise(res => setTimeout(res, ms));

// ─────────────────────────────────────────────────────────────────────────────
// MAIN ENTRY: Apply to a single Internshala job
// ─────────────────────────────────────────────────────────────────────────────
async function autoApply(job) {
    const { id, applyLink, title, company } = job;
    console.log(`\n🤖 Auto-applying: "${title}" @ ${company}`);
    console.log(`   Link: ${applyLink}`);

    const browser = await puppeteer.launch({
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu',
        ],
    });

    try {
        const page = await browser.newPage();
        await page.setUserAgent(
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
        );
        await page.setViewport({ width: 1280, height: 800 });

        // Step 1: Login
        console.log('  → Logging in to Internshala...');
        const loggedIn = await loginToInternshala(page);
        if (!loggedIn) throw new Error('Login failed — check INTERNSHALA_EMAIL / INTERNSHALA_PASSWORD');

        // Step 2: Generate cover letter via AI
        console.log('  → Generating cover letter...');
        const coverLetter = await generateCoverLetter(title, company);

        // Step 3: Open job page
        console.log('  → Opening job page...');
        await page.goto(applyLink, { waitUntil: 'networkidle2', timeout: 30000 });
        await delay(2000);

        // Step 4: Click Apply Now
        console.log('  → Clicking Apply Now...');
        const clicked = await clickApplyButton(page);
        if (!clicked) throw new Error('Apply button not found on page');
        await delay(2500);

        // Step 5: Fill the application form
        console.log('  → Filling application form...');
        await fillApplicationForm(page, coverLetter, title, company);
        await delay(1000);

        // Step 6: Submit
        console.log('  → Submitting application...');
        const submitted = await submitApplication(page);
        if (!submitted) throw new Error('Submit button not found');
        await delay(4000);

        // Step 7: Verify success — check for Internshala confirmation message
        const isSuccess = await page.evaluate(() => {
            const body = document.body.innerText.toLowerCase();
            return body.includes('application submitted') ||
                   body.includes('successfully applied') ||
                   body.includes('thank you for applying') ||
                   body.includes('your application has been') ||
                   document.querySelector('.application-submitted, .success-message, [class*="success"]') !== null;
        });

        if (!isSuccess) {
            // Check if form is still open (validation error / empty required fields)
            const formStillOpen = await page.evaluate(() => {
                return document.querySelector('#cover_letter, textarea') !== null &&
                       document.querySelector('.modal, .application-form') !== null;
            });
            if (formStillOpen) throw new Error('Form still open after submit — required fields may be empty');
        }

        console.log(`  ✅ Successfully applied to "${title}" @ ${company}`);
        return { success: true, title, company, applyLink };

    } catch (error) {
        console.error(`  ❌ Auto-apply failed: ${error.message}`);
        return { success: false, title, company, applyLink, error: error.message };
    } finally {
        await browser.close();
    }
}


// ─────────────────────────────────────────────────────────────────────────────
// LOGIN
// ─────────────────────────────────────────────────────────────────────────────
async function loginToInternshala(page) {
    try {
        // Strategy 1: Use saved cookies (bypasses IP detection)
        if (process.env.INTERNSHALA_COOKIES) {
            console.log('  → Using saved cookies...');
            try {
                const cookies = JSON.parse(process.env.INTERNSHALA_COOKIES);
                await page.goto('https://internshala.com', { waitUntil: 'networkidle2', timeout: 20000 });
                await page.setCookie(...cookies);
                await page.goto('https://internshala.com/student/dashboard', { waitUntil: 'networkidle2', timeout: 20000 });
                await delay(1500);
                const url = page.url();
                const isLoggedIn = !url.includes('/login');
                console.log(`  ${isLoggedIn ? '✅ Cookie login successful' : '❌ Cookies expired'}`);
                if (isLoggedIn) return true;
                console.log('  → Cookies expired, trying password login...');
            } catch (e) {
                console.warn('  ! Cookie login failed:', e.message);
            }
        }

        // Strategy 2: Password login
        console.log('  → Trying password login...');
        await page.goto('https://internshala.com/login/student', {
            waitUntil: 'networkidle2',
            timeout: 20000,
        });
        await delay(1500);

        const emailField = await page.$('#email, input[name="email"], input[type="email"]');
        if (!emailField) return false;
        await emailField.click({ clickCount: 3 });
        await emailField.type(process.env.INTERNSHALA_EMAIL, { delay: 60 });

        const passField = await page.$('#password, input[name="password"], input[type="password"]');
        if (!passField) return false;
        await passField.click({ clickCount: 3 });
        await passField.type(process.env.INTERNSHALA_PASSWORD, { delay: 60 });

        const loginBtn = await page.$('#login_submit, button[type="submit"], .login-btn');
        if (loginBtn) {
            await loginBtn.click();
        } else {
            await page.keyboard.press('Enter');
        }

        await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 }).catch(() => {});
        await delay(1500);

        const currentUrl = page.url();
        const isLoggedIn = !currentUrl.includes('/login');
        console.log(`  ${isLoggedIn ? '✅ Login successful' : '❌ Still on login page'}`);

        await page.screenshot({ path: 'login_debug.png', fullPage: false });
        console.log('  📸 Screenshot saved: login_debug.png');

        return isLoggedIn;

    } catch (e) {
        console.error('  Login error:', e.message);
        return false;
    }
}


// ─────────────────────────────────────────────────────────────────────────────
// CLICK APPLY BUTTON
// ─────────────────────────────────────────────────────────────────────────────
async function clickApplyButton(page) {
    const selectors = [
        '#easy_apply_btn',
        '.easy_apply_cta',
        'a.apply-btn',
        'button.apply-btn',
        '[id*="apply_btn"]',
        '[class*="apply_now"]',
        'a[href*="apply"]',
    ];

    for (const sel of selectors) {
        try {
            const btn = await page.$(sel);
            if (btn) {
                await btn.click();
                return true;
            }
        } catch (_) {}
    }

    // Last resort: find any visible button with "Apply" text
    try {
        const clicked = await page.evaluate(() => {
            const buttons = [...document.querySelectorAll('a, button')];
            const applyBtn = buttons.find(el =>
                el.textContent.toLowerCase().includes('apply now') ||
                el.textContent.toLowerCase().includes('easy apply')
            );
            if (applyBtn) { applyBtn.click(); return true; }
            return false;
        });
        return clicked;
    } catch (_) {
        return false;
    }
}


// ─────────────────────────────────────────────────────────────────────────────
// FILL APPLICATION FORM (cover letter + personal details + custom questions)
// ─────────────────────────────────────────────────────────────────────────────
async function fillApplicationForm(page, coverLetter, jobTitle, company) {

    // Step A: Radio buttons — select "Yes" wherever possible
    try {
        await page.evaluate(() => {
            document.querySelectorAll('input[type="radio"]').forEach(radio => {
                const label =
                    radio.closest('label') ||
                    document.querySelector(`label[for="${radio.id}"]`);
                const text = (label?.textContent || radio.value || '').toLowerCase();
                if (text.includes('yes') || radio.value === '1' || radio.value === 'true') {
                    radio.click();
                }
            });
        });
        console.log('     ✓ Radio buttons handled');
    } catch (_) {}

    // Step B: Personal detail input fields from profile.json
    const p = PROFILE;
    const edu = p.education;

    // Map: [selector patterns] → value to fill
    const inputFills = [
        // Name
        { selectors: ['input[name="name"]', 'input[id*="name"]', 'input[placeholder*="name" i]'], value: p.name },
        // Phone
        { selectors: ['input[name="phone"]', 'input[name="mobile"]', 'input[id*="phone"]', 'input[placeholder*="phone" i]', 'input[type="tel"]'], value: p.phone },
        // Email (usually pre-filled by Internshala, but just in case)
        { selectors: ['input[name="email"]', 'input[id*="email"]', 'input[type="email"]'], value: p.email },
        // College / University
        { selectors: ['input[name="college"]', 'input[name="university"]', 'input[id*="college"]', 'input[placeholder*="college" i]', 'input[placeholder*="university" i]'], value: edu.college },
        // Degree / Course
        { selectors: ['input[name="degree"]', 'input[name="course"]', 'input[id*="degree"]', 'input[placeholder*="degree" i]', 'input[placeholder*="course" i]'], value: edu.degree },
        // CGPA / GPA
        { selectors: ['input[name="cgpa"]', 'input[name="gpa"]', 'input[id*="cgpa"]', 'input[placeholder*="cgpa" i]', 'input[placeholder*="gpa" i]'], value: edu.cgpa },
        // Graduation year
        { selectors: ['input[name="graduation_year"]', 'input[name="grad_year"]', 'input[placeholder*="graduation" i]', 'input[placeholder*="passing" i]'], value: '2026' },
        // GitHub
        { selectors: ['input[name="github"]', 'input[id*="github"]', 'input[placeholder*="github" i]'], value: `https://${p.github}` },
        // Portfolio / Website
        { selectors: ['input[name="portfolio"]', 'input[name="website"]', 'input[id*="portfolio"]', 'input[placeholder*="portfolio" i]', 'input[placeholder*="website" i]'], value: `https://${p.portfolio}` },
        // LinkedIn
        { selectors: ['input[name="linkedin"]', 'input[id*="linkedin"]', 'input[placeholder*="linkedin" i]'], value: `https://${p.linkedin}` },
        // Availability (0 days = immediate)
        { selectors: ['#availability', 'input[name="availability"]', 'input[placeholder*="availab" i]'], value: '0' },
    ];

    for (const { selectors, value } of inputFills) {
        for (const sel of selectors) {
            try {
                const field = await page.$(sel);
                if (!field) continue;
                const tag  = await field.evaluate(el => el.tagName.toLowerCase());
                const type = await field.evaluate(el => el.type || '');
                if (tag !== 'input' || type === 'submit' || type === 'checkbox' || type === 'radio' || type === 'file') continue;
                const current = await field.evaluate(el => el.value.trim());
                if (current.length > 3) break; // already filled, skip
                await field.click({ clickCount: 3 });
                await field.evaluate(el => el.value = '');
                await field.type(value, { delay: 20 });
                await field.evaluate(el => {
                    el.dispatchEvent(new Event('input',  { bubbles: true }));
                    el.dispatchEvent(new Event('change', { bubbles: true }));
                    el.dispatchEvent(new Event('blur',   { bubbles: true }));
                });
                console.log(`     ✓ Filled [${sel}] → ${value.substring(0, 40)}`);
                break;
            } catch (_) {}
        }
    }

    // Step C: Cover letter textarea
    const coverLetterSelectors = [
        '#cover_letter',
        'textarea[name="cover_letter"]',
        'textarea[placeholder*="cover" i]',
        '.cover-letter-text textarea',
    ];
    let coverFilled = false;
    for (const sel of coverLetterSelectors) {
        try {
            const field = await page.$(sel);
            if (field) {
                await field.click({ clickCount: 3 });
                await field.evaluate(el => el.value = '');
                await field.type(coverLetter, { delay: 12 });
                console.log('     ✓ Cover letter filled');
                coverFilled = true;
                break;
            }
        } catch (_) {}
    }

    // Step D: All remaining textareas → AI answers
    try {
        const textareaData = await page.evaluate(() => {
            return [...document.querySelectorAll('textarea')].map((ta, i) => {
                let questionText = '';
                let el = ta.parentElement;
                for (let d = 0; d < 8 && el; d++) {
                    const candidates = el.querySelectorAll('label, p, strong, h4, h5, .question, div[class*="question"]');
                    for (const c of candidates) {
                        const t = c.textContent.trim();
                        if (t.length > 10 && t.length < 800 &&
                            !t.includes('Enter text') &&
                            !t.includes('paste the public link') &&
                            !t.includes('Google Drive')) {
                            questionText = t;
                            break;
                        }
                    }
                    if (questionText) break;
                    el = el.parentElement;
                }
                return { index: i, question: questionText, currentValue: ta.value.trim() };
            });
        });

        console.log(`     → Found ${textareaData.length} textarea(s)`);

        for (const { index, question, currentValue } of textareaData) {
            if (currentValue.length > 20) continue;

            let answer;
            const q = question.toLowerCase();
            if (!coverFilled || q.includes('why should you') || q.includes('cover letter') ||
                q.includes('relevant skill') || q.includes('excites you') || q.includes('hired for')) {
                answer = coverLetter;
                coverFilled = true;
            } else if (question) {
                console.log(`     → AI answering: "${question.substring(0, 70)}"`);
                answer = await generateAnswer(question, jobTitle, company);
            } else {
                answer = coverLetter;
            }

            await page.evaluate((idx, val) => {
                const ta = document.querySelectorAll('textarea')[idx];
                if (!ta) return;
                const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value')?.set;
                if (setter) setter.call(ta, val); else ta.value = val;
                ta.dispatchEvent(new Event('input',  { bubbles: true }));
                ta.dispatchEvent(new Event('change', { bubbles: true }));
                ta.dispatchEvent(new Event('blur',   { bubbles: true }));
            }, index, answer);

            console.log(`     ✓ Filled textarea ${index + 1}`);
            await delay(300);
        }
    } catch (e) {
        console.warn('     ! Custom question fill error:', e.message);
    }

    // Step E: Select dropdowns — pick first non-empty option
    try {
        await page.evaluate(() => {
            document.querySelectorAll('select').forEach(sel => {
                if (!sel.value && sel.options.length > 1) {
                    sel.value = sel.options[1].value;
                    sel.dispatchEvent(new Event('change', { bubbles: true }));
                }
            });
        });
    } catch (_) {}

    await delay(500);
}


// ─────────────────────────────────────────────────────────────────────────────
// SUBMIT APPLICATION
// ─────────────────────────────────────────────────────────────────────────────
async function submitApplication(page) {
    const selectors = [
        '#submit',
        'button[type="submit"]',
        '.submit-internship',
        '[class*="submit"]',
        'input[type="submit"]',
    ];

    for (const sel of selectors) {
        try {
            const btn = await page.$(sel);
            if (btn) {
                await btn.click();
                return true;
            }
        } catch (_) {}
    }

    // Last resort: find button with "Submit" text
    try {
        return await page.evaluate(() => {
            const buttons = [...document.querySelectorAll('button, input[type="submit"]')];
            const submitBtn = buttons.find(el =>
                el.textContent.toLowerCase().includes('submit') ||
                el.value?.toLowerCase().includes('submit')
            );
            if (submitBtn) { submitBtn.click(); return true; }
            return false;
        });
    } catch (_) {
        return false;
    }
}

module.exports = { autoApply };
