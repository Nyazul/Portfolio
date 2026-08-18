import { chromium } from "playwright";

const url = "http://localhost:3000";

const browser = await chromium.launch({ channel: "chrome" });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto(url, { waitUntil: "networkidle" });

const nav = page.locator('nav[aria-label="Primary"]');
await nav.waitFor({ state: "visible" });

async function snapshot(label) {
  const box = await nav.boundingBox();
  const linksWrapper = nav.locator("div[aria-hidden]");
  const ariaHidden = await linksWrapper.getAttribute("aria-hidden");
  const wrapperBox = await linksWrapper.boundingBox();
  console.log(
    `[${label}] pill: ${JSON.stringify(box)} | links-wrapper aria-hidden=${ariaHidden} width=${wrapperBox?.width}`
  );
  return { box, wrapperBox, ariaHidden };
}

const before = await snapshot("top");
await page.screenshot({ path: "/tmp/nav-top.png" });

await page.evaluate(() => window.scrollTo(0, 800));
await page.waitForTimeout(500); // let the 300ms transition settle

const after = await snapshot("scrolled");
await page.screenshot({ path: "/tmp/nav-scrolled.png" });

await page.evaluate(() => window.scrollTo(0, 0));
await page.waitForTimeout(500);
const backTop = await snapshot("back-to-top");

const widthShrank = after.box.width < before.box.width;
const linksCollapsed = after.wrapperBox.width < 5;
const linksReappeared = backTop.wrapperBox.width > 5;

console.log("---");
console.log("Pill width shrank on scroll:", widthShrank, `(${before.box.width} -> ${after.box.width})`);
console.log("Links wrapper collapsed to ~0 on scroll:", linksCollapsed, `(width=${after.wrapperBox.width})`);
console.log("Links wrapper reappeared after scrolling back up:", linksReappeared, `(width=${backTop.wrapperBox.width})`);

await browser.close();
