import { useQuery, useMutation } from "@tanstack/react-query";
import { User, Post, Group } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";
import { useParams } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  Settings,
  MapPin,
  Briefcase,
  Quote,
  UserPlus,
  UserMinus,
  Users,
  Loader2,
} from "lucide-react";
import PostComponent from "@/components/post";
import { motion } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useState, useEffect, useMemo } from "react";
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

  // Initialize form state
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
    interests: ''
  });

  // Initialize field-specific state
  const [locationInput, setLocationInput] = useState("");
  const [occupationInput, setOccupationInput] = useState("");
  const [interestsInput, setInterestsInput] = useState("");

  // Query user data first
  const { data: user, isLoading: isLoadingUser } = useQuery<User>({
    queryKey: [`/api/users/${userId}`],
    enabled: !!userId,
  });

  // Update form data when user data changes
  useEffect(() => {
    if (user) {
      setFormData({
        displayName: user.displayName || '',
        bio: user.bio || '',
        location: user.location || '',
        occupation: user.occupation || '',
        favoriteQuote: user.favoriteQuote || '',
        backgroundColor: user.backgroundColor || '',
        textColor: user.textColor || '',
        accentColor: user.accentColor || '',
        fontFamily: user.fontFamily || '',
        interests: user.interests || ''
      });
      setLocationInput(user.location || "");
      setOccupationInput(user.occupation || "");
      setInterestsInput(user.interests || "");
    }
  }, [user]);

  // Add friend queries back and fix stats typing
  const { data: friends = [], isLoading: isLoadingFriends } = useQuery<User[]>({
    queryKey: [`/api/users/${userId}/friends`],
    enabled: !!userId,
  });

  const { data: userGroups = [], isLoading: isLoadingGroups } = useQuery<Group[]>({
    queryKey: [`/api/users/${userId}/groups`],
    enabled: !!userId,
  });

  type UserStats = {
    postCount: number;
    friendCount: number;
    followerCount: number;
    followingCount: number;
  };

  const { data: stats, isLoading: isLoadingStats } = useQuery<UserStats>({
    queryKey: [`/api/users/${userId}/stats`],
    enabled: !!userId,
  });

  // Query posts and group posts
  const { data: posts = [], isLoading: isLoadingPosts } = useQuery<Post[]>({
    queryKey: [`/api/users/${userId}/posts`],
    enabled: !!userId,
  });


  // Ensure group posts are correctly fetched
  const { data: groupPosts = [], isLoading: isLoadingGroupPosts } = useQuery<Post[]>({
    queryKey: [`/api/users/${userId}/group-posts`],
    enabled: !!userId,
  });

  // Combine all posts
  const allPosts = useMemo(() => {
    const combinedPosts = [...(posts || []), ...(groupPosts || [])];
    return combinedPosts.sort((a, b) =>
      new Date(b.createdAt || '').getTime() - new Date(a.createdAt || '').getTime()
    );
  }, [posts, groupPosts]);

  // Handle profile updates
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

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    updateProfileMutation.mutate({ [field]: value });
  };

  const handleFieldUpdate = (field: string, value: string) => {
    updateProfileMutation.mutate({ [field]: value });
  };

  // Loading state
  if (isLoadingUser) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <div>User not found</div>;
  }

  // Parse social links from JSON string
  const socialLinks = user.socialLinks ? JSON.parse(user.socialLinks) : {};

  // Social media update handler
  const updateSocialLinks = (platform: string, url: string) => {
    const newSocialLinks = { ...socialLinks, [platform]: url };
    updateProfileMutation.mutate({
      socialLinks: JSON.stringify(newSocialLinks)
    });
  };

  // Apply custom styles if they exist
  const customStyles = {
    backgroundColor: user.backgroundColor || undefined,
    color: user.textColor || undefined,
    fontFamily: user.fontFamily || undefined,
  };

  return (
    <div className="min-h-screen" style={customStyles}>
      <div className="container mx-auto p-4 space-y-6">
        {/* Profile Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Card className="overflow-hidden">
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
                    <AvatarImage src={user.avatarUrl} alt={user.displayName} />
                  ) : (
                    <AvatarFallback className="text-2xl bg-primary/10 text-primary">
                      {user.displayName?.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  )}
                </Avatar>
                <div className="flex gap-2">
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

              {/* Profile Content */}
              <div className="mt-4 space-y-4">
                {isEditing ? (
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium">Display Name</label>
                      <Input
                        placeholder="Display Name"
                        value={formData.displayName}
                        onChange={(e) => handleInputChange('displayName', e.target.value)}
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
                      <label className="text-sm font-medium">Location</label>
                      <Input
                        value={locationInput}
                        onChange={(e) => {
                          setLocationInput(e.target.value);
                          handleFieldUpdate('location', e.target.value);
                        }}
                        placeholder="Your location"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Occupation</label>
                      <Input
                        value={occupationInput}
                        onChange={(e) => {
                          setOccupationInput(e.target.value);
                          handleFieldUpdate('occupation', e.target.value);
                        }}
                        placeholder="Your occupation"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Interests</label>
                      <Textarea
                        value={interestsInput}
                        onChange={(e) => {
                          setInterestsInput(e.target.value);
                          handleFieldUpdate('interests', e.target.value);
                        }}
                        placeholder="Your interests"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Social Media Links</label>
                      <div className="space-y-2">
                        {Object.entries(SocialIconMap).map(([platform, Icon]) => (
                          <div key={`social-${platform}`} className="flex items-center gap-2">
                            <Icon className="h-5 w-5" />
                            <Input
                              placeholder={`${platform.charAt(0).toUpperCase() + platform.slice(1)} URL`}
                              value={socialLinks[platform] || ""}
                              onChange={(e) => updateSocialLinks(platform, e.target.value)}
                            />
                          </div>
                        ))}
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
                  </div>
                ) : (
                  <>
                    <h1 className="text-2xl font-bold">{user.displayName}</h1>
                    <p className="text-muted-foreground">@{user.username}</p>
                    {user.bio && <p className="text-foreground/90">{user.bio}</p>}

                    {/* Location and Occupation */}
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

                    {/* Interests */}
                    {user.interests && (
                      <div className="mt-4">
                        <h3 className="text-lg font-semibold mb-2">Interests</h3>
                        <p className="text-muted-foreground">{user.interests}</p>
                      </div>
                    )}

                    {/* Social Links */}
                    {Object.entries(socialLinks).length > 0 && (
                      <div className="flex gap-4 mt-4">
                        {Object.entries(socialLinks).map(([platform, url]) => {
                          const Icon = SocialIconMap[platform as keyof typeof SocialIconMap];
                          return (
                            <a
                              key={`social-link-${platform}`}
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
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Stats and Content */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-6">
            {/* Stats Card */}
            <Card>
              <CardHeader>
                <CardTitle>Stats</CardTitle>
              </CardHeader>
              {/* Update stats section */}
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Posts</span>
                    <span className="text-2xl font-bold">
                      {isLoadingStats ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : (
                        stats.postCount
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Friends</span>
                    <span className="text-2xl font-bold">
                      {isLoadingStats ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : (
                        stats.friendCount
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Followers</span>
                    <span className="text-2xl font-bold">
                      {isLoadingStats ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : (
                        stats.followerCount
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Following</span>
                    <span className="text-2xl font-bold">
                      {isLoadingStats ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : (
                        stats.followingCount
                      )}
                    </span>
                  </div>
                </div>
              </CardContent>

            </Card>

            {/* Main Content Area */}
            <div className="col-span-full md:col-span-3">
              <Tabs defaultValue="tab-posts" className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="tab-posts">Posts</TabsTrigger>
                  <TabsTrigger value="tab-about">About</TabsTrigger>
                  <TabsTrigger value="tab-friends">Friends</TabsTrigger>
                  <TabsTrigger value="tab-groups">Groups</TabsTrigger>
                </TabsList>

                {/* Posts Tab */}
                <TabsContent value="tab-posts" className="mt-6">
                  <div className="space-y-4">
                    {(isLoadingPosts || isLoadingGroupPosts) ? (
                      <div className="flex justify-center p-4">
                        <Loader2 className="h-6 w-6 animate-spin" />
                      </div>
                    ) : allPosts.map((post) => (
                      <PostComponent key={`post-${post.id}`} post={post} />
                    ))}
                    {(!allPosts || allPosts.length === 0) && !isLoadingPosts && !isLoadingGroupPosts && (
                      <Card>
                        <CardContent className="p-8 text-center text-muted-foreground">
                          No posts yet
                        </CardContent>
                      </Card>
                    )}
                  </div>
                </TabsContent>

                {/* About Tab */}
                <TabsContent value="tab-about" className="mt-6">
                  <Card>
                    <CardContent className="space-y-4 p-6">
                      <div>
                        <h3 className="text-lg font-semibold mb-2">About Me</h3>
                        {isEditing ? (
                          <Textarea
                            value={formData.bio}
                            onChange={(e) => handleInputChange('bio', e.target.value)}
                            placeholder="Tell us about yourself"
                            className="min-h-[100px]"
                          />
                        ) : (
                          <p className="text-muted-foreground">{user?.bio || "No bio added yet"}</p>
                        )}
                      </div>

                      <div>
                        <h3 className="text-lg font-semibold mb-2">Interests</h3>
                        {isEditing ? (
                          <Textarea
                            value={interestsInput}
                            onChange={(e) => {
                              setInterestsInput(e.target.value);
                              handleFieldUpdate('interests', e.target.value);
                            }}
                            placeholder="What are your interests?"
                            className="min-h-[100px]"
                          />
                        ) : (
                          <p className="text-muted-foreground">{user?.interests || "No interests added yet"}</p>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <h3 className="font-semibold mb-2">Location</h3>
                          {isEditing ? (
                            <Input
                              value={locationInput}
                              onChange={(e) => {
                                setLocationInput(e.target.value);
                                handleFieldUpdate('location', e.target.value);
                              }}
                              placeholder="Your location"
                            />
                          ) : (
                            <p className="text-muted-foreground">{user?.location || "Not specified"}</p>
                          )}
                        </div>
                        <div>
                          <h3 className="font-semibold mb-2">Occupation</h3>
                          {isEditing ? (
                            <Input
                              value={occupationInput}
                              onChange={(e) => {
                                setOccupationInput(e.target.value);
                                handleFieldUpdate('occupation', e.target.value);
                              }}
                              placeholder="Your occupation"
                            />
                          ) : (
                            <p className="text-muted-foreground">{user?.occupation || "Not specified"}</p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Friends Tab */}
                <TabsContent value="tab-friends" className="mt-6">
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {isLoadingFriends ? (
                      <div className="col-span-full flex justify-center p-4">
                        <Loader2 className="h-6 w-6 animate-spin" />
                      </div>
                    ) : friends.map((friend) => (
                      <Card key={`friend-${friend.id}`} className="overflow-hidden">
                        <CardContent className="p-4">
                          <div className="flex items-center gap-4">
                            <Avatar>
                              {friend.avatarUrl ? (
                                <AvatarImage src={friend.avatarUrl} alt={friend.displayName} />
                              ) : (
                                <AvatarFallback>
                                  {friend.displayName?.charAt(0).toUpperCase()}
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
                    {(!friends || friends.length === 0) && !isLoadingFriends && (
                      <Card className="col-span-full">
                        <CardContent className="p-8 text-center text-muted-foreground">
                          No friends yet
                        </CardContent>
                      </Card>
                    )}
                  </div>
                </TabsContent>

                {/* Groups Tab */}
                <TabsContent value="tab-groups" className="mt-6">
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {isLoadingGroups ? (
                      <div className="col-span-full flex justify-center p-4">
                        <Loader2 className="h-6 w-6 animate-spin" />
                      </div>
                    ) : userGroups.map((group) => (
                      <Card key={`profile-group-${group.id}`} className="overflow-hidden">
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
                    {(!userGroups || userGroups.length === 0) && !isLoadingGroups && (
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