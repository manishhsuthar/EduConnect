import { Hash, Code, Building2, Zap, Megaphone, HelpCircle, Plus, Circle } from 'lucide-react';
import { Channel, DirectMessage } from '@/lib/mockData';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

interface SidebarProps {
  channels: Channel[];
  directMessages: DirectMessage[];
  currentChannelId: string;
  currentDmId: string | null;
  onChannelSelect: (channelId: string) => void;
  onDmSelect: (dmId: string) => void;
  onNewChannel: () => void;
  onNewDm: () => void;
}

const iconMap: Record<string, React.ElementType> = {
  Hash,
  Code,
  Building2,
  Zap,
  Megaphone,
  HelpCircle,
};

const Sidebar = ({
  channels,
  directMessages,
  currentChannelId,
  currentDmId,
  onChannelSelect,
  onDmSelect,
  onNewChannel,
  onNewDm,
}: SidebarProps) => {
  return (
    <div className="h-full flex flex-col bg-sidebar">
      {/* Channels Section */}
      <div className="p-4 border-b border-sidebar-border">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Channels
          </h3>
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5"
            onClick={onNewChannel}
          >
            <Plus className="w-3 h-3" />
          </Button>
        </div>
      </div>
      
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {channels.map((channel) => {
            const Icon = iconMap[channel.icon] || Hash;
            const isActive = currentChannelId === channel.id && !currentDmId;
            
            return (
              <button
                key={channel.id}
                onClick={() => onChannelSelect(channel.id)}
                className={cn(
                  'w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors',
                  isActive
                    ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                    : 'text-sidebar-foreground hover:bg-sidebar-accent/50'
                )}
              >
                <Icon className="w-4 h-4 text-muted-foreground" />
                <span className="flex-1 text-left truncate">{channel.name}</span>
                {channel.unreadCount > 0 && (
                  <span className="bg-primary text-primary-foreground text-xs px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
                    {channel.unreadCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Direct Messages Section */}
        <div className="p-4 pt-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Direct Messages
            </h3>
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5"
              onClick={onNewDm}
            >
              <Plus className="w-3 h-3" />
            </Button>
          </div>
        </div>
        
        <div className="px-2 space-y-1">
          {directMessages.map((dm) => {
            const isActive = currentDmId === dm.id;
            
            return (
              <button
                key={dm.id}
                onClick={() => onDmSelect(dm.id)}
                className={cn(
                  'w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors',
                  isActive
                    ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                    : 'text-sidebar-foreground hover:bg-sidebar-accent/50'
                )}
              >
                <div className="relative">
                  <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-medium">
                    {dm.recipientName.charAt(0)}
                  </div>
                <Circle
                    className={cn(
                      'absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5',
                      dm.isOnline ? 'text-primary fill-primary' : 'text-muted-foreground fill-muted-foreground'
                    )}
                  />
                </div>
                <div className="flex-1 text-left min-w-0">
                  <p className="truncate">{dm.recipientName}</p>
                </div>
                {dm.unreadCount > 0 && (
                  <span className="bg-primary text-primary-foreground text-xs px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
                    {dm.unreadCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
};

export default Sidebar;
