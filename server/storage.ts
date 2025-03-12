import { users, groups, posts, userGroups, comments, likes, groupMembers, groupChat, friendships, friendRequests, followers, reactions } from "@shared/schema";
import type { User, InsertUser, Group, Post, Comment, GroupMember, GroupChat, GroupWithRelations, Reaction } from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, asc, sql } from "drizzle-orm";
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
  getPostComments(postId: number): Promise<Comment[]>;
  getCommentUsers(postId: number): Promise<Record<number, User>>;
  createComment(userId: number, postId: number, content: string): Promise<Comment>;
  likePost(userId: number, postId: number): Promise<void>;
  unlikePost(userId: number, postId: number): Promise<void>;
  isPostLikedByUser(userId: number, postId: number): Promise<boolean>;
  sessionStore: session.Store;
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
  deletePost(postId: number, userId: number): Promise<boolean>;
  getPostReactions(postId: number): Promise<Reaction[]>;
  addReaction(userId: number, postId: number, emoji: string): Promise<Reaction>;
  removeReaction(userId: number, postId: number, emoji: string): Promise<void>;
  getUserGroupPosts(userId: number): Promise<Post[]>;
  getUserStats(userId: number): Promise<{
    postCount: number;
    friendCount: number;
    followerCount: number;
    followingCount: number;
  }>;
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

      const [group] = await db
        .select()
        .from(groups)
        .where(eq(groups.id, id));

      if (!group) {
        console.log('Storage: No group found with ID:', id);
        return undefined;
      }

      console.log('Storage: Found base group:', group);

      const [groupPostsData, groupMembersData, chatMessagesData] = await Promise.all([
        db
          .select({
            id: posts.id,
            content: posts.content,
            userId: posts.userId,
            groupId: posts.groupId,
            imageUrl: posts.imageUrl,
            videoUrl: posts.videoUrl,
            postType: posts.postType,
            createdAt: posts.createdAt,
            likeCount: posts.likeCount
          })
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
        videoUrl: post.videoUrl,
        likeCount: 0,
      })
      .returning();
    return newPost;
  }

  async updatePost(postId: number, userId: number, content: string): Promise<Post | undefined> {
    try {
      const [post] = await db
        .update(posts)
        .set({ content })
        .where(and(
          eq(posts.id, postId),
          eq(posts.userId, userId)
        ))
        .returning();

      console.log('Updated post:', post);
      return post;
    } catch (error) {
      console.error('Error updating post:', error);
      return undefined;
    }
  }

  async joinGroup(userId: number, groupId: number): Promise<void> {
    try {
      await db.transaction(async (tx) => {
        await tx
          .insert(userGroups)
          .values({ userId, groupId })
          .onConflictDoNothing();

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
    try {
      console.log('Fetching groups for user:', userId);
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

      console.log(`Found ${result.length} user groups`);
      return result;
    } catch (error) {
      console.error('Error fetching user groups:', error);
      return [];
    }
  }

  async getPostComments(postId: number): Promise<Comment[]> {
    const result = await db
      .select({
        id: comments.id,
        content: comments.content,
        createdAt: comments.createdAt,
        userId: comments.userId,
        postId: comments.postId
      })
      .from(comments)
      .where(eq(comments.postId, postId))
      .orderBy(comments.createdAt);

    return result;
  }

  async getCommentUsers(postId: number): Promise<Record<number, User>> {
    try {
      const results = await db
        .select({
          id: users.id,
          username: users.username,
          displayName: users.displayName,
          avatarUrl: users.avatarUrl,
        })
        .from(comments)
        .innerJoin(users, eq(comments.userId, users.id))
        .where(eq(comments.postId, postId));

      // Convert array of users to a record keyed by user ID
      return results.reduce((acc, user) => {
        acc[user.id] = user;
        return acc;
      }, {} as Record<number, User>);
    } catch (error) {
      console.error('Error fetching comment users:', error);
      return {};
    }
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
        .set({
          likeCount: sql`${posts.likeCount} + 1`
        })
        .where(eq(posts.id, postId));
    });
  }

  async unlikePost(userId: number, postId: number): Promise<void> {
    await db.transaction(async (tx) => {
      await tx
        .delete(likes)
        .where(
          and(
            eq(likes.userId, userId),
            eq(likes.postId, postId)
          )
        );

      await tx
        .update(posts)
        .set({
          likeCount: sql`${posts.likeCount} - 1`
        })
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
    try {
      console.log('Fetching posts for user:', userId);
      const userPosts = await db
        .select()
        .from(posts)
        .where(eq(posts.userId, userId))
        .orderBy(desc(posts.createdAt));

      console.log(`Found ${userPosts.length} user posts`);
      return userPosts;
    } catch (error) {
      console.error('Error fetching user posts:', error);
      return [];
    }
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
    const result = await db
      .select({
        friend: users,
      })
      .from(friendships)
      .where(eq(friendships.userId, userId))
      .innerJoin(users, eq(friendships.friendId, users.id));

    return result.map((f) => f.friend);
  }

  async getFriendRequests(userId: number): Promise<{ sender: User; status: string }[]> {
    const result = await db
      .select({
        sender: users,
        status: friendRequests.status,
      })
      .from(friendRequests)
      .where(eq(friendRequests.receiverId, userId))
      .innerJoin(users, eq(friendRequests.senderId, users.id));

    return result.map((r) => ({
      sender: r.sender,
      status: r.status || 'pending'
    }));
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
    const result = await db
      .select({
        follower: users,
      })
      .from(followers)
      .where(eq(followers.followingId, userId))
      .innerJoin(users, eq(followers.followerId, users.id));

    return result.map((f) => f.follower);
  }

  async getFollowing(userId: number): Promise<User[]> {
    const result = await db
      .select({
        following: users,
      })
      .from(followers)
      .where(eq(followers.followerId, userId))
      .innerJoin(users, eq(followers.followingId, users.id));

    return result.map((f) => f.following);
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
      console.log('Fetching chat messages for group:', groupId);
      const messages = await db
        .select()
        .from(groupChat)
        .where(eq(groupChat.groupId, groupId))
        .orderBy(asc(groupChat.createdAt));

      console.log(`Found ${messages.length} chat messages`);
      return messages;
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
    try {
      console.log('Creating chat message for group:', groupId);
      const [chatMessage] = await db
        .insert(groupChat)
        .values({ userId, groupId, message })
        .returning();

      console.log('Created chat message:', chatMessage);
      return chatMessage;
    } catch (error) {
      console.error('Error creating chat message:', error);
      throw error;
    }
  }

  async deletePost(postId: number, userId: number): Promise<boolean> {
    try {
      // First check if the post exists and belongs to the user
      const [post] = await db
        .select()
        .from(posts)
        .where(and(
          eq(posts.id, postId),
          eq(posts.userId, userId)
        ));

      if (!post) {
        console.log('Post not found or unauthorized');
        return false;
      }

      // Delete the post and all related data
      await db.transaction(async (tx) => {
        // Delete associated comments first
        await tx
          .delete(comments)
          .where(eq(comments.postId, postId));

        // Delete associated likes
        await tx
          .delete(likes)
          .where(eq(likes.postId, postId));

        // Finally delete the post
        await tx
          .delete(posts)
          .where(eq(posts.id, postId));
      });

      console.log('Post successfully deleted');
      return true;
    } catch (error) {
      console.error('Error deleting post:', error);
      return false;
    }
  }

  async getPostReactions(postId: number): Promise<Reaction[]> {
    try {
      const result = await db
        .select()
        .from(reactions)
        .where(eq(reactions.postId, postId));
      return result;
    } catch (error) {
      console.error('Error fetching reactions:', error);
      return [];
    }
  }

  async addReaction(userId: number, postId: number, emoji: string): Promise<Reaction> {
    try {
      const [reaction] = await db
        .insert(reactions)
        .values({ userId, postId, emoji })
        .returning();
      return reaction;
    } catch (error) {
      console.error('Error adding reaction:', error);
      throw error;
    }
  }

  async removeReaction(userId: number, postId: number, emoji: string): Promise<void> {
    try {
      await db
        .delete(reactions)
        .where(
          and(
            eq(reactions.userId, userId),
            eq(reactions.postId, postId),
            eq(reactions.emoji, emoji)
          )
        );
    } catch (error) {
      console.error('Error removing reaction:', error);
      throw error;
    }
  }

  async getUserGroupPosts(userId: number): Promise<Post[]> {
    try {
      // First get the user's groups
      const userGroups = await this.getUserGroups(userId);

      if (!userGroups || userGroups.length === 0) {
        return [];
      }

      // Create an array of group IDs
      const groupIds = userGroups.map(group => group.id);

      // Get posts from all user's groups using proper SQL array syntax
      const groupPosts = await db
        .select()
        .from(posts)
        .where(
          sql`${posts.groupId} = ANY(${sql.array(groupIds, 'int4')})`
        )
        .orderBy(desc(posts.createdAt));

      return groupPosts;
    } catch (error) {
      console.error('Error fetching user group posts:', error);
      return [];
    }
  }

  async getUserStats(userId: number): Promise<{
    postCount: number;
    friendCount: number;
    followerCount: number;
    followingCount: number;
  }> {
    try {
      const [
        postCount,
        friendCount,
        followerCount,
        followingCount
      ] = await Promise.all([
        db.select({ count: sql<number>`count(*)::int` })
          .from(posts)
          .where(eq(posts.userId, userId))
          .then(result => result[0].count),
        db.select({ count: sql<number>`count(*)::int` })
          .from(friendships)
          .where(eq(friendships.userId, userId))
          .then(result => result[0].count),
        db.select({ count: sql<number>`count(*)::int` })
          .from(followers)
          .where(eq(followers.followingId, userId))
          .then(result => result[0].count),
        db.select({ count: sql<number>`count(*)::int` })
          .from(followers)
          .where(eq(followers.followerId, userId))
          .then(result => result[0].count)
      ]);

      return {
        postCount,
        friendCount,
        followerCount,
        followingCount
      };
    } catch (error) {
      console.error('Error fetching user stats:', error);
      return {
        postCount: 0,
        friendCount: 0,
        followerCount: 0,
        followingCount: 0
      };
    }
  }
}

export const storage = new DatabaseStorage();