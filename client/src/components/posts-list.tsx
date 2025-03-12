import { Post } from "@shared/schema";
import { useQuery } from "@tanstack/react-query";
import PostComponent from "./post";
import { PostSkeleton } from "./post-skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

type PostsListProps = {
  groupId: number;
};

export function PostsList({ groupId }: PostsListProps) {
  const {
    data: posts = [],
    isLoading,
    error
  } = useQuery<Post[]>({
    queryKey: [`/api/groups/${groupId}/posts`],
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <PostSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Failed to load posts: {error.message}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      {posts.map((post) => (
        <PostComponent key={post.id} post={post} />
      ))}
      {posts.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          No posts yet. Be the first to post!
        </div>
      )}
    </div>
  );
}
