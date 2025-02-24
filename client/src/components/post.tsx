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
import { Smile, Edit2, Check, X } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

type PostProps = {
  post: Post;
};

export default function PostComponent({ post }: PostProps) {
  const { user: currentUser } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(post.content);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const { data: author } = useQuery<User>({
    queryKey: [`/api/users/${post.userId}`],
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
    <Card className="glass-card">
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
      <CardContent>
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
            <p className="whitespace-pre-wrap">{post.content}</p>
            <Popover open={showEmojiPicker} onOpenChange={setShowEmojiPicker}>
              <PopoverTrigger asChild>
                <Button
                  size="sm"
                  variant="ghost"
                  className="absolute top-0 right-0"
                >
                  <Smile className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="p-0">
                <EmojiPicker onEmojiClick={onEmojiClick} />
              </PopoverContent>
            </Popover>
          </div>
        )}
      </CardContent>
    </Card>
  );
}