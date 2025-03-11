import { useQuery } from "@tanstack/react-query";
import { Group } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";
import GroupCard from "@/components/group-card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

export default function HomePage() {
  const { user } = useAuth();

  const { data: allGroups, isLoading: isLoadingAll } = useQuery<Group[]>({
    queryKey: ["/api/groups"],
  });

  const { data: userGroups, isLoading: isLoadingUser } = useQuery<Group[]>({
    queryKey: ["/api/user/groups"],
  });

  if (isLoadingAll || isLoadingUser) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const groupsByCategory = allGroups?.reduce((acc, group) => {
    if (!acc[group.category]) {
      acc[group.category] = [];
    }
    acc[group.category].push(group);
    return acc;
  }, {} as Record<string, Group[]>);

  return (
    <div className="min-h-screen bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto p-4 space-y-8">
        <Card className="glass-card border-none">
          <CardContent className="p-8">
            <h1 className="text-3xl font-bold mb-6 bg-gradient-to-r from-primary via-purple-500 to-blue-500 bg-clip-text text-transparent">
              Welcome to Women's Support Network
            </h1>
            <p className="text-lg leading-relaxed opacity-90">
              You've come to the right place if you are trying to restructure your life to become a happier version of yourself. 
              Many of us do not have friends and family to turn to for support. This is a place where women can gather to support 
              each other. We aim to help women build healthy habits and make new friends along the way.
            </p>
            <p className="mt-4 text-lg leading-relaxed opacity-90">
              Both listening and giving advice are encouraged. You can join any groups you're interested in and leave them at any time.
              There will be no politics or religious views here, nor any selling of merchandise. This is a place for making friends 
              and getting advice.
            </p>
          </CardContent>
        </Card>

        <Tabs defaultValue="all" className="w-full">
          <TabsList className="w-full justify-start border-b rounded-none p-0 h-12">
            <TabsTrigger 
              key="all-tab"
              value="all" 
              className="data-[state=active]:border-b-2 border-primary rounded-none"
            >
              All Groups
            </TabsTrigger>
            <TabsTrigger 
              key="joined-tab"
              value="joined" 
              className="data-[state=active]:border-b-2 border-primary rounded-none"
            >
              My Groups
            </TabsTrigger>
          </TabsList>

          <TabsContent key="all-content" value="all" className="mt-6">
            <div className="grid gap-8">
              {groupsByCategory && Object.entries(groupsByCategory).map(([category, groups], index) => (
                <div key={`category-${index}`} className="space-y-4">
                  <h2 className="text-2xl font-semibold text-foreground/90">{category}</h2>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {groups.map((group) => (
                      <GroupCard 
                        key={`group-${group.id}`}
                        group={group}
                        isJoined={userGroups?.some(g => g.id === group.id)}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent key="joined-content" value="joined" className="mt-6">
            {userGroups?.length === 0 ? (
              <Card className="glass-card border-none">
                <CardContent className="p-8 text-center text-muted-foreground">
                  You haven't joined any groups yet. Explore our communities to get started!
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {userGroups?.map((group) => (
                  <GroupCard 
                    key={`joined-group-${group.id}`}
                    group={group}
                    isJoined={true}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}