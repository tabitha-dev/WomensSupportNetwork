import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Form } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertUserSchema } from "@shared/schema";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLocation } from "wouter";
import { useEffect } from "react";
import { motion } from "framer-motion";

export default function AuthPage() {
  const { user, loginMutation, registerMutation } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (user) {
      setLocation("/");
    }
  }, [user, setLocation]);

  const loginForm = useForm({
    defaultValues: {
      username: "",
      password: "",
    },
  });

  const registerForm = useForm({
    resolver: zodResolver(insertUserSchema),
    defaultValues: {
      username: "",
      password: "",
      displayName: "",
      bio: "",
    },
  });

  return (
    <div className="min-h-screen bg-background flex">
      <motion.div 
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3 }}
        className="flex-1 flex items-center justify-center p-4"
      >
        <Card className="w-full max-w-md glass-card">
          <CardContent className="pt-6">
            <Tabs defaultValue="login">
              <TabsList className="grid w-full grid-cols-2 mb-4">
                <TabsTrigger value="login">Login</TabsTrigger>
                <TabsTrigger value="register">Register</TabsTrigger>
              </TabsList>

              <TabsContent value="login">
                <Form {...loginForm}>
                  <form
                    onSubmit={loginForm.handleSubmit((data) =>
                      loginMutation.mutate(data)
                    )}
                    className="space-y-4"
                  >
                    <Input
                      placeholder="Username"
                      {...loginForm.register("username")}
                    />
                    <Input
                      type="password"
                      placeholder="Password"
                      {...loginForm.register("password")}
                    />
                    <Button
                      type="submit"
                      className="w-full"
                      disabled={loginMutation.isPending}
                    >
                      {loginMutation.isPending ? "Logging in..." : "Login"}
                    </Button>
                  </form>
                </Form>
              </TabsContent>

              <TabsContent value="register">
                <Form {...registerForm}>
                  <form
                    onSubmit={registerForm.handleSubmit((data) =>
                      registerMutation.mutate(data)
                    )}
                    className="space-y-4"
                  >
                    <Input
                      placeholder="Username"
                      {...registerForm.register("username")}
                    />
                    <Input
                      type="password"
                      placeholder="Password"
                      {...registerForm.register("password")}
                    />
                    <Input
                      placeholder="Display Name"
                      {...registerForm.register("displayName")}
                    />
                    <Input
                      placeholder="Bio (optional)"
                      {...registerForm.register("bio")}
                    />
                    <Button
                      type="submit"
                      className="w-full"
                      disabled={registerMutation.isPending}
                    >
                      {registerMutation.isPending ? "Creating Account..." : "Register"}
                    </Button>
                  </form>
                </Form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div 
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3 }}
        className="hidden lg:flex flex-1 bg-primary items-center justify-center p-12 text-primary-foreground"
      >
        <div className="max-w-xl">
          <h1 className="text-4xl font-bold mb-6">
            Welcome to Women's Support Network
          </h1>
          <p className="text-lg opacity-90">
            A safe space for women to connect, share experiences, and support each
            other. Join our community to access groups focused on career, health,
            family, and personal growth.
          </p>
        </div>
      </motion.div>
    </div>
  );
}