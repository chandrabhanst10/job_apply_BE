declare module "hpp" {
  import type { RequestHandler } from "express";
  function hpp(options?: Record<string, unknown>): RequestHandler;
  export default hpp;
}
