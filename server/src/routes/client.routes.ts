import { Router } from "express";
import * as c from "../controllers/client.controller.js";
import { authenticate } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { idParamSchema } from "../schemas/common.js";

const r = Router();
r.use(authenticate);
r.get("/", c.list);
r.post("/", c.create);
r.get("/:id", validate({ params: idParamSchema }), c.getOne);
r.patch("/:id", validate({ params: idParamSchema }), c.update);
r.delete("/:id", validate({ params: idParamSchema }), c.remove);
export default r;
