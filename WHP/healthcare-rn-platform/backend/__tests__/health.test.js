/** Health Check Tests */
import request from "supertest";
import { createServer } from "http";
import express from "express";
import { registerHealthRoutes } from "../src/routes/health.js";

const app = express();
registerHealthRoutes(app);
const server = createServer(app);

describe("Health Check Endpoints", () => {
  afterAll(() => {
    server.close();
  });

  test("GET /health returns 200", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
    expect(res.body).toHaveProperty("timestamp");
    expect(res.body).toHaveProperty("uptime");
  });

  test("GET /live returns 200", async () => {
    const res = await request(app).get("/live");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("alive");
  });
});
