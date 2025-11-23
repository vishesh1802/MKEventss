import { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import EventCard from "@/components/EventCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { User, MapPin, Heart, Settings, Calendar, TrendingUp, BarChart3, Plus, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { useSavedEvents } from "@/contexts/SavedEventsContext";
import { useProfile } from "@/contexts/ProfileContext";
import { Link } from "react-router-dom";
import { getReminders } from "@/utils/reminders";

const GENRES = ["Art", "Comedy", "Family", "Food", "Music", "Sports", "Cultural", "Educational", "Business", "Technology"];
const REGIONS = ["Downtown", "East Side", "Bay View", "Walker's Point", "Third Ward"];

const Profile = () => {
  const [isEditing, setIsEditing] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newProfileName, setNewProfileName] = useState("");
  const [newProfileRegion, setNewProfileRegion] = useState("Downtown");
  const [newProfileGenres, setNewProfileGenres] = useState<string[]>([]);
  
  const { 
    currentProfile, 
    profiles, 
    loading: profileLoading,
    currentProfileId,
    createProfile, 
    updateProfile, 
    deleteProfile, 
    switchProfile 
  } = useProfile();

  // Auto-select profile if it exists but none selected (one profile per user)
  useEffect(() => {
    if (!profileLoading && profiles.length > 0 && !currentProfileId) {
      console.log('🔄 Auto-selecting user profile:', profiles[0].id);
      switchProfile(profiles[0].id);
    }
  }, [profileLoading, profiles.length, currentProfileId, switchProfile]);

  // Debug: Log profile state changes
  useEffect(() => {
    console.log('📋 Profile Page State:', {
      loading: profileLoading,
      profilesCount: profiles.length,
      currentProfileId,
      hasCurrentProfile: !!currentProfile,
      currentProfileName: currentProfile?.name
    });
  }, [profileLoading, profiles.length, currentProfileId, currentProfile]);
  const { savedEvents, attendingEvents } = useSavedEvents();
  const reminders = getReminders();

  const handleGenreToggle = (genre: string) => {
    if (!currentProfile) return;
    updateProfile(currentProfile.id, {
      genres: currentProfile.genres.includes(genre)
        ? currentProfile.genres.filter((g) => g !== genre)
        : [...currentProfile.genres, genre]
    });
  };

  const handleNewGenreToggle = (genre: string) => {
    setNewProfileGenres(prev =>
      prev.includes(genre)
        ? prev.filter((g) => g !== genre)
        : [...prev, genre]
    );
  };

  const handleSave = () => {
    if (!currentProfile) return;
    setIsEditing(false);
    toast.success("Profile updated successfully!");
  };

  const handleCancel = () => {
    setIsEditing(false);
  };

  const handleCreateProfile = async (e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    
    if (!newProfileName.trim()) {
      toast.error("Please enter a profile name");
      return;
    }
    
    console.log("Creating profile:", { name: newProfileName, region: newProfileRegion, genres: newProfileGenres });
    
    try {
      const profileName = newProfileName; // Save before clearing
      const profileId = await createProfile(newProfileName, newProfileRegion, newProfileGenres);
      console.log("Profile created successfully:", profileId);
      setShowCreateDialog(false);
      setNewProfileName("");
      setNewProfileRegion("Downtown");
      setNewProfileGenres([]);
      toast.success(`Profile "${profileName}" created!`);
    } catch (error: any) {
      console.error("Error creating profile:", error);
      toast.error(error?.message || "Failed to create profile. Please try again.");
    }
  };

  const handleDeleteProfile = async (profileId: string) => {
    if (profiles.length <= 1) {
      toast.error("Cannot delete the last profile");
      return;
    }
    const isActiveProfile = currentProfile?.id === profileId;
    try {
      await deleteProfile(profileId);
      if (isActiveProfile) {
        toast.success("Profile deleted. Switched to another profile.");
      } else {
        toast.success("Profile deleted");
      }
    } catch (error) {
      toast.error("Failed to delete profile");
    }
  };

  // Fetch full event data for saved/attending events to get images
  const [savedEventsWithImages, setSavedEventsWithImages] = useState<any[]>([]);
  const [attendingEventsWithImages, setAttendingEventsWithImages] = useState<any[]>([]);

  useEffect(() => {
    const enrichEventsWithImages = async () => {
      if (savedEvents.length === 0 && attendingEvents.length === 0) {
        setSavedEventsWithImages([]);
        setAttendingEventsWithImages([]);
        return;
      }

      try {
        // Fetch all events from API
        const response = await fetch('/api/events');
        if (!response.ok) {
          setSavedEventsWithImages(savedEvents as any[]);
          setAttendingEventsWithImages(attendingEvents as any[]);
          return;
        }
        
        const allEvents = await response.json();
        
        // Helper function to get region from coordinates
        const getVenueRegion = (lat: number, lon: number): string | null => {
          if (lat >= 43.038 && lat <= 43.045 && lon >= -87.92 && lon <= -87.89) return 'Downtown';
          if (lat >= 43.0335 && lat <= 43.0345 && lon >= -87.9335 && lon <= -87.9325) return 'Third Ward';
          if (lat >= 43.0515 && lat <= 43.053 && lon >= -87.906 && lon <= -87.904) return 'Walker\'s Point';
          if (lat >= 43.0755 && lat <= 43.077 && (lon >= -87.881 && lon <= -87.879 || Math.abs(lon - (-87.88)) < 0.001)) return 'East Side';
          return null;
        };

        // Enrich saved events
        const enrichedSaved = savedEvents
          .map(savedEvent => {
            const apiEvent = allEvents.find((e: any) => e.id === savedEvent.id || e.event_id === String(savedEvent.id));
            if (!apiEvent) return savedEvent;

            let isoDate = apiEvent.date;
            if (apiEvent.date && apiEvent.date.match(/^\d{1,2}\/\d{1,2}\/\d{2}$/)) {
              const [month, day, year] = apiEvent.date.split('/');
              isoDate = `20${year.padStart(2, '0')}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
            }

            const lat = Number(apiEvent.latitude);
            const lon = Number(apiEvent.longitude);
            const venueRegion = (lat && lon && getVenueRegion(lat, lon)) || apiEvent.venue_name || 'Milwaukee';

            return {
              ...savedEvent,
              title: apiEvent.event_name || savedEvent.title,
              region: venueRegion,
              genre: apiEvent.genre || savedEvent.genre,
              date: isoDate || savedEvent.date,
              price: parseFloat(apiEvent.ticket_price?.replace(/[^0-9.]/g, '') || '0') || savedEvent.price,
              image: apiEvent.image || savedEvent.image || undefined,
            };
          });

        // Enrich attending events
        const enrichedAttending = attendingEvents
          .map(savedEvent => {
            const apiEvent = allEvents.find((e: any) => e.id === savedEvent.id || e.event_id === String(savedEvent.id));
            if (!apiEvent) return savedEvent;

            let isoDate = apiEvent.date;
            if (apiEvent.date && apiEvent.date.match(/^\d{1,2}\/\d{1,2}\/\d{2}$/)) {
              const [month, day, year] = apiEvent.date.split('/');
              isoDate = `20${year.padStart(2, '0')}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
            }

            const lat = Number(apiEvent.latitude);
            const lon = Number(apiEvent.longitude);
            const venueRegion = (lat && lon && getVenueRegion(lat, lon)) || apiEvent.venue_name || 'Milwaukee';

            return {
              ...savedEvent,
              title: apiEvent.event_name || savedEvent.title,
              region: venueRegion,
              genre: apiEvent.genre || savedEvent.genre,
              date: isoDate || savedEvent.date,
              price: parseFloat(apiEvent.ticket_price?.replace(/[^0-9.]/g, '') || '0') || savedEvent.price,
              image: apiEvent.image || savedEvent.image || undefined,
            };
          });

        setSavedEventsWithImages(enrichedSaved);
        setAttendingEventsWithImages(enrichedAttending);
      } catch (error) {
        console.error('Error enriching events with images:', error);
        // Fallback to events without images
        setSavedEventsWithImages(savedEvents as any[]);
        setAttendingEventsWithImages(attendingEvents as any[]);
      }
    };

    enrichEventsWithImages();
  }, [savedEvents, attendingEvents]);

  // Calculate stats
  const upcomingAttending = attendingEventsWithImages.filter(e => {
    const eventDate = new Date(e.date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return eventDate >= today;
  });

  const stats = {
    saved: savedEvents.length,
    attending: attendingEvents.length,
    upcoming: upcomingAttending.length,
    reminders: reminders.length,
  };

  // Render dialog component (needed for both states)
  const renderCreateDialog = () => (
    <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Profile</DialogTitle>
          <DialogDescription>
            Set up your profile to get personalized event recommendations
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-6 py-4">
          <div>
            <Label htmlFor="new-name">Profile Name</Label>
            <Input
              id="new-name"
              value={newProfileName}
              onChange={(e) => setNewProfileName(e.target.value)}
              className="mt-2"
              placeholder="Enter profile name"
            />
          </div>

          <div>
            <Label>Preferred Region</Label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-2">
              {REGIONS.map((region) => (
                <button
                  key={region}
                  type="button"
                  onClick={() => setNewProfileRegion(region)}
                  className={`px-4 py-3 rounded-lg text-sm font-medium transition-smooth ${
                    newProfileRegion === region
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  {region}
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label className="mb-3 block">Favorite Genres</Label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {GENRES.map((genre) => (
                <div
                  key={genre}
                  className="flex items-center space-x-2 p-3 bg-muted rounded-lg"
                >
                  <Checkbox
                    id={`new-genre-${genre}`}
                    checked={newProfileGenres.includes(genre)}
                    onCheckedChange={() => handleNewGenreToggle(genre)}
                  />
                  <label
                    htmlFor={`new-genre-${genre}`}
                    className="text-sm cursor-pointer"
                  >
                    {genre}
                  </label>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button 
              type="button"
              onClick={handleCreateProfile} 
              className="gap-2"
              disabled={!newProfileName.trim()}
            >
              <Plus className="w-4 h-4" />
              Create Profile
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );

  // Show loading state while profiles are being loaded
  if (profileLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Navbar />
        <main className="flex-1 container mx-auto px-4 py-8 flex items-center justify-center">
          <Card>
            <CardHeader>
              <CardTitle>Loading...</CardTitle>
              <CardDescription>Loading your profiles...</CardDescription>
            </CardHeader>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  // Only show "No Profile Selected" if not loading and truly no profiles exist
  if (!profileLoading && !currentProfile && profiles.length === 0) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Navbar />
        <main className="flex-1 container mx-auto px-4 py-8 flex items-center justify-center">
          <Card>
            <CardHeader>
              <CardTitle>No Profile Selected</CardTitle>
              <CardDescription>Please create a profile to continue</CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => setShowCreateDialog(true)} className="gap-2">
                <Plus className="w-4 h-4" />
                Create Profile
              </Button>
            </CardContent>
          </Card>
        </main>
        <Footer />
        {renderCreateDialog()}
      </div>
    );
  }

  // If profiles exist but none selected, wait for auto-selection
  if (!profileLoading && !currentProfile && profiles.length > 0) {
    // Auto-select will happen via useEffect, but show loading state briefly
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Navbar />
        <main className="flex-1 container mx-auto px-4 py-8 flex items-center justify-center">
          <Card>
            <CardHeader>
              <CardTitle>Selecting Profile...</CardTitle>
              <CardDescription>Please wait...</CardDescription>
            </CardHeader>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  // Safety check - should not happen but prevent crashes
  if (!currentProfile) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Navbar />
        <main className="flex-1 container mx-auto px-4 py-8 flex items-center justify-center">
          <Card>
            <CardHeader>
              <CardTitle>Loading Profile...</CardTitle>
              <CardDescription>Please wait while we load your profile</CardDescription>
            </CardHeader>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main className="flex-1 container mx-auto px-4 py-8">
        {/* Profile Header */}
        <div className="bg-card rounded-2xl shadow-card p-8 mb-8">
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 gradient-hero rounded-full flex items-center justify-center">
                <User className="w-10 h-10 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-foreground mb-1">
                  {currentProfile.name}
                </h1>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <MapPin className="w-4 h-4" />
                  <span>{currentProfile.region}, Milwaukee</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => isEditing ? handleCancel() : setIsEditing(true)}
                className="gap-2"
              >
                <Settings className="w-4 h-4" />
                {isEditing ? "Cancel" : "Edit Profile"}
              </Button>
            </div>
          </div>

          {isEditing ? (
            <div className="space-y-6 border-t border-border pt-6">
              {/* Name */}
              <div>
                <Label htmlFor="name">Display Name</Label>
                <Input
                  id="name"
                  value={currentProfile.name}
                  onChange={(e) => updateProfile(currentProfile.id, { name: e.target.value })}
                  className="mt-2"
                  placeholder="Enter your name"
                />
              </div>

              {/* Region */}
              <div>
                <Label>Preferred Region</Label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-2">
                  {REGIONS.map((region) => (
                    <button
                      key={region}
                      onClick={() => updateProfile(currentProfile.id, { region })}
                      className={`px-4 py-3 rounded-lg text-sm font-medium transition-smooth ${
                        currentProfile.region === region
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground hover:bg-muted/80"
                      }`}
                    >
                      {region}
                    </button>
                  ))}
                </div>
              </div>

              {/* Genres */}
              <div>
                <Label className="mb-3 block">Favorite Genres</Label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {GENRES.map((genre) => (
                    <div
                      key={genre}
                      className="flex items-center space-x-2 p-3 bg-muted rounded-lg"
                    >
                      <Checkbox
                        id={`genre-${genre}`}
                        checked={currentProfile.genres.includes(genre)}
                        onCheckedChange={() => handleGenreToggle(genre)}
                      />
                      <label
                        htmlFor={`genre-${genre}`}
                        className="text-sm cursor-pointer"
                      >
                        {genre}
                      </label>
                    </div>
                  ))}
                </div>
              </div>


              <Button onClick={handleSave} className="w-full md:w-auto">
                Save Changes
              </Button>
            </div>
          ) : (
            <div className="border-t border-border pt-6">
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-2">
                    Favorite Genres
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {currentProfile.genres.length > 0 ? (
                      currentProfile.genres.map((genre) => (
                        <span
                          key={genre}
                          className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm font-medium"
                        >
                          {genre}
                        </span>
                      ))
                    ) : (
                      <span className="text-muted-foreground text-sm">No genres selected</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Create Profile Dialog */}
        {renderCreateDialog()}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Saved Events</CardTitle>
              <Heart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.saved}</div>
              <p className="text-xs text-muted-foreground">Events you've saved</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Attending</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.attending}</div>
              <p className="text-xs text-muted-foreground">Events you're going to</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Upcoming</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.upcoming}</div>
              <p className="text-xs text-muted-foreground">Events coming soon</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Reminders</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.reminders}</div>
              <p className="text-xs text-muted-foreground">Active reminders</p>
            </CardContent>
          </Card>
        </div>

        {/* Attending Events */}
        <section className="mb-12">
          <div className="flex items-center gap-3 mb-6">
            <CheckCircle2 className="w-6 h-6 text-primary fill-primary" />
            <h2 className="text-2xl font-bold text-foreground">
              Attending Events
            </h2>
            <span className="text-muted-foreground">
              ({attendingEvents.length})
            </span>
          </div>

          {attendingEvents.length === 0 ? (
            <div className="bg-card rounded-xl p-12 text-center">
              <CheckCircle2 className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-foreground mb-2">
                No events marked as attending
              </h3>
              <p className="text-muted-foreground mb-6">
                Click "Attend" on events you plan to go to
              </p>
              <Link to="/discover">
                <Button>Discover Events</Button>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in">
              {attendingEventsWithImages.map((event) => (
                <EventCard key={`attending-${event.id}`} {...event} />
              ))}
            </div>
          )}
        </section>

        {/* Saved Events */}
        <section>
          <div className="flex items-center gap-3 mb-6">
            <Heart className="w-6 h-6 text-secondary fill-secondary" />
            <h2 className="text-2xl font-bold text-foreground">
              Saved Events
            </h2>
            <span className="text-muted-foreground">
              ({savedEvents.length})
            </span>
          </div>

          {savedEvents.length === 0 ? (
            <div className="bg-card rounded-xl p-12 text-center">
              <Heart className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-foreground mb-2">
                No saved events yet
              </h3>
              <p className="text-muted-foreground mb-6">
                Start exploring and save events you're interested in
              </p>
              <Link to="/discover">
                <Button>Discover Events</Button>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in">
              {savedEventsWithImages.map((event) => (
                <EventCard key={`saved-${event.id}`} {...event} />
              ))}
            </div>
          )}
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default Profile;
