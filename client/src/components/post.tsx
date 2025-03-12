import { Post, Comment } from "@shared/schema";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { User } from "@shared/schema";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import {
  Heart,
  MessageCircle,
  Send,
  Image as ImageIcon,
  Video,
  Trash2,
  AlertCircle
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { PostSkeleton } from "./post-skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";


type PostProps = {
  post: Post;
};

function getYouTubeEmbedUrl(url: string) {
  try {
    if (url.includes('youtu.be/')) {
      const videoId = url.split('youtu.be/')[1]?.split('?')[0];
      if (!videoId) return null;
      return `https://www.youtube.com/embed/${videoId}`;
    } else {
      const videoId = url.split('v=')[1]?.split('&')[0];
      if (!videoId) return null;
      return `https://www.youtube.com/embed/${videoId}`;
    }
  } catch {
    return null;
  }
}

export default function PostComponent({ post: initialPost }: PostProps) {
  const { user: currentUser } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(initialPost.content);
  const [showComments, setShowComments] = useState(false);
  const [newComment, setNewComment] = useState("");

  // Track post state locally for optimistic updates
  const [post, setPost] = useState(initialPost);

  const { 
    data: author,
    isLoading: isLoadingAuthor,
    error: authorError
  } = useQuery<User>({
    queryKey: [`/api/users/${initialPost.userId}`],
  });

  if (isLoadingAuthor) {
    return <PostSkeleton />;
  }

  if (authorError) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Failed to load post author: {authorError.message}
        </AlertDescription>
      </Alert>
    );
  }

  const { data: comments = [], isLoading: isLoadingComments } = useQuery<Comment[]>({
    queryKey: [`/api/posts/${post.id}/comments`],
    enabled: showComments,
  });

  const { data: commentUsers = {} } = useQuery<Record<number, User>>({
    queryKey: [`/api/posts/${post.id}/comment-users`],
    enabled: showComments && comments.length > 0,
  });

  const { data: isLiked = false } = useQuery<boolean>({
    queryKey: [`/api/posts/${post.id}/liked`],
  });

  const deletePostMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("DELETE", `/api/posts/${post.id}`);
      if (!response.ok) {
        throw new Error('Failed to delete post');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/groups/${post.groupId}/posts`] });
      toast({
        title: "Success",
        description: "Post deleted successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: "Failed to delete post: " + error.message,
        variant: "destructive",
      });
    },
  });

  const updatePostMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("PATCH", `/api/posts/${post.id}`, { content: editedContent });
      if (!response.ok) {
        throw new Error('Failed to update post');
      }
      return response.json();
    },
    onSuccess: (updatedPost: Post) => {
      queryClient.invalidateQueries({ queryKey: [`/api/groups/${post.groupId}/posts`] });
      setPost(updatedPost);
      setIsEditing(false);
      toast({
        title: "Success",
        description: "Post updated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: "Failed to update post: " + error.message,
        variant: "destructive",
      });
    },
  });

  const likeMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", `/api/posts/${post.id}/like`);
      if (!response.ok) {
        throw new Error('Failed to like/unlike post');
      }
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: [`/api/posts/${post.id}/liked`] });
      const previousLiked = queryClient.getQueryData([`/api/posts/${post.id}/liked`]);

      queryClient.setQueryData([`/api/posts/${post.id}/liked`], !isLiked);
      setPost(prev => ({
        ...prev,
        likeCount: (prev.likeCount || 0) + (isLiked ? -1 : 1)
      }));

      return { previousLiked };
    },
    onError: (err, _, context) => {
      queryClient.setQueryData([`/api/posts/${post.id}/liked`], context?.previousLiked);
      setPost(initialPost);
      toast({
        title: "Error",
        description: "Failed to update like status",
        variant: "destructive",
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/posts/${post.id}/liked`] });
      queryClient.invalidateQueries({ queryKey: [`/api/groups/${post.groupId}/posts`] });
    },
  });

  const commentMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", `/api/posts/${post.id}/comments`, { content: newComment });
      if (!response.ok) {
        throw new Error('Failed to add comment');
      }
      return response.json();
    },
    onSuccess: (newCommentData: Comment) => {
      queryClient.setQueryData<Comment[]>([`/api/posts/${post.id}/comments`], (old = []) => [...old, newCommentData]);
      setNewComment("");
      toast({
        title: "Success",
        description: "Comment added successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: "Failed to add comment: " + error.message,
        variant: "destructive",
      });
    },
  });

  const canEdit = currentUser?.id === post.userId;


  return (
    <ErrorBoundary>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Card className="overflow-hidden">
          <CardHeader className="space-y-0 pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Avatar className="h-8 w-8">
                  {author?.avatarUrl ? (
                    <img src={author.avatarUrl} alt={author.displayName} />
                  ) : (
                    <AvatarFallback>
                      {author?.displayName?.charAt(0).toUpperCase() || 'U'}
                    </AvatarFallback>
                  )}
                </Avatar>
                <div className="flex flex-col">
                  <span className="text-sm font-medium">{author?.displayName}</span>
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(post.createdAt || Date.now()), { addSuffix: true })}
                  </span>
                </div>
              </div>
              {canEdit && (
                <div className="flex gap-2">
                  {!isEditing && (
                    <>
                      <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)}>
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive/90"
                        onClick={() => {
                          if (window.confirm('Are you sure you want to delete this post?')) {
                            deletePostMutation.mutate();
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {isEditing ? (
              <div className="space-y-2">
                <Textarea
                  value={editedContent}
                  onChange={(e) => setEditedContent(e.target.value)}
                  className="min-h-[100px]"
                />
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    onClick={() => updatePostMutation.mutate()}
                    disabled={updatePostMutation.isPending || !editedContent.trim()}
                  >
                    Save
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setIsEditing(false);
                      setEditedContent(post.content);
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  {post.postType === "image" && <ImageIcon className="h-4 w-4 text-muted-foreground" />}
                  {post.postType === "video" && <Video className="h-4 w-4 text-muted-foreground" />}
                  <p className="whitespace-pre-wrap">{post.content}</p>
                </div>

                {post.postType === "image" && post.imageUrl && (
                  <div className="mt-4 relative aspect-video rounded-lg overflow-hidden">
                    <img
                      src={post.imageUrl}
                      alt="Post attachment"
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                  </div>
                )}

                {post.postType === "video" && post.videoUrl && (
                  <div className="mt-4 aspect-video">
                    <iframe
                      src={getYouTubeEmbedUrl(post.videoUrl) || post.videoUrl}
                      title="YouTube video"
                      className="w-full h-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                )}

                <div className="flex items-center gap-4 mt-4 pt-2 border-t">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => likeMutation.mutate()}
                    disabled={likeMutation.isPending}
                    className={`hover:scale-105 ${isLiked ? "text-red-500" : ""}`}
                  >
                    <Heart className={`h-4 w-4 mr-1 ${isLiked ? "fill-current" : ""}`} />
                    {post.likeCount || 0}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowComments(!showComments)}
                    className="hover:scale-105"
                  >
                    <MessageCircle className="h-4 w-4 mr-1" />
                    {comments.length}
                  </Button>
                </div>
              </div>
            )}

            <AnimatePresence>
              {showComments && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                  className="pt-4 space-y-4"
                >
                  <div className="flex gap-2">
                    <Textarea
                      placeholder="Write a comment..."
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      className="min-h-[60px]"
                    />
                    <Button
                      size="icon"
                      onClick={() => commentMutation.mutate()}
                      disabled={!newComment.trim() || commentMutation.isPending}
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                  {isLoadingComments ? (
                    <div className="space-y-2">
                      <Skeleton className="h-[60px]" />
                      <Skeleton className="h-[60px]" />
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {comments.map((comment) => {
                        const commentUser = commentUsers[comment.userId || 0];
                        return (
                          <motion.div
                            key={`comment-${comment.id}`}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.3 }}
                            className="flex items-start gap-2 p-2 rounded-lg bg-muted/50"
                          >
                            <Avatar className="h-6 w-6">
                              <AvatarFallback>
                                {commentUser?.displayName?.charAt(0).toUpperCase() || 'U'}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="flex items-baseline gap-2">
                                <span className="text-sm font-medium">
                                  {commentUser?.displayName || 'Unknown User'}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {formatDistanceToNow(new Date(comment.createdAt || Date.now()), {
                                    addSuffix: true,
                                  })}
                                </span>
                              </div>
                              <p className="text-sm">{comment.content}</p>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </CardContent>
        </Card>
      </motion.div>
    </ErrorBoundary>
  );
}