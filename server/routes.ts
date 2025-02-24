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
      likeCount: 0,
    });

    res.status(201).json(post);
  });

  app.patch("/api/posts/:id", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).send("Not authenticated");
    }

    const postId = parseInt(req.params.id);
    const post = await storage.updatePost(postId, req.user!.id, req.body.content);

    if (!post) {
      return res.status(404).send("Post not found or unauthorized");
    }

    res.json(post);
  });

  // New routes for social features
  app.get("/api/posts/:id/comments", async (req, res) => {
    const comments = await storage.getPostComments(parseInt(req.params.id));
    res.json(comments);
  });

  app.post("/api/posts/:id/comments", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).send("Not authenticated");
    }

    const comment = await storage.createComment(
      req.user!.id,
      parseInt(req.params.id),
      req.body.content
    );

    res.status(201).json(comment);
  });

  app.post("/api/posts/:id/like", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).send("Not authenticated");
    }

    const postId = parseInt(req.params.id);
    const isLiked = await storage.isPostLikedByUser(req.user!.id, postId);

    if (isLiked) {
      await storage.unlikePost(req.user!.id, postId);
    } else {
      await storage.likePost(req.user!.id, postId);
    }

    res.sendStatus(200);
  });

  app.get("/api/posts/:id/liked", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).send("Not authenticated");
    }

    const isLiked = await storage.isPostLikedByUser(
      req.user!.id,
      parseInt(req.params.id)
    );

    res.json(isLiked);
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

  app.get("/api/users/:id", async (req, res) => {
    const user = await storage.getUser(parseInt(req.params.id));
    if (!user) {
      return res.status(404).send("User not found");
    }

    // Don't send sensitive information
    const { password, ...safeUser } = user;
    res.json(safeUser);
  });

  const httpServer = createServer(app);
  return httpServer;
}