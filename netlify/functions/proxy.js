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
    const isOptions = event.httpMethod === "OPTIONS";
    if (isOptions) {
        return {
            statusCode: 200,
            headers: corsHeaders(),
            body: "",
        };
    }

    const url = event.queryStringParameters.url;
    if (!url) {
        return {
            statusCode: 400,
            headers: corsHeaders(),
            body: JSON.stringify({ error: "Missing URL parameter" }),
        };
    }

    try {
        const fetchOptions = {
            method: event.httpMethod,
            headers: {},
        };

        if (event.httpMethod === "POST" && event.body) {
            fetchOptions.body = event.isBase64Encoded
                ? Buffer.from(event.body, "base64")
                : event.body;

            if (event.headers["content-type"]) {
                fetchOptions.headers["content-type"] = event.headers["content-type"];
            }
            if (event.headers["content-length"]) {
                fetchOptions.headers["content-length"] = event.headers["content-length"];
            }
        }

        const response = await fetch(url, fetchOptions);
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
        const baseUrl = new URL(url);

        // Rewrite href and src
        html = html.replace(/(href|src)=["'](.*?)["']/gi, (match, attr, link) => {
            if (/^(mailto|javascript|data):/.test(link)) return match;
            const fullUrl = new URL(link, baseUrl).toString();
            return `${attr}="/.netlify/functions/proxy?url=${encodeURIComponent(fullUrl)}"`;
        });

        // Rewrite form actions (important for POST like Google search)
        html = html.replace(/<form([^>]*?)action=["'](.*?)["']/gi, (match, attrs, link) => {
            if (/^(mailto|javascript|data):/.test(link)) return match;
            const fullUrl = new URL(link, baseUrl).toString();
            return `<form${attrs}action="/.netlify/functions/proxy?url=${encodeURIComponent(fullUrl)}"`;
        });

        // Rewrite meta refresh redirects
        html = html.replace(/http-equiv=["']refresh["'][^>]*content=["'][^;]+;\s*url=([^"']+)["']/gi, (match, redirectUrl) => {
            const fullUrl = new URL(redirectUrl, baseUrl).toString();
            return match.replace(redirectUrl, `/.netlify/functions/proxy?url=${encodeURIComponent(fullUrl)}`);
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
