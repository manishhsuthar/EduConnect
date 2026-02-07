import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  MessageCircle, 
  Shield, 
  Users, 
  UserCheck, 
  MessageSquare,
  Trash2,
  Check,
  LogOut
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';

interface AdminUser {
  _id: string;
  username: string;
  email: string;
  role: 'student' | 'faculty' | 'admin';
  department?: string;
  subjectsTaught?: string[];
  isApproved?: boolean;
  createdAt?: string;
}

interface AdminMessage {
  _id: string;
  text: string;
  createdAt: string;
  sender?: { username?: string };
  conversationId?: { name?: string; type?: string };
}

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { logout } = useAuth();
  
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [unapprovedFaculty, setUnapprovedFaculty] = useState<AdminUser[]>([]);
  const [messages, setMessages] = useState<AdminMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchAdminData = async () => {
      setIsLoading(true);
      try {
        const [usersRes, pendingRes, messagesRes] = await Promise.all([
          fetch('/api/admin/users'),
          fetch('/api/admin/faculty/pending'),
          fetch('/api/admin/messages'),
        ]);

        if (!usersRes.ok || !pendingRes.ok || !messagesRes.ok) {
          throw new Error('Failed to load admin data');
        }

        const [usersData, pendingData, messagesData] = await Promise.all([
          usersRes.json(),
          pendingRes.json(),
          messagesRes.json(),
        ]);

        setUsers(usersData);
        setUnapprovedFaculty(pendingData);
        setMessages(messagesData);
      } catch (error) {
        console.error(error);
        toast({
          title: 'Error',
          description: 'Failed to load admin data.',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchAdminData();
  }, [toast]);

  const handleApproveFaculty = async (facultyId: string) => {
    try {
      const res = await fetch(`/api/admin/faculty/${facultyId}/approve`, {
        method: 'POST',
      });
      if (!res.ok) throw new Error('Approve failed');
      const updated = await res.json();
      setUnapprovedFaculty(prev => prev.filter(f => f._id !== facultyId));
      setUsers(prev => prev.map(u => (u._id === updated._id ? updated : u)));
      toast({
        title: 'Faculty Approved',
        description: `${updated.username} has been approved.`,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to approve faculty.',
        variant: 'destructive',
      });
    }
  };

  const handleRejectFaculty = async (facultyId: string) => {
    try {
      const res = await fetch(`/api/admin/users/${facultyId}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Reject failed');
      setUnapprovedFaculty(prev => prev.filter(f => f._id !== facultyId));
      setUsers(prev => prev.filter(u => u._id !== facultyId));
      toast({
        title: 'Faculty Rejected',
        description: 'Faculty has been rejected.',
        variant: 'destructive',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to reject faculty.',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteUser = async (userId: string) => {
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Delete failed');
      setUsers(prev => prev.filter(u => u._id !== userId));
      toast({
        title: 'User Deleted',
        description: 'User has been removed.',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete user.',
        variant: 'destructive',
      });
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/admin-login');
    toast({
      title: 'Logged Out',
      description: 'You have been signed out from admin dashboard.',
    });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="h-14 border-b border-border flex items-center justify-between px-6">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <MessageCircle className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="font-semibold">EduConnect Hub</span>
          <span className="px-2 py-0.5 rounded bg-primary/20 text-primary text-xs font-medium">
            Admin
          </span>
        </div>
        <Button variant="ghost" size="sm" onClick={handleLogout}>
          <LogOut className="w-4 h-4 mr-2" />
          Logout
        </Button>
      </header>

      {/* Content */}
      <main className="container mx-auto py-8 px-4">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
            <Shield className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Admin Dashboard</h1>
            <p className="text-muted-foreground text-sm">Manage users and content</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {[
            { label: 'Total Users', value: users.length, icon: Users },
            { label: 'Pending Approvals', value: unapprovedFaculty.length, icon: UserCheck },
            { label: 'Total Messages', value: messages.length, icon: MessageSquare },
          ].map((stat) => (
            <div key={stat.label} className="glass rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                  <stat.icon className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stat.value}</p>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <Tabs defaultValue="approvals" className="space-y-4">
          <TabsList>
            <TabsTrigger value="approvals" className="gap-2">
              <UserCheck className="w-4 h-4" />
              Pending Approvals
              {unapprovedFaculty.length > 0 && (
                <span className="bg-primary text-primary-foreground text-xs px-1.5 py-0.5 rounded-full">
                  {unapprovedFaculty.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="users" className="gap-2">
              <Users className="w-4 h-4" />
              All Users
            </TabsTrigger>
            <TabsTrigger value="messages" className="gap-2">
              <MessageSquare className="w-4 h-4" />
              Messages
            </TabsTrigger>
          </TabsList>

          {/* Pending Approvals */}
          <TabsContent value="approvals" className="glass rounded-xl p-4">
            {isLoading ? (
              <div className="text-center py-12 text-muted-foreground">Loading...</div>
            ) : unapprovedFaculty.length === 0 ? (
              <div className="text-center py-12">
                <UserCheck className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No pending approvals</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Subjects</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {unapprovedFaculty.map((faculty) => (
                    <TableRow key={faculty._id}>
                      <TableCell className="font-medium">{faculty.username}</TableCell>
                      <TableCell>{faculty.email}</TableCell>
                      <TableCell>{faculty.department || '—'}</TableCell>
                      <TableCell>{faculty.subjectsTaught?.join(', ') || '—'}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-green-500 hover:text-green-600"
                            onClick={() => handleApproveFaculty(faculty._id)}
                          >
                            <Check className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-destructive hover:text-destructive"
                            onClick={() => handleRejectFaculty(faculty._id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </TabsContent>

          {/* All Users */}
          <TabsContent value="users" className="glass rounded-xl p-4">
            {isLoading ? (
              <div className="text-center py-12 text-muted-foreground">Loading...</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user._id}>
                      <TableCell className="font-medium">{user.username}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                          user.role === 'faculty'
                            ? 'bg-blue-500/20 text-blue-500'
                            : user.role === 'admin'
                              ? 'bg-purple-500/20 text-purple-500'
                              : 'bg-green-500/20 text-green-500'
                        }`}>
                          {user.role}
                        </span>
                      </TableCell>
                      <TableCell>{user.department || '—'}</TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center gap-1 text-xs ${
                          user.isApproved ? 'text-green-500' : 'text-muted-foreground'
                        }`}>
                          <span className={`w-2 h-2 rounded-full ${
                            user.isApproved ? 'bg-green-500' : 'bg-muted-foreground'
                          }`} />
                          {user.isApproved ? 'Approved' : 'Pending'}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => handleDeleteUser(user._id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </TabsContent>

          {/* Messages */}
          <TabsContent value="messages" className="glass rounded-xl p-4">
            {isLoading ? (
              <div className="text-center py-12 text-muted-foreground">Loading...</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Sender</TableHead>
                    <TableHead>Channel</TableHead>
                    <TableHead>Message</TableHead>
                    <TableHead>Timestamp</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {messages.map((message) => (
                    <TableRow key={message._id}>
                      <TableCell className="font-medium">{message.sender?.username || 'Unknown'}</TableCell>
                      <TableCell>
                        <span className="text-muted-foreground">
                          #{message.conversationId?.name || 'unknown'}
                        </span>
                      </TableCell>
                      <TableCell className="max-w-xs truncate">{message.text}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {format(new Date(message.createdAt), 'MMM d, h:mm a')}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default AdminDashboard;
