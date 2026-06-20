export function getBookmarks() {

    return JSON.parse(
        localStorage.getItem(
            "bookmarks"
        ) || "[]"
    );
}

export function saveBookmark(bookmark) {

    const bookmarks =
        getBookmarks();

    bookmarks.push(bookmark);

    localStorage.setItem(
        "bookmarks",
        JSON.stringify(bookmarks)
    );
}

export function removeBookmark(url) {

    const bookmarks =
        getBookmarks();

    const filtered =
        bookmarks.filter(
            b => b.url !== url
        );

    localStorage.setItem(
        "bookmarks",
        JSON.stringify(filtered)
    );
}