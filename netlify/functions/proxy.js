export async function handler(event) {
    const url = event.queryStringParameters.url;
    
    if (!url) {
        return {
            statusCode: 400,
            body: JSON.stringify({ error: "Missing URL parameter" }),
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
                "Access-Control-Allow-Origin": "*",
            },
            body: data,
        };
    } catch (error) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: "Failed to fetch the requested URL" }),
        };
    }
}
