import { Post } from "@shared/schema";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useQuery, useMutation } from "@tanstack/react-query";
import { User } from "@shared/schema";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import EmojiPicker from 'emoji-picker-react';
import { 
  Smile, 
  Edit2, 
  Check, 
  X, 
  Heart, 
  MessageCircle,
  Send,
  Image as ImageIcon
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { motion } from "framer-motion";

type PostProps = {
  post: Post;
};

export default function PostComponent({ post }: PostProps) {
  const { user: currentUser } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(post.content);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [newComment, setNewComment] = useState("");

  const { data: author } = useQuery<User>({
    queryKey: [`/api/users/${post.userId}`],
  });

  const { data: comments = [] } = useQuery({
    queryKey: [`/api/posts/${post.id}/comments`],
    enabled: showComments,
  });

  const { data: isLiked = false } = useQuery({
    queryKey: [`/api/posts/${post.id}/liked`],
  });

  const updatePostMutation = useMutation({
    mutationFn: async (content: string) => {
      await apiRequest("PATCH", `/api/posts/${post.id}`, { content });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/groups/${post.groupId}/posts`] });
      setIsEditing(false);
    },
  });

  const likeMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", `/api/posts/${post.id}/like`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/posts/${post.id}/liked`] });
      queryClient.invalidateQueries({ queryKey: [`/api/groups/${post.groupId}/posts`] });
    },
  });

  const commentMutation = useMutation({
    mutationFn: async (content: string) => {
      await apiRequest("POST", `/api/posts/${post.id}/comments`, { content });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/posts/${post.id}/comments`] });
      setNewComment("");
    },
  });

  const onEmojiClick = (emoji: any) => {
    const newContent = isEditing 
      ? editedContent + emoji.emoji
      : post.content + emoji.emoji;

    if (isEditing) {
      setEditedContent(newContent);
    } else {
      updatePostMutation.mutate(newContent);
    }
    setShowEmojiPicker(false);
  };

  const canEdit = currentUser?.id === post.userId;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="glass-card overflow-hidden">
        <CardHeader className="space-y-0 pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Avatar className="h-8 w-8 bg-primary/10">
                <AvatarFallback>
                  {author?.displayName.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col">
                <span className="text-sm font-medium">{author?.displayName}</span>
                <span className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
                </span>
              </div>
            </div>
            {canEdit && !isEditing && (
              <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)}>
                <Edit2 className="h-4 w-4" />
              </Button>
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
                  onClick={() => updatePostMutation.mutate(editedContent)}
                  disabled={updatePostMutation.isPending}
                >
                  <Check className="h-4 w-4 mr-1" />
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
                  <X className="h-4 w-4 mr-1" />
                  Cancel
                </Button>
                <Popover open={showEmojiPicker} onOpenChange={setShowEmojiPicker}>
                  <PopoverTrigger asChild>
                    <Button size="sm" variant="outline">
                      <Smile className="h-4 w-4" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="p-0">
                    <EmojiPicker onEmojiClick={onEmojiClick} />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          ) : (
            <div className="relative">
              <p className="whitespace-pre-wrap pb-4">{post.content}</p>
              {post.imageUrl && (
                <div className="relative aspect-video rounded-lg overflow-hidden mb-4">
                  <img 
                    src={post.imageUrl} 
                    alt="Post attachment" 
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                </div>
              )}
              <div className="flex items-center gap-4 pt-2 border-t">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => likeMutation.mutate()}
                  className={`hover-scale ${isLiked ? "text-red-500" : ""}`}
                >
                  <Heart className={`h-4 w-4 mr-1 ${isLiked ? "fill-current" : ""}`} />
                  {post.likeCount || 0}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowComments(!showComments)}
                  className="hover-scale"
                >
                  <MessageCircle className="h-4 w-4 mr-1" />
                  {comments.length}
                </Button>
                <Popover open={showEmojiPicker} onOpenChange={setShowEmojiPicker}>
                  <PopoverTrigger asChild>
                    <Button size="sm" variant="ghost" className="hover-scale">
                      <Smile className="h-4 w-4" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="p-0">
                    <EmojiPicker onEmojiClick={onEmojiClick} />
                  </PopoverContent>
                </Popover>
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
                  onClick={() => commentMutation.mutate(newComment)}
                  disabled={!newComment.trim() || commentMutation.isPending}
                  className="hover-scale"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
              <div className="space-y-2">
                {comments.map((comment) => (
                  <motion.div
                    key={comment.id}
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
            </motion.div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}