import {
    tabs,
    createTab,
    deleteTab,
    setActiveTab,
    saveTabs,
    restoreTabs
} from "./tabs.js";

import {
    lookupDNS
} from "./dns.js";

import {
    addHistory
} from "./history.js";

const tabsContainer =
    document.getElementById("tabs");

const tabViews =
    document.getElementById("tabViews");

const urlBar =
    document.getElementById("urlBar");

const goBtn =
    document.getElementById("goBtn");

const newTabBtn =
    document.getElementById("newTabBtn");

const dnsValue =
    document.getElementById("dnsValue");

const statusText =
    document.getElementById("statusText");

// ---------------- HELPERS ----------------

function parseInput(input) {
    input = input.trim();

    if (
        input.startsWith("http://") ||
        input.startsWith("https://")
    ) {
        return input;
    }

    if (input.includes(".")) {
        return "https://" + input;
    }

    return (
        "https://www.google.com/search?q=" +
        encodeURIComponent(input)
    );
}

function getCurrentTab() {
    const active =
        localStorage.getItem("activeTab");

    return tabs.find(tab => tab.id === active);
}

function getActiveTab() {
    const active =
        localStorage.getItem("activeTab");

    return tabs.find(tab => tab.id === active);
}

// ---------------- RENDER TABS ----------------

function renderTabs() {
    tabsContainer.innerHTML = "";

    tabs.forEach(tab => {
        const tabElement =
            document.createElement("div");

        tabElement.className =
            "browser-tab";

        if (
            tab.id ===
            localStorage.getItem("activeTab")
        ) {
            tabElement.classList.add("active");
        }

        const title =
            document.createElement("span");

        title.textContent =
            tab.title || "New Tab";

        const close =
            document.createElement("button");

        close.className = "close-tab";
        close.textContent = "×";

        close.onclick = e => {
            e.stopPropagation();

            deleteTab(tab.id);

            if (tabs.length > 0) {
                switchTab(tabs[0].id);
            }

            renderTabs();
        };

        tabElement.appendChild(title);
        tabElement.appendChild(close);

        tabElement.onclick = () => {
            switchTab(tab.id);
        };

        tabsContainer.appendChild(tabElement);
    });
}

// ---------------- SWITCH TAB ----------------

function switchTab(id) {
    setActiveTab(id);

    tabs.forEach(tab => {
        if (!tab.iframe) return;

        // FIX: use hidden instead of display:none
        tab.iframe.hidden = tab.id !== id;
    });

    const current =
        tabs.find(t => t.id === id);

    if (current) {
        urlBar.value = current.url || "";

        if (
            current.dns &&
            current.dns.ipv4
        ) {
            dnsValue.textContent =
                current.dns.ipv4[0];
        }
    }

    // auto focus iframe after switching
    setTimeout(() => {
        const t = getActiveTab();
        if (t?.iframe) {
            t.iframe.focus();
        }
    }, 50);

    renderTabs();
}

// ---------------- DNS ----------------

async function updateDNS(tab) {
    try {
        if (!tab.url) return;

        const host =
            new URL(tab.url).hostname;

        const dns =
            await lookupDNS(host);

        tab.dns = dns;

        dnsValue.textContent =
            dns.ipv4?.[0] || "No IPv4";

        saveTabs();
    } catch {
        dnsValue.textContent = "DNS Failed";
    }
}

// ---------------- NAVIGATE ----------------

async function navigate() {
    const current = getCurrentTab();
    if (!current) return;

    const url = parseInput(urlBar.value);

    current.url = url;

    if (!current.iframe) {
        const iframe =
            document.createElement("iframe");

        iframe.className = "browser-frame";

        // FIX: must be focusable
        iframe.tabIndex = 0;

        iframe.hidden = false;

        current.iframe = iframe;

        tabViews.appendChild(iframe);
    }

    current.iframe.src = url;
    current.iframe.hidden = false;

    tabs.forEach(tab => {
        if (
            tab.id !== current.id &&
            tab.iframe
        ) {
            tab.iframe.hidden = true;
        }
    });

    try {
        current.title =
            new URL(url).hostname;
    } catch {
        current.title = "Search";
    }

    addHistory(url, current.title);

    statusText.textContent = "Loading...";

    await updateDNS(current);

    statusText.textContent = "Ready";

    renderTabs();
    saveTabs();
}

// ---------------- CREATE TAB ----------------

function createNewTab() {
    const tab = createTab();

    const iframe =
        document.createElement("iframe");

    iframe.className = "browser-frame";

    iframe.hidden = true;

    // IMPORTANT FIX
    iframe.tabIndex = 0;

    tab.iframe = iframe;

    tabViews.appendChild(iframe);

    switchTab(tab.id);

    renderTabs();
}

// ---------------- RESTORE ----------------

function restoreSession() {
    const stored = restoreTabs();

    if (!stored || stored.length === 0) {
        createNewTab();
        return;
    }

    stored.forEach(saved => {
        const tab = createTab(saved.url);

        tab.title = saved.title;
        tab.dns = saved.dns;

        const iframe =
            document.createElement("iframe");

        iframe.className = "browser-frame";
        iframe.src = saved.url;

        iframe.hidden = true;

        // IMPORTANT FIX
        iframe.tabIndex = 0;

        tab.iframe = iframe;

        tabViews.appendChild(iframe);
    });

    switchTab(tabs[0].id);
    renderTabs();
}

// ---------------- EVENTS ----------------

goBtn.addEventListener("click", navigate);

urlBar.addEventListener("keydown", e => {
    if (e.key === "Enter") {
        navigate();
    }
});

newTabBtn.addEventListener("click", createNewTab);

document.addEventListener("DOMContentLoaded", restoreSession);

// ---------------- TAB KEY FOCUS FIX ----------------

document.addEventListener("keydown", (e) => {
    if (e.key === "Tab") {
        e.preventDefault();

        const t = getActiveTab();
        if (!t?.iframe) return;

        t.iframe.focus();

        t.iframe.style.outline = "2px solid #4af";

        setTimeout(() => {
            t.iframe.style.outline = "none";
        }, 400);
    }
});