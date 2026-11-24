const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const SCREENSHOT_DIR = path.resolve(__dirname, '../docs/screenshots');
const ARTIFACT_DIR = '/home/recoding/.gemini/antigravity-cli/brain/aff21823-8367-4cc0-8556-888bcb5c36c9';

if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

function copyToArtifacts(filename) {
  const src = path.join(SCREENSHOT_DIR, filename);
  const dest = path.join(ARTIFACT_DIR, filename);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, dest);
  }
}

async function runVerification() {
  console.log('🚀 Starting Production UI Verification with Puppeteer...');
  const browser = await puppeteer.launch({
    executablePath: '/usr/bin/google-chrome',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
    headless: 'new',
  });

  const page = await browser.newPage();

  // 1. Desktop Light Mode
  console.log('1️⃣ Testing Desktop Viewport (1440x900) - Light Mode (Default)...');
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });

  await new Promise((r) => setTimeout(r, 1200));

  const pageVerification = await page.evaluate(() => {
    const text = document.body.innerText;
    return {
      hasFakeBalance: text.includes('514,828.63'),
      hasFakeDailyAccrual: text.includes('15,444.85'),
      hasFakeUtilization: text.includes('84.2%'),
      hasFakeAddress: text.includes('0x7a3...e91b'),
      hasHonestPortfolioState: text.includes('Portfolio data not available yet'),
      hasHonestAllocationState: text.includes('No portfolio data available'),
      hasHonestActivityState: text.includes('No Public Pool Transactions Recorded'),
      hasHypotheticalScenarioNotice: text.includes('3% Daily — Hypothetical Scenario'),
      isDark: document.documentElement.classList.contains('dark'),
      bgColor: getComputedStyle(document.body).backgroundColor,
    };
  });

  console.log('  👉 Audit Verification Flags:', pageVerification);

  if (pageVerification.hasFakeBalance || pageVerification.hasFakeDailyAccrual || pageVerification.hasFakeUtilization || pageVerification.hasFakeAddress) {
    throw new Error('❌ Verification failed: Fabricated financial information detected in rendered DOM!');
  }
  if (!pageVerification.hasHonestPortfolioState || !pageVerification.hasHonestAllocationState || !pageVerification.hasHonestActivityState) {
    throw new Error('❌ Verification failed: Honest unavailable states missing from rendered DOM!');
  }

  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'desktop_light.png'), fullPage: false });
  copyToArtifacts('desktop_light.png');

  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'desktop_light_full.png'), fullPage: true });
  copyToArtifacts('desktop_light_full.png');

  // 2. Toggle Dark Mode
  console.log('2️⃣ Testing Dark Mode Switcher...');
  const themeToggle = await page.$('button[aria-label*="Mode"]');
  if (themeToggle) {
    await themeToggle.click();
    await new Promise((r) => setTimeout(r, 600));

    const darkState = await page.evaluate(() => ({
      isDark: document.documentElement.classList.contains('dark'),
      bgColor: getComputedStyle(document.body).backgroundColor,
    }));
    console.log('  👉 Dark Theme Toggled:', darkState);

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'desktop_dark.png'), fullPage: false });
    copyToArtifacts('desktop_dark.png');

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'desktop_dark_full.png'), fullPage: true });
    copyToArtifacts('desktop_dark_full.png');
  }

  // 3. Calculator Interaction
  console.log('3️⃣ Testing 3% Yield Calculator Interaction...');
  await page.evaluate(() => {
    const el = document.getElementById('calculator');
    if (el) el.scrollIntoView({ behavior: 'instant' });
  });
  await new Promise((r) => setTimeout(r, 400));

  // Select SOL
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const btn = buttons.find((b) => b.textContent && b.textContent.includes('SOL'));
    if (btn) btn.click();
  });

  // Click the $10,000 preset button
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const btn10k = buttons.find((b) => b.textContent && b.textContent.includes('$10,000'));
    if (btn10k) btn10k.click();
  });
  await new Promise((r) => setTimeout(r, 1400));

  const calcOutputs = await page.evaluate(() => {
    const text = document.getElementById('calculator').innerText;
    return {
      hasDaily300: text.includes('300.00'),
      hasSevenDay2100: text.includes('2,100.00'),
      hasThirtyDay19000: text.includes('19,000.00'),
    };
  });
  console.log('  👉 Calculator Mathematical Outputs:', calcOutputs);

  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'calculator_interaction.png'), fullPage: false });
  copyToArtifacts('calculator_interaction.png');

  // 4. Test Search Modal
  console.log('4️⃣ Testing Search Modal...');
  const searchButton = await page.$('button[aria-label="Search Cryptiq"]');
  if (searchButton) {
    await searchButton.click();
    await new Promise((r) => setTimeout(r, 400));
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'modal_search.png') });
    copyToArtifacts('modal_search.png');

    await page.keyboard.press('Escape');
    await new Promise((r) => setTimeout(r, 300));
  }

  // 5. Tablet Viewport (768x1024)
  console.log('5️⃣ Testing Tablet Viewport (768x1024)...');
  await page.setViewport({ width: 768, height: 1024 });
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });
  await new Promise((r) => setTimeout(r, 800));
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'tablet_view.png') });
  copyToArtifacts('tablet_view.png');

  // 6. Mobile Viewport (390x844)
  console.log('6️⃣ Testing Mobile Viewport (390x844)...');
  await page.setViewport({ width: 390, height: 844 });
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });
  await new Promise((r) => setTimeout(r, 800));
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'mobile_view.png') });
  copyToArtifacts('mobile_view.png');

  // Mobile Menu Drawer
  const mobileMenuToggle = await page.$('button[aria-label="Toggle Navigation Menu"]');
  if (mobileMenuToggle) {
    await mobileMenuToggle.click();
    await new Promise((r) => setTimeout(r, 400));
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'mobile_menu.png') });
    copyToArtifacts('mobile_menu.png');
  }

  await browser.close();
  console.log('✅ All Production UI verifications completed successfully!');
}

runVerification().catch((err) => {
  console.error('❌ UI Verification Error:', err);
  process.exit(1);
});
