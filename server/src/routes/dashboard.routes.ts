import { Router } from "express";
import * as c from "../controllers/dashboard.controller.js";
import { authenticate, requireRole } from "../middleware/auth.js";

const r = Router();
r.use(authenticate);
r.get("/admin", requireRole("ADMIN"), c.admin);
r.get("/pm", requireRole("ADMIN", "PROJECT_MANAGER"), c.pm);
r.get("/dev", requireRole("ADMIN", "DEVELOPER", "PROJECT_MANAGER"), c.dev);
export default r;
