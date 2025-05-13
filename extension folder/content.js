console.log('[Content Script] Loaded.');

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('[Content Script] Received message:', message);

  // DEBUG: Check for correct message structure
  if (message.action === 'showWarningBanner') {
    console.log('[Content Script] Triggering banner for:', message.url, 'Flagged by:', message.flaggedBy);

    const banner = document.createElement('div');
    banner.style.position = 'fixed';
    banner.style.top = '0';
    banner.style.left = '0';
    banner.style.width = '100%';
    banner.style.backgroundColor = '#dc3545';
    banner.style.color = 'white';
    banner.style.padding = '15px';
    banner.style.fontSize = '18px';
    banner.style.fontWeight = 'bold';
    banner.style.textAlign = 'center';
    banner.style.zIndex = '999999';
    banner.style.boxShadow = '0 2px 5px rgba(0,0,0,0.3)';
    banner.style.display = 'flex';
    banner.style.alignItems = 'center';
    banner.style.justifyContent = 'center';
    banner.style.gap = '10px';

    const warningIcon = document.createElement('span');
    warningIcon.textContent = '⚠️';
    warningIcon.style.fontSize = '24px';

    const messageText = `WARNING: This site has been flagged as phishing by: ${message.flaggedBy.join(', ')}.`;
    const messageSpan = document.createElement('span');
    messageSpan.textContent = messageText;

    const proceedButton = document.createElement('button');
    proceedButton.textContent = 'Proceed Anyway';
    proceedButton.style.backgroundColor = '#ffc107';
    proceedButton.style.color = '#212529';
    proceedButton.style.border = 'none';
    proceedButton.style.padding = '8px 15px';
    proceedButton.style.borderRadius = '5px';
    proceedButton.style.cursor = 'pointer';
    proceedButton.style.fontSize = '16px';
    proceedButton.style.transition = 'background-color 0.3s ease';
    proceedButton.onmouseover = () => proceedButton.style.backgroundColor = '#e0a800';
    proceedButton.onmouseout = () => proceedButton.style.backgroundColor = '#ffc107';
    proceedButton.onclick = () => banner.remove();

    const close = document.createElement('span');
    close.textContent = '✖';
    close.style.marginLeft = '20px';
    close.style.cursor = 'pointer';
    close.style.fontSize = '24px';
    close.onclick = () => banner.remove();

    banner.appendChild(warningIcon);
    banner.appendChild(messageSpan);
    banner.appendChild(proceedButton);
    banner.appendChild(close);
    document.body.prepend(banner);
  } else {
    console.log('[Content Script] Message type unrecognized:', message);
  }
});
