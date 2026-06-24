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
            align-items: center; justify-content: center; gap: 20px;
        }
        h1 { font-size: 34px; font-weight: 700; color: #e2e8f0; letter-spacing: -0.5px; }
        .info { font-size: 13px; color: #475569; text-align: center; line-height: 1.7; }
        .info p { margin: 0; }
        .sites {
            display: flex; flex-wrap: wrap; gap: 10px;
            justify-content: center; max-width: 520px;
        }
        .site-btn {
            padding: 9px 18px;
            background: #1e2535;
            border: 1px solid #2d3a52;
            border-radius: 10px;
            color: #cbd5e1;
            font-size: 13px;
            cursor: pointer;
            transition: background 0.15s, border-color 0.15s;
            text-decoration: none;
        }
        .site-btn:hover { background: #2a3550; border-color: #3b82f6; color: white; }
        .hint { font-size: 12px; color: #2d3a52; margin-top: 4px; }
    </style>
</head>
<body>
    <h1>EclipseX</h1>
    <div class="info">
        <p>Enter "https://better-eagler--alt-acc3.replit.app/" into URL bar</p>
        <p>Turn render distance down and particles to minimal</p>
        <p>by: thatswitchguy &nbsp;&middot;&nbsp; New update on Thursday</p>
    </div>
    <div class="sites">
        <a class="site-btn" href="#" data-url="https://better-eagler--alt-acc3.replit.app/">🎮 EclipseX</a>
        <a class="site-btn" href="#" data-url="https://youtube.com">▶ YouTube</a>
        <a class="site-btn" href="#" data-url="https://discord.com/app">💬 Discord</a>
        <a class="site-btn" href="#" data-url="https://classroom.google.com">📚 Classroom</a>
        <a class="site-btn" href="#" data-url="https://docs.google.com">📄 Docs</a>
        <a class="site-btn" href="#" data-url="https://github.com">🐙 GitHub</a>
        <a class="site-btn" href="#" data-url="https://reddit.com">🔺 Reddit</a>
        <a class="site-btn" href="#" data-url="https://spotify.com">🎵 Spotify</a>
    </div>
    <span class="hint">Press Z to leave &nbsp;&middot;&nbsp; Tab to focus iframe</span>
    <script>
        document.querySelectorAll('.site-btn').forEach(btn => {
            btn.addEventListener('click', e => {
                e.preventDefault();
                const url = btn.getAttribute('data-url');
                window.parent.postMessage({ type: 'navigate', url }, '*');
            });
        });
    </script>
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
  </style>
</head>
<body>
  <h2>Can't reach this site</h2>
  <p>${reason}</p>
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
//
// Step 1: direct iframe (immediate)
//   - onload fires + contentDocument accessible + empty → X-Frame-Options block → Step 2
//   - onerror fires → network error → Step 2
//   - 10 seconds pass with no successful load → Step 2
//
// Step 2: proxy via /proxy?url=... on same server
//   - onload fires → done ✓
//   - onerror or 10s timeout → Step 3
//
// Step 3: DNS lookup
//   - DNS resolves → site exists, open in new tab
//   - DNS fails → show error srcdoc

function attachFallback(iframe, url) {
    let stage = "direct"; // "direct" | "proxy" | "done"
    let timer = null;

    function clearHandlers() {
        clearTimeout(timer);
        iframe.onload = null;
        iframe.onerror = null;
    }

    async function fallbackToDNS() {
        if (stage === "done") return;
        stage = "done";
        clearHandlers();

        let hostname;
        try { hostname = new URL(url).hostname; }
        catch {
            iframe.removeAttribute("src");
            iframe.srcdoc = errorPageSrcdoc(url, "Invalid URL.");
            return;
        }

        try {
            const dns = await lookupDNS(hostname);
            if (dns.addresses && dns.addresses.length > 0) {
                window.open(url, "_blank", "noopener");
            } else {
                iframe.removeAttribute("src");
                iframe.srcdoc = errorPageSrcdoc(
                    url,
                    `The domain <strong>${hostname}</strong> could not be resolved. The site may be down or misspelled.`
                );
            }
        } catch {
            iframe.removeAttribute("src");
            iframe.srcdoc = errorPageSrcdoc(
                url,
                "DNS lookup failed. Check your connection."
            );
        }
    }

    function switchToProxy() {
        if (stage !== "direct") return;
        stage = "proxy";
        clearHandlers();

        iframe.removeAttribute("srcdoc");

        // Proxy onload: check if it actually served content
        iframe.onload = () => {
            clearTimeout(timer);
            try {
                const doc = iframe.contentDocument;
                if (!doc || !doc.body || doc.body.innerHTML.trim() === "") {
                    fallbackToDNS();
                } else {
                    stage = "done";
                    iframe.onload = null;
                    iframe.onerror = null;
                }
            } catch {
                // Cross-origin → real content loaded ✓
                stage = "done";
                iframe.onload = null;
                iframe.onerror = null;
            }
        };

        iframe.onerror = () => fallbackToDNS();

        // 10s timeout on proxy too
        timer = setTimeout(fallbackToDNS, 10000);

        iframe.src = "/proxy?url=" + encodeURIComponent(url);
    }

    // Direct iframe load handler
    iframe.onload = () => {
        if (stage !== "direct") return;
        clearTimeout(timer);

        // Detect X-Frame-Options block: contentDocument accessible but empty
        try {
            const doc = iframe.contentDocument;
            if (!doc || !doc.body || doc.body.innerHTML.trim() === "") {
                switchToProxy();
            } else {
                // Loaded real content ✓
                stage = "done";
                iframe.onload = null;
                iframe.onerror = null;
            }
        } catch {
            // Cross-origin SecurityError → real page loaded ✓
            stage = "done";
            iframe.onload = null;
            iframe.onerror = null;
        }
    };

    iframe.onerror = () => {
        if (stage !== "direct") return;
        clearTimeout(timer);
        switchToProxy();
    };

    // 10-second timeout before proxy fallback
    timer = setTimeout(() => {
        if (stage === "direct") switchToProxy();
    }, 10000);
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

async function navigate(targetUrl) {
    const current = getCurrentTab();
    if (!current) return;

    const url =
        targetUrl
            ? parseInput(targetUrl)
            : parseInput(urlBar.value);

    current.url = url;
    urlBar.value = url;

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
        current.iframe.onload = null;
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

// ---------------- HOME TAB postMessage ----------------

window.addEventListener("message", (e) => {
    if (e.data && e.data.type === "navigate" && e.data.url) {
        urlBar.value = e.data.url;
        navigate(e.data.url);
    }
});

// ---------------- EVENTS ----------------

goBtn.addEventListener("click", () => navigate());

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
