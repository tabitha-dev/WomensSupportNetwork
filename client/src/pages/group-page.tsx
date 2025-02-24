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

  if (isLoadingGroup || isLoadingPosts || isLoadingMembers || isLoadingChat) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
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

  return (
    <div className="container mx-auto p-4 space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Card className="glass-card overflow-hidden">
          <div 
            className="h-48 bg-gradient-to-r from-primary/20 via-purple-500/20 to-blue-500/20"
            style={
              group.coverUrl
                ? {
                    backgroundImage: `url(${group.coverUrl})`,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                  }
                : {}
            }
          />
          <CardHeader>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                {group.iconUrl ? (
                  <img
                    src={group.iconUrl}
                    alt={group.name}
                    className="w-8 h-8 rounded-full"
                  />
                ) : (
                  <Users className="w-6 h-6 text-primary" />
                )}
              </div>
              <div>
                <CardTitle>{group.name}</CardTitle>
                <p className="text-muted-foreground mt-1">{group.category}</p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-foreground/90">{group.description}</p>
          </CardContent>
        </Card>

        <Tabs defaultValue="posts" className="mt-6">
          <TabsList>
            <TabsTrigger value="posts">Posts</TabsTrigger>
            <TabsTrigger value="chat">Group Chat</TabsTrigger>
            <TabsTrigger value="members">Members</TabsTrigger>
          </TabsList>

          <TabsContent value="posts" className="mt-6">
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
                    className="flex items-center gap-2"
                  >
                    <Send className="h-4 w-4" />
                    Post
                  </Button>
                </form>
              </CardContent>
            </Card>

            <div className="space-y-4 mt-6">
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
          </TabsContent>

          <TabsContent value="chat" className="mt-6">
            <Card>
              <CardContent className="p-4">
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
          </TabsContent>

          <TabsContent value="members" className="mt-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {members.map((member) => (
                <Card key={member.userId}>
                  <CardContent className="p-4 flex items-center gap-4">
                    <Avatar>
                      <AvatarFallback>
                        {member.role.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{member.role}</p>
                      <p className="text-sm text-muted-foreground">
                        Joined {new Date(member.joinedAt).toLocaleDateString()}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </motion.div>
    </div>
  );
}