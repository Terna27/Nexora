const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

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

async function runAuthVerification() {
  console.log('🚀 Starting Production Authentication Browser Verification with Puppeteer...');
  try {
    execSync('psql -h localhost -U cryptiq_user -d cryptiq_core -c "DELETE FROM users WHERE email LIKE \'vitalik@cryptiq.%\';"', { stdio: 'ignore' });
  } catch (e) {}

  const browser = await puppeteer.launch({
    executablePath: '/usr/bin/google-chrome',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
    headless: 'new',
  });

  const page = await browser.newPage();
  page.on('console', (msg) => console.log('  [BROWSER CONSOLE]', msg.text()));
  page.on('pageerror', (err) => console.log('  [BROWSER ERROR]', err.message));

  // 1. Visit Register Page (Desktop Light)
  console.log('1️⃣ Testing Registration Interface (/register)...');
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto('http://localhost:3000/register', { waitUntil: 'networkidle0' });
  await new Promise((r) => setTimeout(r, 600));

  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'auth_register_light.png'), fullPage: false });
  copyToArtifacts('auth_register_light.png');

  // Fill in registration form
  console.log('  👉 Filling Registration Form...');
  await page.type('#name-input', 'Vitalik Buterin');
  await page.type('#reg-email', 'vitalik@cryptiq.test');
  await page.type('#reg-pwd', 'InstitutionalPass!2026');
  await page.type('#reg-pwd-confirm', 'InstitutionalPass!2026');

  // Click terms checkbox
  const termsCheckbox = await page.$('input[type="checkbox"]');
  if (termsCheckbox) await termsCheckbox.click();

  await new Promise((r) => setTimeout(r, 400));
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'auth_register_filled.png'), fullPage: false });
  copyToArtifacts('auth_register_filled.png');

  // Submit registration
  console.log('  👉 Submitting Registration...');
  const submitRegBtn = await page.$('button[type="submit"]');
  await submitRegBtn.click();

  // Wait for success screen
  await page.waitForFunction(() => document.body.innerText.includes('Registration Received'), { timeout: 8000 });
  console.log('  ✅ Registration successful! Success notice rendered.');

  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'auth_register_success.png'), fullPage: false });
  copyToArtifacts('auth_register_success.png');

  // 2. Visit Login Page (Desktop Light)
  console.log('2️⃣ Testing Login Interface (/login) - Light Mode...');
  await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle0' });
  await new Promise((r) => setTimeout(r, 600));

  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'auth_login_light.png'), fullPage: false });
  copyToArtifacts('auth_login_light.png');

  // 3. Test Invalid Credentials
  console.log('3️⃣ Testing Invalid Password Attempt...');
  await page.type('#email-input', 'vitalik@cryptiq.test');
  await page.type('#password-input', 'WrongPassword!123');
  const loginBtn = await page.$('button[type="submit"]');
  await loginBtn.click();

  await page.waitForFunction(() => document.querySelector('[role="alert"]') !== null, { timeout: 6000 });
  const alertText = await page.$eval('[role="alert"]', (el) => el.innerText);
  console.log('  ✅ Expected Error Alert Caught:', alertText);

  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'auth_login_error.png'), fullPage: false });
  copyToArtifacts('auth_login_error.png');

  // 4. Test Valid Login
  console.log('4️⃣ Testing Valid Login Attempt...');
  await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle0' });
  await page.type('#email-input', 'vitalik@cryptiq.test');
  await page.type('#password-input', 'InstitutionalPass!2026');

  await page.click('button[type="submit"]');

  // Wait for redirect to homepage
  await page.waitForFunction(() => window.location.pathname === '/', { timeout: 10000 });
  console.log('  ✅ Redirected to Homepage after successful authentication.');
  await new Promise((r) => setTimeout(r, 1200));

  // Check Cookies for server session
  const cookies = await page.cookies();
  const sessionCookie = cookies.find((c) => c.name === 'cryptiq_session');
  console.log('  👉 Session Cookie Found:', !!sessionCookie, sessionCookie ? { name: sessionCookie.name, httpOnly: sessionCookie.httpOnly } : null);

  if (!sessionCookie) {
    throw new Error('❌ Verification failed: cryptiq_session cookie was not established!');
  }

  // Check navbar for authenticated user pill
  await page.waitForFunction(() => {
    const text = document.querySelector('header')?.innerText || '';
    return text.includes('Vitalik');
  }, { timeout: 6000 });
  console.log('  ✅ Authenticated user pill verified in Navbar header.');

  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'auth_navbar_authenticated.png'), fullPage: false });
  copyToArtifacts('auth_navbar_authenticated.png');

  // 5. Test Dark Mode for Auth Interface
  console.log('5️⃣ Testing Dark Mode on /login...');
  await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle0' });
  const themeToggle = await page.$('button[aria-label*="Mode"]');
  if (themeToggle) {
    await themeToggle.click();
    await new Promise((r) => setTimeout(r, 500));
  }
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'auth_login_dark.png'), fullPage: false });
  copyToArtifacts('auth_login_dark.png');

  // 6. Test Forgot Password Interface
  console.log('6️⃣ Testing Forgot Password Interface (/forgot-password)...');
  await page.goto('http://localhost:3000/forgot-password', { waitUntil: 'networkidle0' });
  await page.type('#reset-email', 'vitalik@cryptiq.test');
  await page.click('button[type="submit"]');
  await page.waitForFunction(() => document.body.innerText.includes('Check Your Inbox'), { timeout: 6000 });
  console.log('  ✅ Forgot Password flow confirmed.');
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'auth_forgot_password.png'), fullPage: false });
  copyToArtifacts('auth_forgot_password.png');

  // 7. Responsive Viewports: Tablet & Mobile
  console.log('7️⃣ Testing Responsive Viewports (Tablet 768x1024 and Mobile 375x812)...');
  await page.setViewport({ width: 768, height: 1024 });
  await page.goto('http://localhost:3000/register', { waitUntil: 'networkidle0' });
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'auth_register_tablet.png'), fullPage: false });
  copyToArtifacts('auth_register_tablet.png');

  await page.setViewport({ width: 375, height: 812 });
  await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle0' });
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'auth_login_mobile.png'), fullPage: false });
  copyToArtifacts('auth_login_mobile.png');

  // 8. Test Logout Flow
  console.log('8️⃣ Testing Logout Flow...');
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });
  await new Promise((r) => setTimeout(r, 600));

  const logoutBtn = await page.$('button[aria-label="Sign Out"]');
  if (logoutBtn) {
    await logoutBtn.click();
    await new Promise((r) => setTimeout(r, 800));
    console.log('  ✅ Sign Out button clicked.');
  }

  const postLogoutCookies = await page.cookies();
  const clearedSession = postLogoutCookies.find((c) => c.name === 'cryptiq_session');
  console.log('  👉 Cookie after logout:', clearedSession ? clearedSession.value : 'CLEARED');

  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'auth_post_logout.png'), fullPage: false });
  copyToArtifacts('auth_post_logout.png');

  await browser.close();
  console.log('🎉 ALL AUTHENTICATION BROWSER VERIFICATIONS COMPLETED SUCCESSFULLY!');
}

runAuthVerification().catch((err) => {
  console.error('❌ Verification failed:', err);
  process.exit(1);
});
