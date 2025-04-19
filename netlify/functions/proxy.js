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
    const url = event.queryStringParameters.url;

    if (!url) {
        return {
            statusCode: 400,
            headers: corsHeaders(),
            body: JSON.stringify({ error: "Missing URL parameter" }),
        };
    }

    // Handle preflight request
    if (event.httpMethod === "OPTIONS") {
        return {
            statusCode: 200,
            headers: corsHeaders(),
            body: "",
        };
    }

    try {
        const headers = {
            ...event.headers,
            host: new URL(url).host, // Avoid Netlify's host header causing issues
        };

        const fetchOptions = {
            method: event.httpMethod,
            headers,
        };

        // Attach body for POST, PUT, etc.
        if (event.httpMethod !== "GET" && event.body) {
            fetchOptions.body = event.isBase64Encoded
                ? Buffer.from(event.body, "base64")
                : event.body;
        }

        const response = await fetch(url, fetchOptions);
        const contentType = response.headers.get("content-type") || "text/plain";
        const data = await response.text();

        return {
            statusCode: response.status,
            headers: {
                ...corsHeaders(),
                "Content-Type": contentType,
            },
            body: data,
        };
    } catch (error) {
        return {
            statusCode: 500,
            headers: corsHeaders(),
            body: JSON.stringify({ error: "Failed to fetch the requested URL" }),
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
