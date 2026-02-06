import { useState, useEffect, useRef } from 'react';
import { Send, Hash, Smile, Paperclip } from 'lucide-react';
import { Message, getMessagesByChannel, Channel, DirectMessage } from '@/lib/mockData';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';

interface ChatAreaProps {
  currentChannel: Channel | null;
  currentDm: DirectMessage | null;
  currentChannelId: string;
}

const ChatArea = ({ currentChannel, currentDm, currentChannelId }: ChatAreaProps) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // CRITICAL: Refresh messages when channel changes
  useEffect(() => {
    if (currentDm) {
      // For DMs, show empty or mock DM messages
      setMessages([]);
    } else {
      const channelMessages = getMessagesByChannel(currentChannelId);
      setMessages(channelMessages);
    }
  }, [currentChannelId, currentDm]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user) return;

    const message: Message = {
      id: `msg-${Date.now()}`,
      channelId: currentChannelId,
      senderId: user.id,
      senderName: user.name,
      content: newMessage.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, message]);
    setNewMessage('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(e);
    }
  };

  const title = currentDm ? currentDm.recipientName : currentChannel?.name || 'General';
  const description = currentDm ? 'Direct Message' : currentChannel?.description;

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border flex items-center gap-3">
        {!currentDm && <Hash className="w-5 h-5 text-muted-foreground" />}
        <div>
          <h2 className="font-semibold">{title}</h2>
          {description && (
            <p className="text-xs text-muted-foreground">{description}</p>
          )}
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {messages.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4">
                <Hash className="w-8 h-8 text-primary" />
              </div>
              <h3 className="font-semibold mb-1">Welcome to #{title}</h3>
              <p className="text-sm text-muted-foreground">
                This is the start of the conversation. Say hello!
              </p>
            </div>
          ) : (
            messages.map((message, index) => {
              const showAvatar = index === 0 || messages[index - 1].senderId !== message.senderId;
              const isOwn = message.senderId === user?.id;
              
              return (
                <div
                  key={message.id}
                  className={`flex gap-3 ${showAvatar ? 'mt-4' : 'mt-1'} animate-fade-in`}
                >
                  {showAvatar ? (
                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-sm font-medium shrink-0">
                      {message.senderName.charAt(0)}
                    </div>
                  ) : (
                    <div className="w-8" />
                  )}
                  <div className="flex-1 min-w-0">
                    {showAvatar && (
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className={`font-medium text-sm ${isOwn ? 'text-primary' : ''}`}>
                          {message.senderName}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(message.timestamp), 'h:mm a')}
                        </span>
                      </div>
                    )}
                    <p className="text-sm text-foreground break-words">{message.content}</p>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="p-4 border-t border-border">
        <form onSubmit={handleSendMessage} className="flex items-center gap-2">
          <Button type="button" variant="ghost" size="icon" className="shrink-0">
            <Paperclip className="w-4 h-4" />
          </Button>
          <div className="flex-1 relative">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={`Message #${title}`}
              className="pr-10"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
            >
              <Smile className="w-4 h-4" />
            </Button>
          </div>
          <Button type="submit" size="icon" className="shrink-0" disabled={!newMessage.trim()}>
            <Send className="w-4 h-4" />
          </Button>
        </form>
      </div>
    </div>
  );
};

export default ChatArea;
