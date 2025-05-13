const GOOGLE_SAFE_BROWSING_API_KEY = 'AIzaSyCbcPqC-7YyU6QkiX7nm7e-ahFWR2WHo68';
const VIRUSTOTAL_API_KEY = 'c69b78a54e677bd41c4505b0af3dc05d5f7b7efb936c51e86d9249f2b101abda';

let phishTankList = new Set();

function normalizeUrl(url) {
  try {
    const u = new URL(url);
    return u.origin + u.pathname.replace(/\/$/, '');
  } catch (e) {
    return url;
  }
}

function sanitizeUrl(url) {
  try {
    const u = new URL(url);
    u.hash = '';
    return u.toString();
  } catch (e) {
    return url;
  }
}

async function loadPhishTankCSV() {
  try {
    const response = await fetch(chrome.runtime.getURL('data/verified_online.csv'));
    const csvText = await response.text();
    const lines = csvText.split('\n').slice(1);
    for (const line of lines) {
      const columns = line.split(',');
      if (columns[1]) {
        const cleanUrl = columns[1].replace(/"/g, '').trim();
        phishTankList.add(normalizeUrl(cleanUrl));
      }
    }
    console.log(`[PhishTank] Loaded ${phishTankList.size} phishing URLs.`);
  } catch (error) {
    console.error('[PhishTank] Failed to load CSV:', error);
  }
}

async function checkWithGoogleSafeBrowsing(url) {
  try {
    const response = await fetch(`https://safebrowsing.googleapis.com/v4/threatMatches:find?key=${GOOGLE_SAFE_BROWSING_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client: {
          clientId: "phishing-extension",
          clientVersion: "1.0.0"
        },
        threatInfo: {
          threatTypes: ["MALWARE", "SOCIAL_ENGINEERING"],
          platformTypes: ["ANY_PLATFORM"],
          threatEntryTypes: ["URL"],
          threatEntries: [{ url }]
        }
      })
    });

    if (!response.ok) {
      console.warn('[Safe Browsing] Non-OK response:', response.status);
      return false;
    }

    const data = await response.json();
    return data.matches !== undefined;
  } catch (error) {
    console.error('[Google Safe Browsing] Error:', error);
    return false;
  }
}

async function checkWithVirusTotal(url) {
  try {
    const scanRes = await fetch("https://www.virustotal.com/api/v3/urls", {
      method: "POST",
      headers: {
        "x-apikey": VIRUSTOTAL_API_KEY,
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: `url=${encodeURIComponent(url)}`
    });

    const scanData = await scanRes.json();
    if (!scanData.data || !scanData.data.id) {
      console.warn('[VirusTotal] No scan ID returned.');
      return false;
    }

    const encodedId = scanData.data.id;

    const reportRes = await fetch(`https://www.virustotal.com/api/v3/urls/${encodedId}`, {
      headers: { "x-apikey": VIRUSTOTAL_API_KEY }
    });

    const reportData = await reportRes.json();
    if (reportData?.data?.attributes) {
      const stats = reportData.data.attributes.last_analysis_stats;
      return stats.malicious > 0 || stats.suspicious > 0;
    }

    return false;
  } catch (error) {
    console.error('[VirusTotal] Error:', error);
    return false;
  }
}

function checkWithPhishTank(url) {
  return phishTankList.has(normalizeUrl(url));
}

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url?.startsWith('http')) {
    const url = sanitizeUrl(tab.url);

    // Skip unsupported URLs
    if (url.startsWith('chrome://') || url.startsWith('chrome-error://') || url.startsWith('about:')) {
      console.warn('[Skip] Cannot inject into error or chrome internal page.');
      return;
    }

    const protectionEnabled = await new Promise(resolve => {
      chrome.storage.local.get(['protectionEnabled'], (result) => {
        resolve(result.protectionEnabled !== false);
      });
    });

    if (!protectionEnabled) return;

    const flaggedBy = [];

    if (checkWithPhishTank(url)) flaggedBy.push('PhishTank');
    if (await checkWithGoogleSafeBrowsing(url)) flaggedBy.push('Google Safe Browsing');
    if (await checkWithVirusTotal(url)) flaggedBy.push('VirusTotal');

    if (flaggedBy.length > 0) {
      chrome.storage.local.set({ lastPhishingSources: flaggedBy });

      try {
        chrome.scripting.executeScript({
          target: { tabId },
          files: ['content.js']
        }, () => {
          if (chrome.runtime.lastError) {
            console.warn('[Script Injection Error]', chrome.runtime.lastError.message);
            return;
          }

          chrome.tabs.sendMessage(tabId, {
            action: 'showWarningBanner',
            flaggedBy,
            url
          });
        });
      } catch (err) {
        console.error('[Execute Script Error]', err);
      }
    }
  }
});

loadPhishTankCSV();
