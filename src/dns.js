export async function lookupDNS(host) {

    const response =
        await fetch(
            "/api/dns?host=" +
            encodeURIComponent(host)
        );

    return await response.json();
}