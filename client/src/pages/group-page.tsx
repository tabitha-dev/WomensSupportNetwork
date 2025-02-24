import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams } from "wouter";
import { Group, Post, GroupMember, GroupChat } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";
import PostComponent from "@/components/post";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import {
  Loader2,
  Send,
  Users,
  Image as ImageIcon,
  Music,
  MessageSquare,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { motion } from "framer-motion";

type PostFormData = {
  content: string;
  postType: "text" | "image" | "music";
  mediaUrl?: string;
};

type ChatFormData = {
  message: string;
};

export default function GroupPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const groupId = parseInt(id!);

  const postForm = useForm<PostFormData>({
    defaultValues: {
      content: "",
      postType: "text",
    },
  });

  const chatForm = useForm<ChatFormData>({
    defaultValues: {
      message: "",
    },
  });

  const { data: group, isLoading: isLoadingGroup } = useQuery<Group>({
    queryKey: [`/api/groups/${groupId}`],
    enabled: !!id,
  });

  const { data: posts = [], isLoading: isLoadingPosts } = useQuery<Post[]>({
    queryKey: [`/api/groups/${groupId}/posts`],
    enabled: !!id,
  });

  const { data: members = [], isLoading: isLoadingMembers } = useQuery<GroupMember[]>({
    queryKey: [`/api/groups/${groupId}/members`],
    enabled: !!id,
  });

  const { data: chatMessages = [], isLoading: isLoadingChat } = useQuery<GroupChat[]>({
    queryKey: [`/api/groups/${groupId}/chat`],
    enabled: !!id,
    refetchInterval: 5000, // Poll every 5 seconds
  });

  const createPostMutation = useMutation({
    mutationFn: async (data: PostFormData) => {
      await apiRequest("POST", `/api/groups/${groupId}/posts`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/groups/${groupId}/posts`] });
      postForm.reset();
    },
  });

  const sendChatMessageMutation = useMutation({
    mutationFn: async (data: ChatFormData) => {
      await apiRequest("POST", `/api/groups/${groupId}/chat`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/groups/${groupId}/chat`] });
      chatForm.reset();
    },
  });

  const joinGroupMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", `/api/groups/${groupId}/join`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/groups/${groupId}/members`] });
    },
  });

  if (isLoadingGroup || isLoadingPosts || isLoadingMembers || isLoadingChat) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!group) {
    return (
      <div className="container mx-auto p-4">
        <Card>
          <CardContent className="p-8 text-center">
            <h2 className="text-xl font-semibold mb-2">Group Not Found</h2>
            <p className="text-muted-foreground">
              The group you're looking for doesn't exist or has been removed.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isGroupMember = members.some(member => member.userId === user?.id);

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Banner */}
      <div 
        className="h-64 relative bg-gradient-to-r from-primary/20 via-purple-500/20 to-blue-500/20"
        style={
          group.coverUrl
            ? {
                backgroundImage: `url(${group.coverUrl})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }
            : {}
        }
      >
        <div className="absolute inset-0 bg-black/20" />
        <div className="container mx-auto h-full flex items-end p-8">
          <div className="relative z-10 flex items-center gap-6 text-white">
            <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center border-4 border-background">
              {group.iconUrl ? (
                <img
                  src={group.iconUrl}
                  alt={group.name}
                  className="w-16 h-16 rounded-full"
                />
              ) : (
                <Users className="w-12 h-12" />
              )}
            </div>
            <div>
              <h1 className="text-4xl font-bold">{group.name}</h1>
              <p className="text-lg opacity-90 mt-2">{group.category}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto p-4 -mt-8">
        <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
          {/* Main Column */}
          <div className="space-y-6">
            <Card>
              <CardContent className="p-6">
                <p className="text-lg text-foreground/90">{group.description}</p>
                {!isGroupMember && (
                  <Button 
                    className="mt-4"
                    onClick={() => joinGroupMutation.mutate()}
                    disabled={joinGroupMutation.isPending}
                  >
                    Join Group
                  </Button>
                )}
              </CardContent>
            </Card>

            {isGroupMember ? (
              <>
                {/* Create Post */}
                <Card>
                  <CardHeader>
                    <CardTitle>Create Post</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <form 
                      onSubmit={postForm.handleSubmit((data) => createPostMutation.mutate(data))}
                      className="space-y-4"
                    >
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant={postForm.watch("postType") === "text" ? "default" : "outline"}
                          onClick={() => postForm.setValue("postType", "text")}
                        >
                          <MessageSquare className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant={postForm.watch("postType") === "image" ? "default" : "outline"}
                          onClick={() => postForm.setValue("postType", "image")}
                        >
                          <ImageIcon className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant={postForm.watch("postType") === "music" ? "default" : "outline"}
                          onClick={() => postForm.setValue("postType", "music")}
                        >
                          <Music className="h-4 w-4" />
                        </Button>
                      </div>

                      <Textarea
                        placeholder="Share your thoughts with the group..."
                        {...postForm.register("content")}
                      />

                      {(postForm.watch("postType") === "image" || postForm.watch("postType") === "music") && (
                        <Input
                          placeholder={`Enter ${postForm.watch("postType")} URL`}
                          {...postForm.register("mediaUrl")}
                        />
                      )}

                      <Button 
                        type="submit"
                        disabled={createPostMutation.isPending}
                        className="w-full"
                      >
                        Post
                      </Button>
                    </form>
                  </CardContent>
                </Card>

                {/* Posts */}
                <div className="space-y-4">
                  {posts.map((post) => (
                    <PostComponent key={post.id} post={post} />
                  ))}
                  {posts.length === 0 && (
                    <Card>
                      <CardContent className="p-8 text-center text-muted-foreground">
                        No posts yet. Be the first to share something!
                      </CardContent>
                    </Card>
                  )}
                </div>
              </>
            ) : (
              <Card>
                <CardContent className="p-8 text-center">
                  <h3 className="text-lg font-semibold mb-2">Join this group to participate</h3>
                  <p className="text-muted-foreground mb-4">
                    Join this group to access posts, chat with members, and be part of the community.
                  </p>
                  <Button
                    onClick={() => joinGroupMutation.mutate()}
                    disabled={joinGroupMutation.isPending}
                  >
                    Join Group
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Group Chat */}
            {isGroupMember && (
              <Card>
                <CardHeader>
                  <CardTitle>Group Chat</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[400px] overflow-y-auto mb-4 space-y-4">
                    {chatMessages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex items-start gap-2 ${
                          message.userId === user?.id ? "flex-row-reverse" : ""
                        }`}
                      >
                        <Avatar className="h-8 w-8">
                          <AvatarFallback>
                            {message.userId === user?.id ? user.displayName.charAt(0) : "U"}
                          </AvatarFallback>
                        </Avatar>
                        <div
                          className={`rounded-lg p-2 ${
                            message.userId === user?.id
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted"
                          }`}
                        >
                          <p className="text-sm">{message.message}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <form
                    onSubmit={chatForm.handleSubmit((data) =>
                      sendChatMessageMutation.mutate(data)
                    )}
                    className="flex gap-2"
                  >
                    <Input
                      placeholder="Type a message..."
                      {...chatForm.register("message")}
                    />
                    <Button
                      type="submit"
                      disabled={sendChatMessageMutation.isPending}
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </form>
                </CardContent>
              </Card>
            )}

            {/* Members List */}
            <Card>
              <CardHeader>
                <CardTitle>Members ({members.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {members.map((member) => (
                    <div key={member.userId} className="flex items-center gap-3">
                      <Avatar>
                        <AvatarFallback>
                          {member.role?.charAt(0).toUpperCase() ?? 'M'}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{member.role || 'Member'}</p>
                        <p className="text-sm text-muted-foreground">
                          Joined {new Date(member.joinedAt!).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}