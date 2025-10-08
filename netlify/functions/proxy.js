export async function handler(event) {
  const queryUrl = event.queryStringParameters.url;
  const targetUrl = queryUrl || event.headers["x-target-url"];

  // Handle missing URL
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
      init.body = event.isBase64Encoded
        ? Buffer.from(event.body, "base64")
        : event.body;
    }

    const response = await fetch(targetUrl, init);
    const contentType = response.headers.get("content-type") || "";
    const newHeaders = { ...corsHeaders() };

    // Strip anti-embed headers
    for (const [key, value] of response.headers.entries()) {
      if (!/x-frame-options|content-security-policy/i.test(key)) {
        newHeaders[key] = value;
      }
    }

    // Handle HTML rewriting
    if (contentType.includes("text/html")) {
      let html = await response.text();

      // Rewrite relative links
      html = html.replace(/(href|src)="(?!http|\/\/)([^"]+)"/g, (m, attr, path) => {
        const abs = new URL(path, targetUrl).href;
        return `${attr}="https://gregarious-piroshki-a874a0.netlify.app/.netlify/functions/proxy?url=${encodeURIComponent(abs)}"`;
      });

      // Fix form actions (including Google)
      html = html.replace(/<form([^>]*?)action="([^"]*)"([^>]*)>/g, (match, pre, action, post) => {
        const abs = new URL(action || targetUrl, targetUrl).href;
        return `<form${pre}action="https://gregarious-piroshki-a874a0.netlify.app/.netlify/functions/proxy?url=${encodeURIComponent(abs)}"${post} target="_self" method="post">`;
      });

      // Inject JavaScript to rewrite navigation
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
        headers: { ...newHeaders, "Content-Type": "text/html; charset=utf-8" },
        body: html,
      };
    }

    // Handle non-HTML (images, etc.)
    const buffer = await response.arrayBuffer();
    return {
      statusCode: response.status,
      headers: newHeaders,
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
