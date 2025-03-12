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
import { FaTwitter, FaGithub, FaLinkedin, FaInstagram } from "react-icons/fa";
import { useToast } from "@/hooks/use-toast";

const SocialIconMap = {
  twitter: FaTwitter,
  github: FaGithub,
  linkedin: FaLinkedin,
  instagram: FaInstagram,
};

export default function ProfilePage() {
  const { id } = useParams();
  const { user: currentUser } = useAuth();
  const { toast } = useToast();
  const userId = parseInt(id!);
  const isOwnProfile = currentUser?.id === userId;
  const [isEditing, setIsEditing] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    displayName: '',
    bio: '',
    location: '',
    occupation: '',
    favoriteQuote: '',
    backgroundColor: '',
    textColor: '',
    accentColor: '',
    fontFamily: '',
    socialLinks: ''
  });

  const { data: user, isLoading: isLoadingUser } = useQuery<User>({
    queryKey: [`/api/users/${userId}`],
    enabled: !!userId,
    onSuccess: (data) => {
      if (data) {
        setFormData({
          displayName: data.displayName || '',
          bio: data.bio || '',
          location: data.location || '',
          occupation: data.occupation || '',
          favoriteQuote: data.favoriteQuote || '',
          backgroundColor: data.backgroundColor || '',
          textColor: data.textColor || '',
          accentColor: data.accentColor || '',
          fontFamily: data.fontFamily || '',
          socialLinks: data.socialLinks || '{}'
        });
      }
    },
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
      const response = await apiRequest("PATCH", `/api/users/${userId}`, data);
      if (!response.ok) {
        throw new Error('Failed to update profile');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/users/${userId}`] });
      toast({
        title: "Success",
        description: "Profile updated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: "Failed to update profile: " + error.message,
        variant: "destructive",
      });
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

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Update social links handler
  const handleSocialLinkChange = (platform: string, url: string) => {
    const currentLinks = formData.socialLinks ? JSON.parse(formData.socialLinks) : {};
    const newLinks = { ...currentLinks, [platform]: url };
    setFormData(prev => ({
      ...prev,
      socialLinks: JSON.stringify(newLinks)
    }));
  };

  const handleSubmit = async () => {
    try {
      await updateProfileMutation.mutateAsync(formData);
      setIsEditing(false);
      toast({
        title: "Success",
        description: "Profile updated successfully",
      });
    } catch (error) {
      console.error('Failed to update profile:', error);
      toast({
        title: "Error",
        description: "Failed to update profile settings",
        variant: "destructive",
      });
    }
  };

  // Parse social links from JSON string
  const socialLinks = formData.socialLinks ? JSON.parse(formData.socialLinks) : {};


  // Apply custom styles if they exist
  const customStyles = {
    backgroundColor: user?.backgroundColor || undefined,
    color: user?.textColor || undefined,
    fontFamily: user?.fontFamily || undefined,
  };

  const accentStyles = {
    "--accent-color": user?.accentColor || "hsl(var(--primary))",
  } as React.CSSProperties;

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
                  {user.avatarUrl ? (
                    <img src={user.avatarUrl} alt={user.displayName} />
                  ) : (
                    <AvatarFallback className="text-2xl bg-primary/10 text-primary">
                      {user.displayName.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  )}
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
                    <div className="grid gap-4">
                      <div>
                        <label className="text-sm font-medium">Display Name</label>
                        <Input
                          placeholder="Display Name"
                          value={formData.displayName}
                          onChange={(e) =>
                            handleInputChange('displayName', e.target.value)
                          }
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium">Bio</label>
                        <Textarea
                          placeholder="Bio"
                          value={formData.bio}
                          onChange={(e) => handleInputChange('bio', e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium">Social Media Links</label>
                        <div className="space-y-2">
                          {Object.entries(SocialIconMap).map(([platform, Icon]) => (
                            <div key={platform} className="flex items-center gap-2">
                              <Icon className="h-5 w-5" />
                              <Input
                                placeholder={`${platform.charAt(0).toUpperCase() + platform.slice(1)} URL`}
                                value={socialLinks[platform] || ""}
                                onChange={(e) => handleSocialLinkChange(platform, e.target.value)}
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="pt-4 border-t space-y-4">
                      <h3 className="font-semibold">Customize Profile</h3>
                      <div className="grid gap-4">
                        <div>
                          <label className="text-sm font-medium">Background Color</label>
                          <Input
                            type="color"
                            value={formData.backgroundColor}
                            onChange={(e) => handleInputChange('backgroundColor', e.target.value)}
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium">Text Color</label>
                          <Input
                            type="color"
                            value={formData.textColor}
                            onChange={(e) => handleInputChange('textColor', e.target.value)}
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium">Accent Color</label>
                          <Input
                            type="color"
                            value={formData.accentColor}
                            onChange={(e) => handleInputChange('accentColor', e.target.value)}
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium">Font Family</label>
                          <select
                            className="w-full h-10 px-3 py-2 bg-background border border-input rounded-md"
                            value={formData.fontFamily}
                            onChange={(e) => handleInputChange('fontFamily', e.target.value)}
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
                    <div className="flex gap-2 mt-4">
                      <Button onClick={handleSubmit} disabled={updateProfileMutation.isPending}>
                        {updateProfileMutation.isPending ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          'Save Changes'
                        )}
                      </Button>
                      <Button variant="outline" onClick={() => setIsEditing(false)}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <h1 className="text-2xl font-bold">{user.displayName}</h1>
                    <p className="text-muted-foreground">@{user.username}</p>
                    {user.bio && <p className="text-foreground/90">{user.bio}</p>}

                    {/* Social Links */}
                    {Object.entries(socialLinks).length > 0 && (
                      <div className="flex gap-4 mt-4">
                        {Object.entries(socialLinks).map(([platform, url]) => {
                          const Icon = SocialIconMap[platform as keyof typeof SocialIconMap];
                          return (
                            <a
                              key={platform}
                              href={url as string}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-muted-foreground hover:text-primary transition-colors"
                            >
                              <Icon className="h-5 w-5" />
                            </a>
                          );
                        })}
                      </div>
                    )}

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

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-6">
            {/* Stats Cards */}
            <Card className="col-span-full md:col-span-1">
              <CardHeader>
                <CardTitle>Stats</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Posts</span>
                    <span className="text-2xl font-bold">{posts.length}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Friends</span>
                    <span className="text-2xl font-bold">{friends.length}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Followers</span>
                    <span className="text-2xl font-bold">{followers.length}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Following</span>
                    <span className="text-2xl font-bold">{following.length}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Main Content Area */}
            <div className="col-span-full md:col-span-3">
              <Tabs defaultValue="posts">
                <TabsList>
                  <TabsTrigger key="posts-tab" value="posts">Posts</TabsTrigger>
                  <TabsTrigger key="about-tab" value="about">About</TabsTrigger>
                  <TabsTrigger key="friends-tab" value="friends">Friends</TabsTrigger>
                  <TabsTrigger key="groups-tab" value="groups">Groups</TabsTrigger>
                </TabsList>

                <TabsContent key="posts-content" value="posts" className="mt-6">
                  <div className="space-y-4">
                    {posts.map((post) => (
                      <PostComponent key={`post-${post.id}`} post={post} />
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

                <TabsContent key="about-content" value="about" className="mt-6">
                  <Card>
                    <CardContent className="space-y-4 p-6">
                      <div>
                        <h3 className="text-lg font-semibold mb-2">About Me</h3>
                        <p className="text-muted-foreground">{user.bio || "No bio added yet"}</p>
                      </div>
                      {user.interests && (
                        <div>
                          <h3 className="text-lg font-semibold mb-2">Interests</h3>
                          <p className="text-muted-foreground">{user.interests}</p>
                        </div>
                      )}
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <h3 className="font-semibold mb-2">Location</h3>
                          <p className="text-muted-foreground">{user.location || "Not specified"}</p>
                        </div>
                        <div>
                          <h3 className="font-semibold mb-2">Occupation</h3>
                          <p className="text-muted-foreground">{user.occupation || "Not specified"}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent key="friends-content" value="friends" className="mt-6">
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {friends.map((friend) => (
                      <Card key={`friend-${friend.id}`} className="overflow-hidden">
                        <CardContent className="p-4">
                          <div className="flex items-center gap-4">
                            <Avatar>
                              {friend.avatarUrl ? (
                                <img src={friend.avatarUrl} alt={friend.displayName} />
                              ) : (
                                <AvatarFallback>
                                  {friend.displayName.charAt(0).toUpperCase()}
                                </AvatarFallback>
                              )}
                            </Avatar>
                            <div>
                              <p className="font-medium">{friend.displayName}</p>
                              <p className="text-sm text-muted-foreground">
                                @{friend.username}
                              </p>
                            </div>
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

                <TabsContent key="groups-content" value="groups" className="mt-6">
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {userGroups.map((group) => (
                      <Card key={`group-${group.id}`} className="overflow-hidden">
                        <CardContent className="p-4">
                          <div className="flex items-center gap-4">
                            {group.iconUrl && (
                              <img
                                src={group.iconUrl}
                                alt={group.name}
                                className="w-12 h-12 rounded-full"
                              />
                            )}
                            <div>
                              <p className="font-medium">{group.name}</p>
                              <p className="text-sm text-muted-foreground">
                                {group.category}
                              </p>
                            </div>
                          </div>
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
              </Tabs>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}