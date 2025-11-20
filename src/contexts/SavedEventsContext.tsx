import { createContext, useContext, useState, ReactNode, useEffect } from "react";
import { toast } from "sonner";
import { ProfileContext } from "./ProfileContext";

interface SavedEvent {
  id: number;
  title: string;
  region: string;
  genre: string;
  date: string;
  price: number;
}

interface SavedEventsContextType {
  savedEvents: SavedEvent[];
  attendingEvents: SavedEvent[];
  toggleSaveEvent: (event: SavedEvent) => void;
  toggleAttendingEvent: (event: SavedEvent) => void;
  isEventSaved: (eventId: number) => boolean;
  isEventAttending: (eventId: number) => boolean;
}

const SavedEventsContext = createContext<SavedEventsContextType | undefined>(undefined);

export const SavedEventsProvider = ({ children }: { children: ReactNode }) => {
  // Access ProfileContext directly
  const profileContext = useContext(ProfileContext);
  const currentProfileId = profileContext?.currentProfileId || null;
  
  const getStorageKey = (key: string) => {
    return currentProfileId ? `${key}_${currentProfileId}` : key;
  };

  const [savedEvents, setSavedEvents] = useState<SavedEvent[]>(() => {
    if (!currentProfileId) return [];
    const stored = localStorage.getItem(getStorageKey("savedEvents"));
    return stored ? JSON.parse(stored) : [];
  });

  const [attendingEvents, setAttendingEvents] = useState<SavedEvent[]>(() => {
    if (!currentProfileId) return [];
    const stored = localStorage.getItem(getStorageKey("attendingEvents"));
    return stored ? JSON.parse(stored) : [];
  });

  // Reload events when profile changes
  useEffect(() => {
    if (!currentProfileId) {
      setSavedEvents([]);
      setAttendingEvents([]);
      return;
    }
    
    const savedKey = getStorageKey("savedEvents");
    const attendingKey = getStorageKey("attendingEvents");
    
    const saved = localStorage.getItem(savedKey);
    const attending = localStorage.getItem(attendingKey);
    
    setSavedEvents(saved ? JSON.parse(saved) : []);
    setAttendingEvents(attending ? JSON.parse(attending) : []);
  }, [currentProfileId]);

  useEffect(() => {
    if (currentProfileId) {
      localStorage.setItem(getStorageKey("savedEvents"), JSON.stringify(savedEvents));
    }
  }, [savedEvents, currentProfileId]);

  useEffect(() => {
    if (currentProfileId) {
      localStorage.setItem(getStorageKey("attendingEvents"), JSON.stringify(attendingEvents));
    }
  }, [attendingEvents, currentProfileId]);

  const toggleSaveEvent = (event: SavedEvent) => {
    setSavedEvents((prev) => {
      const isAlreadySaved = prev.some((e) => e.id === event.id);
      if (isAlreadySaved) {
        toast.success("Removed from favorites");
        return prev.filter((e) => e.id !== event.id);
      } else {
        toast.success("Added to favorites");
        return [...prev, event];
      }
    });
  };

  const toggleAttendingEvent = (event: SavedEvent) => {
    setAttendingEvents((prev) => {
      const isAlreadyAttending = prev.some((e) => e.id === event.id);
      if (isAlreadyAttending) {
        toast.success("Removed from attending");
        return prev.filter((e) => e.id !== event.id);
      } else {
        toast.success("Added to attending events!");
        return [...prev, event];
      }
    });
  };

  const isEventSaved = (eventId: number) => {
    return savedEvents.some((e) => e.id === eventId);
  };

  const isEventAttending = (eventId: number) => {
    return attendingEvents.some((e) => e.id === eventId);
  };

  return (
    <SavedEventsContext.Provider value={{ 
      savedEvents, 
      attendingEvents,
      toggleSaveEvent, 
      toggleAttendingEvent,
      isEventSaved,
      isEventAttending
    }}>
      {children}
    </SavedEventsContext.Provider>
  );
};

export const useSavedEvents = () => {
  const context = useContext(SavedEventsContext);
  if (!context) {
    throw new Error("useSavedEvents must be used within SavedEventsProvider");
  }
  return context;
};
