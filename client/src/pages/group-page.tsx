import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams } from "wouter";
import { Group, Post } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";
import PostComponent from "@/components/post";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Send, Users } from "lucide-react";
import { useForm } from "react-hook-form";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { motion } from "framer-motion";

type PostFormData = {
  content: string;
};

export default function GroupPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const groupId = parseInt(id!);

  const form = useForm<PostFormData>({
    defaultValues: {
      content: "",
    },
  });

  const { data: group, isLoading: isLoadingGroup } = useQuery<Group>({
    queryKey: [`/api/groups/${groupId}`],
    enabled: !!groupId,
  });

  const { data: posts = [], isLoading: isLoadingPosts } = useQuery<Post[]>({
    queryKey: [`/api/groups/${groupId}/posts`],
    enabled: !!groupId,
  });

  const createPostMutation = useMutation({
    mutationFn: async (data: PostFormData) => {
      await apiRequest("POST", `/api/groups/${groupId}/posts`, {
        content: data.content,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/groups/${groupId}/posts`] });
      form.reset();
    },
  });

  if (isLoadingGroup || isLoadingPosts) {
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
        <Card className="glass-card">
          <CardHeader>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Users className="w-6 h-6 text-primary" />
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

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Create Post</CardTitle>
          </CardHeader>
          <CardContent>
            <form 
              onSubmit={form.handleSubmit((data) => createPostMutation.mutate(data))}
              className="space-y-4"
            >
              <Textarea
                placeholder="Share your thoughts with the group..."
                {...form.register("content")}
              />
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
      </motion.div>
    </div>
  );
}