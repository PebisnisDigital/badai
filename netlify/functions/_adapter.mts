type HandlerLoader = () => Promise<any>;

type QueryValue = string | string[];
type QueryMap = Record<string, QueryValue>;

export async function runVercelStyleHandler(
  request: Request,
  loadHandler: HandlerLoader,
  queryOverrides: Record<string, string> = {}
) {
  const url = new URL(request.url);
  const query: QueryMap = {};

  for (const [key, value] of url.searchParams.entries()) {
    const current = query[key];
    if (current === undefined) query[key] = value;
    else if (Array.isArray(current)) current.push(value);
    else query[key] = [current, value];
  }

  Object.assign(query, queryOverrides);

  let statusCode = 200;
  let responseBody = "";
  const responseHeaders = new Headers();

  const req = {
    method: request.method,
    url: url.pathname + url.search,
    headers: Object.fromEntries(request.headers.entries()),
    query
  };

  const res = {
    setHeader(name: string, value: string | number | string[]) {
      const normalized = Array.isArray(value) ? value.join(", ") : String(value);
      responseHeaders.set(name, normalized);
      return this;
    },
    status(code: number) {
      statusCode = code;
      return this;
    },
    send(payload: unknown) {
      responseBody = payload == null ? "" : String(payload);
      return this;
    }
  };

  const imported = await loadHandler();
  const handler = imported?.default || imported;

  if (typeof handler !== "function") {
    return new Response("BADAI Netlify adapter: handler tidak ditemukan.", {
      status: 500,
      headers: { "Content-Type": "text/plain; charset=utf-8" }
    });
  }

  await handler(req, res);

  return new Response(responseBody, {
    status: statusCode,
    headers: responseHeaders
  });
}
