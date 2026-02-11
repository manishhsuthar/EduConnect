import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface User {
  id: string;
  username: string;
  email: string;
  role: 'student' | 'faculty' | 'admin';
  isApproved: boolean;
  isProfileComplete: boolean;
  department?: string;
  year?: string;
  subjects?: string[];
  profilePhoto?: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string; profileSetupRequired?: boolean; isAdmin?: boolean }>;
  loginWithGoogle: () => Promise<{ success: boolean; error?: string }>;
  register: (name: string, email: string, password: string, role: 'Student' | 'Faculty') => Promise<{ success: boolean; error?: string; profileSetupRequired?: boolean }>;
  logout: () => void;
  updateProfile: (profileData: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const normalizeUser = (raw: any): User => ({
    id: raw.id || raw._id,
    username: raw.username,
    email: raw.email,
    role: raw.role,
    isApproved: raw.isApproved ?? false,
    isProfileComplete: raw.isProfileComplete ?? false,
    department: raw.department,
    year: raw.year,
    subjects: raw.subjects,
    profilePhoto: raw.profilePhoto,
  });

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await fetch('/api/auth/me');
        if (res.ok) {
          const userData = await res.json();
          setUser(normalizeUser(userData));
        } else {
          setUser(null);
        }
      } catch (error) {
        console.error("Failed to fetch user", error);
        setUser(null);
      }
      setIsLoading(false);
    };
    fetchUser();
  }, []);

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string; profileSetupRequired?: boolean; isAdmin?: boolean }> => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();

      if (!res.ok) {
        return { success: false, error: data.message || 'Login failed' };
      }

      if(data.user) {
        setUser(normalizeUser(data.user));
      }

      return { 
        success: true, 
        profileSetupRequired: !data.user.isProfileComplete,
        isAdmin: data.user.role === 'admin'
      };
    } catch (error) {
      return { success: false, error: 'An unexpected error occurred.' };
    }
  };

  const loginWithGoogle = async (): Promise<{ success: boolean; error?: string }> => {
    // This is a placeholder. Full Google OAuth implementation is complex
    // and requires a backend setup with passport.js or similar.
    console.warn("loginWithGoogle is not implemented. This requires backend OAuth setup.");
    return { success: false, error: "Google login is not configured." };
  };

  const register = async (
    username: string,
    email: string,
    password: string,
    role: 'Student' | 'Faculty'
  ): Promise<{ success: boolean; error?: string; profileSetupRequired?: boolean }> => {
    const roleLower = role.toLowerCase();
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password, role: roleLower }),
      });
      const data = await res.json();

      if (!res.ok) {
        return { success: false, error: data.message || 'Registration failed' };
      }

      if (data.user) {
        setUser(normalizeUser(data.user));
      }
      
      return { success: true, profileSetupRequired: true };
    } catch (error) {
      return { success: false, error: 'An unexpected error occurred.' };
    }
  };

  const logout = async () => {
    try {
        await fetch('/api/auth/logout', { method: 'POST' });
    } catch (error) {
        console.error("Failed to logout from server", error);
    } finally {
        setUser(null);
    }
  };

  const updateProfile = (profileData: Partial<User>) => {
    if (user) {
      const updatedUser = { ...user, ...profileData, isProfileComplete: true };
      setUser(updatedUser);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        login,
        loginWithGoogle,
        register,
        logout,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
