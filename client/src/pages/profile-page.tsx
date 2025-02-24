import { useQuery, useMutation } from "@tanstack/react-query";
import { User, Post } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";
import { useParams } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  Settings,
  MapPin,
  Briefcase,
  Heart,
  Quote,
  UserPlus,
  UserMinus,
  Users,
} from "lucide-react";
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

  const { data: isFollowing } = useQuery<boolean>({
    queryKey: [`/api/users/${userId}/is-following`],
    enabled: !!userId && !isOwnProfile,
  });

  const { data: friends = [] } = useQuery<User[]>({
    queryKey: [`/api/users/${userId}/friends`],
    enabled: !!userId,
  });

  const { data: followers = [] } = useQuery<User[]>({
    queryKey: [`/api/users/${userId}/followers`],
    enabled: !!userId,
  });

  const { data: following = [] } = useQuery<User[]>({
    queryKey: [`/api/users/${userId}/following`],
    enabled: !!userId,
  });

  const { data: userGroups = [] } = useQuery({
    queryKey: ["/api/user/groups"],
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

  const followMutation = useMutation({
    mutationFn: async () => {
      await apiRequest(
        "POST",
        `/api/users/${userId}/${isFollowing ? "unfollow" : "follow"}`
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/users/${userId}/is-following`] });
      queryClient.invalidateQueries({ queryKey: [`/api/users/${userId}/followers`] });
    },
  });

  const sendFriendRequestMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", `/api/users/${userId}/friend-request`);
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

  // Apply custom styles if they exist
  const customStyles = {
    backgroundColor: user.backgroundColor || undefined,
    color: user.textColor || undefined,
    fontFamily: user.fontFamily || undefined,
  };

  const accentStyles = {
    "--accent-color": user.accentColor || "hsl(var(--primary))",
  } as React.CSSProperties;

  return (
    <div className="min-h-screen" style={customStyles}>
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
                user.coverUrl
                  ? {
                      backgroundImage: `url(${user.coverUrl})`,
                      backgroundSize: "cover",
                      backgroundPosition: "center",
                    }
                  : {}
              }
            />
            <CardContent className="relative px-6 pb-6">
              <div className="flex justify-between items-end -mt-12">
                <Avatar className="h-24 w-24 border-4 border-background">
                  <AvatarFallback className="text-2xl bg-primary/10 text-primary">
                    {user.displayName.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex gap-2">
                  {!isOwnProfile && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => followMutation.mutate()}
                        className="gap-2"
                      >
                        {isFollowing ? (
                          <>
                            <UserMinus className="h-4 w-4" />
                            Unfollow
                          </>
                        ) : (
                          <>
                            <UserPlus className="h-4 w-4" />
                            Follow
                          </>
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => sendFriendRequestMutation.mutate()}
                        className="gap-2"
                      >
                        <Users className="h-4 w-4" />
                        Add Friend
                      </Button>
                    </>
                  )}
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
              </div>

              <div className="mt-4 space-y-4">
                {isEditing ? (
                  <div className="space-y-4">
                    <Input
                      placeholder="Display Name"
                      defaultValue={user.displayName}
                      onChange={(e) =>
                        updateProfileMutation.mutate({ displayName: e.target.value })
                      }
                    />
                    <Textarea
                      placeholder="Bio"
                      defaultValue={user.bio || ""}
                      onChange={(e) =>
                        updateProfileMutation.mutate({ bio: e.target.value })
                      }
                    />
                    <Input
                      placeholder="Location"
                      defaultValue={user.location || ""}
                      onChange={(e) =>
                        updateProfileMutation.mutate({ location: e.target.value })
                      }
                    />
                    <Input
                      placeholder="Occupation"
                      defaultValue={user.occupation || ""}
                      onChange={(e) =>
                        updateProfileMutation.mutate({ occupation: e.target.value })
                      }
                    />
                    <Input
                      placeholder="Favorite Quote"
                      defaultValue={user.favoriteQuote || ""}
                      onChange={(e) =>
                        updateProfileMutation.mutate({ favoriteQuote: e.target.value })
                      }
                    />
                    <div className="pt-4 border-t space-y-4">
                      <h3 className="font-semibold">Customize Profile</h3>
                      <Input
                        type="color"
                        placeholder="Background Color"
                        defaultValue={user.backgroundColor}
                        onChange={(e) =>
                          updateProfileMutation.mutate({
                            backgroundColor: e.target.value,
                          })
                        }
                      />
                      <Input
                        type="color"
                        placeholder="Text Color"
                        defaultValue={user.textColor}
                        onChange={(e) =>
                          updateProfileMutation.mutate({ textColor: e.target.value })
                        }
                      />
                      <Input
                        type="color"
                        placeholder="Accent Color"
                        defaultValue={user.accentColor}
                        onChange={(e) =>
                          updateProfileMutation.mutate({ accentColor: e.target.value })
                        }
                      />
                      <Input
                        placeholder="Font Family"
                        defaultValue={user.fontFamily}
                        onChange={(e) =>
                          updateProfileMutation.mutate({ fontFamily: e.target.value })
                        }
                      />
                    </div>
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
              <TabsTrigger
                value="posts"
                className="data-[state=active]:border-b-2 border-primary rounded-none"
              >
                Posts
              </TabsTrigger>
              <TabsTrigger
                value="about"
                className="data-[state=active]:border-b-2 border-primary rounded-none"
              >
                About
              </TabsTrigger>
              <TabsTrigger
                value="friends"
                className="data-[state=active]:border-b-2 border-primary rounded-none"
              >
                Friends
              </TabsTrigger>
              <TabsTrigger
                value="groups"
                className="data-[state=active]:border-b-2 border-primary rounded-none"
              >
                Groups
              </TabsTrigger>
              <TabsTrigger
                value="profile"
                className="data-[state=active]:border-b-2 border-primary rounded-none"
              >
                Profile
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
                  <div className="grid grid-cols-3 gap-4 mt-4">
                    <div>
                      <h3 className="font-semibold mb-2">Followers</h3>
                      <p className="text-muted-foreground">{followers.length}</p>
                    </div>
                    <div>
                      <h3 className="font-semibold mb-2">Following</h3>
                      <p className="text-muted-foreground">{following.length}</p>
                    </div>
                    <div>
                      <h3 className="font-semibold mb-2">Friends</h3>
                      <p className="text-muted-foreground">{friends.length}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="friends" className="mt-6">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {friends.map((friend) => (
                  <Card key={friend.id}>
                    <CardContent className="p-4 flex items-center gap-4">
                      <Avatar>
                        <AvatarFallback>
                          {friend.displayName.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{friend.displayName}</p>
                        <p className="text-sm text-muted-foreground">
                          @{friend.username}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {friends.length === 0 && (
                  <Card className="col-span-full">
                    <CardContent className="p-8 text-center text-muted-foreground">
                      No friends yet
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>

            <TabsContent value="groups" className="mt-6">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {userGroups.map((group) => (
                  <Card key={group.id}>
                    <CardContent className="p-4">
                      <h3 className="font-medium mb-1">{group.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {group.category}
                      </p>
                    </CardContent>
                  </Card>
                ))}
                {userGroups.length === 0 && (
                  <Card className="col-span-full">
                    <CardContent className="p-8 text-center text-muted-foreground">
                      Not a member of any groups yet
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>

            <TabsContent value="profile" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Profile Settings</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid gap-4">
                    <div>
                      <h3 className="text-lg font-semibold mb-4">Theme Customization</h3>
                      <div className="grid gap-4">
                        <div>
                          <label className="text-sm font-medium">Background Color</label>
                          <Input
                            type="color"
                            value={user.backgroundColor || "#ffffff"}
                            onChange={(e) =>
                              updateProfileMutation.mutate({
                                backgroundColor: e.target.value,
                              })
                            }
                            className="h-10 w-full"
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium">Text Color</label>
                          <Input
                            type="color"
                            value={user.textColor || "#000000"}
                            onChange={(e) =>
                              updateProfileMutation.mutate({
                                textColor: e.target.value,
                              })
                            }
                            className="h-10 w-full"
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium">Accent Color</label>
                          <Input
                            type="color"
                            value={user.accentColor || "hsl(var(--primary))"}
                            onChange={(e) =>
                              updateProfileMutation.mutate({
                                accentColor: e.target.value,
                              })
                            }
                            className="h-10 w-full"
                          />
                        </div>
                      </div>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold mb-4">Font Settings</h3>
                      <div className="grid gap-4">
                        <div>
                          <label className="text-sm font-medium">Font Family</label>
                          <select
                            className="w-full h-10 px-3 py-2 bg-background border border-input rounded-md"
                            value={user.fontFamily || ""}
                            onChange={(e) =>
                              updateProfileMutation.mutate({
                                fontFamily: e.target.value,
                              })
                            }
                          >
                            <option value="">Default</option>
                            <option value="Arial">Arial</option>
                            <option value="Helvetica">Helvetica</option>
                            <option value="Times New Roman">Times New Roman</option>
                            <option value="Georgia">Georgia</option>
                            <option value="Verdana">Verdana</option>
                          </select>
                        </div>
                      </div>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold mb-4">Profile Information</h3>
                      <div className="grid gap-4">
                        <div>
                          <label className="text-sm font-medium">Display Name</label>
                          <Input
                            value={user.displayName}
                            onChange={(e) =>
                              updateProfileMutation.mutate({
                                displayName: e.target.value,
                              })
                            }
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium">Bio</label>
                          <Textarea
                            value={user.bio || ""}
                            onChange={(e) =>
                              updateProfileMutation.mutate({
                                bio: e.target.value,
                              })
                            }
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium">Location</label>
                          <Input
                            value={user.location || ""}
                            onChange={(e) =>
                              updateProfileMutation.mutate({
                                location: e.target.value,
                              })
                            }
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium">Occupation</label>
                          <Input
                            value={user.occupation || ""}
                            onChange={(e) =>
                              updateProfileMutation.mutate({
                                occupation: e.target.value,
                              })
                            }
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium">Favorite Quote</label>
                          <Input
                            value={user.favoriteQuote || ""}
                            onChange={(e) =>
                              updateProfileMutation.mutate({
                                favoriteQuote: e.target.value,
                              })
                            }
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </motion.div>
      </div>
    </div>
  );
}