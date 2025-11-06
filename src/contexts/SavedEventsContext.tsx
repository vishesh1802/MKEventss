import { createContext, useContext, useState, ReactNode, useEffect } from "react";
import { toast } from "sonner";

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
  const [savedEvents, setSavedEvents] = useState<SavedEvent[]>(() => {
    const stored = localStorage.getItem("savedEvents");
    return stored ? JSON.parse(stored) : [];
  });

  const [attendingEvents, setAttendingEvents] = useState<SavedEvent[]>(() => {
    const stored = localStorage.getItem("attendingEvents");
    return stored ? JSON.parse(stored) : [];
  });

  useEffect(() => {
    localStorage.setItem("savedEvents", JSON.stringify(savedEvents));
  }, [savedEvents]);

  useEffect(() => {
    localStorage.setItem("attendingEvents", JSON.stringify(attendingEvents));
  }, [attendingEvents]);

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
