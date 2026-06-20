export function getHistory() {

    return JSON.parse(
        localStorage.getItem(
            "history"
        ) || "[]"
    );
}

export function addHistory(url,title) {

    const history =
        getHistory();

    history.unshift({
        url,
        title,
        timestamp:
            Date.now()
    });

    localStorage.setItem(
        "history",
        JSON.stringify(history)
    );
}

export function clearHistory() {

    localStorage.removeItem(
        "history"
    );
}