import { Group } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Link } from "wouter";
import { UserPlus, UserMinus, Users } from "lucide-react";

type GroupCardProps = {
  group: Group;
  isJoined?: boolean;
};

export default function GroupCard({ group, isJoined }: GroupCardProps) {
  const joinMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", `/api/groups/${group.id}/join`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/groups"] });
    },
  });

  const leaveMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", `/api/groups/${group.id}/leave`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/groups"] });
    },
  });

  return (
    <Card className="glass-card border-none hover:shadow-lg transition-all duration-300">
      <CardHeader>
        <CardTitle className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Users className="w-5 h-5 text-primary" />
            </div>
            <Link 
              href={`/groups/${group.id}`} 
              className="hover:text-primary transition-colors duration-200"
            >
              {group.name}
            </Link>
          </div>
          <Button
            variant={isJoined ? "destructive" : "default"}
            size="sm"
            onClick={() => {
              if (isJoined) {
                leaveMutation.mutate();
              } else {
                joinMutation.mutate();
              }
            }}
            disabled={joinMutation.isPending || leaveMutation.isPending}
            className="shrink-0"
          >
            {isJoined ? (
              <>
                <UserMinus className="h-4 w-4 mr-2" />
                Leave
              </>
            ) : (
              <>
                <UserPlus className="h-4 w-4 mr-2" />
                Join
              </>
            )}
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground line-clamp-2">{group.description}</p>
      </CardContent>
    </Card>
  );
}