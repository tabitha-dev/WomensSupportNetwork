import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { upload } from "./upload";
import fs from "fs/promises";
import path from "path";
import express from "express";

export async function registerRoutes(app: Express): Promise<Server> {
  // Create upload directories if they don't exist
  await fs.mkdir("uploads/avatars", { recursive: true });

  setupAuth(app);

  // File upload endpoints
  app.post("/api/users/avatar", upload.single("avatar"), async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const avatarUrl = `/uploads/avatars/${req.file.filename}`;
      const user = await storage.updateUser(req.user!.id, { avatarUrl });

      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      const { password, ...safeUser } = user;
      res.json(safeUser);
    } catch (error) {
      console.error("Error uploading avatar:", error);
      res.status(500).json({ error: "Failed to upload avatar" });
    }
  });

  // Serve uploaded files
  app.use("/uploads", express.static("uploads"));

  // Get all groups
  app.get("/api/groups", async (req, res) => {
    try {
      const groups = await storage.getGroups();
      res.json(groups);
    } catch (error) {
      console.error("Error fetching groups:", error);
      res.status(500).json({ error: "Failed to fetch groups" });
    }
  });

  // Get single group with all related data
  app.get("/api/groups/:id", async (req, res) => {
    try {
      const groupId = parseInt(req.params.id);

      if (isNaN(groupId)) {
        return res.status(400).json({ error: "Invalid group ID" });
      }

      const group = await storage.getGroupById(groupId);

      if (!group) {
        return res.status(404).json({ error: "Group not found" });
      }

      res.json(group);
    } catch (error) {
      console.error("Error fetching group:", error);
      res.status(500).json({ error: "Failed to fetch group" });
    }
  });

  // Get user's groups
  app.get("/api/user/groups", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const groups = await storage.getUserGroups(req.user!.id);
      res.json(groups);
    } catch (error) {
      console.error("Error fetching user groups:", error);
      res.status(500).json({ error: "Failed to fetch user groups" });
    }
  });

  // Create post in group
  app.post("/api/groups/:id/posts", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const post = await storage.createPost({
        content: req.body.content,
        userId: req.user!.id,
        groupId: parseInt(req.params.id),
        postType: req.body.postType,
        imageUrl: req.body.postType === "image" ? req.body.mediaUrl : null,
        videoUrl: req.body.postType === "video" ? req.body.mediaUrl : null,
        likeCount: 0,
      });

      res.status(201).json(post);
    } catch (error) {
      console.error("Error creating post:", error);
      res.status(500).json({ error: "Failed to create post" });
    }
  });

  // Delete post
  app.delete("/api/posts/:id", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const postId = parseInt(req.params.id);
      const success = await storage.deletePost(postId, req.user!.id);

      if (!success) {
        return res.status(404).json({ error: "Post not found or unauthorized" });
      }

      res.sendStatus(200);
    } catch (error) {
      console.error("Error deleting post:", error);
      res.status(500).json({ error: "Failed to delete post" });
    }
  });

  // Update post
  app.patch("/api/posts/:id", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const postId = parseInt(req.params.id);
      const post = await storage.updatePost(postId, req.user!.id, req.body.content);
      if (!post) {
        return res.status(404).json({ error: "Post not found or unauthorized" });
      }
      res.json(post);
    } catch (error) {
      console.error("Error updating post:", error);
      res.status(500).json({ error: "Failed to update post" });
    }
  });

  // Post comments
  app.get("/api/posts/:id/comments", async (req, res) => {
    try {
      const comments = await storage.getPostComments(parseInt(req.params.id));
      res.json(comments);
    } catch (error) {
      console.error("Error fetching comments:", error);
      res.status(500).json({ error: "Failed to fetch comments" });
    }
  });

  app.post("/api/posts/:id/comments", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const comment = await storage.createComment(
        req.user!.id,
        parseInt(req.params.id),
        req.body.content
      );
      res.status(201).json(comment);
    } catch (error) {
      console.error("Error creating comment:", error);
      res.status(500).json({ error: "Failed to create comment" });
    }
  });

  // Post likes
  app.post("/api/posts/:id/like", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const postId = parseInt(req.params.id);
      const isLiked = await storage.isPostLikedByUser(req.user!.id, postId);
      if (isLiked) {
        await storage.unlikePost(req.user!.id, postId);
      } else {
        await storage.likePost(req.user!.id, postId);
      }
      res.sendStatus(200);
    } catch (error) {
      console.error("Error liking/unliking post:", error);
      res.status(500).json({ error: "Failed to like/unlike post" });
    }
  });

  app.get("/api/posts/:id/liked", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const isLiked = await storage.isPostLikedByUser(
        req.user!.id,
        parseInt(req.params.id)
      );
      res.json(isLiked);
    } catch (error) {
      console.error("Error checking if post is liked:", error);
      res.status(500).json({ error: "Failed to check if post is liked" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}