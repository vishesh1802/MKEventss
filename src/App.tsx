import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ProfileProvider } from "@/contexts/ProfileContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { SavedEventsProvider } from "@/contexts/SavedEventsContext";
import { ThemeProvider } from "next-themes";
import Index from "./pages/Index";
import Discover from "./pages/Discover";
import Recommendations from "./pages/Recommendations";
import EventDetail from "./pages/EventDetail";
import Profile from "./pages/Profile";
import MapView from "./pages/MapView";
import CompareEvents from "./pages/CompareEvents";
import Dashboard from "./pages/Dashboard";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <ProfileProvider>
            <SavedEventsProvider>
              <Toaster />
              <Sonner />
              <BrowserRouter>
                <Routes>
                  <Route path="/" element={<Index />} />
                  <Route path="/discover" element={<Discover />} />
                  <Route path="/recommendations" element={<Recommendations />} />
                  <Route path="/events/:id" element={<EventDetail />} />
                  <Route path="/profile" element={<Profile />} />
                  <Route path="/map" element={<MapView />} />
                  <Route path="/compare" element={<CompareEvents />} />
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/login" element={<Login />} />
                  {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </BrowserRouter>
            </SavedEventsProvider>
          </ProfileProvider>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
