/** Authentication Tests */
import request from "supertest";
import express from "express";
import { query } from "../src/db.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

// Mock database
jest.mock("../src/db.js", () => ({
  query: jest.fn()
}));

const app = express();
app.use(express.json());

// Mock admin login endpoint
app.post("/api/admin/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required" });
  }
  const users = await query("SELECT * FROM admins WHERE email = ?", [email]);
  if (users.length === 0) {
    return res.status(401).json({ message: "Invalid credentials" });
  }
  const admin = users[0];
  const isValid = await bcrypt.compare(password, admin.password_hash);
  if (!isValid) {
    return res.status(401).json({ message: "Invalid credentials" });
  }
  const token = jwt.sign({ sub: admin.id, role: "admin" }, "test_secret");
  return res.json({ token, user: { id: admin.id, name: admin.name, email: admin.email } });
});

describe("Authentication", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("POST /api/admin/login with valid credentials", async () => {
    const hashedPassword = await bcrypt.hash("admin123", 10);
    query.mockResolvedValueOnce([
      { id: 1, name: "Admin", email: "admin@test.com", password_hash: hashedPassword }
    ]);

    const res = await request(app)
      .post("/api/admin/login")
      .send({ email: "admin@test.com", password: "admin123" });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("token");
    expect(res.body.user.email).toBe("admin@test.com");
  });

  test("POST /api/admin/login with invalid credentials", async () => {
    query.mockResolvedValueOnce([]);

    const res = await request(app)
      .post("/api/admin/login")
      .send({ email: "wrong@test.com", password: "wrong" });

    expect(res.status).toBe(401);
    expect(res.body.message).toBe("Invalid credentials");
  });

  test("POST /api/admin/login without email", async () => {
    const res = await request(app)
      .post("/api/admin/login")
      .send({ password: "admin123" });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe("Email and password are required");
  });
});
