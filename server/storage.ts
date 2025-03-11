import { users, groups, posts, userGroups, comments, likes, groupMembers, groupChat, friendships, friendRequests, followers } from "@shared/schema";
import type { User, InsertUser, Group, Post, Comment, GroupMember, GroupChat, GroupWithRelations } from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, asc, sql } from "drizzle-orm";
import connectPg from "connect-pg-simple";
import session from "express-session";
import { pool } from "./db";

const PostgresSessionStore = connectPg(session);

export interface IStorage {
  sessionStore: session.Store;
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getGroups(): Promise<Group[]>;
  getGroupById(id: number): Promise<GroupWithRelations | undefined>;
  getGroupPosts(groupId: number): Promise<Post[]>;
  createPost(post: Omit<Post, "id" | "createdAt">): Promise<Post>;
  updatePost(postId: number, userId: number, content: string): Promise<Post | undefined>;
  deletePost(postId: number, userId: number): Promise<boolean>;
  joinGroup(userId: number, groupId: number): Promise<void>;
  leaveGroup(userId: number, groupId: number): Promise<void>;
  getUserGroups(userId: number): Promise<Group[]>;
  getPostComments(postId: number): Promise<(Comment & { user: User })[]>;
  createComment(userId: number, postId: number, content: string): Promise<Comment>;
  likePost(userId: number, postId: number): Promise<void>;
  unlikePost(userId: number, postId: number): Promise<void>;
  isPostLikedByUser(userId: number, postId: number): Promise<boolean>;
  getUserPosts(userId: number): Promise<Post[]>;
  updateUser(id: number, userData: Partial<User>): Promise<User | undefined>;
  getFriends(userId: number): Promise<User[]>;
  getFriendRequests(userId: number): Promise<{ sender: User; status: string }[]>;
  sendFriendRequest(senderId: number, receiverId: number): Promise<void>;
  acceptFriendRequest(senderId: number, receiverId: number): Promise<void>;
  rejectFriendRequest(senderId: number, receiverId: number): Promise<void>;
  getFollowers(userId: number): Promise<User[]>;
  getFollowing(userId: number): Promise<User[]>;
  followUser(followerId: number, followingId: number): Promise<void>;
  unfollowUser(followerId: number, followingId: number): Promise<void>;
  isFollowing(followerId: number, followingId: number): Promise<boolean>;
  getGroupMembers(groupId: number): Promise<GroupMember[]>;
  addGroupMember(userId: number, groupId: number, role?: string): Promise<void>;
  removeGroupMember(userId: number, groupId: number): Promise<void>;
  getGroupChat(groupId: number): Promise<GroupChat[]>;
  createChatMessage(userId: number, groupId: number, message: string): Promise<GroupChat>;
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
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async getGroups(): Promise<Group[]> {
    return await db.select().from(groups);
  }

  async getGroupById(id: number): Promise<GroupWithRelations | undefined> {
    try {
      console.log('Storage: Fetching group with ID:', id);

      const [group] = await db.select().from(groups).where(eq(groups.id, id));

      if (!group) {
        console.log('Storage: No group found with ID:', id);
        return undefined;
      }

      console.log('Storage: Found base group:', group);

      const [groupPostsData, groupMembersData, chatMessagesData] = await Promise.all([
        db.select().from(posts).where(eq(posts.groupId, id)).orderBy(desc(posts.createdAt)),
        db.select().from(groupMembers).where(eq(groupMembers.groupId, id)).orderBy(asc(groupMembers.joinedAt)),
        db.select().from(groupChat).where(eq(groupChat.groupId, id)).orderBy(asc(groupChat.createdAt))
      ]);

      console.log('Storage: Related data fetched:', {
        postsCount: groupPostsData.length,
        membersCount: groupMembersData.length,
        chatCount: chatMessagesData.length
      });

      return {
        ...group,
        posts: groupPostsData,
        members: groupMembersData,
        chatMessages: chatMessagesData
      };
    } catch (error) {
      console.error('Storage: Error in getGroupById:', error);
      throw error;
    }
  }

  async getGroupPosts(groupId: number): Promise<Post[]> {
    return await db
      .select()
      .from(posts)
      .where(eq(posts.groupId, groupId))
      .orderBy(desc(posts.createdAt));
  }

  async createPost(post: Omit<Post, "id" | "createdAt">): Promise<Post> {
    console.log('Storage: Creating post:', post);
    const [newPost] = await db.insert(posts).values(post).returning();
    console.log('Storage: Created post:', newPost);
    return newPost;
  }

  async updatePost(postId: number, userId: number, content: string): Promise<Post | undefined> {
    const [post] = await db
      .update(posts)
      .set({ content })
      .where(and(eq(posts.id, postId), eq(posts.userId, userId)))
      .returning();
    return post;
  }

  async deletePost(postId: number, userId: number): Promise<boolean> {
    try {
      const [deletedPost] = await db
        .delete(posts)
        .where(and(eq(posts.id, postId), eq(posts.userId, userId)))
        .returning();
      return !!deletedPost;
    } catch (error) {
      console.error("Error deleting post:", error);
      return false;
    }
  }

  async joinGroup(userId: number, groupId: number): Promise<void> {
    await db.insert(groupMembers).values({ userId, groupId });
  }

  async leaveGroup(userId: number, groupId: number): Promise<void> {
    await db.delete(groupMembers).where(and(eq(groupMembers.userId, userId), eq(groupMembers.groupId, groupId)));
  }

