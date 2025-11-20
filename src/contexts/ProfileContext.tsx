import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useAuth } from "./AuthContext";

export interface Profile {
  id: string;
  name: string;
  region: string;
  genres: string[];
  createdAt: string;
}

interface ProfileContextType {
  profiles: Profile[];
  currentProfileId: string | null;
  currentProfile: Profile | null;
  loading: boolean;
  createProfile: (name: string, region: string, genres: string[]) => Promise<string>;
  updateProfile: (id: string, updates: Partial<Profile>) => Promise<void>;
  deleteProfile: (id: string) => Promise<void>;
  switchProfile: (id: string) => void;
  getProfile: (id: string) => Profile | undefined;
}

export const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

const STORAGE_KEY = "userProfiles";
const CURRENT_PROFILE_KEY = "currentProfileId";

export function ProfileProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, user } = useAuth();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [currentProfileId, setCurrentProfileId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Load profiles from backend if authenticated, otherwise from localStorage
  useEffect(() => {
    const loadProfiles = async () => {
      setLoading(true);
      try {
        if (isAuthenticated && user) {
          // Load from backend
          const token = localStorage.getItem("session_token");
          const response = await fetch("/api/profiles", {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });

          if (response.ok) {
            const backendProfiles = await response.json();
            setProfiles(backendProfiles);
            
            // Try to restore current profile from localStorage
            const savedCurrentId = localStorage.getItem(CURRENT_PROFILE_KEY);
            if (savedCurrentId && backendProfiles.find((p: Profile) => p.id === savedCurrentId)) {
              setCurrentProfileId(savedCurrentId);
            } else if (backendProfiles.length > 0) {
              setCurrentProfileId(backendProfiles[0].id);
            }
          } else {
            // Fallback to empty array
            setProfiles([]);
          }
        } else {
          // Load from localStorage for non-authenticated users
          const savedProfiles = localStorage.getItem(STORAGE_KEY);
          const savedCurrentId = localStorage.getItem(CURRENT_PROFILE_KEY);

          if (savedProfiles) {
            try {
              const parsed = JSON.parse(savedProfiles);
              setProfiles(parsed);
              
              if (savedCurrentId && parsed.find((p: Profile) => p.id === savedCurrentId)) {
                setCurrentProfileId(savedCurrentId);
              } else if (parsed.length > 0) {
                setCurrentProfileId(parsed[0].id);
              }
            } catch (error) {
              console.error("Error loading profiles:", error);
            }
          } else {
            // Create default profile if none exist
            const defaultProfile: Profile = {
              id: `profile_${Date.now()}`,
              name: "Milwaukee Explorer",
              region: "Downtown",
              genres: ["Music", "Food"],
              createdAt: new Date().toISOString(),
            };
            setProfiles([defaultProfile]);
            setCurrentProfileId(defaultProfile.id);
            localStorage.setItem(STORAGE_KEY, JSON.stringify([defaultProfile]));
            localStorage.setItem(CURRENT_PROFILE_KEY, defaultProfile.id);
          }
        }
      } catch (error) {
        console.error("Error loading profiles:", error);
      } finally {
        setLoading(false);
      }
    };

    loadProfiles();
  }, [isAuthenticated, user?.id]);

  // Save profiles to localStorage whenever they change (for non-authenticated users)
  useEffect(() => {
    if (!isAuthenticated && profiles.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(profiles));
    }
  }, [profiles, isAuthenticated]);

  // Save current profile ID whenever it changes
  useEffect(() => {
    if (currentProfileId) {
      localStorage.setItem(CURRENT_PROFILE_KEY, currentProfileId);
    }
  }, [currentProfileId]);

  const createProfile = async (name: string, region: string, genres: string[]): Promise<string> => {
    const newProfile: Profile = {
      id: `profile_${Date.now()}`,
      name,
      region,
      genres,
      createdAt: new Date().toISOString(),
    };

    if (isAuthenticated && user) {
      // Save to backend
      try {
        const token = localStorage.getItem("session_token");
        if (!token) {
          console.warn("No session token found, creating profile locally");
          // Fall through to local storage
        } else {
          const response = await fetch("/api/profiles", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ name, region, genres }),
          });

          if (response.ok) {
            const savedProfile = await response.json();
            setProfiles((prev) => [...prev, savedProfile]);
            setCurrentProfileId(savedProfile.id);
            return savedProfile.id;
          } else {
            const errorData = await response.json().catch(() => ({ error: "Failed to create profile" }));
            console.warn("Backend failed, creating profile locally:", errorData.error || "Unknown error");
            // Fall through to local storage fallback
          }
        }
      } catch (error) {
        console.error("Error creating profile in backend:", error);
        // Fall through to local storage fallback
      }
    }

    // Fallback to local storage for non-authenticated users
    setProfiles((prev) => {
      const updated = [...prev, newProfile];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
    setCurrentProfileId(newProfile.id);
    localStorage.setItem(CURRENT_PROFILE_KEY, newProfile.id);
    return newProfile.id;
  };

  const updateProfile = async (id: string, updates: Partial<Profile>) => {
    const updatedProfile = { ...profiles.find(p => p.id === id), ...updates };
    
    setProfiles((prev) =>
      prev.map((profile) =>
        profile.id === id ? updatedProfile : profile
      )
    );

    if (isAuthenticated && user) {
      // Sync to backend
      try {
        const token = localStorage.getItem("session_token");
        await fetch("/api/profiles", {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            profileId: id,
            ...updates,
          }),
        });
      } catch (error) {
        console.error("Error updating profile:", error);
      }
    } else if (!isAuthenticated) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(profiles.map(p => p.id === id ? updatedProfile : p)));
    }
  };

  const deleteProfile = async (id: string) => {
    if (isAuthenticated && user) {
      // Delete from backend
      try {
        const token = localStorage.getItem("session_token");
        await fetch(`/api/profiles?profileId=${id}`, {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
      } catch (error) {
        console.error("Error deleting profile:", error);
      }
    }

    setProfiles((prev) => {
      const filtered = prev.filter((profile) => profile.id !== id);
      // If deleting current profile, switch to first available
      if (id === currentProfileId) {
        if (filtered.length > 0) {
          setCurrentProfileId(filtered[0].id);
        } else {
          setCurrentProfileId(null);
        }
      }
      if (!isAuthenticated) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
      }
      return filtered;
    });
  };

  const switchProfile = (id: string) => {
    if (profiles.find((p) => p.id === id)) {
      setCurrentProfileId(id);
    }
  };

  const getProfile = (id: string): Profile | undefined => {
    return profiles.find((p) => p.id === id);
  };

  const currentProfile = currentProfileId
    ? profiles.find((p) => p.id === currentProfileId) || null
    : null;

  return (
    <ProfileContext.Provider
      value={{
        profiles,
        currentProfileId,
        currentProfile,
        loading,
        createProfile,
        updateProfile,
        deleteProfile,
        switchProfile,
        getProfile,
      }}
    >
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile() {
  const context = useContext(ProfileContext);
  if (context === undefined) {
    throw new Error("useProfile must be used within a ProfileProvider");
  }
  return context;
}

