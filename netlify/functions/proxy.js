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
    let url = event.queryStringParameters.url;

    // Rebuild the full URL if it's missing but there are search parameters
    if (!url) {
        const referer = event.headers.referer || "";
        const refererURL = new URL(referer);
        const baseProxyURL = refererURL.searchParams.get("url");

        if (baseProxyURL) {
            const params = new URLSearchParams(event.queryStringParameters);
            url = baseProxyURL + "?" + params.toString();
        }
    }

    if (!url) {
        return {
            statusCode: 400,
            headers: corsHeaders(),
            body: JSON.stringify({ error: "Missing URL parameter" }),
        };
    }

    if (event.httpMethod === "OPTIONS") {
        return {
            statusCode: 200,
            headers: corsHeaders(),
            body: "",
        };
    }

    try {
        const response = await fetch(url, {
            method: event.httpMethod,
            headers: event.headers,
            body: event.body,
        });

        const contentType = response.headers.get("content-type");

        // If not HTML, return raw
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
        const baseUrl = new URL(url);

        // Rewrite href/src/action
        html = html.replace(/(href|src|action)=["'](.*?)["']/gi, (match, attr, link) => {
            if (/^(mailto|javascript|data):/i.test(link)) return match;
            const fullUrl = new URL(link, baseUrl).toString();
            return `${attr}="/.netlify/functions/proxy?url=${encodeURIComponent(fullUrl)}"`;
        });

        // Rewrite <form> tags
        html = html.replace(/<form\b([^>]*)>/gi, (match, attributes) => {
            const actionMatch = attributes.match(/action=["'](.*?)["']/i);
            const originalAction = actionMatch ? new URL(actionMatch[1], baseUrl).toString() : baseUrl.toString();

            return `<form ${attributes.replace(/action=["'].*?["']/, '')} action="/.netlify/functions/proxy" method="GET" target="proxyFrame" data-proxy-url="${originalAction}">`;
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
