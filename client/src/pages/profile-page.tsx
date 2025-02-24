import { useQuery } from "@tanstack/react-query";
import { User, Post } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";
import { useParams } from "wouter";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Loader2, Settings, Image as ImageIcon } from "lucide-react";
import PostComponent from "@/components/post";
import { motion } from "framer-motion";

export default function ProfilePage() {
  const { id } = useParams();
  const { user: currentUser } = useAuth();
  const userId = parseInt(id);
  const isOwnProfile = currentUser?.id === userId;

  const { data: user, isLoading: isLoadingUser } = useQuery<User>({
    queryKey: [`/api/users/${userId}`],
  });

  const { data: posts, isLoading: isLoadingPosts } = useQuery<Post[]>({
    queryKey: [`/api/users/${userId}/posts`],
  });

  if (isLoadingUser || isLoadingPosts) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <div>User not found</div>;
  }

  return (
    <div className="container mx-auto p-4 space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Card className="glass-card overflow-hidden">
          <div className="h-48 bg-gradient-to-r from-primary/20 via-purple-500/20 to-blue-500/20" />
          <CardContent className="relative px-6 pb-6">
            <div className="flex justify-between items-end -mt-12">
              <Avatar className="h-24 w-24 border-4 border-background">
                <AvatarFallback className="text-2xl bg-primary/10 text-primary">
                  {user.displayName.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              {isOwnProfile && (
                <Button variant="outline" size="sm" className="gap-2">
                  <Settings className="h-4 w-4" />
                  Edit Profile
                </Button>
              )}
            </div>
            <div className="mt-4 space-y-2">
              <h1 className="text-2xl font-bold">{user.displayName}</h1>
              <p className="text-muted-foreground">@{user.username}</p>
              {user.bio && <p className="text-foreground/90">{user.bio}</p>}
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="posts" className="mt-6">
          <TabsList className="w-full justify-start border-b rounded-none p-0 h-12">
            <TabsTrigger value="posts" className="data-[state=active]:border-b-2 border-primary rounded-none">
              Posts
            </TabsTrigger>
            <TabsTrigger value="groups" className="data-[state=active]:border-b-2 border-primary rounded-none">
              Groups
            </TabsTrigger>
          </TabsList>

          <TabsContent value="posts" className="mt-6">
            <div className="space-y-4">
              {posts?.map((post) => (
                <PostComponent key={post.id} post={post} />
              ))}
              {posts?.length === 0 && (
                <Card>
                  <CardContent className="p-8 text-center text-muted-foreground">
                    No posts yet
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="groups" className="mt-6">
            {/* Groups content will be implemented later */}
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                Groups will be shown here
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </motion.div>
    </div>
  );
}
