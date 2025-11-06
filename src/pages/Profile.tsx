import { useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import EventCard from "@/components/EventCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { User, MapPin, Heart, Settings, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { useSavedEvents } from "@/contexts/SavedEventsContext";
import { Link } from "react-router-dom";

const GENRES = ["Art", "Comedy", "Family", "Food", "Music", "Sports", "Cultural", "Educational", "Business", "Technology"];
const REGIONS = ["Downtown", "East Side", "Bay View", "Walker's Point", "Third Ward"];

const Profile = () => {
  const [isEditing, setIsEditing] = useState(false);
  const [userName, setUserName] = useState("Milwaukee Explorer");
  const [selectedRegion, setSelectedRegion] = useState("Downtown");
  const [selectedGenres, setSelectedGenres] = useState(["Music", "Food"]);
  const { savedEvents, attendingEvents } = useSavedEvents();

  const handleGenreToggle = (genre: string) => {
    setSelectedGenres(
      selectedGenres.includes(genre)
        ? selectedGenres.filter((g) => g !== genre)
        : [...selectedGenres, genre]
    );
  };

  const handleSave = () => {
    setIsEditing(false);
    toast.success("Profile updated successfully!");
  };

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
                  {userName}
                </h1>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <MapPin className="w-4 h-4" />
                  <span>{selectedRegion}, Milwaukee</span>
                </div>
              </div>
            </div>
            <Button
              variant="outline"
              onClick={() => setIsEditing(!isEditing)}
              className="gap-2"
            >
              <Settings className="w-4 h-4" />
              {isEditing ? "Cancel" : "Edit Profile"}
            </Button>
          </div>

          {isEditing ? (
            <div className="space-y-6 border-t border-border pt-6">
              {/* Name */}
              <div>
                <Label htmlFor="name">Display Name</Label>
                <Input
                  id="name"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  className="mt-2"
                />
              </div>

              {/* Region */}
              <div>
                <Label>Preferred Region</Label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-2">
                  {REGIONS.map((region) => (
                    <button
                      key={region}
                      onClick={() => setSelectedRegion(region)}
                      className={`px-4 py-3 rounded-lg text-sm font-medium transition-smooth ${
                        selectedRegion === region
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
                        checked={selectedGenres.includes(genre)}
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
                    {selectedGenres.map((genre) => (
                      <span
                        key={genre}
                        className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm font-medium"
                      >
                        {genre}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
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
              {attendingEvents.map((event) => (
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
              {savedEvents.map((event) => (
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
