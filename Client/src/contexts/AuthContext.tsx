import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface User {
  id: string;
  username: string;
  email: string;
  role: 'student' | 'faculty' | 'admin';
  isApproved: boolean;
  isProfileComplete: boolean;
  // Add other fields from your User model as needed
}

interface AuthContextType {
  user: User | null;
  token: string | null;
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
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      const storedToken = localStorage.getItem('token');
      if (storedToken) {
        try {
          const res = await fetch('/user', {
            headers: {
              'Authorization': `Bearer ${storedToken}`,
            },
          });
          if (res.ok) {
            const userData = await res.json();
            setUser(userData);
            setToken(storedToken);
          } else {
            // Token is invalid, clear it
            logout();
          }
        } catch (error) {
          console.error("Failed to fetch user", error);
          logout();
        }
      }
      setIsLoading(false);
    };
    fetchUser();
  }, []);

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string; profileSetupRequired?: boolean; isAdmin?: boolean }> => {
    try {
      const res = await fetch('/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();

      if (!res.ok) {
        return { success: false, error: data.message || 'Login failed' };
      }

      if (data.token) {
        localStorage.setItem('token', data.token);
        setToken(data.token);
      }
      if(data.user) {
        setUser(data.user);
        localStorage.setItem('user', JSON.stringify(data.user));
      }

      return { 
        success: true, 
        profileSetupRequired: data.profileSetupRequired,
        isAdmin: data.isAdmin
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
      const res = await fetch('/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password, role: roleLower }),
      });
      const data = await res.json();

      if (!res.ok) {
        return { success: false, error: data.message || 'Registration failed' };
      }
      
      if (data.token) {
        localStorage.setItem('token', data.token);
        setToken(data.token);
      }
      if(data.user) {
        setUser(data.user);
        localStorage.setItem('user', JSON.stringify(data.user));
      }

      return { success: true, profileSetupRequired: data.profileSetupRequired };
    } catch (error) {
      return { success: false, error: 'An unexpected error occurred.' };
    }
  };

  const logout = async () => {
    try {
        await fetch('/logout', { method: 'POST' });
    } catch (error) {
        console.error("Failed to logout from server", error);
    } finally {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setToken(null);
        setUser(null);
    }
  };

  const updateProfile = (profileData: Partial<User>) => {
    if (user) {
      const updatedUser = { ...user, ...profileData, isProfileComplete: true };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      setUser(updatedUser);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
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
