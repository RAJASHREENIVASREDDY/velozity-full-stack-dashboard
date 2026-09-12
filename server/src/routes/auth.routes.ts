import { Router } from "express";
import rateLimit from "express-rate-limit";
import * as c from "../controllers/auth.controller.js";
import { authenticate } from "../middleware/auth.js";

const r = Router();
const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 50 });

r.post("/login", loginLimiter, c.postLogin);
r.post("/refresh", c.postRefresh);
r.post("/logout", c.postLogout);
r.get("/me", authenticate, c.getMe);

export default r;
