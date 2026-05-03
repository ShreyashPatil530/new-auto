// Run this ONCE locally to save Internshala login cookies
// node save_cookies.js
const puppeteer = require('puppeteer');
const fs = require('fs');
const dotenv = require('dotenv');
dotenv.config();

const delay = (ms) => new Promise(res => setTimeout(res, ms));

(async () => {
    console.log('🍪 Opening Internshala login (visible browser)...');

    const browser = await puppeteer.launch({
        headless: false, // visible so you can solve CAPTCHA if needed
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });

    await page.goto('https://internshala.com/login/student', {
        waitUntil: 'networkidle2',
        timeout: 30000,
    });

    // Auto-fill credentials if set in .env
    if (process.env.INTERNSHALA_EMAIL && process.env.INTERNSHALA_PASSWORD) {
        await delay(1500);
        const emailField = await page.$('#email, input[type="email"]');
        if (emailField) {
            await emailField.click({ clickCount: 3 });
            await emailField.type(process.env.INTERNSHALA_EMAIL, { delay: 60 });
        }
        const passField = await page.$('#password, input[type="password"]');
        if (passField) {
            await passField.click({ clickCount: 3 });
            await passField.type(process.env.INTERNSHALA_PASSWORD, { delay: 60 });
        }
        const loginBtn = await page.$('#login_submit, button[type="submit"]');
        if (loginBtn) await loginBtn.click();
    }

    console.log('⏳ Complete login manually if needed (CAPTCHA etc)...');
    console.log('   Waiting 30 seconds for you to finish login...');
    await delay(30000);

    const currentUrl = page.url();
    if (currentUrl.includes('/login')) {
        console.log('❌ Still on login page — login not completed');
        await browser.close();
        process.exit(1);
    }

    // Save cookies
    const cookies = await page.cookies();
    fs.writeFileSync('internshala_cookies.json', JSON.stringify(cookies, null, 2));
    console.log(`✅ Cookies saved! (${cookies.length} cookies)`);
    console.log('');
    console.log('📋 Next step: Copy this value into GitHub Secret "INTERNSHALA_COOKIES":');
    console.log('');
    console.log(JSON.stringify(cookies));

    await browser.close();
})();
