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

// ---------------- NEW TAB PAGE ----------------

const HOME_SRCDOC = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>New Tab</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            width: 100vw; height: 100vh;
            background: #0f1117; color: white;
            font-family: -apple-system, Inter, Arial, sans-serif;
            display: flex; flex-direction: column;
            align-items: center; justify-content: center; gap: 24px;
        }
        h1 { font-size: 36px; font-weight: 700; color: #e2e8f0; letter-spacing: -0.5px; }
        p { font-size: 15px; color: #64748b; }
        .hint { font-size: 13px; color: #334155; margin-top: 8px; }
    </style>
</head>
<body>
    <h1>EclipseX</h1>
    <p>
    <p>
    <p>
    <p>
    <p>Enter "https://better-eagler--alt-acc3.replit.app/" into URL bar</p>
    <p>Turn render distance down and paricles to minimal</p>
    <p>Press Z to leave &nbsp;&middot;&nbsp; Tab to focus iframe</p>
    <p>by: thatswitchguy</p>
    <p>New update on Thursday</p>
</body>
</html>`;

function applyHomeTab(iframe) {
    iframe.removeAttribute("src");
    iframe.srcdoc = HOME_SRCDOC;
}

function errorPageSrcdoc(url, reason) {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Can't connect</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      width: 100vw; height: 100vh;
      background: #0f1117; color: white;
      font-family: -apple-system, Inter, Arial, sans-serif;
      display: flex; flex-direction: column;
      align-items: center; justify-content: center; gap: 18px;
    }
    h2 { font-size: 22px; font-weight: 700; color: #e2e8f0; }
    p  { font-size: 14px; color: #64748b; max-width: 420px; text-align: center; }
    a  {
      display: inline-block; margin-top: 6px; padding: 11px 22px;
      background: #3b82f6; color: white; border-radius: 10px;
      text-decoration: none; font-size: 14px; font-weight: 600;
    }
    a:hover { background: #2563eb; }
    code { font-size: 12px; color: #475569; word-break: break-all; }
  </style>
</head>
<body>
  <h2>Can't reach this site</h2>
  <p>DNS lookup failed for <strong>${url}</strong>.<br>${reason}</p>
  <a href="${url}" target="_blank" rel="noopener">Open in new tab ↗</a>
</body>
</html>`;
}

// ---------------- HELPERS ----------------

function parseInput(input) {
    input = input.trim();

    if (input === "home.html") {
        return "home.html";
    }

    if (
        input.startsWith("http://") ||
        input.startsWith("https://")
    ) {
        return input;
    }

    return "https://" + input;
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

// ---------------- FALLBACK CHAIN ----------------
// Step 1: direct iframe load
// Step 2 (on error): DNS lookup
// Step 3a: DNS ok  → window.open in new tab
// Step 3b: DNS fail → show error srcdoc

function attachFallback(iframe, url) {
    // Clear any previous error handler
    iframe.onerror = null;

    iframe.onerror = async () => {
        // Prevent double-firing
        iframe.onerror = null;

        let hostname;
        try {
            hostname = new URL(url).hostname;
        } catch {
            iframe.removeAttribute("src");
            iframe.srcdoc = errorPageSrcdoc(url, "Invalid URL.");
            return;
        }

        try {
            const dns = await lookupDNS(hostname);

            const resolved =
                dns.addresses && dns.addresses.length > 0;

            if (resolved) {
                // Site exists but iframe was blocked — open in new tab
                window.open(url, "_blank", "noopener");
            } else {
                // DNS failed — show error page
                iframe.removeAttribute("src");
                iframe.srcdoc = errorPageSrcdoc(
                    url,
                    "The domain could not be resolved. The site may be down or misspelled."
                );
            }
        } catch {
            iframe.removeAttribute("src");
            iframe.srcdoc = errorPageSrcdoc(
                url,
                "DNS lookup failed. Check your connection."
            );
        }
    };
}

// ---------------- RENDER TABS ----------------

function renderTabs() {
    tabsContainer.innerHTML = "";

    tabs.forEach(tab => {
        const tabElement =
            document.createElement("div");

        tabElement.className = "browser-tab";

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

        tab.iframe.hidden = tab.id !== id;
    });

    const current =
        tabs.find(t => t.id === id);

    if (current) {
        urlBar.value = current.url || "";
    }

    setTimeout(() => {
        const t = getActiveTab();
        if (t?.iframe) {
            t.iframe.focus();
        }
    }, 50);

    renderTabs();
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
        iframe.tabIndex = 0;
        iframe.hidden = false;

        current.iframe = iframe;

        tabViews.appendChild(iframe);
    }

    if (url === "home.html") {
        current.iframe.onerror = null;
        applyHomeTab(current.iframe);
    } else {
        current.iframe.removeAttribute("srcdoc");
        attachFallback(current.iframe, url);
        current.iframe.src = url;
    }

    current.iframe.hidden = false;

    tabs.forEach(tab => {
        if (
            tab.id !== current.id &&
            tab.iframe
        ) {
            tab.iframe.hidden = true;
        }
    });

    if (url === "home.html") {
        current.title = "New Tab";
    } else {
        try {
            current.title =
                new URL(url).hostname;
        } catch {
            current.title = url;
        }
    }

    if (url !== "home.html") {
        addHistory(url, current.title);
    }

    renderTabs();
    saveTabs();
}

// ---------------- CREATE TAB ----------------

function createNewTab() {
    const tab = createTab("home.html");

    const iframe =
        document.createElement("iframe");

    iframe.className = "browser-frame";
    iframe.hidden = false;
    iframe.tabIndex = 0;

    applyHomeTab(iframe);

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
        iframe.hidden = true;
        iframe.tabIndex = 0;

        if (saved.url === "home.html") {
            applyHomeTab(iframe);
        } else {
            attachFallback(iframe, saved.url);
            iframe.src = saved.url;
        }

        tab.iframe = iframe;

        tabViews.appendChild(iframe);
    });

    switchTab(tabs[0].id);

    const first = tabs[0];
    if (first && first.iframe) {
        first.iframe.hidden = false;
    }

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

// ---------------- KEY SHORTCUTS ----------------

document.addEventListener("keydown", (e) => {
    if (
        e.key === "z" &&
        !e.ctrlKey &&
        !e.altKey &&
        !e.metaKey &&
        document.activeElement !== urlBar
    ) {
        window.location.href =
            "https://classroom.google.com";
        return;
    }

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
