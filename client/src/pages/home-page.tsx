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
    <div className="container mx-auto p-4 space-y-8">
      <div className="flex items-center space-x-4">
        <img 
          src="https://cdn.pixabay.com/photo/2016/11/14/04/45/woman-1822726_1280.jpg"
          alt="Welcome" 
          className="w-16 h-16 rounded-full object-cover"
        />
        <div>
          <h1 className="text-2xl font-bold">Welcome, {user?.displayName}</h1>
          <p className="text-muted-foreground">Find your community and connect with others</p>
        </div>
      </div>

      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">All Groups</TabsTrigger>
          <TabsTrigger value="joined">My Groups</TabsTrigger>
        </TabsList>

        <TabsContent value="all">
          <div className="grid gap-6">
            {groupsByCategory && Object.entries(groupsByCategory).map(([category, groups]) => (
              <Card key={category}>
                <CardHeader>
                  <CardTitle>{category}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {groups.map((group) => (
                      <GroupCard 
                        key={group.id} 
                        group={group}
                        isJoined={userGroups?.some(g => g.id === group.id)}
                      />
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="joined">
          {userGroups?.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                You haven't joined any groups yet. Explore our communities to get started!
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {userGroups?.map((group) => (
                <GroupCard 
                  key={group.id} 
                  group={group}
                  isJoined={true}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
