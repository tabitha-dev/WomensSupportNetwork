import { Group } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Link } from "wouter";
import { UserPlus, UserMinus, Users, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

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
      queryClient.invalidateQueries({ queryKey: ["/api/groups"] });
    },
  });

  const leaveMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", `/api/groups/${group.id}/leave`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/groups"] });
      queryClient.invalidateQueries({ queryKey: ["/api/groups"] });
    },
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="overflow-hidden group">
        <CardHeader className="p-4">
          <CardTitle className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                {group.iconUrl ? (
                  <img
                    src={group.iconUrl}
                    alt={group.name}
                    className="w-8 h-8 rounded-full"
                  />
                ) : (
                  <Users className="w-6 h-6 text-primary" />
                )}
              </div>
              <div className="space-y-1">
                <Link 
                  href={`/groups/${group.id}`} 
                  className="text-lg font-semibold hover:text-primary transition-colors duration-200 flex items-center gap-2 group-hover:gap-3"
                >
                  {group.name}
                  <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-all" />
                </Link>
                <p className="text-sm text-muted-foreground line-clamp-1">
                  {group.category}
                </p>
              </div>
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
              className="shrink-0 transition-transform hover:scale-105"
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
        <CardContent className="px-4 pb-4">
          <p className="text-sm text-muted-foreground line-clamp-2 group-hover:line-clamp-none transition-all duration-300">
            {group.description}
          </p>
        </CardContent>
      </Card>
    </motion.div>
  );
}