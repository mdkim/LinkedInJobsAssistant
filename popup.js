document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('ext-closePopupBtn').addEventListener('click', () => {
        window.close();
    });
    document.getElementById('ext-export').addEventListener('click', handleExportClick);
});

chrome.runtime.onMessage.addListener((msg) => {
    setStatus(msg.message, msg.type);
    if (msg.action === 'exportDone') {
        const loadingSpinner = document.getElementById('ext-loadingSpinner');
        loadingSpinner.style.display = 'none';
    }
});

// requires `popup.js` to be loaded after 'ext-status' div
const extStatus = document.getElementById('ext-status');

function setStatus(msg, type) {
    extStatus.classList.remove('ext-status--error', 'ext-status--warning');
    switch (type) {
        case 'warning':
            extStatus.classList.add('ext-status--warning');
            break;
        case 'error':
            extStatus.classList.add('ext-status--error');
            break;
    }
    extStatus.textContent = msg;
    extStatus.style.display = 'block';
}

async function handleExportClick() {
    setStatus("Gathering Saved Jobs from all pages...");

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab.url || !tab.url.startsWith('https://www.linkedin.com/my-items/saved-jobs/')) {
        setStatus("Not a LinkedIn Saved Jobs page", 'error');
        return;
    }

    const loadingSpinner = document.getElementById('ext-loadingSpinner');
    loadingSpinner.style.display = 'block';

    const isExportToExcel = document.querySelector('#ext-xlsxCheckbox').checked;
    await chrome.storage.local.set({ isExportToExcel });

    const jsFiles = ['exportToCSV.js'];
    if (isExportToExcel) {
        //jsFiles.unshift('xlsx.mini.min.js'); // SheetJS
        jsFiles.unshift('exceljs.min.js');
    }
    await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: jsFiles
    });

    if (chrome.runtime.lastError) {
        setStatus(`Chrome API error: ${chrome.runtime.lastError.message}`, 'error');
        return;
    }
}
