import { Link, useLocation, useNavigate } from "react-router-dom";
import { Heart, User, Compass, Home, Map, LayoutDashboard, GitCompare, Users, LogIn, LogOut } from "lucide-react";
import { Button } from "./ui/button";
import { ThemeToggle } from "./ThemeToggle";
import { useProfile } from "@/contexts/ProfileContext";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "./ui/dropdown-menu";

const Navbar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { currentProfile } = useProfile();
  const { user, isAuthenticated, logout } = useAuth();
  
  const isActive = (path: string) => location.pathname === path;

  const handleLogout = async () => {
    try {
      await logout();
      toast.success("Logged out successfully");
      navigate("/");
    } catch (error) {
      toast.error("Failed to logout");
    }
  };
  
  return (
    <nav className="sticky top-0 z-50 bg-card/80 backdrop-blur-lg border-b border-border">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2 group">
            <div className="w-10 h-10 gradient-hero rounded-lg flex items-center justify-center transition-smooth group-hover:scale-110">
              <span className="text-white font-bold text-xl">M</span>
            </div>
            <span className="text-xl font-bold text-foreground">
              <span className="text-primary">MK</span>Events
            </span>
          </Link>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center space-x-1">
            <Link to="/">
              <Button
                variant={isActive("/") ? "default" : "ghost"}
                className="gap-2"
              >
                <Home className="w-4 h-4" />
                Home
              </Button>
            </Link>
            <Link to="/discover">
              <Button
                variant={isActive("/discover") ? "default" : "ghost"}
                className="gap-2"
              >
                <Compass className="w-4 h-4" />
                Discover
              </Button>
            </Link>
            <Link to="/recommendations">
              <Button
                variant={isActive("/recommendations") ? "default" : "ghost"}
                className="gap-2"
              >
                <Heart className="w-4 h-4" />
                For You
              </Button>
            </Link>
            <Link to="/map">
              <Button
                variant={isActive("/map") ? "default" : "ghost"}
                className="gap-2"
              >
                <Map className="w-4 h-4" />
                Map
              </Button>
            </Link>
            <Link to="/compare">
              <Button
                variant={isActive("/compare") ? "default" : "ghost"}
                className="gap-2"
              >
                <GitCompare className="w-4 h-4" />
                Compare
              </Button>
            </Link>
            <Link to="/dashboard">
              <Button
                variant={isActive("/dashboard") ? "default" : "ghost"}
                className="gap-2"
              >
                <LayoutDashboard className="w-4 h-4" />
                Dashboard
              </Button>
            </Link>
            {isAuthenticated ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant={isActive("/profile") ? "default" : "ghost"}
                    className="gap-2"
                  >
                    <User className="w-4 h-4" />
                    {user?.name || currentProfile?.name || "Profile"}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  {user && (
                    <>
                      <div className="px-2 py-1.5 text-sm text-muted-foreground">
                        {user.email}
                      </div>
                      <DropdownMenuSeparator />
                    </>
                  )}
                  <Link to="/profile">
                    <DropdownMenuItem>
                      <User className="w-4 h-4 mr-2" />
                      View Profile
                    </DropdownMenuItem>
                  </Link>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout}>
                    <LogOut className="w-4 h-4 mr-2" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Link to="/login">
                <Button variant="ghost" className="gap-2">
                  <LogIn className="w-4 h-4" />
                  Login
                </Button>
              </Link>
            )}
            <ThemeToggle />
          </div>

          {/* Mobile Navigation */}
          <div className="md:hidden flex items-center space-x-1">
            <Link to="/discover">
              <Button variant="ghost" size="icon">
                <Compass className="w-5 h-5" />
              </Button>
            </Link>
            <Link to="/compare">
              <Button variant="ghost" size="icon">
                <GitCompare className="w-5 h-5" />
              </Button>
            </Link>
            <Link to="/profile">
              <Button variant="ghost" size="icon">
                <User className="w-5 h-5" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
