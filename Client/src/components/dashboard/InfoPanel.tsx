import { Circle, Users, MessageSquare, TrendingUp } from 'lucide-react';
import { getOnlineUsers } from '@/lib/mockData';
import { ScrollArea } from '@/components/ui/scroll-area';

const InfoPanel = () => {
  const onlineUsers = getOnlineUsers();

  const stats = [
    { label: 'Total Users', value: '1,234', icon: Users },
    { label: 'Messages Today', value: '567', icon: MessageSquare },
    { label: 'Active Now', value: onlineUsers.length.toString(), icon: TrendingUp },
  ];

  return (
    <div className="h-full flex flex-col bg-card border-l border-border">
      {/* Stats */}
      <div className="p-4 border-b border-border">
        <h3 className="text-sm font-semibold mb-3">Statistics</h3>
        <div className="space-y-3">
          {stats.map((stat) => (
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
            {onlineUsers.map((user) => (
              <div
                key={user.id}
                className="flex items-center gap-2 p-2 rounded-lg hover:bg-accent/50 transition-colors cursor-pointer"
              >
                <div className="relative">
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-sm font-medium">
                    {user.name.charAt(0)}
                  </div>
                  <Circle className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 text-primary fill-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{user.name}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {user.role} • {user.department}
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
