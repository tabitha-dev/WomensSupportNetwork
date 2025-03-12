import { useQuery, useMutation } from "@tanstack/react-query";
import { User, Post } from "@shared/schema";
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
  });

  // Add field-specific state
  const [locationInput, setLocationInput] = useState(user?.location || "");
  const [occupationInput, setOccupationInput] = useState(user?.occupation || "");
  const [interestsInput, setInterestsInput] = useState(user?.interests || "");


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
        });
        setLocationInput(data.location || "");
        setOccupationInput(data.occupation || "");
        setInterestsInput(data.interests || "");
      }
    },
  });

  const { data: posts = [], isLoading: isLoadingPosts } = useQuery<Post[]>({
    queryKey: [`/api/users/${userId}/posts`],
    enabled: !!userId,
  });

  // Add group posts query
  const { data: groupPosts = [], isLoading: isLoadingGroupPosts } = useQuery<Post[]>({
    queryKey: [`/api/users/${userId}/group-posts`],
    enabled: !!userId,
  });

  // Combine posts and group posts
  const allPosts = [...posts, ...groupPosts].sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

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
    queryKey: [`/api/users/${userId}/groups`],
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

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    updateProfileMutation.mutate({ [field]: value });
  };

  // Handle individual field updates
  const handleFieldUpdate = (field: string, value: string) => {
    updateProfileMutation.mutate({ [field]: value });
  };

  // About section content
  const renderAboutContent = () => (
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
  );

  // Parse social links from JSON string
  const socialLinks = user?.socialLinks ? JSON.parse(user.socialLinks) : {};

  // Social media update handler
  const updateSocialLinks = (platform: string, url: string) => {
    const newSocialLinks = { ...socialLinks, [platform]: url };
    updateProfileMutation.mutate({
      socialLinks: JSON.stringify(newSocialLinks)
    });
  };

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

  // Apply custom styles if they exist
  const customStyles = {
    backgroundColor: user.backgroundColor || undefined,
    color: user.textColor || undefined,
    fontFamily: user.fontFamily || undefined,
  };

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
              <Tabs defaultValue="tab-posts" className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="tab-posts">Posts</TabsTrigger>
                  <TabsTrigger value="tab-about">About</TabsTrigger>
                  <TabsTrigger value="tab-friends">Friends</TabsTrigger>
                  <TabsTrigger value="tab-groups">Groups</TabsTrigger>
                </TabsList>

                <TabsContent value="tab-posts" className="mt-6">
                  <div className="space-y-4">
                    {(isLoadingPosts || isLoadingGroupPosts) ? (
                      <div className="flex justify-center p-4">
                        <Loader2 className="h-6 w-6 animate-spin" />
                      </div>
                    ) : allPosts?.map((post) => (
                      <PostComponent key={`user-post-${post.id}`} post={post} />
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

                <TabsContent value="tab-about" className="mt-6">
                  {renderAboutContent()}
                </TabsContent>

                <TabsContent value="tab-friends" className="mt-6">
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {friends?.map((friend) => (
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
                    {(!friends || friends.length === 0) && (
                      <Card className="col-span-full">
                        <CardContent className="p-8 text-center text-muted-foreground">
                          No friends yet
                        </CardContent>
                      </Card>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="tab-groups" className="mt-6">
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {Array.isArray(userGroups) && userGroups.map((group, index) => (
                      <Card key={`profile-group-${group.id || index}`} className="overflow-hidden">
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
                    {(!Array.isArray(userGroups) || userGroups.length === 0) && (
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