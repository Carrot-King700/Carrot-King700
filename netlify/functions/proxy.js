// export async function handler(event) {
//     const url = event.queryStringParameters.url;

//     if (!url) {
//         return {
//             statusCode: 400,
//             headers: corsHeaders(),
//             body: JSON.stringify({ error: "Missing URL parameter" }),
//         };
//     }

//     if (event.httpMethod === "OPTIONS") {
//         return {
//             statusCode: 200,
//             headers: corsHeaders(),
//             body: "",
//         };
//     }

//     try {
//         const response = await fetch(url);
//         const contentType = response.headers.get("content-type");

//         // If it's not HTML, just return it as-is
//         if (!contentType.includes("text/html")) {
//             const buffer = await response.arrayBuffer();
//             return {
//                 statusCode: 200,
//                 headers: {
//                     ...corsHeaders(),
//                     "Content-Type": contentType,
//                 },
//                 body: Buffer.from(buffer).toString("base64"),
//                 isBase64Encoded: true,
//             };
//         }

//         // Get and rewrite HTML
//         let html = await response.text();

//         // Base URL for relative paths
//         const baseUrl = new URL(url);

//         html = html.replace(/(href|src|action)=["'](.*?)["']/gi, (match, attr, link) => {
//             // Ignore absolute links (like mailto:, data:, javascript:, etc.)
//             if (/^(mailto|javascript|data):/.test(link)) return match;

//             // Turn relative URLs into absolute ones
//             const fullUrl = new URL(link, baseUrl).toString();
//             return `${attr}="/.netlify/functions/proxy?url=${encodeURIComponent(fullUrl)}"`;
//         });

//         return {
//             statusCode: 200,
//             headers: {
//                 ...corsHeaders(),
//                 "Content-Type": "text/html",
//             },
//             body: html,
//         };
//     } catch (error) {
//         return {
//             statusCode: 500,
//             headers: corsHeaders(),
//             body: JSON.stringify({ error: error.toString() }),
//         };
//     }
// }

// function corsHeaders() {
//     return {
//         "Access-Control-Allow-Origin": "*",
//         "Access-Control-Allow-Methods": "GET, OPTIONS",
//         "Access-Control-Allow-Headers": "Content-Type",
//     };
// }

export async function handler(event) {
    const urlParam = event.queryStringParameters.url;
    const originalQuery = event.rawUrl.split('?')[1] || '';

    let targetUrl;
    if (urlParam) {
        targetUrl = urlParam;
    } else {
        // Reconstruct from Referer + query string
        const referer = event.headers.referer || '';
        const refUrl = new URL(referer);
        const base = decodeURIComponent(refUrl.searchParams.get("url") || "");
        if (!base) {
            return {
                statusCode: 400,
                headers: corsHeaders(),
                body: JSON.stringify({ error: "Missing URL parameter" }),
            };
        }
        targetUrl = base.includes('?') ? `${base}&${originalQuery}` : `${base}?${originalQuery}`;
    }

    if (event.httpMethod === "OPTIONS") {
        return {
            statusCode: 200,
            headers: corsHeaders(),
            body: "",
        };
    }

    try {
        const response = await fetch(targetUrl, {
            method: event.httpMethod,
            headers: {
                ...event.headers,
                host: new URL(targetUrl).host,
            },
            body: event.httpMethod !== "GET" && event.httpMethod !== "HEAD" ? event.body : undefined,
        });

        const contentType = response.headers.get("content-type") || "";

        if (!contentType.includes("text/html")) {
            const buffer = await response.arrayBuffer();
            return {
                statusCode: 200,
                headers: {
                    ...corsHeaders(),
                    "Content-Type": contentType,
                },
                body: Buffer.from(buffer).toString("base64"),
                isBase64Encoded: true,
            };
        }

        let html = await response.text();
        const baseUrl = new URL(targetUrl);

        html = html.replace(/(href|src|action)=["'](.*?)["']/gi, (match, attr, link) => {
            if (/^(mailto|javascript|data):/.test(link)) return match;
            const fullUrl = new URL(link, baseUrl).toString();
            return `${attr}="/.netlify/functions/proxy?url=${encodeURIComponent(fullUrl)}"`;
        });

        return {
            statusCode: 200,
            headers: {
                ...corsHeaders(),
                "Content-Type": "text/html",
            },
            body: html,
        };
    } catch (error) {
        return {
            statusCode: 500,
            headers: corsHeaders(),
            body: JSON.stringify({ error: error.toString() }),
        };
    }
}

function corsHeaders() {
    return {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
    };
}