  async getUserGroups(userId: number): Promise<Group[]> {
    const groupMemberships = await db.select().from(groupMembers).where(eq(groupMembers.userId, userId));
    const groupIds = groupMemberships.map((membership) => membership.groupId);
    return db.select().from(groups).where(groupIds.length > 0 ? sql`id IN (${sql.join(groupIds, ',')})` : sql`id = -1`);
  }

  async getPostComments(postId: number): Promise<(Comment & { user: User })[]> {
    return db.select({
      comments: { id: comments.id, content: comments.content, createdAt: comments.createdAt },
      user: { id: users.id, username: users.username },
    }).from(comments)
    .innerJoin(users, eq(comments.userId, users.id))
    .where(eq(comments.postId, postId));

  }

  async createComment(userId: number, postId: number, content: string): Promise<Comment> {
      const [comment] = await db.insert(comments).values({ userId, postId, content }).returning();
      return comment;
  }

  async likePost(userId: number, postId: number): Promise<void> {
    await db.insert(likes).values({ userId, postId });
  }

  async unlikePost(userId: number, postId: number): Promise<void> {
    await db.delete(likes).where(and(eq(likes.userId, userId), eq(likes.postId, postId)));
  }

  async isPostLikedByUser(userId: number, postId: number): Promise<boolean> {
    const [like] = await db.select().from(likes).where(and(eq(likes.userId, userId), eq(likes.postId, postId)));
    return !!like;
  }

  async getUserPosts(userId: number): Promise<Post[]> {
    return db.select().from(posts).where(eq(posts.userId, userId)).orderBy(desc(posts.createdAt));
  }

  async updateUser(id: number, userData: Partial<User>): Promise<User | undefined> {
    const [updatedUser] = await db.update(users).set(userData).where(eq(users.id, id)).returning();
    return updatedUser;
  }

  async getFriends(userId: number): Promise<User[]> {
    const friendIds = (await db.select({ friendId: friendships.friendId }).from(friendships).where(eq(friendships.userId, userId))).map(f => f.friendId);
    return db.select().from(users).where(friendIds.length > 0 ? sql`id IN (${sql.join(friendIds, ',')})` : sql`id = -1`);
  }

  async getFriendRequests(userId: number): Promise<{ sender: User; status: string }[]> {
    return db.select({
        sender: {id: users.id, username: users.username},
        status: friendRequests.status
    }).from(friendRequests)
    .innerJoin(users, eq(friendRequests.senderId, users.id))
    .where(eq(friendRequests.receiverId, userId));
  }

  async sendFriendRequest(senderId: number, receiverId: number): Promise<void> {
    await db.insert(friendRequests).values({ senderId, receiverId, status: 'pending' });
  }

  async acceptFriendRequest(senderId: number, receiverId: number): Promise<void> {
    await db.update(friendRequests).set({ status: 'accepted' }).where(and(eq(friendRequests.senderId, senderId), eq(friendRequests.receiverId, receiverId)));
    await db.insert(friendships).values({ userId: senderId, friendId: receiverId });
    await db.insert(friendships).values({ userId: receiverId, friendId: senderId });
  }

  async rejectFriendRequest(senderId: number, receiverId: number): Promise<void> {
    await db.delete(friendRequests).where(and(eq(friendRequests.senderId, senderId), eq(friendRequests.receiverId, receiverId)));
  }

  async getFollowers(userId: number): Promise<User[]> {
    const followerIds = (await db.select({ followerId: followers.followerId }).from(followers).where(eq(followers.followingId, userId))).map(f => f.followerId);
    return db.select().from(users).where(followerIds.length > 0 ? sql`id IN (${sql.join(followerIds, ',')})` : sql`id = -1`);
  }

  async getFollowing(userId: number): Promise<User[]> {
    const followingIds = (await db.select({ followingId: followers.followingId }).from(followers).where(eq(followers.followerId, userId))).map(f => f.followingId);
    return db.select().from(users).where(followingIds.length > 0 ? sql`id IN (${sql.join(followingIds, ',')})` : sql`id = -1`);
  }

  async followUser(followerId: number, followingId: number): Promise<void> {
    await db.insert(followers).values({ followerId, followingId });
  }

  async unfollowUser(followerId: number, followingId: number): Promise<void> {
    await db.delete(followers).where(and(eq(followers.followerId, followerId), eq(followers.followingId, followingId)));
  }

  async isFollowing(followerId: number, followingId: number): Promise<boolean> {
    const [following] = await db.select().from(followers).where(and(eq(followers.followerId, followerId), eq(followers.followingId, followingId)));
    return !!following;
  }

  async getGroupMembers(groupId: number): Promise<GroupMember[]> {
    return db.select().from(groupMembers).where(eq(groupMembers.groupId, groupId));
  }

  async addGroupMember(userId: number, groupId: number, role?: string): Promise<void> {
    await db.insert(groupMembers).values({ userId, groupId, role: role || 'member' });
  }

  async removeGroupMember(userId: number, groupId: number): Promise<void> {
    await db.delete(groupMembers).where(and(eq(groupMembers.userId, userId), eq(groupMembers.groupId, groupId)));
  }

  async getGroupChat(groupId: number): Promise<GroupChat[]> {
    return db.select().from(groupChat).where(eq(groupChat.groupId, groupId)).orderBy(asc(groupChat.createdAt));
  }

  async createChatMessage(userId: number, groupId: number, message: string): Promise<GroupChat> {
    const [chatMessage] = await db.insert(groupChat).values({ userId, groupId, message }).returning();
    return chatMessage;
  }
}

export const storage = new DatabaseStorage();