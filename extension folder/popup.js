const toggle = document.getElementById('toggleProtection');
const statusText = document.getElementById('status');
const sourcesList = document.getElementById('sourcesList');
const loadingIndicator = document.getElementById('loading');

// Show loading indicator until data is loaded
loadingIndicator.style.display = 'block';

chrome.storage.local.get(['protectionEnabled', 'lastPhishingSources'], (result) => {
    loadingIndicator.style.display = 'none'; // Hide loading indicator after data is fetched

    // Error handling in case chrome.storage.local.get fails
    if (chrome.runtime.lastError) {
        console.error('Error retrieving data:', chrome.runtime.lastError);
        statusText.textContent = 'Failed to load data.';
        return;
    }

    // Restore toggle state
    toggle.checked = result.protectionEnabled !== false;

    const sources = result.lastPhishingSources;
    if (sources && sources.length > 0) {
        statusText.textContent = 'Last site was flagged by:';
        sourcesList.innerHTML = sources.map(source => {
            let color = 'red'; // Default to red for phishing
            if (source === 'No threat') {
                color = 'green';
            }
            return `<li style="color: ${color};">${source}</li>`;
        }).join('');
    } else {
        statusText.textContent = 'No recent phishing activity detected.';
        sourcesList.innerHTML = '';
    }
});

// Handle toggle change
toggle.addEventListener('change', () => {
    const newState = toggle.checked;
    chrome.storage.local.get('protectionEnabled', (result) => {
        if (result.protectionEnabled !== newState) {
            chrome.storage.local.set({ protectionEnabled: newState });
            const message = newState ? 'Protection enabled.' : 'Protection disabled.';
            alert(message); // Show a simple alert when the protection is toggled
        }
    });
});
