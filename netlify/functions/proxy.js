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

    // Try to recover url from form fallback
    if (!url && event.headers.referer) {
        const refererUrl = new URL(event.headers.referer);
        const dataProxyUrl = refererUrl.searchParams.get("url");
        if (dataProxyUrl) {
            const originalParams = new URLSearchParams(event.queryStringParameters);
            originalParams.delete("url");
            url = `${dataProxyUrl}?${originalParams.toString()}`;
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
        const response = await fetch(url);
        const contentType = response.headers.get("content-type");

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

        // Rewrite href/src/action attributes
        html = html.replace(/(href|src|action)=["'](.*?)["']/gi, (match, attr, link) => {
            if (/^(mailto|javascript|data):/.test(link)) return match;
            const fullUrl = new URL(link, baseUrl).toString();
            return `${attr}="/.netlify/functions/proxy?url=${encodeURIComponent(fullUrl)}"`;
        });

        // Rewrite form tags to use GET + target iframe + data-proxy-url
        html = html.replace(/<(form\b[^>]*?)>/gi, (match, startTag) => {
            const actionMatch = startTag.match(/action=["']([^"']+)["']/i);
            const actionUrl = actionMatch ? actionMatch[1] : baseUrl.toString();

            // Rewrite action and add method/target/data-proxy-url
            let rewrittenTag = startTag
                .replace(/action=["'][^"']*["']/i, '') // remove old action
                .replace(/\s+$/, ''); // trim

            return `<form ${rewrittenTag} action="/.netlify/functions/proxy" method="GET" target="proxyFrame" data-proxy-url="${actionUrl}">`;
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
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
    };
}