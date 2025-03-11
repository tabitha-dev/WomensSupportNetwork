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
  await fs.mkdir("uploads/music", { recursive: true });
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

  app.post("/api/groups/:groupId/posts/music", upload.single("music"), async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const musicUrl = `/uploads/music/${req.file.filename}`;
      const post = await storage.createPost({
        content: req.body.content || "Shared a music track",
        userId: req.user!.id,
        groupId: parseInt(req.params.groupId),
        postType: "music",
        musicUrl,
        imageUrl: null,
        videoUrl: null,
        likeCount: 0,
      });

      res.status(201).json(post);
    } catch (error) {
      console.error("Error uploading music:", error);
      res.status(500).json({ error: "Failed to upload music" });
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
      console.log('Routes: Received request for group:', groupId);

      if (isNaN(groupId)) {
        console.error('Routes: Invalid group ID:', req.params.id);
        return res.status(400).json({ error: "Invalid group ID" });
      }

      const group = await storage.getGroupById(groupId);
      console.log('Routes: Group fetch result:', group);

      if (!group) {
        console.error('Routes: Group not found:', groupId);
        return res.status(404).json({ error: "Group not found" });
      }

      console.log('Routes: Sending complete group response:', {
        id: group.id,
        name: group.name,
        memberCount: group.members?.length || 0,
        postCount: group.posts?.length || 0,
        messageCount: group.chatMessages?.length || 0
      });

      res.json(group);
    } catch (error) {
      console.error('Routes: Error in group fetch:', error);
      res.status(500).json({
        error: "Failed to fetch group",
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  app.get("/api/groups/:id/posts", async (req, res) => {
    try {
      const posts = await storage.getGroupPosts(parseInt(req.params.id));
      res.json(posts);
    } catch (error) {
      console.error("Error fetching group posts:", error);
      res.status(500).json({ error: "Failed to fetch posts" });
    }
  });

  app.post("/api/groups/:id/posts", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      console.log('Creating post with data:', req.body);
      let postType = req.body.postType;
      let videoUrl = null;
      let musicUrl = null;

      // Handle YouTube URLs
      if (postType === "video" && req.body.mediaUrl) {
        try {
          console.log('Processing YouTube URL:', req.body.mediaUrl);
          const url = req.body.mediaUrl;
          let videoId = null;

          // Handle youtu.be format
          if (url.includes('youtu.be/')) {
            const urlParts = url.split('youtu.be/');
            if (urlParts.length > 1) {
              videoId = urlParts[1].split(/[?#]/)[0]; // Remove query params and hash
            }
          } 
          // Handle youtube.com format
          else if (url.includes('youtube.com')) {
            const urlObj = new URL(url);
            videoId = urlObj.searchParams.get('v');
          }

          console.log('Extracted video ID:', videoId);

          if (videoId && videoId.length === 11) {
            videoUrl = `https://www.youtube.com/embed/${videoId}`;
            console.log('Processed YouTube URL:', videoUrl);
          } else {
            console.error('Invalid YouTube video ID:', videoId);
            return res.status(400).json({ error: "Invalid YouTube video ID" });
          }
        } catch (error) {
          console.error('Error processing YouTube URL:', error);
          return res.status(400).json({ error: "Failed to process YouTube URL" });
        }
      }

      // Handle Spotify URLs
      if (postType === "music" && req.body.mediaUrl) {
        try {
          console.log('Processing Spotify URL:', req.body.mediaUrl);
          const url = req.body.mediaUrl;
          let trackId = null;

          if (url.includes('spotify.com/track/')) {
            const match = url.match(/track\/([a-zA-Z0-9]+)/);
            if (match && match[1]) {
              trackId = match[1].split(/[?#]/)[0]; // Remove query params and hash
            }
          } else if (url.includes('spotify:track:')) {
            const match = url.match(/track:([a-zA-Z0-9]+)/);
            if (match) {
              trackId = match[1];
            }
          }

          console.log('Extracted track ID:', trackId);

          if (trackId) {
            musicUrl = `https://open.spotify.com/embed/track/${trackId}`;
            console.log('Processed Spotify URL:', musicUrl);
          } else {
            console.error('Invalid Spotify track ID');
            return res.status(400).json({ error: "Invalid Spotify URL" });
          }
        } catch (error) {
          console.error('Error processing Spotify URL:', error);
          return res.status(400).json({ error: "Failed to process Spotify URL" });
        }
      }

      console.log('Creating post with:', {
        content: req.body.content,
        postType,
        videoUrl,
        musicUrl,
        groupId: req.params.id
      });

      const post = await storage.createPost({
        content: req.body.content,
        userId: req.user!.id,
        groupId: parseInt(req.params.id),
        postType,
        imageUrl: postType === "image" ? req.body.mediaUrl : null,
        musicUrl,
        videoUrl,
        likeCount: 0,
      });

      console.log('Created post:', post);
      res.status(201).json(post);
    } catch (error) {
      console.error("Error creating post:", error);
      res.status(500).json({ error: "Failed to create post" });
    }
  });

  // Add delete post endpoint
  app.delete("/api/posts/:id", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const postId = parseInt(req.params.id);
      const deleted = await storage.deletePost(postId, req.user!.id);

      if (!deleted) {
        return res.status(404).json({ error: "Post not found or unauthorized" });
      }

      res.sendStatus(200);
    } catch (error) {
      console.error("Error deleting post:", error);
      res.status(500).json({ error: "Failed to delete post" });
    }
  });

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

  app.post("/api/groups/:id/join", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      await storage.joinGroup(req.user!.id, parseInt(req.params.id));
      res.sendStatus(200);
    } catch (error) {
      console.error("Error joining group:", error);
      res.status(500).json({ error: "Failed to join group" });
    }
  });

  app.post("/api/groups/:id/leave", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      await storage.leaveGroup(req.user!.id, parseInt(req.params.id));
      res.sendStatus(200);
    } catch (error) {
      console.error("Error leaving group:", error);
      res.status(500).json({ error: "Failed to leave group" });
    }
  });

  app.patch("/api/posts/:id", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Not authenticated" });
      }
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

  app.get("/api/posts/:id/comments", async (req, res) => {
    try {
      const comments = await storage.getPostComments(parseInt(req.params.id));
      res.json(comments);
    } catch (error) {
      console.error("Error fetching post comments:", error);
      res.status(500).json({ error: "Failed to fetch comments" });
    }
  });

  app.post("/api/posts/:id/comments", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Not authenticated" });
      }
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

  app.post("/api/posts/:id/like", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Not authenticated" });
      }
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
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Not authenticated" });
      }
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

  app.get("/api/users/:id/posts", async (req, res) => {
    try {
      const posts = await storage.getUserPosts(parseInt(req.params.id));
      res.json(posts);
    } catch (error) {
      console.error("Error fetching user posts:", error);
      res.status(500).json({ error: "Failed to fetch user posts" });
    }
  });

  app.get("/api/users/:id/friends", async (req, res) => {
    try {
      const friends = await storage.getFriends(parseInt(req.params.id));
      res.json(friends);
    } catch (error) {
      console.error("Error fetching friends:", error);
      res.status(500).json({ error: "Failed to fetch friends" });
    }
  });

  app.get("/api/users/friend-requests", async (req, res) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ error: "Not authenticated" });
      const requests = await storage.getFriendRequests(req.user!.id);
      res.json(requests);
    } catch (error) {
      console.error("Error fetching friend requests:", error);
      res.status(500).json({ error: "Failed to fetch friend requests" });
    }
  });

  app.post("/api/users/:id/friend-request", async (req, res) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ error: "Not authenticated" });
      await storage.sendFriendRequest(req.user!.id, parseInt(req.params.id));
      res.sendStatus(200);
    } catch (error) {
      console.error("Error sending friend request:", error);
      res.status(500).json({ error: "Failed to send friend request" });
    }
  });

  app.post("/api/users/:id/accept-friend", async (req, res) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ error: "Not authenticated" });
      await storage.acceptFriendRequest(parseInt(req.params.id), req.user!.id);
      res.sendStatus(200);
    } catch (error) {
      console.error("Error accepting friend request:", error);
      res.status(500).json({ error: "Failed to accept friend request" });
    }
  });

  app.post("/api/users/:id/reject-friend", async (req, res) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ error: "Not authenticated" });
      await storage.rejectFriendRequest(parseInt(req.params.id), req.user!.id);
      res.sendStatus(200);
    } catch (error) {
      console.error("Error rejecting friend request:", error);
      res.status(500).json({ error: "Failed to reject friend request" });
    }
  });

  app.get("/api/users/:id/followers", async (req, res) => {
    try {
      const followers = await storage.getFollowers(parseInt(req.params.id));
      res.json(followers);
    } catch (error) {
      console.error("Error fetching followers:", error);
      res.status(500).json({ error: "Failed to fetch followers" });
    }
  });

  app.get("/api/users/:id/following", async (req, res) => {
    try {
      const following = await storage.getFollowing(parseInt(req.params.id));
      res.json(following);
    } catch (error) {
      console.error("Error fetching following:", error);
      res.status(500).json({ error: "Failed to fetch following" });
    }
  });

  app.post("/api/users/:id/follow", async (req, res) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ error: "Not authenticated" });
      await storage.followUser(req.user!.id, parseInt(req.params.id));
      res.sendStatus(200);
    } catch (error) {
      console.error("Error following user:", error);
      res.status(500).json({ error: "Failed to follow user" });
    }
  });

  app.post("/api/users/:id/unfollow", async (req, res) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ error: "Not authenticated" });
      await storage.unfollowUser(req.user!.id, parseInt(req.params.id));
      res.sendStatus(200);
    } catch (error) {
      console.error("Error unfollowing user:", error);
      res.status(500).json({ error: "Failed to unfollow user" });
    }
  });

  app.get("/api/users/:id/is-following", async (req, res) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ error: "Not authenticated" });
      const isFollowing = await storage.isFollowing(
        req.user!.id,
        parseInt(req.params.id)
      );
      res.json(isFollowing);
    } catch (error) {
      console.error("Error checking if following:", error);
      res.status(500).json({ error: "Failed to check if following" });
    }
  });

  app.patch("/api/users/:id", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      if (req.user!.id !== parseInt(req.params.id)) {
        return res.status(403).json({ error: "Not authorized" });
      }
      const user = await storage.updateUser(req.user!.id, req.body);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      const { password, ...safeUser } = user;
      res.json(safeUser);
    } catch (error) {
      console.error("Error updating user:", error);
      res.status(500).json({ error: "Failed to update user" });
    }
  });

  app.get("/api/groups/:id/members", async (req, res) => {
    try {
      const members = await storage.getGroupMembers(parseInt(req.params.id));
      res.json(members);
    } catch (error) {
      console.error("Error fetching group members:", error);
      res.status(500).json({ error: "Failed to fetch group members" });
    }
  });

  app.post("/api/groups/:id/members", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      await storage.addGroupMember(req.user!.id, parseInt(req.params.id), req.body.role);
      res.sendStatus(200);
    } catch (error) {
      console.error("Error adding group member:", error);
      res.status(500).json({ error: "Failed to add group member" });
    }
  });

  app.get("/api/groups/:id/chat", async (req, res) => {
    try {
      const messages = await storage.getGroupChat(parseInt(req.params.id));
      res.json(messages);
    } catch (error) {
      console.error("Error fetching group chat messages:", error);
      res.status(500).json({ error: "Failed to fetch group chat messages" });
    }
  });

  app.post("/api/groups/:id/chat", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const message = await storage.createChatMessage(
        req.user!.id,
        parseInt(req.params.id),
        req.body.message
      );
      res.status(201).json(message);
    } catch (error) {
      console.error("Error creating chat message:", error);
      res.status(500).json({ error: "Failed to create chat message" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}