import { Router } from "express";
import { authenticate } from "../../middleware/auth.js";
import { validate } from "../../middleware/validate.js";
import * as controller from "./connection.controller.js";
import { linkConnectionSchema } from "./validation.js";

export const connectionRouter = Router();

connectionRouter.use(authenticate);
connectionRouter.get("/status", controller.getStatus);
connectionRouter.post("/link/:platform(linkedin|naukri)", validate(linkConnectionSchema), controller.link);
connectionRouter.post("/unlink/:platform(linkedin|naukri)", controller.unlink);
