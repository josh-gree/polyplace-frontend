export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/") {
      const response = await env.ASSETS.fetch(request);
      const text = await response.text();
      const backendUrl = env.BACKEND_URL ?? "";
      const injected = text.replace(
        "<head>",
        `<head><script>window.BACKEND_URL = ${JSON.stringify(backendUrl)};</script>`
      );
      return new Response(injected, {
        headers: response.headers,
        status: response.status,
      });
    }

    if (env.BACKEND_URL && (url.pathname === "/grid" || url.pathname === "/ws")) {
      const backendUrl = new URL(url.pathname + url.search, env.BACKEND_URL);
      return fetch(backendUrl.toString(), request);
    }

    return env.ASSETS.fetch(request);
  },
};
