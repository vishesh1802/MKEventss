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
          console.log('🔍 Loading profiles for user:', user.email, 'Token exists:', !!token);
          
          if (!token) {
            console.error('❌ No session token found!');
            setProfiles([]);
            setLoading(false);
            return;
          }
          
          const response = await fetch("/api/profiles", {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });

          console.log('📡 Profiles API response status:', response.status);

          if (response.ok) {
            const backendProfiles = await response.json();
            console.log('✅ Loaded profiles from database:', backendProfiles.length);
            
            // If no profiles in database, create one automatically (one profile per user)
            if (backendProfiles.length === 0) {
                // No profiles in database or localStorage - create default immediately
                console.log('📝 No profiles found, creating default profile...');
                const defaultProfileData = {
                  name: user.name || "Milwaukee Explorer",
                  region: "Downtown",
                  genres: ["Music", "Food"],
                };
                
                // Create immediate fallback first (synchronous)
                const immediateFallback: Profile = {
                  id: `profile_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                  name: defaultProfileData.name,
                  region: defaultProfileData.region,
                  genres: defaultProfileData.genres,
                  createdAt: new Date().toISOString(),
                };
                
                console.log('⚡ Creating immediate fallback profile:', immediateFallback.id);
                setProfiles([immediateFallback]);
                setCurrentProfileId(immediateFallback.id);
                localStorage.setItem(STORAGE_KEY, JSON.stringify([immediateFallback]));
                localStorage.setItem(CURRENT_PROFILE_KEY, immediateFallback.id);
                setLoading(false);
                
                // Then try to save to backend (async, non-blocking)
                try {
                  const createResponse = await fetch("/api/profiles", {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                      Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify(defaultProfileData),
                  });
                  
                  if (createResponse.ok) {
                    const newProfile = await createResponse.json();
                    console.log('✅ Saved default profile to database:', newProfile.id);
                    // Update with database profile (has proper ID)
                    setProfiles([newProfile]);
                    setCurrentProfileId(newProfile.id);
                    localStorage.setItem(CURRENT_PROFILE_KEY, newProfile.id);
                    // Update localStorage too
                    localStorage.setItem(STORAGE_KEY, JSON.stringify([newProfile]));
                  } else {
                    const errorText = await createResponse.text();
                    console.warn('⚠️ Failed to save profile to database (using local):', createResponse.status, errorText);
                    // Keep using the fallback profile
                  }
                } catch (error) {
                  console.warn('⚠️ Error saving profile to database (using local):', error);
                  // Keep using the fallback profile
                }
            } else {
              // One profile per user - use the first (and only) profile
              const userProfile = backendProfiles[0];
              setProfiles([userProfile]);
              setCurrentProfileId(userProfile.id);
              localStorage.setItem(CURRENT_PROFILE_KEY, userProfile.id);
              console.log(`✅ Loaded user profile: ${userProfile.name}`);
              setLoading(false);
            }
          } else {
            // API error - check what the error is
            const errorText = await response.text();
            console.error('❌ Profiles API error:', response.status, errorText);
            
            // If unauthorized, user might need to login again
            if (response.status === 401) {
              console.error('⚠️ Unauthorized - session might be expired');
              // Don't clear profiles, but log the issue
            }
            
            // Fallback to localStorage if available
            const savedProfiles = localStorage.getItem(STORAGE_KEY);
            if (savedProfiles) {
              try {
                const parsed = JSON.parse(savedProfiles);
                console.log('📦 Falling back to localStorage profiles:', parsed.length);
                setProfiles(parsed);
                const savedCurrentId = localStorage.getItem(CURRENT_PROFILE_KEY);
                if (savedCurrentId && parsed.find((p: Profile) => p.id === savedCurrentId)) {
                  setCurrentProfileId(savedCurrentId);
                  localStorage.setItem(CURRENT_PROFILE_KEY, savedCurrentId);
                } else if (parsed.length > 0) {
                  const firstId = parsed[0].id;
                  setCurrentProfileId(firstId);
                  localStorage.setItem(CURRENT_PROFILE_KEY, firstId);
                }
                setLoading(false);
              } catch (error) {
                console.error("Error loading profiles from localStorage:", error);
                setProfiles([]);
                setLoading(false);
              }
            } else {
              console.log('⚠️ No profiles in database or localStorage');
              setProfiles([]);
              setLoading(false);
            }
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

  // Debug logging for current profile state
  useEffect(() => {
    if (!loading) {
      console.log('📊 Profile State:', {
        profilesCount: profiles.length,
        currentProfileId,
        currentProfile: currentProfile ? currentProfile.name : null,
        isAuthenticated,
        userId: user?.id
      });
    }
  }, [profiles.length, currentProfileId, currentProfile, loading, isAuthenticated, user?.id]);

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

