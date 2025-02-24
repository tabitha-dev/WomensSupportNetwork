import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams } from "wouter";
import { Group, Post } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";
import PostComponent from "@/components/post";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Send } from "lucide-react";
import { useForm } from "react-hook-form";
import { apiRequest, queryClient } from "@/lib/queryClient";

type PostFormData = {
  content: string;
};

export default function GroupPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const groupId = parseInt(id || "0");

  const form = useForm<PostFormData>({
    defaultValues: {
      content: "",
    },
  });

  const { data: group, isLoading: isLoadingGroup } = useQuery<Group>({
    queryKey: [`/api/groups/${groupId}`],
    enabled: !!groupId && groupId > 0,
  });

  const { data: posts = [], isLoading: isLoadingPosts } = useQuery<Post[]>({
    queryKey: [`/api/groups/${groupId}/posts`],
    enabled: !!groupId && groupId > 0,
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

  if (!groupId || groupId <= 0) {
    return <div>Invalid group ID</div>;
  }

  if (isLoadingGroup || isLoadingPosts) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!group) {
    return <div>Group not found</div>;
  }

  return (
    <div className="container mx-auto p-4 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{group.name}</CardTitle>
          <p className="text-muted-foreground">{group.description}</p>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Create Post</CardTitle>
        </CardHeader>
        <CardContent>
          <form 
            onSubmit={form.handleSubmit((data) => createPostMutation.mutate(data))}
            className="space-y-4"
          >
            <Textarea
              placeholder="Share your thoughts..."
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
    </div>
  );
}