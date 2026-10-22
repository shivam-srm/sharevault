import assert from "node:assert/strict";
import { test } from "node:test";
import express from "express";
import jwt from "jsonwebtoken";
import request from "supertest";
import { z } from "zod";
import authenticate from "../src/middlewares/auth.middlewares.js";
import { validate } from "../src/middlewares/validate.middlewares.js";

process.env.JWT_SECRET = "sharevault-test-secret";

const app = express();
app.use(express.json());

app.post(
  "/validated",
  validate({ body: z.object({ name: z.string().min(1, "Name is required") }) }),
  (req, res) => res.status(201).json({ name: req.body.name }),
);

app.get(
  "/validated/:resourceId",
  validate({
    params: z.object({ resourceId: z.string() }),
    query: z.object({ view: z.literal("summary") }),
  }),
  (req, res) => res.json({ resourceId: req.params.resourceId, view: req.query.view }),
);

app.post(
  "/invalid-validator",
  validate({ body: { parse: () => { throw new Error("Unexpected validator error"); } } }),
  (_req, res) => res.sendStatus(204),
);

app.get("/protected", authenticate, (req, res) => {
  res.json({ userId: req.user.userId });
});

test("request validation accepts valid data and rejects invalid data", async (t) => {
  await t.test("accepts a valid request body", async () => {
    const response = await request(app)
      .post("/validated")
      .send({ name: "Example User" });

    assert.equal(response.status, 201);
    assert.deepEqual(response.body, { name: "Example User" });
  });

  await t.test("returns a clear client error for invalid request data", async () => {
    const response = await request(app).post("/validated").send({ name: "" });

    assert.equal(response.status, 400);
    assert.deepEqual(response.body, { message: "Name is required" });
  });

  await t.test("validates route parameters and query values", async () => {
    const response = await request(app).get("/validated/file-123?view=summary");

    assert.equal(response.status, 200);
    assert.deepEqual(response.body, {
      resourceId: "file-123",
      view: "summary",
    });
  });

  await t.test("returns the fallback message for unexpected validator errors", async () => {
    const response = await request(app)
      .post("/invalid-validator")
      .send({ name: "Example User" });

    assert.equal(response.status, 400);
    assert.deepEqual(response.body, { message: "Invalid request" });
  });
});

test("authentication protects routes and accepts a valid bearer token", async (t) => {
  await t.test("rejects a request without a bearer token", async () => {
    const response = await request(app).get("/protected");

    assert.equal(response.status, 401);
    assert.deepEqual(response.body, {
      message: "Access denied. No token provided.",
    });
  });

  await t.test("rejects an invalid bearer token", async () => {
    const response = await request(app)
      .get("/protected")
      .set("Authorization", "Bearer invalid-token");

    assert.equal(response.status, 401);
    assert.deepEqual(response.body, {
      message: "Invalid or expired token.",
    });
  });

  await t.test("attaches the verified identity to the request", async () => {
    const token = jwt.sign({ userId: "test-user" }, process.env.JWT_SECRET);
    const response = await request(app)
      .get("/protected")
      .set("Authorization", `Bearer ${token}`);

    assert.equal(response.status, 200);
    assert.deepEqual(response.body, { userId: "test-user" });
  });
});
