// netlify/functions/proxy.js
export async function handler(event) {
  // Debug info (visible in Netlify function logs)
  console.log("proxy invoked:", event.httpMethod, event.path, event.queryStringParameters);

  // Get target URL from ?url=... or X-Target-Url header fallback
  let target = event.queryStringParameters && event.queryStringParameters.url;
  if (!target && event.headers) {
    target = event.headers["x-target-url"] || event.headers["X-Target-Url"];
  }

  // If it's a relative URL, try to resolve from referer (so forms with relative action can work)
  if (target && !/^https?:\/\//i.test(target)) {
    const referer = event.headers.referer || event.headers.referrer || "";
    const m = referer.match(/url=([^&]+)/);
    if (m) {
      try {
        const base = decodeURIComponent(m[1]);
        target = new URL(target, base).toString();
      } catch (e) {
        // leave target as-is and fail later if invalid
      }
    }
  }

  if (!target) {
    console.log("missing target url; query:", event.queryStringParameters);
    return jsonResponse(400, { error: "Missing URL parameter" });
  }

  // CORS preflight
  if (event.httpMethod === "OPTIONS") {
    return corsResponse(200, "");
  }

  try {
    // Build fetch options
    const method = event.httpMethod || "GET";
    const headers = { ...(event.headers || {}) };

    // Remove headers that interfere
    delete headers.host;
    delete headers["x-forwarded-host"];
    delete headers["x-forwarded-proto"];

    const init = { method, headers };

    // Attach body for non-GET/HEAD
    if (!["GET", "HEAD"].includes(method)) {
      if (event.isBase64Encoded) {
        // binary form data
        init.body = Buffer.from(event.body || "", "base64");
      } else {
        init.body = event.body || "";
      }
    }

    console.log("fetching target:", target, "method:", method);

    // Use global fetch (Node 18+ / Netlify runtime)
    const res = await fetch(target, init);

    const contentType = (res.headers.get("content-type") || "").toLowerCase();
    console.log("fetched, status:", res.status, "content-type:", contentType);

    // Build base response headers (CORS + content-type)
    const respHeaders = {
      ...corsHeaders(),
      "Content-Type": contentType || "application/octet-stream",
    };

    // For HTML/text responses we rewrite links/forms and inject navigation script
    if (contentType.includes("text/html") || contentType.includes("text/")) {
      let html = await res.text();

      // 1) Rewrite href/src/action attributes (handles relative and absolute)
      // Avoid rewriting if already proxied (contains /.netlify/functions/proxy)
      html = html.replace(/(href|src|action)=["']([^"']+)["']/gi, (m, attr, link) => {
        // ignore special schemes and anchors
        if (/^(#|mailto:|javascript:|data:|blob:|tel:|sms:)/i.test(link)) return `${attr}="${link}"`;

        // if already proxy link, leave it
        if (link.includes("/.netlify/functions/proxy")) return `${attr}="${link}"`;

        // resolve absolute
        let abs;
        try {
          abs = new URL(link, target).toString();
        } catch (e) {
          return `${attr}="${link}"`;
        }

        // For form actions we want the form to post to our function with url param
        if (attr.toLowerCase() === "action") {
          return `${attr}="https://gregarious-piroshki-a874a0.netlify.app/.netlify/functions/proxy?url=${encodeURIComponent(abs)}"`;
        }

        // For resources and links route them through the proxy too
        return `${attr}="https://gregarious-piroshki-a874a0.netlify.app/.netlify/functions/proxy?url=${encodeURIComponent(abs)}"`;
      });

      // 2) Inject small client-side script to intercept JS navigation and form submits
      const injector = `
<script>
(function(){
  // Intercept normal anchor clicks
  document.addEventListener('click', function(e){
    try {
      var a = e.target.closest && e.target.closest('a[href]');
      if (!a) return;
      var href = a.getAttribute('href') || '';
      if (!href) return;
      if (href.startsWith('javascript:') || href.startsWith('mailto:') || href.startsWith('#')) return;
      if (href.includes('/.netlify/functions/proxy')) return; // already proxied
      e.preventDefault();
      var prox = 'https://gregarious-piroshki-a874a0.netlify.app/.netlify/functions/proxy?url=' + encodeURIComponent(new URL(href, location.href).href);
      window.location.href = prox;
    } catch(e) { /* ignore */ }
  }, false);

  // Intercept form submissions so they post to our function (preserve method)
  document.addEventListener('submit', function(e){
    try {
      var f = e.target;
      if (!f || !f.action) return;
      if (f.action.includes('/.netlify/functions/proxy')) return;
      e.preventDefault();

      var method = (f.method || 'GET').toUpperCase();
      var actionAbs = new URL(f.action || window.location.href, window.location.href).href;
      var proxAction = 'https://gregarious-piroshki-a874a0.netlify.app/.netlify/functions/proxy?url=' + encodeURIComponent(actionAbs);

      // Build form data and submit via fetch, then replace document with response
      var formData = new FormData(f);
      var init = { method: method };
      if (method !== 'GET') {
        init.body = formData;
      } else {
        // GET -> convert to query string and change proxAction
        var params = new URLSearchParams(formData);
        proxAction = proxAction + '&' + params.toString();
      }

      fetch(proxAction, init).then(function(r){ return r.text(); }).then(function(html){
        document.open();
        document.write(html);
        document.close();
      }).catch(function(err){
        console.error('Form submit proxy failed', err);
        window.open(proxAction, '_blank');
      });
    } catch(e) { /* ignore */ }
  }, false);
})();
</script>
`;

      // Put injector before </body>
      html = html.replace(/<\/body>/i, injector + "</body>");

      return {
        statusCode: 200,
        headers: respHeaders,
        body: html,
      };
    }

    // Otherwise return binary data as base64
    const arrayBuf = await res.arrayBuffer();
    const b64 = Buffer.from(arrayBuf).toString("base64");

    return {
      statusCode: res.status,
      headers: respHeaders,
      body: b64,
      isBase64Encoded: true,
    };
  } catch (err) {
    console.error("proxy error:", err);
    return jsonResponse(500, { error: "Proxy fetch failed", details: err.message });
  }
}

// helpers
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
