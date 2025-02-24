import { users, groups, posts, userGroups, comments, likes, groupMembers, groupChat, type User, type InsertUser, type Group, type Post, type Comment, type GroupMember, type GroupChat, type GroupWithRelations } from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, asc } from "drizzle-orm";
import connectPg from "connect-pg-simple";
import session from "express-session";
import { pool } from "./db";

const PostgresSessionStore = connectPg(session);

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getGroups(): Promise<Group[]>;
  getGroupById(id: number): Promise<GroupWithRelations | undefined>;
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
  // Friend system methods
  getFriends(userId: number): Promise<User[]>;
  getFriendRequests(userId: number): Promise<{ sender: User; status: string }[]>;
  sendFriendRequest(senderId: number, receiverId: number): Promise<void>;
  acceptFriendRequest(senderId: number, receiverId: number): Promise<void>;
  rejectFriendRequest(senderId: number, receiverId: number): Promise<void>;

  // Follow system methods
  getFollowers(userId: number): Promise<User[]>;
  getFollowing(userId: number): Promise<User[]>;
  followUser(followerId: number, followingId: number): Promise<void>;
  unfollowUser(followerId: number, followingId: number): Promise<void>;
  isFollowing(followerId: number, followingId: number): Promise<boolean>;

  // Group member methods
  getGroupMembers(groupId: number): Promise<GroupMember[]>;
  addGroupMember(userId: number, groupId: number, role?: string): Promise<void>;
  removeGroupMember(userId: number, groupId: number): Promise<void>;

  // Group chat methods
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
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async getGroups(): Promise<Group[]> {
    return await db.select().from(groups);
  }

  async getGroupById(id: number): Promise<GroupWithRelations | undefined> {
    try {
      console.log('Storage: Fetching group with ID:', id);

      // Get the base group
      const [group] = await db
        .select()
        .from(groups)
        .where(eq(groups.id, id));

      if (!group) {
        console.log('Storage: No group found with ID:', id);
        return undefined;
      }

      console.log('Storage: Found base group:', group);

      // Get all related data
      const [groupPostsData, groupMembersData, chatMessagesData] = await Promise.all([
        db
          .select()
          .from(posts)
          .where(eq(posts.groupId, id))
          .orderBy(desc(posts.createdAt)),
        db
          .select()
          .from(groupMembers)
          .where(eq(groupMembers.groupId, id))
          .orderBy(asc(groupMembers.joinedAt)),
        db
          .select()
          .from(groupChat)
          .where(eq(groupChat.groupId, id))
          .orderBy(asc(groupChat.createdAt))
      ]);

      console.log('Storage: Related data fetched:', {
        postsCount: groupPostsData.length,
        membersCount: groupMembersData.length,
        chatCount: chatMessagesData.length
      });

      // Combine everything into a GroupWithRelations object
      const groupWithRelations: GroupWithRelations = {
        ...group,
        posts: groupPostsData,
        members: groupMembersData,
        chatMessages: chatMessagesData
      };

      return groupWithRelations;
    } catch (error) {
      console.error('Storage: Error in getGroupById:', error);
      throw error;
    }
  }

  async getGroupPosts(groupId: number): Promise<Post[]> {
    try {
      console.log('Storage: Fetching posts for group:', groupId);
      const result = await db
        .select()
        .from(posts)
        .where(eq(posts.groupId, groupId))
        .orderBy(desc(posts.createdAt));

      console.log(`Storage: Found ${result.length} posts for group ${groupId}`);
      return result;
    } catch (error) {
      console.error('Storage: Error fetching group posts:', error);
      throw error;
    }
  }

  async createPost(post: Omit<Post, "id" | "createdAt">): Promise<Post> {
    const [newPost] = await db
      .insert(posts)
      .values({
        content: post.content,
        userId: post.userId,
        groupId: post.groupId,
        postType: post.postType || "text",
        imageUrl: post.imageUrl,
        musicUrl: post.musicUrl,
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
    try {
      await db.transaction(async (tx) => {
        // Add to userGroups for membership
        await tx
          .insert(userGroups)
          .values({ userId, groupId })
          .onConflictDoNothing();

        // Add as group member with default role
        await tx
          .insert(groupMembers)
          .values({ userId, groupId, role: 'member' })
          .onConflictDoNothing();
      });
    } catch (error) {
      console.error('Error joining group:', error);
      throw error;
    }
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
        coverUrl: groups.coverUrl,
        isPrivate: groups.isPrivate,
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
  async getFriends(userId: number): Promise<User[]> {
    const friends = await db
      .select({
        friend: users,
      })
      .from(friendships)
      .where(eq(friendships.userId, userId))
      .innerJoin(users, eq(friendships.friendId, users.id));

    return friends.map((f) => f.friend);
  }

  async getFriendRequests(userId: number): Promise<{ sender: User; status: string }[]> {
    const requests = await db
      .select({
        sender: users,
        status: friendRequests.status,
      })
      .from(friendRequests)
      .where(eq(friendRequests.receiverId, userId))
      .innerJoin(users, eq(friendRequests.senderId, users.id));

    return requests.map((r) => ({ sender: r.sender, status: r.status }));
  }

  async sendFriendRequest(senderId: number, receiverId: number): Promise<void> {
    await db
      .insert(friendRequests)
      .values({ senderId, receiverId })
      .onConflictDoNothing();
  }

  async acceptFriendRequest(senderId: number, receiverId: number): Promise<void> {
    await db.transaction(async (tx) => {
      await tx
        .update(friendRequests)
        .set({ status: "accepted" })
        .where(
          and(
            eq(friendRequests.senderId, senderId),
            eq(friendRequests.receiverId, receiverId)
          )
        );

      // Create mutual friendship
      await tx.insert(friendships).values([
        { userId: senderId, friendId: receiverId },
        { userId: receiverId, friendId: senderId },
      ]);
    });
  }

  async rejectFriendRequest(senderId: number, receiverId: number): Promise<void> {
    await db
      .update(friendRequests)
      .set({ status: "rejected" })
      .where(
        and(
          eq(friendRequests.senderId, senderId),
          eq(friendRequests.receiverId, receiverId)
        )
      );
  }

  async getFollowers(userId: number): Promise<User[]> {
    const followers = await db
      .select({
        follower: users,
      })
      .from(followers)
      .where(eq(followers.followingId, userId))
      .innerJoin(users, eq(followers.followerId, users.id));

    return followers.map((f) => f.follower);
  }

  async getFollowing(userId: number): Promise<User[]> {
    const following = await db
      .select({
        following: users,
      })
      .from(followers)
      .where(eq(followers.followerId, userId))
      .innerJoin(users, eq(followers.followingId, users.id));

    return following.map((f) => f.following);
  }

  async followUser(followerId: number, followingId: number): Promise<void> {
    await db
      .insert(followers)
      .values({ followerId, followingId })
      .onConflictDoNothing();
  }

  async unfollowUser(followerId: number, followingId: number): Promise<void> {
    await db
      .delete(followers)
      .where(
        and(
          eq(followers.followerId, followerId),
          eq(followers.followingId, followingId)
        )
      );
  }

  async isFollowing(followerId: number, followingId: number): Promise<boolean> {
    const [follow] = await db
      .select()
      .from(followers)
      .where(
        and(
          eq(followers.followerId, followerId),
          eq(followers.followingId, followingId)
        )
      );

    return !!follow;
  }

  async getGroupMembers(groupId: number): Promise<GroupMember[]> {
    try {
      console.log('Storage: Fetching members for group:', groupId);
      const result = await db
        .select()
        .from(groupMembers)
        .where(eq(groupMembers.groupId, groupId))
        .orderBy(asc(groupMembers.joinedAt));

      console.log(`Storage: Found ${result.length} members for group ${groupId}`);
      return result;
    } catch (error) {
      console.error('Storage: Error fetching group members:', error);
      throw error;
    }
  }

  async addGroupMember(userId: number, groupId: number, role: string = "member"): Promise<void> {
    await db
      .insert(groupMembers)
      .values({ userId, groupId, role })
      .onConflictDoNothing();
  }

  async removeGroupMember(userId: number, groupId: number): Promise<void> {
    await db
      .delete(groupMembers)
      .where(
        and(
          eq(groupMembers.userId, userId),
          eq(groupMembers.groupId, groupId)
        )
      );
  }

  async getGroupChat(groupId: number): Promise<GroupChat[]> {
    try {
      return await db
        .select()
        .from(groupChat)
        .where(eq(groupChat.groupId, groupId))
        .orderBy(asc(groupChat.createdAt));
    } catch (error) {
      console.error('Error fetching group chat:', error);
      return [];
    }
  }

  async createChatMessage(
    userId: number,
    groupId: number,
    message: string
  ): Promise<GroupChat> {
    const [chatMessage] = await db
      .insert(groupChat)
      .values({ userId, groupId, message })
      .returning();
    return chatMessage;
  }
}

export const storage = new DatabaseStorage();