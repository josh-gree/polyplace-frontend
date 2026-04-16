export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (env.BACKEND_URL && (url.pathname === "/grid" || url.pathname === "/ws")) {
      const backendUrl = new URL(url.pathname + url.search, env.BACKEND_URL);
      return fetch(backendUrl.toString(), request);
    }

    return env.ASSETS.fetch(request);
  },
};
