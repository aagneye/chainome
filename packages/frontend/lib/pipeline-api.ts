import "server-only";

/**
 * Server-side client for the lab node's job service (Azure VM). The service token never reaches
 * the browser; the browser only ever gets a short-lived, single-job upload URL.
 */
export function pipelineApi() {
  const url = process.env.PIPELINE_API_URL?.replace(/\/$/, "");
  const token = process.env.PIPELINE_API_TOKEN;
  if (!url || !token) return null;
  return {
    async request(path: string, init: RequestInit = {}) {
      return fetch(`${url}${path}`, {
        ...init,
        cache: "no-store",
        headers: { ...(init.headers ?? {}), authorization: `Bearer ${token}`, "content-type": "application/json" },
      });
    },
  };
}
