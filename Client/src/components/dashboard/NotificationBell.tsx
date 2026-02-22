import { useCallback, useEffect, useMemo, useState } from 'react';
import { Bell, CheckCheck, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

type NotificationItem = {
  _id: string;
  title: string;
  body: string;
  type: 'general' | 'approval' | 'message' | 'system';
  isRead: boolean;
  createdAt: string;
  link?: string;
};

const NotificationBell = () => {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const loadNotifications = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/notifications');
      if (!res.ok) {
        throw new Error('Failed to fetch notifications');
      }
      const data = await res.json();
      setItems(Array.isArray(data.notifications) ? data.notifications : []);
      setUnreadCount(typeof data.unreadCount === 'number' ? data.unreadCount : 0);
    } catch (error) {
      console.error(error);
      setItems([]);
      setUnreadCount(0);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  const onOpenChange = (open: boolean) => {
    if (open) {
      loadNotifications();
    }
  };

  const markOneAsRead = async (id: string) => {
    try {
      const res = await fetch(`/api/notifications/${id}/read`, { method: 'PATCH' });
      if (!res.ok) {
        return;
      }
      setItems((prev) => prev.map((n) => (n._id === id ? { ...n, isRead: true } : n)));
      setUnreadCount((prev) => Math.max(prev - 1, 0));
    } catch (error) {
      console.error(error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const res = await fetch('/api/notifications/read-all', { method: 'PATCH' });
      if (!res.ok) {
        return;
      }
      setItems((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error(error);
    }
  };

  const unread = useMemo(() => unreadCount > 0, [unreadCount]);

  return (
    <DropdownMenu onOpenChange={onOpenChange}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="w-4 h-4" />
          {unread && (
            <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] leading-5 font-semibold text-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0">
        <div className="px-3 py-2 flex items-center justify-between">
          <DropdownMenuLabel className="p-0">Notifications</DropdownMenuLabel>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2"
            onClick={markAllAsRead}
            disabled={!unread}
          >
            <CheckCheck className="w-4 h-4 mr-1" />
            Mark all
          </Button>
        </div>
        <DropdownMenuSeparator />

        {isLoading ? (
          <div className="p-6 flex items-center justify-center text-muted-foreground text-sm">
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
            Loading...
          </div>
        ) : items.length === 0 ? (
          <div className="p-6 text-sm text-muted-foreground text-center">No notifications yet.</div>
        ) : (
          <div className="max-h-96 overflow-y-auto">
            {items.map((n) => (
              <DropdownMenuItem
                key={n._id}
                onSelect={() => {
                  if (!n.isRead) {
                    markOneAsRead(n._id);
                  }
                }}
                className="items-start gap-2 py-2"
              >
                <span
                  className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${n.isRead ? 'bg-muted' : 'bg-primary'}`}
                />
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{n.title}</p>
                  {n.body ? (
                    <p className="text-xs text-muted-foreground line-clamp-2">{n.body}</p>
                  ) : null}
                  <p className="text-[11px] text-muted-foreground mt-1">
                    {new Date(n.createdAt).toLocaleString()}
                  </p>
                </div>
              </DropdownMenuItem>
            ))}
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default NotificationBell;
