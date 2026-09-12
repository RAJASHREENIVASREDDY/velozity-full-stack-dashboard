import { Router } from "express";
import * as c from "../controllers/activity.controller.js";
import { authenticate } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { activityQuery } from "../schemas/entities.js";

const r = Router();
r.use(authenticate);
r.get("/", validate({ query: activityQuery }), c.list);
export default r;
