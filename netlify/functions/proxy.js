const fetch = (...args) => import("node-fetch").then(({ default: fetch }) => fetch(...args));

export async function handler(event) {
    const { url } = event.queryStringParameters;
    
    if (!url) {
        return {
            statusCode: 400,
            body: "Missing URL parameter",
        };
    }

    try {
        const response = await fetch(url);
        const contentType = response.headers.get("content-type");

        return {
            statusCode: 200,
            headers: {
                "Content-Type": contentType,
                "Access-Control-Allow-Origin": "*",
            },
            body: await response.text(),
        };
    } catch (error) {
        return {
            statusCode: 500,
            body: "Error fetching URL",
        };
    }
}
