export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/config.json") {
      return Response.json({ backendUrl: env.BACKEND_URL ?? null });
    }

    return new Response("Not found", { status: 404 });
  },
};
