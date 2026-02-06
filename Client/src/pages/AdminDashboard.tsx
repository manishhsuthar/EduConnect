import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  mockUsers, 
  mockUnapprovedFaculty, 
  mockMessages,
  User 
} from '@/lib/mockData';
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
  X,
  LogOut
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [users, setUsers] = useState<User[]>(mockUsers);
  const [unapprovedFaculty, setUnapprovedFaculty] = useState<User[]>(mockUnapprovedFaculty);

  useEffect(() => {
    const adminToken = localStorage.getItem('adminToken');
    if (!adminToken) {
      navigate('/admin-login');
    }
  }, [navigate]);

  const handleApproveFaculty = (facultyId: string) => {
    const faculty = unapprovedFaculty.find(f => f.id === facultyId);
    if (faculty) {
      setUnapprovedFaculty(prev => prev.filter(f => f.id !== facultyId));
      setUsers(prev => [...prev, faculty]);
      toast({
        title: 'Faculty Approved',
        description: `${faculty.name} has been approved.`,
      });
    }
  };

  const handleRejectFaculty = (facultyId: string) => {
    const faculty = unapprovedFaculty.find(f => f.id === facultyId);
    setUnapprovedFaculty(prev => prev.filter(f => f.id !== facultyId));
    toast({
      title: 'Faculty Rejected',
      description: faculty ? `${faculty.name} has been rejected.` : 'Faculty rejected.',
      variant: 'destructive',
    });
  };

  const handleDeleteUser = (userId: string) => {
    const user = users.find(u => u.id === userId);
    setUsers(prev => prev.filter(u => u.id !== userId));
    toast({
      title: 'User Deleted',
      description: user ? `${user.name} has been removed.` : 'User removed.',
    });
  };

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
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
            { label: 'Total Messages', value: mockMessages.length, icon: MessageSquare },
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
            {unapprovedFaculty.length === 0 ? (
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
                    <TableRow key={faculty.id}>
                      <TableCell className="font-medium">{faculty.name}</TableCell>
                      <TableCell>{faculty.email}</TableCell>
                      <TableCell>{faculty.department}</TableCell>
                      <TableCell>{faculty.subjects?.join(', ')}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-green-500 hover:text-green-600"
                            onClick={() => handleApproveFaculty(faculty.id)}
                          >
                            <Check className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-destructive hover:text-destructive"
                            onClick={() => handleRejectFaculty(faculty.id)}
                          >
                            <X className="w-4 h-4" />
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
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.name}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        user.role === 'Faculty' 
                          ? 'bg-blue-500/20 text-blue-500' 
                          : 'bg-green-500/20 text-green-500'
                      }`}>
                        {user.role}
                      </span>
                    </TableCell>
                    <TableCell>{user.department || '—'}</TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center gap-1 text-xs ${
                        user.isOnline ? 'text-green-500' : 'text-muted-foreground'
                      }`}>
                        <span className={`w-2 h-2 rounded-full ${
                          user.isOnline ? 'bg-green-500' : 'bg-muted-foreground'
                        }`} />
                        {user.isOnline ? 'Online' : 'Offline'}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => handleDeleteUser(user.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TabsContent>

          {/* Messages */}
          <TabsContent value="messages" className="glass rounded-xl p-4">
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
                {mockMessages.map((message) => (
                  <TableRow key={message.id}>
                    <TableCell className="font-medium">{message.senderName}</TableCell>
                    <TableCell>
                      <span className="text-muted-foreground">#{message.channelId}</span>
                    </TableCell>
                    <TableCell className="max-w-xs truncate">{message.content}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {format(new Date(message.timestamp), 'MMM d, h:mm a')}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default AdminDashboard;
