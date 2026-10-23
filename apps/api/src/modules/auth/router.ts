import { loginSchema, registerSchema } from "@qroute/shared";
import { Router } from "express";
import { prisma } from "../../lib/prisma.ts";
import { requireAuth } from "../../middleware/auth.ts";
import { authLimiter } from "../../middleware/rateLimit.ts";
import { signToken } from "../../utils/jwt.ts";
import { hashPassword, toPublicUser, verifyPassword } from "../../utils/password.ts";

export const authRouter = Router();

authRouter.post("/register", authLimiter, async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message: "Invalid registration payload",
        details: parsed.error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message,
        })),
      },
    });
    return;
  }

  const { email, name, password } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    res.status(409).json({
      error: { code: "CONFLICT", message: "An account with that email already exists" },
    });
    return;
  }

  const user = await prisma.user.create({
    data: {
      email,
      name,
      password: await hashPassword(password),
      // Assigned server-side, unconditionally. A `role` in the request body was
      // already stripped by the schema (threat T-01-12).
      role: "user",
    },
  });

  res.status(201).json({
    token: signToken({ id: user.id, role: user.role, email: user.email }),
    user: toPublicUser(user),
  });
});

authRouter.post("/login", authLimiter, async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message: "Invalid login payload",
        details: parsed.error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message,
        })),
      },
    });
    return;
  }

  const { email, password } = parsed.data;
  const user = await prisma.user.findUnique({ where: { email } });

  // Unknown email and wrong password must be indistinguishable (T-01-15).
  const passwordMatches = user ? await verifyPassword(password, user.password) : false;

  if (!user || !passwordMatches) {
    res.status(401).json({
      error: { code: "UNAUTHORIZED", message: "Invalid email or password" },
    });
    return;
  }

  res.status(200).json({
    token: signToken({ id: user.id, role: user.role, email: user.email }),
    user: toPublicUser(user),
  });
});

authRouter.get("/me", requireAuth, (req, res) => {
  res.status(200).json({ user: req.user });
});
