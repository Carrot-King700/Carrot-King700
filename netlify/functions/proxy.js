export async function handler(event) {
    const url = event.queryStringParameters.url;

    if (!url) {
        return {
            statusCode: 400,
            headers: {
                "Access-Control-Allow-Origin": "*",  // ✅ Allows requests from any website
                "Access-Control-Allow-Methods": "GET, OPTIONS", // ✅ Allows GET requests
                "Access-Control-Allow-Headers": "Content-Type",
            },
            body: JSON.stringify({ error: "Missing URL parameter" }),
        };
    }

    // Handle preflight requests (for CORS)
    if (event.httpMethod === "OPTIONS") {
        return {
            statusCode: 200,
            headers: {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "GET, OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type",
            },
            body: "",
        };
    }

    try {
        const response = await fetch(url);
        const contentType = response.headers.get("content-type");
        const data = await response.text();

        return {
            statusCode: 200,
            headers: {
                "Content-Type": contentType || "text/plain",
                "Access-Control-Allow-Origin": "*", // ✅ Fix CORS issue
                "Access-Control-Allow-Methods": "GET, OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type",
            },
            body: data,
        };
    } catch (error) {
        return {
            statusCode: 500,
            headers: {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "GET, OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type",
            },
            body: JSON.stringify({ error: "Failed to fetch the requested URL" }),
        };
    }
}
