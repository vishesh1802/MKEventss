import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import EventCard from "@/components/EventCard";
import { Button } from "@/components/ui/button";
import { Calendar, MapPin, DollarSign, Heart, Share2, Users, Clock, Download, ExternalLink, Bell, Cloud, UtensilsCrossed, Wine, Sparkles, MessageSquare, Loader2, Star, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { useSavedEvents } from "@/contexts/SavedEventsContext";
import { downloadCalendar, getGoogleCalendarUrl } from "@/utils/calendar";
import { shareToFacebook, shareToTwitter, shareViaEmail, copyToClipboard, shareViaNativeShare, shareViaGmail, shareViaOutlook, copyEmailTemplate } from "@/utils/share";
import { saveReminder, getReminderForEvent, removeReminder, calculateReminderTime } from "@/utils/reminders";
import { fetchWeather, getWeatherIconUrl, getWeatherConditionColor, formatWeatherCondition, getWeatherRecommendation, type WeatherData } from "@/utils/weather";
import { fetchNearbyPlaces, getPriceLevelSymbol, getDirectionsUrl, formatDistance, type NearbyPlace } from "@/utils/nearby-places";
import { generateEventDescription, getPersonalizedSummary, answerEventQuestion } from "@/utils/ai";
import { fetchReviews, submitReview, formatRating, getRatingColor, formatReviewTimestamp, formatFullTimestamp, type Review } from "@/utils/reviews";
import { generateEventImage } from "@/utils/event-image-generation";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/contexts/ProfileContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

interface Event {
  id: number;
  event_id?: string;
  title: string;
  event_name?: string;
  region: string;
  venue_name?: string;
  genre: string;
  date: string;
  price: number;
  description?: string;
  latitude?: number;
  longitude?: number;
  organizer?: string;
  image?: string;
}

const EventDetail = () => {
  const { id } = useParams();
  const [event, setEvent] = useState<Event | null>(null);
  const [relatedEvents, setRelatedEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [reminderDialogOpen, setReminderDialogOpen] = useState(false);
  const [reminderType, setReminderType] = useState<'1day' | '1week' | 'custom'>('1day');
  const [customHours, setCustomHours] = useState(24);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [nearbyRestaurants, setNearbyRestaurants] = useState<NearbyPlace[]>([]);
  const [nearbyBars, setNearbyBars] = useState<NearbyPlace[]>([]);
  const [placesLoading, setPlacesLoading] = useState(false);
  const [placesTab, setPlacesTab] = useState<'restaurants' | 'bars'>('restaurants');
  const [aiDescription, setAiDescription] = useState<string | null>(null);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);
  const [answerLoading, setAnswerLoading] = useState(false);
  const [showAIDescription, setShowAIDescription] = useState(false);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [averageRating, setAverageRating] = useState(0);
  const [totalReviews, setTotalReviews] = useState(0);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewText, setReviewText] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);
  const [generatingImage, setGeneratingImage] = useState(false);
  const { toggleSaveEvent, toggleAttendingEvent, isEventSaved, isEventAttending } = useSavedEvents();
  const { currentProfile } = useProfile();
  const { user, isAuthenticated } = useAuth();
  const isSaved = event ? isEventSaved(event.id) : false;
  const isAttending = event ? isEventAttending(event.id) : false;
  const hasReminder = event ? getReminderForEvent(event.id) !== null : false;

  // Helper function to get region from coordinates
  const getVenueRegion = (lat: number, lon: number): string | null => {
    if (lat >= 43.038 && lat <= 43.045 && lon >= -87.92 && lon <= -87.89) {
      return 'Downtown';
    }
    if (lat >= 43.0335 && lat <= 43.0345 && lon >= -87.9335 && lon <= -87.9325) {
      return 'Third Ward';
    }
    if (lat >= 43.0515 && lat <= 43.053 && lon >= -87.906 && lon <= -87.904) {
      return 'Walker\'s Point';
    }
    if (lat >= 43.0755 && lat <= 43.077 && (lon >= -87.881 && lon <= -87.879 || Math.abs(lon - (-87.88)) < 0.001)) {
      return 'East Side';
    }
    return null;
  };

  useEffect(() => {
    const fetchEvent = async () => {
      setLoading(true);
      try {
        // Fetch event by ID
        const response = await fetch(`/api/events/${id}`);
        if (!response.ok) {
          throw new Error('Event not found');
        }
        const eventData = await response.json();
        
        // Parse date
        let isoDate = eventData.date;
        if (eventData.date && eventData.date.match(/^\d{1,2}\/\d{1,2}\/\d{2}$/)) {
          const [month, day, year] = eventData.date.split('/');
          isoDate = `20${year.padStart(2, '0')}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
        }
        
        // Get region
        const lat = Number(eventData.latitude);
        const lon = Number(eventData.longitude);
        const venueRegion = (lat && lon && getVenueRegion(lat, lon)) || eventData.venue_name || 'Milwaukee';
        
        // Use the actual database ID from eventData.id (this is the real events.id)
        const mappedEvent: Event = {
          id: eventData.id, // Always use the database ID from events table
          event_id: eventData.event_id,
          title: eventData.event_name || 'Untitled Event',
          event_name: eventData.event_name,
          region: venueRegion,
          venue_name: eventData.venue_name,
          genre: eventData.genre || 'General',
          date: isoDate,
          price: parseFloat(eventData.ticket_price?.replace(/[^0-9.]/g, '') || '0'),
          description: eventData.description || 'No description available.',
          latitude: lat,
          longitude: lon,
          organizer: eventData.organizer,
          image: eventData.image || undefined,
        };
        
        console.log('📝 Event loaded - Database ID:', eventData.id, 'Mapped ID:', mappedEvent.id);
        console.log('🖼️ Event image status:', mappedEvent.image ? 'Has image' : 'No image');
        setEvent(mappedEvent);
        
        // Fetch weather for event date
        if (lat && lon) {
          setWeatherLoading(true);
          const weatherData = await fetchWeather(lat, lon, isoDate);
          setWeather(weatherData);
          setWeatherLoading(false);
        }
        
        // Fetch nearby places
        if (lat && lon) {
          setPlacesLoading(true);
          const [restaurants, bars] = await Promise.all([
            fetchNearbyPlaces(lat, lon, 'restaurant', 1000),
            fetchNearbyPlaces(lat, lon, 'bar', 1000),
          ]);
          setNearbyRestaurants(restaurants);
          setNearbyBars(bars);
          setPlacesLoading(false);
        }
        
        // Fetch reviews
        if (eventData.id) {
          setReviewsLoading(true);
          console.log('📝 Fetching reviews for event ID:', eventData.id);
          const reviewsData = await fetchReviews(eventData.id);
          console.log('📝 Received reviews:', reviewsData.reviews.length, 'reviews');
          console.log('📝 Reviews data:', reviewsData.reviews);
          setReviews(reviewsData.reviews);
          setAverageRating(reviewsData.averageRating);
          setTotalReviews(reviewsData.totalReviews);
          setReviewsLoading(false);
        }
        
        // Fetch related events (same genre, different event)
        const allEventsResponse = await fetch('/api/events');
        if (allEventsResponse.ok) {
          const allEvents = await allEventsResponse.json();
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          
          const related = allEvents
            .filter((e: any) => {
              if (!e.event_name || !e.date || e.event_id === eventData.event_id) return false;
              
              // Parse date
              let eIsoDate = e.date;
              if (e.date.match(/^\d{1,2}\/\d{1,2}\/\d{2}$/)) {
                const [month, day, year] = e.date.split('/');
                eIsoDate = `20${year.padStart(2, '0')}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
              }
              
              const eDate = new Date(eIsoDate);
              eDate.setHours(0, 0, 0, 0);
              const eDateStr = eDate.toISOString().split('T')[0];
              const todayStr = today.toISOString().split('T')[0];
              
              // Only future events, same genre
              return e.genre === eventData.genre && eDateStr >= todayStr;
            })
            .slice(0, 3)
            .map((e: any, idx: number) => {
              let eIsoDate = e.date;
              if (e.date.match(/^\d{1,2}\/\d{1,2}\/\d{2}$/)) {
                const [month, day, year] = e.date.split('/');
                eIsoDate = `20${year.padStart(2, '0')}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
              }
              
              const eLat = Number(e.latitude);
              const eLon = Number(e.longitude);
              const eVenueRegion = (eLat && eLon && getVenueRegion(eLat, eLon)) || e.venue_name || 'Milwaukee';
              
              return {
                id: e.id || parseInt(e.event_id?.replace(/\D/g, '') || String(idx + 1)),
                title: e.event_name || 'Untitled Event',
                region: eVenueRegion,
                genre: e.genre || 'General',
                date: eIsoDate,
                price: parseFloat(e.ticket_price?.replace(/[^0-9.]/g, '') || '0'),
                image: e.image || undefined,
              };
            });
          
          setRelatedEvents(related);
        }
      } catch (error) {
        console.error("Error fetching event:", error);
        toast.error("Failed to load event details");
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchEvent();
    }
  }, [id]);

  const handleSave = () => {
    if (event) {
      toggleSaveEvent({
        id: event.id,
        title: event.title,
        region: event.region,
        genre: event.genre,
        date: event.date,
        price: event.price,
        image: event.image,
      });
    }
  };

  const handleAttend = () => {
    if (event) {
      toggleAttendingEvent({
        id: event.id,
        title: event.title,
        region: event.region,
        genre: event.genre,
        date: event.date,
        price: event.price,
        image: event.image,
      });
    }
  };

  const handleGenerateImage = async (eventId: number, showToast = true) => {
    if (generatingImage) return;
    
    setGeneratingImage(true);
    if (showToast) {
      toast.info("Generating image... This may take a moment.");
    }
    
    try {
      const result = await generateEventImage({ eventId });
      
      if (result.success && result.image) {
        // Refresh the event data
        const response = await fetch(`/api/events/${id}`);
        if (response.ok) {
          const eventData = await response.json();
          const lat = Number(eventData.latitude);
          const lon = Number(eventData.longitude);
          const venueRegion = (lat && lon && getVenueRegion(lat, lon)) || eventData.venue_name || 'Milwaukee';
          
          let isoDate = eventData.date;
          if (eventData.date && eventData.date.match(/^\d{1,2}\/\d{1,2}\/\d{2}$/)) {
            const [month, day, year] = eventData.date.split('/');
            isoDate = `20${year.padStart(2, '0')}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
          }
          
          setEvent({
            id: eventData.id,
            event_id: eventData.event_id,
            title: eventData.event_name || 'Untitled Event',
            event_name: eventData.event_name,
            region: venueRegion,
            venue_name: eventData.venue_name,
            genre: eventData.genre || 'General',
            date: isoDate,
            price: parseFloat(eventData.ticket_price?.replace(/[^0-9.]/g, '') || '0'),
            description: eventData.description || 'No description available.',
            latitude: lat,
            longitude: lon,
            organizer: eventData.organizer,
            image: eventData.image || undefined,
          });
        }
        
        if (showToast) {
          toast.success("Image generated successfully!");
        }
      } else {
        throw new Error(result.message || "Failed to generate image");
      }
    } catch (error: any) {
      console.error("Error generating image:", error);
      if (showToast) {
        toast.error(error.message || "Failed to generate image. Please check your API keys.");
      }
    } finally {
      setGeneratingImage(false);
    }
  };

  const handleShare = async (platform?: 'facebook' | 'twitter' | 'email' | 'gmail' | 'outlook' | 'email-copy' | 'native' | 'copy') => {
    const url = window.location.href;
    const title = event?.title || 'Event';

    if (!platform || platform === 'copy') {
      const success = await copyToClipboard(url);
      if (success) {
        toast.success("Link copied to clipboard!");
      } else {
        toast.error("Failed to copy link");
      }
    } else if (platform === 'facebook') {
      shareToFacebook(url, title);
    } else if (platform === 'twitter') {
      shareToTwitter(url, title);
    } else if (platform === 'email') {
      // Try mailto: link (works if email client is configured)
      shareViaEmail(url, title);
      toast.info("Opening email client...");
    } else if (platform === 'gmail') {
      shareViaGmail(url, title);
      toast.success("Opening Gmail...");
    } else if (platform === 'outlook') {
      shareViaOutlook(url, title);
      toast.success("Opening Outlook...");
    } else if (platform === 'email-copy') {
      const copied = await copyEmailTemplate(url, title);
      if (copied) {
        toast.success("Email template copied to clipboard! Paste it into your email.");
      } else {
        toast.error("Failed to copy email template.");
      }
    } else if (platform === 'native') {
      shareViaNativeShare(url, title, event?.description);
    }
  };

  const handleAddToCalendar = (type: 'ical' | 'google') => {
    if (!event) return;
    
    if (type === 'ical') {
      downloadCalendar({
        title: event.title,
        date: event.date,
        description: event.description,
        location: `${event.venue_name || event.region}, Milwaukee`,
        price: event.price,
      });
      toast.success("Calendar file downloaded!");
    } else {
      window.open(getGoogleCalendarUrl({
        title: event.title,
        date: event.date,
        description: event.description,
        location: `${event.venue_name || event.region}, Milwaukee`,
      }), '_blank');
    }
  };

  const handleSetReminder = () => {
    if (!event) return;
    
    const reminderTime = calculateReminderTime(event.date, reminderType, customHours);
    saveReminder({
      eventId: event.id,
      eventTitle: event.title,
      eventDate: event.date,
      reminderTime,
      reminderType,
    });
    
    toast.success("Reminder set successfully!");
    setReminderDialogOpen(false);
  };

  const handleRemoveReminder = () => {
    if (!event) return;
    removeReminder(event.id);
    toast.success("Reminder removed");
  };

  const handleGetDirections = () => {
    if (!event || !event.latitude || !event.longitude) {
      toast.error("Location information not available");
      return;
    }
    const url = `https://www.google.com/maps/dir/?api=1&destination=${event.latitude},${event.longitude}`;
    window.open(url, '_blank');
  };

  const handleAskQuestion = async () => {
    if (!question.trim() || !event) return;
    
    setAnswerLoading(true);
    setAnswer(null);
    
    const answerText = await answerEventQuestion(
      {
        title: event.title,
        event_name: event.event_name,
        genre: event.genre,
        date: event.date,
        venue_name: event.venue_name,
        region: event.region,
        price: event.price,
        description: event.description,
      },
      question
    );
    
    setAnswer(answerText);
    setAnswerLoading(false);
    
    if (answerText) {
      toast.success("Answer generated!");
    } else {
      toast.error("Failed to get answer");
    }
  };

  const formatDate = (dateString: string) => {
    const eventDate = new Date(dateString);
    return eventDate.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1 container mx-auto px-4 py-8">
          <div className="animate-pulse">
            <div className="h-96 bg-muted rounded-2xl mb-8" />
            <div className="h-8 bg-muted rounded w-2/3 mb-4" />
            <div className="h-4 bg-muted rounded w-1/2 mb-8" />
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-4">Event not found</h2>
            <Link to="/discover">
              <Button>Browse Events</Button>
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1">
        {/* Hero Banner */}
        <div className="relative h-96 overflow-hidden">
          {event.image && event.image.trim() !== '' ? (
            <img 
              src={event.image} 
              alt={event.title}
              className="w-full h-full object-cover"
              onError={(e) => {
                console.error('❌ Event detail image failed to load:', event.image);
                // Fallback to placeholder
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
                const parent = target.parentElement;
                if (parent && !parent.querySelector('.gradient-hero')) {
                  const placeholder = document.createElement('div');
                  placeholder.className = 'relative h-full w-full gradient-hero';
                  placeholder.innerHTML = '<div class="absolute inset-0 flex items-center justify-center"><svg class="w-32 h-32 text-white/20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg></div></div>';
                  parent.appendChild(placeholder);
                }
              }}
              onLoad={() => {
                console.log('✅ Event detail image loaded:', event.image);
              }}
            />
          ) : (
            <div className="relative h-full w-full gradient-hero">
              <div className="absolute inset-0 flex items-center justify-center">
                <Calendar className="w-32 h-32 text-white/20" />
              </div>
            </div>
          )}
          {/* Overlay for better text readability if image exists */}
          {event.image && event.image.trim() !== '' && (
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
          )}
        </div>

        {/* Event Details */}
        <div className="container mx-auto px-4 -mt-20 relative z-10">
          <div className="bg-card rounded-2xl shadow-card-hover p-8 mb-8">
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6 mb-6">
              <div className="flex-1">
                <div className="inline-block bg-primary/10 text-primary px-3 py-1 rounded-full text-sm font-medium mb-3">
                  {event.genre}
                </div>
                <h1 className="text-4xl font-bold text-foreground mb-4">
                  {event.title}
                </h1>
                
                <div className="space-y-3">
                  <div className="flex items-center gap-3 text-muted-foreground">
                    <Calendar className="w-5 h-5 text-primary" />
                    <span className="text-lg">{formatDate(event.date)}</span>
                  </div>
                  <div className="flex items-center gap-3 text-muted-foreground">
                    <MapPin className="w-5 h-5 text-primary" />
                    <span className="text-lg">{event.venue_name || event.region}, Milwaukee</span>
                  </div>
                  {event.organizer && (
                    <div className="flex items-center gap-3 text-muted-foreground">
                      <Users className="w-5 h-5 text-primary" />
                      <span className="text-lg">Organized by {event.organizer}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-3 text-foreground font-semibold">
                    <DollarSign className="w-5 h-5 text-secondary" />
                    <span className="text-lg">
                      {event.price === 0 ? "Free Event" : `$${event.price}`}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col gap-3 lg:w-48">
                <Button 
                  size="lg" 
                  className={`w-full gap-2 ${isAttending ? 'bg-primary' : ''}`}
                  onClick={handleAttend}
                >
                  <Users className="w-5 h-5" />
                  {isAttending ? "Attending ✓" : "Attend"}
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={handleSave}
                  className="w-full gap-2"
                >
                  <Heart
                    className={`w-5 h-5 ${
                      isSaved ? "fill-secondary text-secondary" : ""
                    }`}
                  />
                  {isSaved ? "Saved" : "Save"}
                </Button>
                
                {/* Generate Image Button */}
                {(!event.image || event.image.trim() === '') && (
                  <Button
                    size="lg"
                    variant="outline"
                    onClick={() => handleGenerateImage(event.id)}
                    disabled={generatingImage}
                    className="w-full gap-2"
                  >
                    {generatingImage ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <ImageIcon className="w-5 h-5" />
                        Generate Image
                      </>
                    )}
                  </Button>
                )}
                
                {/* Share Dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="lg" variant="outline" className="w-full gap-2">
                      <Share2 className="w-5 h-5" />
                      Share
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleShare('copy')}>
                      Copy Link
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleShare('facebook')}>
                      Facebook
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleShare('twitter')}>
                      Twitter
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => handleShare('gmail')}>
                      Gmail
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleShare('outlook')}>
                      Outlook
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleShare('email-copy')}>
                      Copy Email Template
                    </DropdownMenuItem>
                    {navigator.share && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => handleShare('native')}>
                          More Options
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* Add to Calendar Dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="lg" variant="outline" className="w-full gap-2">
                      <Calendar className="w-5 h-5" />
                      Add to Calendar
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleAddToCalendar('google')}>
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Google Calendar
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleAddToCalendar('ical')}>
                      <Download className="w-4 h-4 mr-2" />
                      Download (.ics)
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* Reminder Button */}
                {hasReminder ? (
                  <Button
                    size="lg"
                    variant="outline"
                    onClick={handleRemoveReminder}
                    className="w-full gap-2"
                  >
                    <Bell className="w-5 h-5 fill-primary text-primary" />
                    Remove Reminder
                  </Button>
                ) : (
                  <Dialog open={reminderDialogOpen} onOpenChange={setReminderDialogOpen}>
                    <DialogTrigger asChild>
                      <Button size="lg" variant="outline" className="w-full gap-2">
                        <Bell className="w-5 h-5" />
                        Set Reminder
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Set Event Reminder</DialogTitle>
                        <DialogDescription>
                          Get notified before this event starts
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div>
                          <Label>Reminder Time</Label>
                          <Select value={reminderType} onValueChange={(v: '1day' | '1week' | 'custom') => setReminderType(v)}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="1day">1 Day Before</SelectItem>
                              <SelectItem value="1week">1 Week Before</SelectItem>
                              <SelectItem value="custom">Custom</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        {reminderType === 'custom' && (
                          <div>
                            <Label>Hours Before Event</Label>
                            <Input
                              type="number"
                              value={customHours}
                              onChange={(e) => setCustomHours(parseInt(e.target.value) || 24)}
                              min={1}
                              max={168}
                            />
                          </div>
                        )}
                        <Button onClick={handleSetReminder} className="w-full">
                          Set Reminder
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                )}

                {/* Get Directions */}
                {event.latitude && event.longitude && (
                  <Button
                    size="lg"
                    variant="outline"
                    onClick={handleGetDirections}
                    className="w-full gap-2"
                  >
                    <MapPin className="w-5 h-5" />
                    Get Directions
                  </Button>
                )}
              </div>
            </div>

            {/* Description */}
            <div className="border-t border-border pt-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-semibold text-foreground">
                  About This Event
                </h2>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    if (aiDescription) {
                      setShowAIDescription(!showAIDescription);
                      return;
                    }
                    setAiLoading(true);
                    const desc = await generateEventDescription({
                      title: event.title,
                      event_name: event.event_name,
                      genre: event.genre,
                      date: event.date,
                      venue_name: event.venue_name,
                      region: event.region,
                      price: event.price,
                      description: event.description,
                    });
                    setAiDescription(desc);
                    setShowAIDescription(true);
                    setAiLoading(false);
                    if (desc) {
                      toast.success("AI description generated!");
                    } else {
                      toast.error("Failed to generate AI description");
                    }
                  }}
                  disabled={aiLoading}
                  className="gap-2"
                >
                  {aiLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Sparkles className="w-4 h-4" />
                  )}
                  {aiDescription && showAIDescription ? "Hide AI Description" : "Generate AI Description"}
                </Button>
              </div>
              <p className="text-muted-foreground leading-relaxed text-lg">
                {event.description}
              </p>
              {showAIDescription && aiDescription && (
                <div className="mt-4 p-4 bg-primary/5 border border-primary/20 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="w-4 h-4 text-primary" />
                    <span className="text-sm font-medium text-primary">AI-Enhanced Description</span>
                  </div>
                  <p className="text-foreground leading-relaxed">{aiDescription}</p>
                </div>
              )}
            </div>

            {/* AI Personalized Summary */}
            {currentProfile && currentProfile.genres.length > 0 && (
              <div className="border-t border-border pt-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-2xl font-semibold text-foreground flex items-center gap-2">
                    <Sparkles className="w-6 h-6 text-primary" />
                    Personalized For You
                  </h2>
                  {!aiSummary && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        setAiLoading(true);
                        const summary = await getPersonalizedSummary(
                          {
                            title: event.title,
                            event_name: event.event_name,
                            genre: event.genre,
                            date: event.date,
                            venue_name: event.venue_name,
                            region: event.region,
                            price: event.price,
                          },
                          {
                            genres: currentProfile.genres,
                            region: currentProfile.region || undefined,
                          }
                        );
                        setAiSummary(summary);
                        setAiLoading(false);
                        if (summary) {
                          toast.success("Personalized summary generated!");
                        } else {
                          toast.error("Failed to generate summary");
                        }
                      }}
                      disabled={aiLoading}
                      className="gap-2"
                    >
                      {aiLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Sparkles className="w-4 h-4" />
                      )}
                      Generate Summary
                    </Button>
                  )}
                </div>
                {aiSummary ? (
                  <div className="p-4 bg-secondary/50 border border-border rounded-lg">
                    <p className="text-foreground leading-relaxed">{aiSummary}</p>
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm">
                    Get a personalized summary explaining why this event matches your interests.
                  </p>
                )}
              </div>
            )}

            {/* Reviews & Ratings Section */}
            <div className="border-t border-border pt-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-semibold text-foreground flex items-center gap-2">
                  <Star className="w-6 h-6 text-primary" />
                  Reviews & Ratings
                </h2>
                {isAuthenticated && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setReviewDialogOpen(true)}
                  >
                    Write a Review
                  </Button>
                )}
              </div>
              
              {/* Average Rating Display */}
              {reviewsLoading ? (
                <Skeleton className="h-20 w-full mb-4" />
              ) : (
                <div className="mb-6 p-4 bg-muted rounded-lg">
                  <div className="flex items-center gap-4">
                    <div className="text-4xl font-bold" style={{ color: getRatingColor(averageRating) }}>
                      {averageRating > 0 ? averageRating.toFixed(1) : "—"}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-1 mb-2">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={`w-5 h-5 ${
                              star <= Math.round(averageRating)
                                ? "fill-yellow-400 text-yellow-400"
                                : "text-muted-foreground"
                            }`}
                          />
                        ))}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {formatRating(averageRating, totalReviews)}
                      </p>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Reviews List */}
              {reviewsLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-24 w-full" />
                  ))}
                </div>
              ) : reviews.length > 0 ? (
                <div className="space-y-4">
                  {reviews.map((review) => (
                    <div key={review.id} className="p-4 border border-border rounded-lg">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="font-semibold text-foreground">
                            {review.user_name || "Anonymous"}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <div className="flex items-center gap-1">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <Star
                                  key={star}
                                  className={`w-4 h-4 ${
                                    star <= review.rating
                                      ? "fill-yellow-400 text-yellow-400"
                                      : "text-muted-foreground"
                                  }`}
                                />
                              ))}
                            </div>
                            <span 
                              className="text-sm text-muted-foreground"
                              title={formatFullTimestamp(review.created_at) + (review.updated_at && review.updated_at !== review.created_at ? ` (Updated: ${formatFullTimestamp(review.updated_at)})` : '')}
                            >
                              {formatReviewTimestamp(review.created_at, review.updated_at)}
                            </span>
                          </div>
                        </div>
                      </div>
                      {review.review_text && (
                        <p className="text-foreground mt-2">{review.review_text}</p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Star className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No reviews yet. Be the first to review this event!</p>
                  {!isAuthenticated && (
                    <p className="text-sm mt-2">
                      <Link to="/login" className="text-primary hover:underline">
                        Sign in
                      </Link> to write a review
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* AI Q&A Section */}
            <div className="border-t border-border pt-6">
              <h2 className="text-2xl font-semibold text-foreground mb-4 flex items-center gap-2">
                <MessageSquare className="w-6 h-6 text-primary" />
                Ask About This Event
              </h2>
              <div className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    placeholder="Ask a question (e.g., What should I wear?)"
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && question.trim()) {
                        handleAskQuestion();
                      }
                    }}
                  />
                  <Button
                    onClick={handleAskQuestion}
                    disabled={!question.trim() || answerLoading}
                  >
                    {answerLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      "Ask"
                    )}
                  </Button>
                </div>
                {answer && (
                  <div className="p-4 bg-muted border border-border rounded-lg">
                    <p className="text-foreground leading-relaxed">{answer}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Weather & Context Section */}
            {(event.latitude && event.longitude) && (
              <div className="border-t border-border pt-6 space-y-6">
                {/* Weather Forecast */}
                {weatherLoading ? (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Cloud className="w-5 h-5" />
                        Weather Forecast
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <Skeleton className="h-8 w-32" />
                        <Skeleton className="h-4 w-48" />
                      </div>
                    </CardContent>
                  </Card>
                ) : weather ? (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Cloud className="w-5 h-5" />
                        Weather Forecast
                      </CardTitle>
                      <CardDescription>
                        Weather conditions for {formatDate(event.date)}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-start gap-6 flex-wrap">
                        <div className="flex items-center gap-4">
                          <img
                            src={getWeatherIconUrl(weather.icon)}
                            alt={weather.condition}
                            className="w-16 h-16"
                          />
                          <div>
                            <div className="text-3xl font-bold text-foreground">
                              {weather.temperature}°F
                            </div>
                            <div className={`text-lg font-medium ${getWeatherConditionColor(weather.condition)}`}>
                              {formatWeatherCondition(weather.condition)}
                            </div>
                            <div className="text-sm text-muted-foreground capitalize">
                              {weather.description}
                            </div>
                          </div>
                        </div>
                        <div className="flex-1 min-w-[200px] space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Humidity:</span>
                            <span className="font-medium">{weather.humidity}%</span>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Wind Speed:</span>
                            <span className="font-medium">{weather.windSpeed} mph</span>
                          </div>
                          {weather.precipitation !== undefined && weather.precipitation > 0 && (
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">Precipitation:</span>
                              <span className="font-medium">{weather.precipitation.toFixed(2)} mm</span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="mt-4 p-3 bg-muted rounded-lg">
                        <p className="text-sm text-foreground">
                          <strong>💡 Tip:</strong> {getWeatherRecommendation(weather.condition, weather.temperature)}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ) : null}

                {/* Nearby Places */}
                {(nearbyRestaurants.length > 0 || nearbyBars.length > 0 || placesLoading) && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <MapPin className="w-5 h-5" />
                        Nearby Places
                      </CardTitle>
                      <CardDescription>
                        Restaurants and bars near the event venue
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Tabs value={placesTab} onValueChange={(v) => setPlacesTab(v as 'restaurants' | 'bars')}>
                        <TabsList className="grid w-full grid-cols-2">
                          <TabsTrigger value="restaurants" className="gap-2">
                            <UtensilsCrossed className="w-4 h-4" />
                            Restaurants ({nearbyRestaurants.length})
                          </TabsTrigger>
                          <TabsTrigger value="bars" className="gap-2">
                            <Wine className="w-4 h-4" />
                            Bars ({nearbyBars.length})
                          </TabsTrigger>
                        </TabsList>
                        
                        <TabsContent value="restaurants" className="mt-4">
                          {placesLoading ? (
                            <div className="space-y-3">
                              {[1, 2, 3].map((i) => (
                                <Skeleton key={i} className="h-20 w-full" />
                              ))}
                            </div>
                          ) : nearbyRestaurants.length > 0 ? (
                            <div className="space-y-3">
                              {nearbyRestaurants.map((place, idx) => (
                                <div
                                  key={idx}
                                  className="flex items-start justify-between p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors"
                                >
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                      <h4 className="font-semibold text-foreground">{place.name}</h4>
                                      {place.rating && (
                                        <Badge variant="secondary" className="text-xs">
                                          ⭐ {place.rating.toFixed(1)}
                                        </Badge>
                                      )}
                                      {place.priceLevel && (
                                        <Badge variant="outline" className="text-xs">
                                          {getPriceLevelSymbol(place.priceLevel)}
                                        </Badge>
                                      )}
                                    </div>
                                    <p className="text-sm text-muted-foreground mb-2">{place.address}</p>
                                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                      <span className="flex items-center gap-1">
                                        <MapPin className="w-3 h-3" />
                                        {formatDistance(place.distance)} away
                                      </span>
                                    </div>
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => window.open(getDirectionsUrl(place.lat, place.lng), '_blank')}
                                    className="ml-4"
                                  >
                                    <ExternalLink className="w-4 h-4" />
                                  </Button>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-center text-muted-foreground py-8">
                              No restaurants found nearby
                            </p>
                          )}
                        </TabsContent>
                        
                        <TabsContent value="bars" className="mt-4">
                          {placesLoading ? (
                            <div className="space-y-3">
                              {[1, 2, 3].map((i) => (
                                <Skeleton key={i} className="h-20 w-full" />
                              ))}
                            </div>
                          ) : nearbyBars.length > 0 ? (
                            <div className="space-y-3">
                              {nearbyBars.map((place, idx) => (
                                <div
                                  key={idx}
                                  className="flex items-start justify-between p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors"
                                >
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                      <h4 className="font-semibold text-foreground">{place.name}</h4>
                                      {place.rating && (
                                        <Badge variant="secondary" className="text-xs">
                                          ⭐ {place.rating.toFixed(1)}
                                        </Badge>
                                      )}
                                      {place.priceLevel && (
                                        <Badge variant="outline" className="text-xs">
                                          {getPriceLevelSymbol(place.priceLevel)}
                                        </Badge>
                                      )}
                                    </div>
                                    <p className="text-sm text-muted-foreground mb-2">{place.address}</p>
                                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                      <span className="flex items-center gap-1">
                                        <MapPin className="w-3 h-3" />
                                        {formatDistance(place.distance)} away
                                      </span>
                                    </div>
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => window.open(getDirectionsUrl(place.lat, place.lng), '_blank')}
                                    className="ml-4"
                                  >
                                    <ExternalLink className="w-4 h-4" />
                                  </Button>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-center text-muted-foreground py-8">
                              No bars found nearby
                            </p>
                          )}
                        </TabsContent>
                      </Tabs>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </div>

          {/* Related Events */}
          <section className="pb-16">
            <h2 className="text-3xl font-bold text-foreground mb-6">
              You Might Also Like
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in">
              {relatedEvents.map((relatedEvent) => (
                <EventCard key={relatedEvent.id} {...relatedEvent} />
              ))}
            </div>
          </section>
        </div>
      </main>
      
      {/* Review Dialog */}
      <Dialog open={reviewDialogOpen} onOpenChange={setReviewDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Write a Review</DialogTitle>
            <DialogDescription>
              Share your experience with this event
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Rating</Label>
              <div className="flex items-center gap-2 mt-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setReviewRating(star)}
                    className="focus:outline-none"
                  >
                    <Star
                      className={`w-8 h-8 transition-colors ${
                        star <= reviewRating
                          ? "fill-yellow-400 text-yellow-400"
                          : "text-muted-foreground hover:text-yellow-400"
                      }`}
                    />
                  </button>
                ))}
                <span className="ml-2 text-sm text-muted-foreground">
                  {reviewRating} {reviewRating === 1 ? "star" : "stars"}
                </span>
              </div>
            </div>
            <div>
              <Label htmlFor="review-text">Review (Optional)</Label>
              <Textarea
                id="review-text"
                className="w-full mt-2"
                rows={4}
                placeholder="Tell others about your experience..."
                value={reviewText}
                onChange={(e) => setReviewText(e.target.value)}
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => {
                  setReviewDialogOpen(false);
                  setReviewText("");
                  setReviewRating(5);
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={async () => {
                  if (!event) return;
                  setSubmittingReview(true);
                  try {
                    const token = localStorage.getItem("session_token");
                    await fetch("/api/reviews", {
                      method: "POST",
                      headers: {
                        "Content-Type": "application/json",
                        Authorization: token ? `Bearer ${token}` : "",
                      },
                      credentials: "include",
                      body: JSON.stringify({
                        event_id: event.id, // This should be the database ID from events table
                        rating: reviewRating,
                        review_text: reviewText || null,
                      }),
                    });
                    
                    // Refresh reviews - use the database ID
                    console.log('🔄 Refreshing reviews after submission, event.id:', event.id);
                    const reviewsData = await fetchReviews(event.id);
                    console.log('🔄 Refreshed reviews:', reviewsData.reviews.length, 'total reviews');
                    console.log('🔄 Review user IDs:', reviewsData.reviews.map((r: Review) => r.user_id));
                    setReviews(reviewsData.reviews);
                    setAverageRating(reviewsData.averageRating);
                    setTotalReviews(reviewsData.totalReviews);
                    
                    toast.success("Review submitted successfully!");
                    setReviewDialogOpen(false);
                    setReviewText("");
                    setReviewRating(5);
                  } catch (error) {
                    toast.error("Failed to submit review");
                    console.error(error);
                  } finally {
                    setSubmittingReview(false);
                  }
                }}
                disabled={submittingReview}
              >
                {submittingReview ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Submitting...
                  </>
                ) : (
                  "Submit Review"
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      
      <Footer />
    </div>
  );
};

export default EventDetail;
