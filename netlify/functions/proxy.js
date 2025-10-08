export async function handler(event) {
  const targetUrl = event.queryStringParameters.url || event.headers["x-target-url"];
  if (!targetUrl) {
    return jsonResponse(400, { error: "Missing URL parameter" });
  }

  // Handle CORS preflight
  if (event.httpMethod === "OPTIONS") {
    return corsResponse(200, "");
  }

  try {
    const method = event.httpMethod;
    const headers = { ...event.headers };
    delete headers.host;

    const init = { method, headers };
    if (!["GET", "HEAD"].includes(method) && event.body) {
      init.body = event.body;
    }

    const response = await fetch(targetUrl, init);
    const contentType = response.headers.get("content-type") || "";

    // For text or HTML content
    if (contentType.includes("text") || contentType.includes("html")) {
      let html = await response.text();

      // Fix relative URLs (href/src)
      html = html.replace(/(href|src)="(?!http|\/\/)([^"]+)"/g, (m, attr, path) => {
        const fixedUrl = new URL(path, targetUrl).href;
        return `${attr}="https://gregarious-piroshki-a874a0.netlify.app/.netlify/functions/proxy?url=${encodeURIComponent(fixedUrl)}"`;
      });

      // Fix form actions
      html = html.replace(/<form([^>]*?)action="([^"]*)"([^>]*)>/g, (match, pre, action, post) => {
        const abs = new URL(action || targetUrl, targetUrl).href;
        return `<form${pre}action="https://gregarious-piroshki-a874a0.netlify.app/.netlify/functions/proxy?url=${encodeURIComponent(abs)}"${post} target="_self">`;
      });

      // Inject JS to dynamically rewrite links
      const injector = `
        <script>
        document.addEventListener("click", e => {
          const a = e.target.closest("a[href]");
          if (a && !a.target && !a.href.startsWith("javascript:")) {
            e.preventDefault();
            const newUrl = "https://gregarious-piroshki-a874a0.netlify.app/.netlify/functions/proxy?url=" + encodeURIComponent(a.href);
            window.location.href = newUrl;
          }
        });
        document.addEventListener("submit", e => {
          const f = e.target;
          if (f && f.action) {
            f.action = "https://gregarious-piroshki-a874a0.netlify.app/.netlify/functions/proxy?url=" + encodeURIComponent(f.action);
          }
        });
        </script>
      `;
      html = html.replace(/<\/body>/i, injector + "</body>");

      return {
        statusCode: 200,
        headers: {
          ...corsHeaders(),
          "Content-Type": "text/html; charset=utf-8",
        },
        body: html,
      };
    }

    // For binary or other content
    const buffer = await response.arrayBuffer();
    return {
      statusCode: response.status,
      headers: {
        ...corsHeaders(),
        "Content-Type": contentType,
      },
      body: Buffer.from(buffer).toString("base64"),
      isBase64Encoded: true,
    };
  } catch (err) {
    return jsonResponse(500, { error: "Proxy fetch failed", details: err.message });
  }
}

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-Target-Url",
  };
}
function corsResponse(status, body) {
  return { statusCode: status, headers: corsHeaders(), body };
}
function jsonResponse(status, obj) {
  return { statusCode: status, headers: corsHeaders(), body: JSON.stringify(obj) };
}