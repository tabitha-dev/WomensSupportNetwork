import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { upload } from "./upload";
import fs from "fs/promises";
import path from "path";
import express from "express";

export async function registerRoutes(app: Express): Promise<Server> {
  await fs.mkdir("uploads/avatars", { recursive: true });

  setupAuth(app);

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

  // Get post comments and their users
  app.get("/api/posts/:id/comments", async (req, res) => {
    try {
      const comments = await storage.getPostComments(parseInt(req.params.id));
      res.json(comments);
    } catch (error) {
      console.error("Error fetching comments:", error);
      res.status(500).json({ error: "Failed to fetch comments" });
    }
  });

  // Get comment users for a post
  app.get("/api/posts/:id/comment-users", async (req, res) => {
    try {
      const users = await storage.getCommentUsers(parseInt(req.params.id));
      res.json(users);
    } catch (error) {
      console.error("Error fetching comment users:", error);
      res.status(500).json({ error: "Failed to fetch comment users" });
    }
  });

  // Add comment to post
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

  // Like/unlike post
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

  // Check if user liked post
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

  // Get post reactions
  app.get("/api/posts/:id/reactions", async (req, res) => {
    try {
      const reactions = await storage.getPostReactions(parseInt(req.params.id));
      res.json(reactions);
    } catch (error) {
      console.error("Error fetching reactions:", error);
      res.status(500).json({ error: "Failed to fetch reactions" });
    }
  });

  // Add reaction to post
  app.post("/api/posts/:id/reactions", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const reaction = await storage.addReaction(
        req.user!.id,
        parseInt(req.params.id),
        req.body.emoji
      );
      res.status(201).json(reaction);
    } catch (error) {
      console.error("Error adding reaction:", error);
      res.status(500).json({ error: "Failed to add reaction" });
    }
  });

  // Remove reaction from post
  app.delete("/api/posts/:id/reactions", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      await storage.removeReaction(
        req.user!.id,
        parseInt(req.params.id),
        req.body.emoji
      );
      res.sendStatus(200);
    } catch (error) {
      console.error("Error removing reaction:", error);
      res.status(500).json({ error: "Failed to remove reaction" });
    }
  });

  // Get user data
  app.get("/api/users/:id", async (req, res) => {
    try {
      const user = await storage.getUser(parseInt(req.params.id));
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      const { password, ...safeUser } = user;
      res.json(safeUser);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ error: "Failed to fetch user" });
    }
  });

  // Update user profile
  app.patch("/api/users/:id", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const userId = parseInt(req.params.id);

      // Only allow users to update their own profile
      if (req.user!.id !== userId) {
        return res.status(403).json({ error: "Not authorized" });
      }

      const updatedUser = await storage.updateUser(userId, req.body);
      const { password, ...safeUser } = updatedUser;
      res.json(safeUser);
    } catch (error) {
      console.error("Error updating user:", error);
      res.status(500).json({ error: "Failed to update user" });
    }
  });

  // Get user's posts
  app.get("/api/users/:id/posts", async (req, res) => {
    try {
      const posts = await storage.getUserPosts(parseInt(req.params.id));
      res.json(posts);
    } catch (error) {
      console.error("Error fetching user posts:", error);
      res.status(500).json({ error: "Failed to fetch user posts" });
    }
  });

  // Get user's friends
  app.get("/api/users/:id/friends", async (req, res) => {
    try {
      const friends = await storage.getUserFriends(parseInt(req.params.id));
      res.json(friends);
    } catch (error) {
      console.error("Error fetching user friends:", error);
      res.status(500).json({ error: "Failed to fetch user friends" });
    }
  });

  // Get user's followers
  app.get("/api/users/:id/followers", async (req, res) => {
    try {
      const followers = await storage.getUserFollowers(parseInt(req.params.id));
      res.json(followers);
    } catch (error) {
      console.error("Error fetching user followers:", error);
      res.status(500).json({ error: "Failed to fetch user followers" });
    }
  });

  // Get user's following
  app.get("/api/users/:id/following", async (req, res) => {
    try {
      const following = await storage.getUserFollowing(parseInt(req.params.id));
      res.json(following);
    } catch (error) {
      console.error("Error fetching user following:", error);
      res.status(500).json({ error: "Failed to fetch user following" });
    }
  });

  // Check if user is following another user
  app.get("/api/users/:id/is-following", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const isFollowing = await storage.isUserFollowing(req.user!.id, parseInt(req.params.id));
      res.json(isFollowing);
    } catch (error) {
      console.error("Error checking follow status:", error);
      res.status(500).json({ error: "Failed to check follow status" });
    }
  });

  // Follow user
  app.post("/api/users/:id/follow", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      await storage.followUser(req.user!.id, parseInt(req.params.id));
      res.sendStatus(200);
    } catch (error) {
      console.error("Error following user:", error);
      res.status(500).json({ error: "Failed to follow user" });
    }
  });

  // Unfollow user
  app.post("/api/users/:id/unfollow", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      await storage.unfollowUser(req.user!.id, parseInt(req.params.id));
      res.sendStatus(200);
    } catch (error) {
      console.error("Error unfollowing user:", error);
      res.status(500).json({ error: "Failed to unfollow user" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}