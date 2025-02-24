import { users, groups, posts, userGroups, comments, likes, type User, type InsertUser, type Group, type Post, type Comment } from "@shared/schema";
import { db } from "./db";
import { eq, and, desc } from "drizzle-orm";
import connectPg from "connect-pg-simple";
import session from "express-session";
import { pool } from "./db";

const PostgresSessionStore = connectPg(session);

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getGroups(): Promise<Group[]>;
  getGroupById(id: number): Promise<Group | undefined>;
  getGroupPosts(groupId: number): Promise<Post[]>;
  createPost(post: Omit<Post, "id" | "createdAt">): Promise<Post>;
  updatePost(postId: number, userId: number, content: string): Promise<Post | undefined>;
  joinGroup(userId: number, groupId: number): Promise<void>;
  leaveGroup(userId: number, groupId: number): Promise<void>;
  getUserGroups(userId: number): Promise<Group[]>;
  // New methods for social features
  getPostComments(postId: number): Promise<(Comment & { user: User })[]>;
  createComment(userId: number, postId: number, content: string): Promise<Comment>;
  likePost(userId: number, postId: number): Promise<void>;
  unlikePost(userId: number, postId: number): Promise<void>;
  isPostLikedByUser(userId: number, postId: number): Promise<boolean>;
  sessionStore: session.Store;
  getUserPosts(userId: number): Promise<Post[]>;
  updateUser(id: number, userData: Partial<User>): Promise<User | undefined>;
}

export class DatabaseStorage implements IStorage {
  public sessionStore: session.Store;

  constructor() {
    this.sessionStore = new PostgresSessionStore({
      pool,
      createTableIfMissing: true,
    });
  }

  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async getGroups(): Promise<Group[]> {
    return await db.select().from(groups);
  }

  async getGroupById(id: number): Promise<Group | undefined> {
    const [group] = await db
      .select({
        id: groups.id,
        name: groups.name,
        description: groups.description,
        category: groups.category,
        iconUrl: groups.iconUrl,
        coverUrl: groups.coverUrl,
        createdAt: groups.createdAt,
      })
      .from(groups)
      .where(eq(groups.id, id));
    return group;
  }

  async getGroupPosts(groupId: number): Promise<Post[]> {
    return await db
      .select()
      .from(posts)
      .where(eq(posts.groupId, groupId))
      .orderBy(desc(posts.createdAt));
  }

  async createPost(post: Omit<Post, "id" | "createdAt">): Promise<Post> {
    const [newPost] = await db
      .insert(posts)
      .values({
        content: post.content,
        userId: post.userId,
        groupId: post.groupId,
        imageUrl: post.imageUrl || null,
        likeCount: 0,
      })
      .returning();
    return newPost;
  }

  async updatePost(postId: number, userId: number, content: string): Promise<Post | undefined> {
    const [post] = await db
      .update(posts)
      .set({ content })
      .where(and(
        eq(posts.id, postId),
        eq(posts.userId, userId)
      ))
      .returning();
    return post;
  }

  async joinGroup(userId: number, groupId: number): Promise<void> {
    await db
      .insert(userGroups)
      .values({ userId, groupId })
      .onConflictDoNothing();
  }

  async leaveGroup(userId: number, groupId: number): Promise<void> {
    await db
      .delete(userGroups)
      .where(
        and(
          eq(userGroups.userId, userId),
          eq(userGroups.groupId, groupId)
        )
      );
  }

  async getUserGroups(userId: number): Promise<Group[]> {
    const result = await db
      .select({
        id: groups.id,
        name: groups.name,
        description: groups.description,
        category: groups.category,
        createdAt: groups.createdAt,
        iconUrl: groups.iconUrl,
      })
      .from(userGroups)
      .innerJoin(groups, eq(userGroups.groupId, groups.id))
      .where(eq(userGroups.userId, userId));

    return result;
  }

  async getPostComments(postId: number): Promise<(Comment & { user: User })[]> {
    const result = await db
      .select({
        id: comments.id,
        content: comments.content,
        createdAt: comments.createdAt,
        user: users,
      })
      .from(comments)
      .innerJoin(users, eq(comments.userId, users.id))
      .where(eq(comments.postId, postId))
      .orderBy(comments.createdAt);

    return result as (Comment & { user: User })[];
  }

  async createComment(userId: number, postId: number, content: string): Promise<Comment> {
    const [comment] = await db
      .insert(comments)
      .values({ userId, postId, content })
      .returning();

    return comment;
  }

  async likePost(userId: number, postId: number): Promise<void> {
    await db.transaction(async (tx) => {
      await tx
        .insert(likes)
        .values({ userId, postId })
        .onConflictDoNothing();

      await tx
        .update(posts)
        .set({ likeCount: posts.likeCount + 1 })
        .where(eq(posts.id, postId));
    });
  }

  async unlikePost(userId: number, postId: number): Promise<void> {
    await db.transaction(async (tx) => {
      await tx
        .delete(likes)
        .where(and(
          eq(likes.userId, userId),
          eq(likes.postId, postId)
        ));

      await tx
        .update(posts)
        .set({ likeCount: posts.likeCount - 1 })
        .where(eq(posts.id, postId));
    });
  }

  async isPostLikedByUser(userId: number, postId: number): Promise<boolean> {
    const [like] = await db
      .select()
      .from(likes)
      .where(and(
        eq(likes.userId, userId),
        eq(likes.postId, postId)
      ));

    return !!like;
  }
  async getUserPosts(userId: number): Promise<Post[]> {
    const userPosts = await db
      .select()
      .from(posts)
      .where(eq(posts.userId, userId))
      .orderBy(desc(posts.createdAt));

    return userPosts;
  }
  async updateUser(id: number, userData: Partial<User>): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set(userData)
      .where(eq(users.id, id))
      .returning();
    return user;
  }
}

export const storage = new DatabaseStorage();