import { useQuery, useMutation } from "@tanstack/react-query";
import { User, Post } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";
import { useParams } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Loader2, Settings, MapPin, Briefcase, Heart, Quote } from "lucide-react";
import PostComponent from "@/components/post";
import { motion } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useState } from "react";

export default function ProfilePage() {
  const { id } = useParams();
  const { user: currentUser } = useAuth();
  const userId = parseInt(id!);
  const isOwnProfile = currentUser?.id === userId;
  const [isEditing, setIsEditing] = useState(false);

  const { data: user, isLoading: isLoadingUser } = useQuery<User>({
    queryKey: [`/api/users/${userId}`],
    enabled: !!userId,
  });

  const { data: posts = [], isLoading: isLoadingPosts } = useQuery<Post[]>({
    queryKey: [`/api/users/${userId}/posts`],
    enabled: !!userId,
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (data: Partial<User>) => {
      const res = await apiRequest("PATCH", `/api/users/${userId}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/users/${userId}`] });
      setIsEditing(false);
    },
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
          <div 
            className="h-48 bg-gradient-to-r from-primary/20 via-purple-500/20 to-blue-500/20"
            style={user.coverUrl ? { 
              backgroundImage: `url(${user.coverUrl})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            } : {}}
          />
          <CardContent className="relative px-6 pb-6">
            <div className="flex justify-between items-end -mt-12">
              <Avatar className="h-24 w-24 border-4 border-background">
                <AvatarFallback className="text-2xl bg-primary/10 text-primary">
                  {user.displayName.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              {isOwnProfile && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="gap-2"
                  onClick={() => setIsEditing(!isEditing)}
                >
                  <Settings className="h-4 w-4" />
                  {isEditing ? "Cancel Editing" : "Edit Profile"}
                </Button>
              )}
            </div>
            <div className="mt-4 space-y-4">
              {isEditing ? (
                <div className="space-y-4">
                  <Input
                    placeholder="Display Name"
                    defaultValue={user.displayName}
                    onChange={(e) => updateProfileMutation.mutate({ displayName: e.target.value })}
                  />
                  <Textarea
                    placeholder="Bio"
                    defaultValue={user.bio || ""}
                    onChange={(e) => updateProfileMutation.mutate({ bio: e.target.value })}
                  />
                  <Input
                    placeholder="Location"
                    defaultValue={user.location || ""}
                    onChange={(e) => updateProfileMutation.mutate({ location: e.target.value })}
                  />
                  <Input
                    placeholder="Occupation"
                    defaultValue={user.occupation || ""}
                    onChange={(e) => updateProfileMutation.mutate({ occupation: e.target.value })}
                  />
                  <Input
                    placeholder="Favorite Quote"
                    defaultValue={user.favoriteQuote || ""}
                    onChange={(e) => updateProfileMutation.mutate({ favoriteQuote: e.target.value })}
                  />
                </div>
              ) : (
                <>
                  <h1 className="text-2xl font-bold">{user.displayName}</h1>
                  <p className="text-muted-foreground">@{user.username}</p>
                  {user.bio && <p className="text-foreground/90">{user.bio}</p>}

                  <div className="flex flex-wrap gap-4 mt-4 text-sm text-muted-foreground">
                    {user.location && (
                      <div className="flex items-center gap-1">
                        <MapPin className="h-4 w-4" />
                        {user.location}
                      </div>
                    )}
                    {user.occupation && (
                      <div className="flex items-center gap-1">
                        <Briefcase className="h-4 w-4" />
                        {user.occupation}
                      </div>
                    )}
                  </div>

                  {user.favoriteQuote && (
                    <div className="flex items-center gap-2 mt-4 italic text-muted-foreground">
                      <Quote className="h-4 w-4" />
                      "{user.favoriteQuote}"
                    </div>
                  )}
                </>
              )}
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="posts" className="mt-6">
          <TabsList className="w-full justify-start border-b rounded-none p-0 h-12">
            <TabsTrigger value="posts" className="data-[state=active]:border-b-2 border-primary rounded-none">
              Posts
            </TabsTrigger>
            <TabsTrigger value="about" className="data-[state=active]:border-b-2 border-primary rounded-none">
              About
            </TabsTrigger>
            <TabsTrigger value="groups" className="data-[state=active]:border-b-2 border-primary rounded-none">
              Groups
            </TabsTrigger>
          </TabsList>

          <TabsContent value="posts" className="mt-6">
            <div className="space-y-4">
              {posts.map((post) => (
                <PostComponent key={post.id} post={post} />
              ))}
              {posts.length === 0 && (
                <Card>
                  <CardContent className="p-8 text-center text-muted-foreground">
                    No posts yet
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="about" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>About Me</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {user.interests && (
                  <div>
                    <h3 className="font-semibold mb-2">Interests</h3>
                    <p className="text-muted-foreground">{user.interests}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="groups" className="mt-6">
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