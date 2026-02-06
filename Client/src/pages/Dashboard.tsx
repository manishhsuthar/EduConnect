import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import Sidebar from '@/components/dashboard/Sidebar';
import ChatArea from '@/components/dashboard/ChatArea';
import InfoPanel from '@/components/dashboard/InfoPanel';
import { Button } from '@/components/ui/button';
import { 
  Sheet, 
  SheetContent, 
  SheetTrigger 
} from '@/components/ui/sheet';
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
  Bell,
  PanelRightClose,
  PanelRight,
  Sun,
  Moon
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const Dashboard = () => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [channels, setChannels] = useState([]);
  const [directMessages, setDirectMessages] = useState([]);
  // State for current view
  const [currentChannelId, setCurrentChannelId] = useState<string | null>(null);
  const [currentDmId, setCurrentDmId] = useState<string | null>(null);
  const [showInfoPanel, setShowInfoPanel] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const fetchConversations = async () => {
      try {
        const [channelsRes, dmsRes] = await Promise.all([
          fetch('/api/conversations/rooms'),
          fetch('/api/conversations/dms')
        ]);
        const channelsData = await channelsRes.json();
        const dmsData = await dmsRes.json();
        setChannels(channelsData);
        setDirectMessages(dmsData);
        if (channelsData.length > 0) {
          setCurrentChannelId(channelsData[0]._id);
        }
      } catch (error) {
        console.error('Failed to fetch conversations', error);
        toast({
          title: 'Error',
          description: 'Failed to fetch conversations.',
          variant: 'destructive',
        });
      }
    };

    if (user) {
      fetchConversations();
    }
  }, [user, toast]);

  const currentChannel = channels.find(c => c._id === currentChannelId);
  const currentDm = directMessages.find(dm => dm._id === currentDmId);

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

  const handleNewDm = () => {
    toast({
      title: 'Coming Soon',
      description: 'New DM functionality will be available soon.',
    });
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
      <header className="h-14 border-b border-border flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-3">
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
                  onNewDm={handleNewDm}
                />
              </div>
            </SheetContent>
          </Sheet>

          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <MessageCircle className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-semibold hidden sm:block">EduConnect Hub</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={toggleTheme}>
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </Button>
          <Button variant="ghost" size="icon">
            <Bell className="w-4 h-4" />
          </Button>
          
          {/* Toggle Info Panel (Desktop) */}
          <Button 
            variant="ghost" 
            size="icon" 
            className="hidden lg:flex"
            onClick={() => setShowInfoPanel(!showInfoPanel)}
          >
            {showInfoPanel ? (
              <PanelRightClose className="w-4 h-4" />
            ) : (
              <PanelRight className="w-4 h-4" />
            )}
          </Button>

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
              <DropdownMenuItem>
                <User className="w-4 h-4 mr-2" />
                Profile
              </DropdownMenuItem>
              <DropdownMenuItem>
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
      <div className="flex-1 flex min-h-0">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:block w-64 border-r border-border shrink-0">
          <Sidebar
            channels={channels}
            directMessages={directMessages}
            currentChannelId={currentChannelId}
            currentDmId={currentDmId}
            onChannelSelect={handleChannelSelect}
            onDmSelect={handleDmSelect}
            onNewDm={handleNewDm}
          />
        </aside>

        {/* Chat Area */}
        <main className="flex-1 min-w-0">
          <ChatArea
            currentChannel={currentChannel || null}
            currentDm={currentDm || null}
            currentConversationId={currentChannelId || currentDmId}
          />
        </main>

        {/* Info Panel (Desktop) */}
        {showInfoPanel && (
          <aside className="hidden lg:block w-64 shrink-0">
            <InfoPanel />
          </aside>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
