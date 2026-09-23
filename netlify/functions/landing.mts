import { runVercelStyleHandler } from "./_adapter.mts";

export default async (request: Request) => {
  return runVercelStyleHandler(
    request,
    () => import("../../api/landing-v6.js")
  );
};

export const config = {
  path: ["/", "/:slug"],
  excludedPath: ["/admin", "/akses", "/.netlify/*"],
  preferStatic: true
};
