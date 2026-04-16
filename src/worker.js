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

    return env.ASSETS.fetch(request);
  },
};
