import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Link } from "wouter";
import { LogOut, User } from "lucide-react";
import { motion } from "framer-motion";

export default function Navigation() {
  const { user, logoutMutation } = useAuth();

  if (!user) return null;

  return (
    <motion.nav 
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="nav-glass sticky top-0 z-50"
    >
      <div className="container flex h-16 items-center">
        <Link href="/" className="flex items-center space-x-2">
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <span className="text-xl font-bold gradient-text">
              Women's Support Network
            </span>
          </motion.div>
        </Link>

        <div className="flex-1" />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-8 w-8 rounded-full hover:scale-110 transition-transform">
              <Avatar className="h-8 w-8 border-2 border-primary/20">
                <AvatarFallback className="bg-primary/10 text-primary">
                  {user.displayName.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 glass-card">
            <DropdownMenuItem className="flex items-center gap-2 py-2">
              <User className="h-4 w-4 text-primary" />
              <span className="font-medium">{user.displayName}</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              className="flex items-center gap-2 text-destructive focus:text-destructive py-2"
              onClick={() => logoutMutation.mutate()}
            >
              <LogOut className="h-4 w-4" />
              <span>Logout</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </motion.nav>
  );
}