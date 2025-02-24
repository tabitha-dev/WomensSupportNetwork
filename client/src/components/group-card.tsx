import { Group } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Link } from "wouter";
import { UserPlus, UserMinus } from "lucide-react";

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
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <Link href={`/groups/${group.id}`} className="hover:underline">
            {group.name}
          </Link>
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
        <p className="text-sm text-muted-foreground">{group.description}</p>
      </CardContent>
    </Card>
  );
}
