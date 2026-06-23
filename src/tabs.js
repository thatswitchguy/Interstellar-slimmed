export const tabs = [];

export let activeTab = null;

export function createTab(url = "blackscreen.app") {

    const id =
        "tab-" +
        Date.now() +
        "-" +
        Math.random();

    const tab = {
        id,
        title: "New Tab",
        url,
        dns: null,
        favicon: "",
        iframe: null
    };

    tabs.push(tab);

    saveTabs();

    return tab;
}

export function deleteTab(id) {

    const index =
        tabs.findIndex(
            t => t.id === id
        );

    if (index === -1) return;

    const tab =
        tabs[index];

    if (tab.iframe) {
        tab.iframe.remove();
    }

    tabs.splice(index, 1);

    saveTabs();
}

export function setActiveTab(id) {

    activeTab = id;

    localStorage.setItem(
        "activeTab",
        id
    );
}

export function saveTabs() {

    localStorage.setItem(
        "tabs",
        JSON.stringify(
            tabs.map(tab => ({
                id: tab.id,
                title: tab.title,
                url: tab.url,
                dns: tab.dns,
                favicon: tab.favicon
            }))
        )
    );
}

export function restoreTabs() {

    const stored =
        localStorage.getItem("tabs");

    if (!stored) return [];

    return JSON.parse(stored);
}