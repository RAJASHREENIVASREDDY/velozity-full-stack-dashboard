import { Router } from "express";
import * as c from "../controllers/notification.controller.js";
import { authenticate } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { idParamSchema } from "../schemas/common.js";
import { notificationQuery } from "../schemas/entities.js";

const r = Router();
r.use(authenticate);
r.get("/", validate({ query: notificationQuery }), c.list);
r.get("/unread-count", c.count);
r.patch("/read-all", c.markAll);
r.patch("/:id/read", validate({ params: idParamSchema }), c.markOne);
export default r;
