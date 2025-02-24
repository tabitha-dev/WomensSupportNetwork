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
  createdAt: timestamp("created_at").defaultNow(),
});

export const groups = pgTable("groups", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  category: text("category").notNull(),
  iconUrl: text("icon_url"),
  coverUrl: text("cover_url"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const posts = pgTable("posts", {
  id: serial("id").primaryKey(),
  content: text("content").notNull(),
  userId: integer("user_id").references(() => users.id),
  groupId: integer("group_id").references(() => groups.id),
  imageUrl: text("image_url"),
  createdAt: timestamp("created_at").defaultNow(),
  likeCount: integer("like_count").default(0),
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
});

export const insertGroupSchema = createInsertSchema(groups);
export const insertPostSchema = createInsertSchema(posts);
export const insertCommentSchema = createInsertSchema(comments);

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type Group = typeof groups.$inferSelect;
export type Post = typeof posts.$inferSelect;
export type Comment = typeof comments.$inferSelect;