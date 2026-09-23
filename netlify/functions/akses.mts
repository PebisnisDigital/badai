import { runVercelStyleHandler } from "./_adapter.mts";

export default async (request: Request) => {
  return runVercelStyleHandler(
    request,
    () => import("../../api/admin-v3.js"),
    { accesscompact: "1" }
  );
};

export const config = {
  path: "/akses"
};
