import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";

export async function registerRoutes(app: Express): Promise<Server> {
  setupAuth(app);

  app.get("/api/groups", async (req, res) => {
    const groups = await storage.getGroups();
    res.json(groups);
  });

  app.get("/api/groups/:id", async (req, res) => {
    const group = await storage.getGroupById(parseInt(req.params.id));
    if (!group) {
      return res.status(404).send("Group not found");
    }
    res.json(group);
  });

  app.get("/api/groups/:id/posts", async (req, res) => {
    const posts = await storage.getGroupPosts(parseInt(req.params.id));
    res.json(posts);
  });

  app.post("/api/groups/:id/posts", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).send("Not authenticated");
    }

    const post = await storage.createPost({
      content: req.body.content,
      userId: req.user!.id,
      groupId: parseInt(req.params.id),
    });

    res.status(201).json(post);
  });

  app.post("/api/groups/:id/join", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).send("Not authenticated");
    }

    await storage.joinGroup(req.user!.id, parseInt(req.params.id));
    res.sendStatus(200);
  });

  app.post("/api/groups/:id/leave", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).send("Not authenticated");
    }

    await storage.leaveGroup(req.user!.id, parseInt(req.params.id));
    res.sendStatus(200);
  });

  app.get("/api/user/groups", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).send("Not authenticated");
    }

    const groups = await storage.getUserGroups(req.user!.id);
    res.json(groups);
  });

  const httpServer = createServer(app);
  return httpServer;
}
