import { users, groups, posts, userGroups, type User, type InsertUser, type Group, type Post } from "@shared/schema";
import { db } from "./db";
import { eq, and } from "drizzle-orm";
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
  joinGroup(userId: number, groupId: number): Promise<void>;
  leaveGroup(userId: number, groupId: number): Promise<void>;
  getUserGroups(userId: number): Promise<Group[]>;
  updatePost(postId: number, userId: number, content: string): Promise<Post | undefined>;
  sessionStore: session.Store;
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
    const [group] = await db.select().from(groups).where(eq(groups.id, id));
    return group;
  }

  async getGroupPosts(groupId: number): Promise<Post[]> {
    return await db
      .select()
      .from(posts)
      .where(eq(posts.groupId, groupId))
      .orderBy(posts.createdAt);
  }

  async createPost(post: Omit<Post, "id" | "createdAt">): Promise<Post> {
    const [newPost] = await db
      .insert(posts)
      .values(post)
      .returning();
    return newPost;
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
      })
      .from(userGroups)
      .innerJoin(groups, eq(userGroups.groupId, groups.id))
      .where(eq(userGroups.userId, userId));

    return result;
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
}

export const storage = new DatabaseStorage();