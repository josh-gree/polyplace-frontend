export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (env.BACKEND_URL && (url.pathname === "/grid" || url.pathname === "/ws")) {
      const backendUrl = new URL(url.pathname + url.search, env.BACKEND_URL);
      console.log(`proxying ${url.pathname} -> ${backendUrl.toString()}`);
      return fetch(backendUrl.toString(), request);
    }

    console.log(`no BACKEND_URL set, falling through to assets for ${url.pathname}`);

    return env.ASSETS.fetch(request);
  },
};
