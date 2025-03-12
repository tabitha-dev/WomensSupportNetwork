import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  displayName: text("display_name").notNull(),
  bio: text("bio"),
  isAdmin: boolean("is_admin").default(false),
  avatarUrl: text("avatar_url"),
  coverUrl: text("cover_url"),
  theme: text("theme").default("light"),
  location: text("location"),
  interests: text("interests"),
  occupation: text("occupation"),
  relationshipStatus: text("relationship_status"),
  favoriteQuote: text("favorite_quote"),
  socialLinks: text("social_links"),
  customCss: text("custom_css"),
  profileLayout: text("profile_layout").default("classic"),
  backgroundColor: text("background_color"),
  textColor: text("text_color"),
  accentColor: text("accent_color"),
  fontFamily: text("font_family"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Friendship system tables
export const friendships = pgTable("friendships", {
  userId: integer("user_id").references(() => users.id),
  friendId: integer("friend_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

export const friendRequests = pgTable("friend_requests", {
  senderId: integer("sender_id").references(() => users.id),
  receiverId: integer("receiver_id").references(() => users.id),
  status: text("status").default("pending"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Follower system
export const followers = pgTable("followers", {
  followerId: integer("follower_id").references(() => users.id),
  followingId: integer("following_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

export const groups = pgTable("groups", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  category: text("category").notNull(),
  iconUrl: text("icon_url"),
  coverUrl: text("cover_url"),
  isPrivate: boolean("is_private").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const posts = pgTable("posts", {
  id: serial("id").primaryKey(),
  content: text("content").notNull(),
  userId: integer("user_id").references(() => users.id),
  groupId: integer("group_id").references(() => groups.id),
  imageUrl: text("image_url"),
  videoUrl: text("video_url"), // For YouTube videos
  postType: text("post_type").default("text"),
  createdAt: timestamp("created_at").defaultNow(),
  likeCount: integer("like_count").default(0),
});

export const groupMembers = pgTable("group_members", {
  groupId: integer("group_id").references(() => groups.id),
  userId: integer("user_id").references(() => users.id),
  role: text("role").default("member"),
  joinedAt: timestamp("joined_at").defaultNow(),
});

export const groupChat = pgTable("group_chat", {
  id: serial("id").primaryKey(),
  groupId: integer("group_id").references(() => groups.id),
  userId: integer("user_id").references(() => users.id),
  message: text("message").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const comments = pgTable("comments", {
  id: serial("id").primaryKey(),
  content: text("content").notNull(),
  userId: integer("user_id").references(() => users.id),
  postId: integer("post_id").references(() => posts.id),
  createdAt: timestamp("created_at").defaultNow(),
});

export const likes = pgTable("likes", {
  userId: integer("user_id").references(() => users.id),
  postId: integer("post_id").references(() => posts.id),
  createdAt: timestamp("created_at").defaultNow(),
});

export const userGroups = pgTable("user_groups", {
  userId: integer("user_id").references(() => users.id),
  groupId: integer("group_id").references(() => groups.id),
});

export const reactions = pgTable("reactions", {
  id: serial("id").primaryKey(),
  postId: integer("post_id").references(() => posts.id),
  userId: integer("user_id").references(() => users.id),
  emoji: text("emoji").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  displayName: true,
  bio: true,
  avatarUrl: true,
  theme: true,
  location: true,
  interests: true,
  occupation: true,
  relationshipStatus: true,
  favoriteQuote: true,
  socialLinks: true,
  customCss: true,
  profileLayout: true,
  backgroundColor: true,
  textColor: true,
  accentColor: true,
  fontFamily: true,
});

export const insertReactionSchema = createInsertSchema(reactions).pick({
  postId: true,
  userId: true,
  emoji: true,
});

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Group = typeof groups.$inferSelect;
export type Post = typeof posts.$inferSelect;
export type Comment = typeof comments.$inferSelect;
export type GroupChat = typeof groupChat.$inferSelect;
export type GroupMember = typeof groupMembers.$inferSelect;

export type GroupWithRelations = Group & {
  posts: Post[];
  members: GroupMember[];
  chatMessages: GroupChat[];
};

export type Reaction = typeof reactions.$inferSelect;
export type InsertReaction = z.infer<typeof insertReactionSchema>;