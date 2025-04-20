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
    const isPost = event.httpMethod === "POST";
    const isOptions = event.httpMethod === "OPTIONS";

    if (isOptions) {
        return {
            statusCode: 200,
            headers: corsHeaders(),
            body: "",
        };
    }

    let targetUrl;
    if (isPost) {
        const contentType = event.headers["content-type"] || "";
        if (contentType.includes("application/x-www-form-urlencoded")) {
            const params = new URLSearchParams(event.body);
            targetUrl = params.get("__proxy_target");
        }
    } else {
        targetUrl = event.queryStringParameters.url;
    }

    if (!targetUrl) {
        return {
            statusCode: 400,
            headers: corsHeaders(),
            body: JSON.stringify({ error: "Missing URL parameter" }),
        };
    }

    try {
        const fetchOptions = {
            method: event.httpMethod,
            headers: { ...event.headers },
        };

        if (isPost) {
            fetchOptions.body = event.body;
        }

        const response = await fetch(targetUrl, fetchOptions);
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
        const baseUrl = new URL(targetUrl);

        html = html.replace(/(href|src)=["'](.*?)["']/gi, (match, attr, link) => {
            if (/^(mailto|javascript|data):/.test(link)) return match;
            const fullUrl = new URL(link, baseUrl).toString();
            return `${attr}="/.netlify/functions/proxy?url=${encodeURIComponent(fullUrl)}"`;
        });

        html = html.replace(/<form[^>]*action=["'](.*?)["'][^>]*>/gi, (match, action) => {
            const fullAction = new URL(action || baseUrl, baseUrl).toString();
            return match.replace(action, "/.netlify/functions/proxy") +
                   `<input type="hidden" name="__proxy_target" value="${fullAction}">`;
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
