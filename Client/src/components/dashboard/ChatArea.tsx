import { useState, useEffect, useRef } from 'react';
import io, { Socket } from 'socket.io-client';
import { Send, Hash, Smile, Paperclip } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

interface Message {
    _id: string;
    conversationId: string;
    sender: {
        _id: string;
        username: string;
        profilePhoto: string;
    };
    text: string;
    createdAt: string;
    attachment?: {
        url: string;
        filename: string;
        mimetype: string;
        size: number;
    };
}

interface ChatAreaProps {
  currentChannel: { _id: string, name: string, description: string } | null;
  currentDm: { _id:string, participants: any[] } | null;
  currentConversationId: string | null;
}

const ChatArea = ({ currentChannel, currentDm, currentConversationId }: ChatAreaProps) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!currentConversationId) return;

    // Connect to the server and authenticate
    const socketUrl =
      (import.meta as any).env?.VITE_SOCKET_URL || window.location.origin;
    socketRef.current = io(socketUrl);
    const socket = socketRef.current;

    socket.on('connect', () => {
        console.log('Socket connected');
        socket.emit('join-room', currentConversationId);
    });

    socket.on('room-messages', (data: { room: string, messages: Message[] }) => {
        if (String(data.room) === String(currentConversationId)) {
            setMessages(data.messages);
        }
    });

    socket.on('message', (message: Message) => {
        if (String(message.conversationId) === String(currentConversationId)) {
            setMessages(prev => [...prev, message]);
        }
    });

    socket.on('error', (error) => {
        console.error('Socket error:', error);
    });

    return () => {
        socket.emit('leave-room', currentConversationId);
        socket.disconnect();
    };
}, [currentConversationId]);


  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if ((!newMessage.trim()) || !user || !socketRef.current || !currentConversationId) return;

    socketRef.current.emit('message', {
        conversationId: currentConversationId,
        message: newMessage.trim()
    });

    setNewMessage('');
  };

  const handleFileClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentConversationId || !socketRef.current) return;

    const isImageOrVideo = file.type.startsWith('image/') || file.type.startsWith('video/');
    if (!isImageOrVideo) {
      toast({
        title: 'Invalid file type',
        description: 'Only image or video files are allowed.',
        variant: 'destructive',
      });
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: 'File too large',
        description: 'Max file size is 5MB.',
        variant: 'destructive',
      });
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/conversations/upload', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        throw new Error('Upload failed');
      }

      const data = await res.json();
      socketRef.current.emit('message', {
        conversationId: currentConversationId,
        message: newMessage.trim() || '',
        attachment: data,
      });

      setNewMessage('');
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: 'Upload failed',
        description: 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(e);
    }
  };

  const getDmRecipient = () => {
    if (!currentDm || !user) return null;
    return currentDm.participants.find(p => p._id !== user.id);
  }

  const title = currentDm ? getDmRecipient()?.username : currentChannel?.name;
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
              const showAvatar = index === 0 || messages[index - 1].sender._id !== message.sender._id;
              const isOwn = message.sender._id === user?.id;
              
              return (
                <div
                  key={message._id}
                  className={`flex gap-3 ${showAvatar ? 'mt-4' : 'mt-1'} animate-fade-in`}
                >
                  {showAvatar ? (
                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-sm font-medium shrink-0">
                      {message.sender.username.charAt(0)}
                    </div>
                  ) : (
                    <div className="w-8" />
                  )}
                  <div className="flex-1 min-w-0">
                    {showAvatar && (
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className={`font-medium text-sm ${isOwn ? 'text-primary' : ''}`}>
                          {message.sender.username}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(message.createdAt), 'h:mm a')}
                        </span>
                      </div>
                    )}
                    {message.text && (
                      <p className="text-sm text-foreground break-words">{message.text}</p>
                    )}
                    {message.attachment?.url && (
                      <div className="mt-2">
                        <a
                          href={message.attachment.url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-sm text-primary underline break-all"
                        >
                          {message.attachment.filename || 'Download file'}
                        </a>
                      </div>
                    )}
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
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="shrink-0"
            onClick={handleFileClick}
            disabled={uploading}
          >
            <Paperclip className="w-4 h-4" />
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept="image/*,video/*"
            onChange={handleFileChange}
          />
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
        {uploading && (
          <div className="mt-2 text-xs text-muted-foreground">Uploading...</div>
        )}
      </div>
    </div>
  );
};

export default ChatArea;
