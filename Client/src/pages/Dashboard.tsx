import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import Sidebar from '@/components/dashboard/Sidebar';
import ChatArea from '@/components/dashboard/ChatArea';
import InfoPanel from '@/components/dashboard/InfoPanel';
import NotificationBell from '@/components/dashboard/NotificationBell';
import SettingsDialog from '@/components/dashboard/SettingsDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { 
  Sheet, 
  SheetContent, 
  SheetTrigger 
} from '@/components/ui/sheet';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  Menu, 
  MessageCircle, 
  Settings, 
  LogOut, 
  User,
  PanelRightClose,
  PanelRight,
  Sun,
  Moon
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Channel, DirectMessage } from '@/lib/mockData';

interface AvailableDmUser {
  _id: string;
  username: string;
  profilePhoto?: string;
  role?: string;
  department?: string;
}

const Dashboard = () => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [channels, setChannels] = useState<Channel[]>([]);
  const [directMessages, setDirectMessages] = useState<DirectMessage[]>([]);
  const [rawChannels, setRawChannels] = useState<any[]>([]);
  const [rawDms, setRawDms] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  // State for current view
  const [currentChannelId, setCurrentChannelId] = useState<string | null>(null);
  const [currentDmId, setCurrentDmId] = useState<string | null>(null);
  const currentChannelIdRef = useRef<string | null>(null);
  const currentDmIdRef = useRef<string | null>(null);
  const [showInfoPanel, setShowInfoPanel] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [newChannelOpen, setNewChannelOpen] = useState(false);
  const [newChannelName, setNewChannelName] = useState('');
  const [isCreatingChannel, setIsCreatingChannel] = useState(false);
  const [isChannelUsersLoading, setIsChannelUsersLoading] = useState(false);
  const [channelUsers, setChannelUsers] = useState<AvailableDmUser[]>([]);
  const [channelUserSearch, setChannelUserSearch] = useState('');
  const [selectedChannelUserIds, setSelectedChannelUserIds] = useState<string[]>([]);
  const [newDmOpen, setNewDmOpen] = useState(false);
  const [isUsersLoading, setIsUsersLoading] = useState(false);
  const [availableUsers, setAvailableUsers] = useState<AvailableDmUser[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [dashboardSearch, setDashboardSearch] = useState('');
  const [searchDropdownOpen, setSearchDropdownOpen] = useState(false);
  const [creatingDmUserId, setCreatingDmUserId] = useState<string | null>(null);

  useEffect(() => {
    currentChannelIdRef.current = currentChannelId;
  }, [currentChannelId]);

  useEffect(() => {
    currentDmIdRef.current = currentDmId;
  }, [currentDmId]);

  const fetchConversations = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const [channelsRes, dmsRes, statsRes] = await Promise.all([
        fetch('/api/conversations/rooms'),
        fetch('/api/conversations/dms'),
        fetch('/api/dashboard/stats')
      ]);
      if (!channelsRes.ok || !dmsRes.ok) {
        throw new Error('Failed to load conversations');
      }
      const channelsData = await channelsRes.json();
      const dmsData = await dmsRes.json();
      let onlineIds = new Set<string>();
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        if (Array.isArray(statsData.onlineUsers)) {
          onlineIds = new Set(statsData.onlineUsers.map((u: any) => u._id));
        }
      }
      setRawChannels(channelsData);
      setRawDms(dmsData);

      const mapChannelIcon = (name: string): string => {
        const lower = name.toLowerCase();
        if (lower.includes('announcement')) return 'Megaphone';
        if (lower.includes('help')) return 'HelpCircle';
        if (lower.includes('computer') || lower.includes('code')) return 'Code';
        if (lower.includes('civil')) return 'Building2';
        if (lower.includes('electrical') || lower.includes('electronics')) return 'Zap';
        return 'Hash';
      };

      const mappedChannels: Channel[] = channelsData.map((c: any) => ({
        id: c._id,
        name: c.name,
        description: c.description || '',
        icon: mapChannelIcon(c.name),
        unreadCount: 0,
      }));

      const filteredChannels = mappedChannels;

      const mappedDms: DirectMessage[] = dmsData.map((dm: any) => {
        const recipient = dm.participants?.find((p: any) => p._id !== user?.id);
        return {
          id: dm._id,
          recipientId: recipient?._id || '',
          recipientName: recipient?.username || 'Unknown',
          recipientAvatar: recipient?.profilePhoto,
          lastMessage: '',
          timestamp: new Date(),
          unreadCount: 0,
          isOnline: recipient?._id ? onlineIds.has(recipient._id) : false,
        };
      });

      setChannels(filteredChannels);
      setDirectMessages(mappedDms);

      const selectedDmId = currentDmIdRef.current;
      const selectedChannelId = currentChannelIdRef.current;
      const hasCurrentDm = selectedDmId && mappedDms.some((dm) => dm.id === selectedDmId);
      const hasCurrentChannel = selectedChannelId && filteredChannels.some((channel) => channel.id === selectedChannelId);

      if (hasCurrentDm) {
        setCurrentChannelId(null);
      } else if (hasCurrentChannel) {
        setCurrentDmId(null);
      } else if (filteredChannels.length > 0) {
        setCurrentChannelId(filteredChannels[0].id);
        setCurrentDmId(null);
      } else {
        setCurrentChannelId(null);
        setCurrentDmId(mappedDms[0]?.id || null);
      }
    } catch (error) {
      console.error('Failed to fetch conversations', error);
      setLoadError('Failed to load conversations. Please try again.');
      toast({
        title: 'Error',
        description: 'Failed to fetch conversations.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast, user?.id]);

  useEffect(() => {
    if (user) {
      fetchConversations();
    }
  }, [user, fetchConversations]);

  const currentChannel = rawChannels.find(c => c._id === currentChannelId) || null;
  const currentDm = rawDms.find(dm => dm._id === currentDmId) || null;
  const normalizedDashboardSearch = dashboardSearch.trim().toLowerCase();
  const filteredSearchChannels = useMemo(() => {
    if (!normalizedDashboardSearch) return channels;
    return channels.filter((channel) => {
      const searchText = `${channel.name} ${channel.description || ''}`.toLowerCase();
      return searchText.includes(normalizedDashboardSearch);
    });
  }, [channels, normalizedDashboardSearch]);
  const filteredSearchDms = useMemo(() => {
    if (!normalizedDashboardSearch) return directMessages;
    return directMessages.filter((dm) => dm.recipientName.toLowerCase().includes(normalizedDashboardSearch));
  }, [directMessages, normalizedDashboardSearch]);
  const filteredAvailableUsers = availableUsers.filter((candidate) => {
    const search = userSearch.trim().toLowerCase();
    if (!search) return true;
    const text = `${candidate.username} ${candidate.department || ''} ${candidate.role || ''}`.toLowerCase();
    return text.includes(search);
  });
  const filteredChannelUsers = channelUsers.filter((candidate) => {
    const search = channelUserSearch.trim().toLowerCase();
    if (!search) return true;
    const text = `${candidate.username} ${candidate.department || ''} ${candidate.role || ''}`.toLowerCase();
    return text.includes(search);
  });

  const handleChannelSelect = (channelId: string) => {
    setCurrentChannelId(channelId);
    setCurrentDmId(null);
    setMobileMenuOpen(false);
  };

  const handleDmSelect = (dmId: string) => {
    setCurrentDmId(dmId);
    setCurrentChannelId(null);
    setMobileMenuOpen(false);
  };
  
  const handleSearchChannelSelect = (channelId: string) => {
    handleChannelSelect(channelId);
    setSearchDropdownOpen(false);
  };

  const handleSearchDmSelect = (dmId: string) => {
    handleDmSelect(dmId);
    setSearchDropdownOpen(false);
  };

  const handleNewDm = () => {
    setNewDmOpen(true);
  };

  const handleNewChannel = () => {
    setNewChannelOpen(true);
  };

  const fetchAvailableUsers = useCallback(async () => {
    setIsUsersLoading(true);
    try {
      const response = await fetch('/api/conversations/users');
      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }
      const usersData = await response.json();
      setAvailableUsers(Array.isArray(usersData) ? usersData : []);
    } catch (error) {
      console.error('Failed to fetch DM users', error);
      toast({
        title: 'Error',
        description: 'Unable to load users for direct messages.',
        variant: 'destructive',
      });
    } finally {
      setIsUsersLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (newDmOpen) {
      fetchAvailableUsers();
    } else {
      setUserSearch('');
    }
  }, [newDmOpen, fetchAvailableUsers]);

  const fetchChannelUsers = useCallback(async () => {
    setIsChannelUsersLoading(true);
    try {
      const response = await fetch('/api/conversations/users');
      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }
      const usersData = await response.json();
      const sanitizedUsers = Array.isArray(usersData)
        ? usersData.filter((candidate: AvailableDmUser) => candidate._id !== user?.id && candidate.role !== 'admin')
        : [];
      setChannelUsers(sanitizedUsers);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Unable to load users for channel members.',
        variant: 'destructive',
      });
    } finally {
      setIsChannelUsersLoading(false);
    }
  }, [toast, user?.id]);

  useEffect(() => {
    if (newChannelOpen) {
      fetchChannelUsers();
    } else {
      setNewChannelName('');
      setChannelUserSearch('');
      setSelectedChannelUserIds([]);
    }
  }, [newChannelOpen, fetchChannelUsers]);

  const toggleChannelUser = (userId: string) => {
    setSelectedChannelUserIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const handleCreateDm = async (receiverId: string) => {
    setCreatingDmUserId(receiverId);
    try {
      const response = await fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ receiverId }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.message || 'Failed to create direct message');
      }

      await fetchConversations();
      setCurrentDmId(data._id);
      setCurrentChannelId(null);
      setNewDmOpen(false);
      setMobileMenuOpen(false);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error?.message || 'Failed to open direct message.',
        variant: 'destructive',
      });
    } finally {
      setCreatingDmUserId(null);
    }
  };

  const handleCreateChannel = async (event: React.FormEvent) => {
    event.preventDefault();
    const name = newChannelName.trim();

    if (!name) {
      toast({
        title: 'Error',
        description: 'Channel name is required.',
        variant: 'destructive',
      });
      return;
    }

    if (selectedChannelUserIds.length === 0) {
      toast({
        title: 'Error',
        description: 'Select at least one user for this channel.',
        variant: 'destructive',
      });
      return;
    }

    setIsCreatingChannel(true);
    try {
      const response = await fetch('/api/conversations/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, participantIds: selectedChannelUserIds }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.message || 'Failed to create channel');
      }

      await fetchConversations();
      setCurrentChannelId(data._id);
      setCurrentDmId(null);
      setNewChannelOpen(false);
      setMobileMenuOpen(false);

      toast({
        title: 'Channel created',
        description: `${name} is now available.`,
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error?.message || 'Unable to create channel.',
        variant: 'destructive',
      });
    } finally {
      setIsCreatingChannel(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
    toast({
      title: 'Logged Out',
      description: 'You have been signed out successfully.',
    });
  };

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Top Header */}
      <header className="h-14 border-b border-border flex items-center shrink-0">
        <div className="flex items-center gap-3 px-4 lg:w-64 lg:border-r lg:border-border lg:h-full">
          {/* Mobile Menu Trigger */}
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild className="lg:hidden">
              <Button variant="ghost" size="icon">
                <Menu className="w-5 h-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-0">
              <div className="h-full">
                <div className="p-4 border-b border-border flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                    <MessageCircle className="w-5 h-5 text-primary-foreground" />
                  </div>
                  <span className="font-semibold">EduConnect Hub</span>
                </div>
                <Sidebar
                  channels={channels}
                  directMessages={directMessages}
                  currentChannelId={currentChannelId}
                  currentDmId={currentDmId}
                  onChannelSelect={handleChannelSelect}
                  onDmSelect={handleDmSelect}
                  onNewChannel={handleNewChannel}
                  onNewDm={handleNewDm}
                />
              </div>
            </SheetContent>
          </Sheet>

          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="w-15 h-11 rounded-lg bg-black flex items-center justify-center">
              <img src="./public/icon.png" alt="Logo" className="w-10 h-10 text-primary-" />
              <span className="font-semibold hidden sm:block text-white">duConnect</span>
            </div>
          </div>
        </div>

        <div className="hidden lg:flex flex-1 justify-center px-6">
          <Popover open={searchDropdownOpen} onOpenChange={setSearchDropdownOpen}>
            <PopoverTrigger asChild>
              <div className="w-full max-w-lg">
                <Input
                  placeholder="Search chat or user"
                  value={dashboardSearch}
                  onFocus={() => setSearchDropdownOpen(true)}
                  onClick={() => setSearchDropdownOpen(true)}
                  onChange={(event) => {
                    setDashboardSearch(event.target.value);
                    setSearchDropdownOpen(true);
                  }}
                  className="h-9 bg-muted/70 border-border/70"
                />
              </div>
            </PopoverTrigger>
            <PopoverContent align="center" sideOffset={8} className="w-[--radix-popover-trigger-width] p-2">
              {normalizedDashboardSearch ? (
                filteredSearchChannels.length === 0 && filteredSearchDms.length === 0 ? (
                  <p className="px-2 py-3 text-xs text-muted-foreground">No results found.</p>
                ) : (
                  <div className="max-h-72 overflow-y-auto">
                    {filteredSearchChannels.length > 0 && (
                      <div className="mb-2">
                        <p className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                          Chats
                        </p>
                        <div className="space-y-1">
                          {filteredSearchChannels.map((channel) => (
                            <button
                              key={channel.id}
                              onClick={() => handleSearchChannelSelect(channel.id)}
                              className="w-full rounded-md px-2 py-2 text-left text-sm hover:bg-accent transition-colors"
                            >
                              {channel.name}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {filteredSearchDms.length > 0 && (
                      <div>
                        <p className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                          Users
                        </p>
                        <div className="space-y-1">
                          {filteredSearchDms.map((dm) => (
                            <button
                              key={dm.id}
                              onClick={() => handleSearchDmSelect(dm.id)}
                              className="w-full rounded-md px-2 py-2 text-left text-sm hover:bg-accent transition-colors"
                            >
                              {dm.recipientName}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )
              ) : (
                <p className="px-2 py-3 text-xs text-muted-foreground">Type to search chats or users.</p>
              )}
            </PopoverContent>
          </Popover>
        </div>

        <div className="ml-auto flex items-center gap-1 px-2 lg:px-4">
          <Button variant="ghost" size="icon" onClick={toggleTheme}>
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </Button>
          <NotificationBell />

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="gap-2 px-2">
                <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-sm font-medium">
                  {user?.username?.charAt(0) || 'U'}
                </div>
                <span className="hidden sm:block text-sm">{user?.username}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => navigate('/profile')}>
                <User className="w-4 h-4 mr-2" />
                Profile
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSettingsOpen(true)}>
                <Settings className="w-4 h-4 mr-2" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="text-destructive">
                <LogOut className="w-4 h-4 mr-2" />
                Log Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Main Content */}
      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
      <Dialog open={newChannelOpen} onOpenChange={setNewChannelOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create Channel</DialogTitle>
            <DialogDescription>Enter channel name and choose users who can send messages in this room.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateChannel} className="space-y-3">
            <Input
              placeholder="Channel name (e.g., Hackathon 2026)"
              value={newChannelName}
              onChange={(event) => setNewChannelName(event.target.value)}
              maxLength={60}
            />
            <Input
              placeholder="Search users..."
              value={channelUserSearch}
              onChange={(event) => setChannelUserSearch(event.target.value)}
            />
            <div className="max-h-56 overflow-y-auto space-y-2 pr-1 border rounded-md p-2">
              {isChannelUsersLoading ? (
                <p className="text-sm text-muted-foreground py-3 text-center">Loading users...</p>
              ) : filteredChannelUsers.length === 0 ? (
                <p className="text-sm text-muted-foreground py-3 text-center">No users found.</p>
              ) : (
                filteredChannelUsers.map((candidate) => {
                  const selected = selectedChannelUserIds.includes(candidate._id);
                  return (
                    <button
                      key={candidate._id}
                      type="button"
                      onClick={() => toggleChannelUser(candidate._id)}
                      className={`w-full text-left px-3 py-2 rounded-lg border transition-colors ${selected ? 'border-primary bg-primary/10' : 'border-border hover:bg-accent'}`}
                    >
                      <p className="text-sm font-medium truncate">{candidate.username}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {[candidate.role, candidate.department].filter(Boolean).join(' • ') || 'User'}
                      </p>
                    </button>
                  );
                })
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Selected users: {selectedChannelUserIds.length}
            </p>
            <div className="flex justify-end">
              <Button type="submit" disabled={isCreatingChannel || !newChannelName.trim() || selectedChannelUserIds.length === 0}>
                {isCreatingChannel ? 'Creating...' : 'Create Channel'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
      <Dialog open={newDmOpen} onOpenChange={setNewDmOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>New Direct Message</DialogTitle>
            <DialogDescription>Select an existing user to start chatting.</DialogDescription>
          </DialogHeader>
          <Input
            placeholder="Search users..."
            value={userSearch}
            onChange={(event) => setUserSearch(event.target.value)}
          />
          <div className="max-h-80 overflow-y-auto space-y-2 pr-1">
            {isUsersLoading ? (
              <p className="text-sm text-muted-foreground py-4 text-center">Loading users...</p>
            ) : filteredAvailableUsers.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No users found.</p>
            ) : (
              filteredAvailableUsers.map((candidate) => (
                <button
                  key={candidate._id}
                  onClick={() => handleCreateDm(candidate._id)}
                  disabled={creatingDmUserId === candidate._id}
                  className="w-full text-left px-3 py-2 rounded-lg border border-border hover:bg-accent transition-colors disabled:opacity-60"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{candidate.username}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {[candidate.role, candidate.department].filter(Boolean).join(' • ') || 'User'}
                      </p>
                    </div>
                    {creatingDmUserId === candidate._id && (
                      <span className="text-xs text-muted-foreground">Opening...</span>
                    )}
                  </div>
                </button>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
      <div className="flex-1 flex min-h-0">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:block w-64 border-r border-border shrink-0">
          {isLoading ? (
            <div className="p-4 text-sm text-muted-foreground">Loading channels...</div>
          ) : loadError ? (
            <div className="p-4 text-sm text-muted-foreground">{loadError}</div>
          ) : (
            <Sidebar
              channels={channels}
              directMessages={directMessages}
              currentChannelId={currentChannelId}
              currentDmId={currentDmId}
              onChannelSelect={handleChannelSelect}
              onDmSelect={handleDmSelect}
              onNewChannel={handleNewChannel}
              onNewDm={handleNewDm}
            />
          )}
        </aside>

        {/* Chat Area */}
        <main className="flex-1 min-w-0">
          {isLoading ? (
            <div className="h-full flex items-center justify-center text-muted-foreground">
              Loading messages...
            </div>
          ) : loadError ? (
            <div className="h-full flex items-center justify-center text-muted-foreground">
              {loadError}
              <Button variant="outline" className="ml-3" onClick={fetchConversations}>
                Retry
              </Button>
            </div>
          ) : (
            <ChatArea
              currentChannel={currentChannel || null}
              currentDm={currentDm || null}
              currentConversationId={currentChannelId || currentDmId}
            />
          )}
        </main>

        {/* Info Panel (Desktop) */}
        <div className={`relative hidden lg:block shrink-0 border-l border-border ${showInfoPanel ? 'w-64' : 'w-0'}`}>
          <Button
            variant="ghost"
            size="icon"
            className="absolute -left-3 top-8 z-10 h-6 w-6 rounded-full border border-border bg-background"
            onClick={() => setShowInfoPanel(!showInfoPanel)}
          >
            {showInfoPanel ? (
              <PanelRightClose className="w-3.5 h-3.5" />
            ) : (
              <PanelRight className="w-3.5 h-3.5" />
            )}
          </Button>
          {showInfoPanel && <InfoPanel />}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
