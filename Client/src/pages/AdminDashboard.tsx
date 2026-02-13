import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  MessageCircle, 
  Shield, 
  Users, 
  UserCheck, 
  GraduationCap,
  Briefcase,
  Search,
  RefreshCw,
  Trash2,
  Check,
  X,
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
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'student' | 'faculty' | 'admin'>('all');

  const loadAdminData = async (backgroundRefresh = false) => {
    if (backgroundRefresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }

    try {
      const [usersResult, pendingResult, messagesResult] = await Promise.allSettled([
        fetch('/api/admin/users'),
        fetch('/api/admin/faculty/pending'),
        fetch('/api/admin/messages'),
      ]);

      let usersData: AdminUser[] = [];
      let pendingData: AdminUser[] = [];
      let messagesData: AdminMessage[] = [];

      if (usersResult.status === 'fulfilled' && usersResult.value.ok) {
        usersData = await usersResult.value.json();
        setUsers(usersData);
      } else {
        toast({
          title: 'Error',
          description: 'Failed to load users list.',
          variant: 'destructive',
        });
      }

      if (pendingResult.status === 'fulfilled' && pendingResult.value.ok) {
        pendingData = await pendingResult.value.json();
      } else {
        pendingData = usersData.filter((u) => u.role === 'faculty' && !u.isApproved);
      }
      setUnapprovedFaculty(pendingData);

      if (messagesResult.status === 'fulfilled' && messagesResult.value.ok) {
        messagesData = await messagesResult.value.json();
        setMessages(messagesData);
      } else {
        setMessages([]);
      }
    } catch (error) {
      console.error(error);
      toast({
        title: 'Error',
        description: 'Failed to load admin data.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadAdminData();
  }, []);

  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      const matchesRole = roleFilter === 'all' ? true : user.role === roleFilter;
      const text = `${user.username} ${user.email} ${user.department || ''}`.toLowerCase();
      const matchesSearch = searchTerm.trim()
        ? text.includes(searchTerm.trim().toLowerCase())
        : true;
      return matchesRole && matchesSearch;
    });
  }, [users, roleFilter, searchTerm]);

  const stats = useMemo(() => {
    const students = users.filter((u) => u.role === 'student').length;
    const faculty = users.filter((u) => u.role === 'faculty').length;
    const pending = users.filter((u) => u.role === 'faculty' && !u.isApproved).length;
    return {
      total: users.length,
      students,
      faculty,
      pending,
      messages: messages.length,
    };
  }, [users, messages]);

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
    const userToDelete = users.find((u) => u._id === userId);
    if (!userToDelete) return;

    const confirmed = window.confirm(`Delete ${userToDelete.username} (${userToDelete.role})? This action cannot be undone.`);
    if (!confirmed) return;

    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Delete failed');
      setUsers(prev => prev.filter(u => u._id !== userId));
      setUnapprovedFaculty(prev => prev.filter(f => f._id !== userId));
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
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadAdminData(true)}
            disabled={isRefreshing}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button variant="ghost" size="sm" onClick={handleLogout}>
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </div>
      </header>

      {/* Content */}
      <main className="container mx-auto py-8 px-4">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
            <Shield className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Admin Dashboard</h1>
            <p className="text-muted-foreground text-sm">Approve faculty, view all users, and manage accounts</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4 mb-8">
          {[
            { label: 'Total Users', value: stats.total, icon: Users },
            { label: 'Students', value: stats.students, icon: GraduationCap },
            { label: 'Faculty', value: stats.faculty, icon: Briefcase },
            { label: 'Pending Faculty', value: stats.pending, icon: UserCheck },
            { label: 'Messages', value: stats.messages, icon: MessageCircle },
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

        {/* Pending Approvals */}
        <section className="glass rounded-xl p-4 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold">Faculty Approval Queue</h2>
              <p className="text-sm text-muted-foreground">
                Pending requests: {unapprovedFaculty.length}
              </p>
            </div>
          </div>
          {isLoading ? (
            <div className="text-center py-12 text-muted-foreground">Loading pending approvals...</div>
          ) : unapprovedFaculty.length === 0 ? (
            <div className="text-center py-10">
              <UserCheck className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">No pending faculty approvals</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Subjects</TableHead>
                  <TableHead>Requested</TableHead>
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
                    <TableCell className="text-muted-foreground">
                      {faculty.createdAt ? format(new Date(faculty.createdAt), 'MMM d, yyyy') : '—'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-green-600 hover:text-green-700"
                          onClick={() => handleApproveFaculty(faculty._id)}
                        >
                          <Check className="w-4 h-4 mr-1" />
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-destructive hover:text-destructive"
                          onClick={() => handleRejectFaculty(faculty._id)}
                        >
                          <X className="w-4 h-4 mr-1" />
                          Reject
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </section>

        {/* All Users */}
        <section className="glass rounded-xl p-4 mb-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 mb-4">
            <div>
              <h2 className="text-lg font-semibold">All Users</h2>
              <p className="text-sm text-muted-foreground">
                Showing {filteredUsers.length} of {users.length} users
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-full sm:w-72"
                  placeholder="Search by name, email, department"
                />
              </div>
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value as 'all' | 'student' | 'faculty' | 'admin')}
                className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="all">All Roles</option>
                <option value="student">Students</option>
                <option value="faculty">Faculty</option>
                <option value="admin">Admins</option>
              </select>
            </div>
          </div>
          {isLoading ? (
            <div className="text-center py-12 text-muted-foreground">Loading users...</div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">No users found for the selected filters.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user._id}>
                    <TableCell className="font-medium">{user.username}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        user.role === 'faculty'
                          ? 'bg-blue-500/20 text-blue-600'
                          : user.role === 'admin'
                            ? 'bg-slate-500/20 text-slate-600'
                            : 'bg-green-500/20 text-green-600'
                      }`}>
                        {user.role}
                      </span>
                    </TableCell>
                    <TableCell>{user.department || '—'}</TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center gap-1 text-xs ${
                        user.isApproved ? 'text-green-600' : 'text-amber-600'
                      }`}>
                        <span className={`w-2 h-2 rounded-full ${
                          user.isApproved ? 'bg-green-600' : 'bg-amber-600'
                        }`} />
                        {user.isApproved ? 'Approved' : 'Pending'}
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {user.createdAt ? format(new Date(user.createdAt), 'MMM d, yyyy') : '—'}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => handleDeleteUser(user._id)}
                      >
                        <Trash2 className="w-4 h-4 mr-1" />
                        Delete
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </section>
      </main>
    </div>
  );
};

export default AdminDashboard;
