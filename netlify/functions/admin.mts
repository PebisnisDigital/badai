import { runVercelStyleHandler } from "./_adapter.mts";

export default async (request: Request) => {
  return runVercelStyleHandler(
    request,
    () => import("../../api/admin-v5.js")
  );
};

export const config = {
  path: "/admin"
};
