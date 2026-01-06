document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('ext-closePopupBtn').addEventListener('click', () => {
        window.close();
    });
    document.getElementById('ext-exportBtn').addEventListener('click', handleExportClick);
    document.getElementById('ext-recommendBtn').addEventListener('click', handleRecommendClick);
});

chrome.runtime.onMessage.addListener((msg) => {
    setStatus(msg.message, msg.type);

    let loadingSpinner;
    let button;
    if (msg.action === 'exportDone') {
        button = document.getElementById('ext-exportBtn');
        loadingSpinner = document.getElementById('ext-loadingSpinner-export');
        showExportedJobs();
    }
    if (msg.action === 'recommendDone') {
        button = document.getElementById('ext-recommendBtn');
        loadingSpinner = document.getElementById('ext-loadingSpinner-recommend');
    }
    if (button) button.disabled = true;
    if (loadingSpinner) loadingSpinner.style.display = 'none';
});

async function showExportedJobs() {
    const { exportedJobs } = await chrome.storage.local.get('exportedJobs');
    if (chrome.storage.local.get('exportedJobs')) {
        debugger;
        // TODO: show exportedJobs.length + 'Last updated' datetime + small Clear (Trash) button
    }
}

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

    const button = document.getElementById('ext-exportBtn');
    button.disabled = true;
    const loadingSpinner = document.getElementById('ext-loadingSpinner-export');
    loadingSpinner.style.display = 'block';

    const isExportToExcel = document.querySelector('#ext-xlsxCheckbox').checked;
    await chrome.storage.local.set({ isExportToExcel });

    const jsFiles = ['exportToCSV.js'];
    if (isExportToExcel) {
        //jsFiles.unshift('xlsx.mini.min.js'); // SheetJS
        jsFiles.unshift('exceljs.min.js');
    }
    try {
        await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: jsFiles
        });
    } catch (err) {
        setStatus("`exportToCSV.js` Injection error: ${err.message}", 'error');
    } finally {
        setChromeAPIErrorStatus();
    }
}

async function handleRecommendClick() {
    setStatus("Gathering job recommendations...");

    const JOB_URLS = [
        'https://www.linkedin.com/jobs/collections/',
        'https://www.linkedin.com/jobs/search-results/'
    ];
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!JOB_URLS.some(prefix => tab.url?.startsWith(prefix))) {
        setStatus("Not a LinkedIn job search page", 'error');
        return;
    }

    const button = document.getElementById('ext-recommendBtn');
    button.disabled = true;
    const loadingSpinner = document.getElementById('ext-loadingSpinner-recommend');
    loadingSpinner.style.display = 'block';

    try {
        await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: ["recommendJobs.js"]
        });
    } catch (err) {
        setStatus("`recommendJobs.js` Injection error: ${err.message}", 'error');
    } finally {
        setChromeAPIErrorStatus();
    }
}

function setChromeAPIErrorStatus() {
    if (chrome.runtime.lastError) {
        setStatus(`Chrome API error: ${chrome.runtime.lastError.message}`, 'error');
    }
}
