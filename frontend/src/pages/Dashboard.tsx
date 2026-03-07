import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { TrendingUp, Package, Users, Factory, UserPlus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useAuthStore } from "@/stores/authStore";

const statsData = [
  { title: "Total Users", value: "12", change: "+3 this week", icon: Users, color: "text-primary" },
  { title: "Manufacturers", value: "5", change: "+2 new", icon: Factory, color: "text-secondary" },
  { title: "Active Users", value: "10", change: "83% active", icon: TrendingUp, color: "text-accent" },
  { title: "Products", value: "248", change: "Across manufacturers", icon: Package, color: "text-primary" },
];

const monthlyData = [
  { month: "Jan", users: 2, manufacturers: 1 },
  { month: "Feb", users: 3, manufacturers: 1 },
  { month: "Mar", users: 5, manufacturers: 2 },
  { month: "Apr", users: 7, manufacturers: 3 },
  { month: "May", users: 10, manufacturers: 4 },
  { month: "Jun", users: 12, manufacturers: 5 },
];

export default function Dashboard() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back, {user?.name}! Here's what's happening today.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statsData.map((stat, index) => (
          <motion.div
            key={stat.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className="hover:shadow-elegant transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{stat.title}</CardTitle>
                <stat.icon className={`h-5 w-5 ${stat.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">{stat.value}</div>
                <p className="text-xs text-muted-foreground mt-1">{stat.change}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 }}>
          <Card>
            <CardHeader>
              <CardTitle>User Growth</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="month" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                  />
                  <Bar dataKey="users" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} name="Total Users" />
                  <Bar dataKey="manufacturers" fill="hsl(var(--secondary))" radius={[8, 8, 0, 0]} name="Manufacturers" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5 }}>
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button
                className="w-full p-4 bg-gradient-primary text-white rounded-lg hover:opacity-90 transition-opacity h-auto justify-start"
                onClick={() => navigate("/dashboard/admin/manufacturers/add")}
              >
                <div className="text-left">
                  <h3 className="font-semibold mb-1 flex items-center gap-2">
                    <UserPlus className="h-4 w-4" />
                    Add Manufacturer
                  </h3>
                  <p className="text-sm text-white/80">Register a new manufacturer</p>
                </div>
              </Button>
              <Button
                className="w-full p-4 bg-gradient-secondary text-white rounded-lg hover:opacity-90 transition-opacity h-auto justify-start"
                onClick={() => navigate("/dashboard/admin/manufacturers")}
              >
                <div className="text-left">
                  <h3 className="font-semibold mb-1 flex items-center gap-2">
                    <Factory className="h-4 w-4" />
                    View Manufacturers
                  </h3>
                  <p className="text-sm text-white/80">Manage all registered manufacturers</p>
                </div>
              </Button>
              <Button
                variant="outline"
                className="w-full p-4 rounded-lg h-auto justify-start"
                onClick={() => navigate("/dashboard/profile")}
              >
                <div className="text-left">
                  <h3 className="font-semibold mb-1 flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    My Profile
                  </h3>
                  <p className="text-sm text-muted-foreground">View and update your profile</p>
                </div>
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>About BuchiFin</CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground">
            <p>
              BuchiFin is a comprehensive business management solution designed specifically for the
              agricultural supply chain. We help retailers, distributors, and manufacturers streamline
              their operations, manage inventory, and maintain regulatory compliance.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Contact Support</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-muted-foreground">
            <p>Need help? Our support team is here for you.</p>
            <p className="font-medium text-foreground">Email: support@buchifin.com</p>
            <p className="font-medium text-foreground">Phone: +91 1800-123-4567</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
