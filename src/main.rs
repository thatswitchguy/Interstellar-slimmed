use axum::{
    extract::Query,
    response::Json,
    routing::get,
    Router,
};
use serde::Serialize;
use std::collections::HashMap;
use std::net::SocketAddr;
use tokio::net::lookup_host;

#[derive(Serialize)]
struct DnsResponse {
    host: String,
    addresses: Vec<String>,
}

async fn lookup(Query(params): Query<HashMap<String, String>>) -> Json<DnsResponse> {
    let host = match params.get("host") {
        Some(h) => h.clone(),
        None => return Json(DnsResponse {
            host: "missing".to_string(),
            addresses: vec![],
        }),
    };

    let mut addresses = vec![];

    // Try DNS resolution
    if let Ok(results) = lookup_host((host.as_str(), 0)).await {
        for addr in results {
            addresses.push(addr.ip().to_string());
        }
    }

    Json(DnsResponse { host, addresses })
}

#[tokio::main]
async fn main() {
    let app = Router::new()
        .route("/lookup", get(lookup))
        .route("/", get(|| async { "DNS server running" }));

    let addr = SocketAddr::from(([0, 0, 0, 0], 8081));
    println!("DNS server running on http://{}", addr);

    let listener = tokio::net::TcpListener::bind(addr)
        .await
        .expect("Failed to bind");

    axum::serve(listener, app)
        .await
        .expect("Server failed");
}