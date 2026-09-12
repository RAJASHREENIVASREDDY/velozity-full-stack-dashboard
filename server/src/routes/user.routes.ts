import { Router } from "express";
import * as c from "../controllers/user.controller.js";
import { authenticate, requireRole } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { idParamSchema, paginationQuery } from "../schemas/common.js";

const r = Router();
r.use(authenticate, requireRole("ADMIN"));
r.get("/", validate({ query: paginationQuery }), c.list);
r.post("/", c.create);
r.get("/:id", validate({ params: idParamSchema }), c.getOne);
r.patch("/:id", validate({ params: idParamSchema }), c.update);
export default r;
