import { User, InsertUser, Group, Post } from "@shared/schema";
import createMemoryStore from "memorystore";
import session from "express-session";
import { randomUUID } from "crypto";

const MemoryStore = createMemoryStore(session);

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
  sessionStore: session.Store;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private groups: Map<number, Group>;
  private posts: Map<number, Post>;
  private userGroups: Set<string>;
  public sessionStore: session.Store;
  private currentId: number;

  constructor() {
    this.users = new Map();
    this.groups = new Map();
    this.posts = new Map();
    this.userGroups = new Set();
    this.currentId = 1;
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000,
    });
    
    // Initialize with default groups
    this.initializeGroups();
  }

  private initializeGroups() {
    const defaultGroups: Group[] = [
      { id: 1, name: "Tech", description: "Discuss tech and career in tech", category: "Career" },
      { id: 2, name: "Health & Wellness", description: "General health discussions", category: "Health" },
      { id: 3, name: "Career Support", description: "Career advice and support", category: "Career" },
      { id: 4, name: "Life Balance", description: "Work-life balance discussions", category: "Lifestyle" },
    ];

    defaultGroups.forEach(group => this.groups.set(group.id, group));
    this.currentId = 5;
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentId++;
    const user: User = { ...insertUser, id, isAdmin: false };
    this.users.set(id, user);
    return user;
  }

  async getGroups(): Promise<Group[]> {
    return Array.from(this.groups.values());
  }

  async getGroupById(id: number): Promise<Group | undefined> {
    return this.groups.get(id);
  }

  async getGroupPosts(groupId: number): Promise<Post[]> {
    return Array.from(this.posts.values())
      .filter(post => post.groupId === groupId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async createPost(post: Omit<Post, "id" | "createdAt">): Promise<Post> {
    const id = this.currentId++;
    const newPost: Post = {
      ...post,
      id,
      createdAt: new Date(),
    };
    this.posts.set(id, newPost);
    return newPost;
  }

  async joinGroup(userId: number, groupId: number): Promise<void> {
    this.userGroups.add(`${userId}-${groupId}`);
  }

  async leaveGroup(userId: number, groupId: number): Promise<void> {
    this.userGroups.delete(`${userId}-${groupId}`);
  }

  async getUserGroups(userId: number): Promise<Group[]> {
    const userGroupIds = Array.from(this.userGroups)
      .filter(key => key.startsWith(`${userId}-`))
      .map(key => parseInt(key.split('-')[1]));
    
    return userGroupIds.map(id => this.groups.get(id)!).filter(Boolean);
  }
}

export const storage = new MemStorage();
