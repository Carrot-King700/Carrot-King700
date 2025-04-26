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
        body: JSON.stringify({ error: "Missing URL parameter" }),
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
        },
      };
    }
  
    // Handle preflight CORS
    if (event.httpMethod === "OPTIONS") {
      return {
        statusCode: 200,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
        },
        body: "",
      };
    }
  
    try {
      const response = await fetch(url, {
        method: event.httpMethod,
        headers: {
          "Content-Type": event.headers["content-type"] || "application/x-www-form-urlencoded"
        },
        body: event.httpMethod === "POST" ? event.body : undefined,
      });
  
      const contentType = response.headers.get("content-type");
      const body = await response.text();
  
      return {
        statusCode: 200,
        headers: {
          "Content-Type": contentType || "text/plain",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
        },
        body,
      };
    } catch (error) {
      return {
        statusCode: 500,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
        },
        body: JSON.stringify({
          error: "Proxy fetch failed",
          details: error.message,
        }),
      };
    }
  }
  