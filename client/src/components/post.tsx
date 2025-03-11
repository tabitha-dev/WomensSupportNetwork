import { Post } from "@shared/schema";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useQuery, useMutation } from "@tanstack/react-query";
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
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { motion } from "framer-motion";

type PostProps = {
  post: Post;
};

function getYouTubeEmbedUrl(url: string) {
  try {
    // Handle both regular and shortened YouTube URLs
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

export default function PostComponent({ post }: PostProps) {
  const { user: currentUser } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(post.content);
  const [showComments, setShowComments] = useState(false);
  const [newComment, setNewComment] = useState("");

  const { data: author } = useQuery<User>({
    queryKey: [`/api/users/${post.userId}`],
  });

  const { data: comments = [], isLoading: isLoadingComments } = useQuery({
    queryKey: [`/api/posts/${post.id}/comments`],
    enabled: showComments,
  });

  const { data: isLiked = false } = useQuery({
    queryKey: [`/api/posts/${post.id}/liked`],
  });

  const deletePostMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", `/api/posts/${post.id}`);
    },
    onSuccess: () => {
      // Invalidate both group posts and user posts queries
      queryClient.invalidateQueries({ queryKey: [`/api/groups/${post.groupId}/posts`] });
      if (author) {
        queryClient.invalidateQueries({ queryKey: [`/api/users/${author.id}/posts`] });
      }
    },
  });

  const updatePostMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("PATCH", `/api/posts/${post.id}`, { content: editedContent });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/groups/${post.groupId}/posts`] });
      if (author) {
        queryClient.invalidateQueries({ queryKey: [`/api/users/${author.id}/posts`] });
      }
      setIsEditing(false);
    },
  });

  const likeMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", `/api/posts/${post.id}/like`);
    },
    onSuccess: () => {
      // Invalidate both the like status and the group posts to update counts
      queryClient.invalidateQueries({ queryKey: [`/api/posts/${post.id}/liked`] });
      queryClient.invalidateQueries({ queryKey: [`/api/groups/${post.groupId}/posts`] });
    },
  });

  const commentMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", `/api/posts/${post.id}/comments`, { content: newComment });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/posts/${post.id}/comments`] });
      setNewComment("");
    },
  });

  const canEdit = currentUser?.id === post.userId;

  return (
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
                  {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
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
                      onClick={() => deletePostMutation.mutate()}
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
                  disabled={updatePostMutation.isPending}
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

          {showComments && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
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
                <div>Loading comments...</div>
              ) : (
                <div className="space-y-2">
                  {comments.map((comment) => (
                    <motion.div
                      key={`comment-${comment.id}`}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3 }}
                      className="flex items-start gap-2 p-2 rounded-lg bg-muted/50"
                    >
                      <Avatar className="h-6 w-6">
                        <AvatarFallback>
                          {comment.user.displayName.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="flex items-baseline gap-2">
                          <span className="text-sm font-medium">
                            {comment.user.displayName}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(comment.createdAt), {
                              addSuffix: true,
                            })}
                          </span>
                        </div>
                        <p className="text-sm">{comment.content}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}