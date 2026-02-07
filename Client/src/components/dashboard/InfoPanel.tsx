import { Circle, Users, MessageSquare, TrendingUp } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useEffect, useState } from 'react';
import { useToast } from '@/hooks/use-toast';

interface OnlineUser {
  _id: string;
  username: string;
  role: string;
  department?: string;
}

const InfoPanel = () => {
  const { toast } = useToast();
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [stats, setStats] = useState({
    totalUsers: 0,
    messagesToday: 0,
    activeNow: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      setIsLoading(true);
      try {
        const res = await fetch('/api/dashboard/stats');
        if (!res.ok) throw new Error('Failed to load stats');
        const data = await res.json();
        setStats({
          totalUsers: data.totalUsers || 0,
          messagesToday: data.messagesToday || 0,
          activeNow: data.activeNow || 0,
        });
        setOnlineUsers(data.onlineUsers || []);
      } catch (error) {
        toast({
          title: 'Error',
          description: 'Failed to load dashboard stats.',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
    const interval = setInterval(fetchStats, 15000);
    return () => clearInterval(interval);
  }, [toast]);

  const statCards = [
    { label: 'Total Users', value: stats.totalUsers.toString(), icon: Users },
    { label: 'Messages Today', value: stats.messagesToday.toString(), icon: MessageSquare },
    { label: 'Active Now', value: stats.activeNow.toString(), icon: TrendingUp },
  ];

  return (
    <div className="h-full flex flex-col bg-card border-l border-border">
      {/* Stats */}
      <div className="p-4 border-b border-border">
        <h3 className="text-sm font-semibold mb-3">Statistics</h3>
        <div className="space-y-3">
          {statCards.map((stat) => (
            <div key={stat.label} className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <stat.icon className="w-4 h-4" />
                <span>{stat.label}</span>
              </div>
              <span className="text-sm font-medium">{stat.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Online Users */}
      <div className="flex-1 flex flex-col">
        <div className="p-4 pb-2">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Circle className="w-2 h-2 fill-primary text-primary" />
            Online — {onlineUsers.length}
          </h3>
        </div>
        <ScrollArea className="flex-1">
          <div className="px-4 pb-4 space-y-2">
            {isLoading ? (
              <div className="text-xs text-muted-foreground">Loading...</div>
            ) : onlineUsers.length === 0 ? (
              <div className="text-xs text-muted-foreground">No users online</div>
            ) : onlineUsers.map((user) => (
              <div
                key={user._id}
                className="flex items-center gap-2 p-2 rounded-lg hover:bg-accent/50 transition-colors cursor-pointer"
              >
                <div className="relative">
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-sm font-medium">
                    {user.username.charAt(0)}
                  </div>
                  <Circle className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 text-primary fill-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{user.username}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {user.role} • {user.department || '—'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
};

export default InfoPanel;
