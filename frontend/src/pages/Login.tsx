import { useState } from "react";
import { Navigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Phone, Mail, Lock, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuthStore } from "@/stores/authStore";
import { useLogin } from "@/hooks/useAuth";

export default function Login() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const login = useLogin();

  if (isAuthenticated) return <Navigate to="/dashboard" replace />;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) return;
    const payload = phone.trim()
      ? { phone: phone.replace(/\D/g, ""), password }
      : email.trim()
        ? { email: email.trim(), password }
        : null;
    if (!payload) return;
    login.mutate(payload);
  };

  const canSubmit =
    password.trim().length > 0 && (phone.replace(/\D/g, "").length >= 10 || email.trim().length > 0);
  const isLoading = login.isPending;

  return (
    <div className="min-h-screen w-full flex">
      {/* Left hero panel */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
        className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-hero"
      >
        <div className="absolute inset-0 flex flex-col justify-center items-center text-white p-12">
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.6 }}
          >
            <h1 className="text-5xl font-bold mb-4">BuchiFin</h1>
            <p className="text-xl text-white/90 max-w-md">
              Complete Business Management Solution for Agricultural Supply Chain
            </p>
          </motion.div>
        </div>
      </motion.div>

      {/* Right login form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-8 bg-background">
        <motion.div
          initial={{ scale: 0.98, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="w-full max-w-[400px]"
        >
          <div className="flex justify-center mb-6 lg:hidden">
            <div className="h-12 w-12 rounded-xl bg-gradient-hero flex items-center justify-center text-white font-semibold text-lg">
              B
            </div>
          </div>

          <Card className="border-0 shadow-lg bg-card">
            <CardHeader className="pb-4 pt-6 px-6">
              <CardTitle className="text-xl font-semibold tracking-tight text-center">
                Sign in
              </CardTitle>
              <CardDescription className="text-center text-muted-foreground">
                Use your phone or email to continue
              </CardDescription>
            </CardHeader>
            <CardContent className="px-6 pb-6 pt-0">
              <form onSubmit={handleLogin} className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="phone" className="text-muted-foreground font-normal text-sm">
                    Phone number
                  </Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="10-digit number"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                      className="pl-10 h-10"
                      maxLength={10}
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-muted-foreground font-normal text-sm">
                    Email <span className="text-muted-foreground/80 font-normal">(optional)</span>
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10 h-10"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="password" className="text-muted-foreground font-normal text-sm">
                    Password
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                    <Input
                      id="password"
                      type="password"
                      placeholder="Enter password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10 h-10"
                      required
                    />
                  </div>
                </div>
                <Button
                  type="submit"
                  className="w-full h-10 bg-gradient-primary font-medium mt-1"
                  disabled={!canSubmit || isLoading}
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Sign in"
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          <p className="text-center text-xs text-muted-foreground mt-5">
            By continuing, you agree to our{" "}
            <span className="underline underline-offset-2 cursor-pointer hover:text-foreground/80">Terms of Service</span>
            {" "}and{" "}
            <span className="underline underline-offset-2 cursor-pointer hover:text-foreground/80">Privacy Policy</span>.
          </p>
        </motion.div>
      </div>
    </div>
  );
}
