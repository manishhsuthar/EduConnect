import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Mail, User, GraduationCap, Building2, BookOpen, CheckCircle2, Clock3 } from 'lucide-react';

const toTitleCase = (value: string) => {
  if (!value) return value;
  return value.charAt(0).toUpperCase() + value.slice(1);
};

const Profile = () => {
  const { user } = useAuth();

  if (!user) {
    return null;
  }

  const educationRows =
    user.role === 'student'
      ? [
          { label: 'Department', value: user.department || 'Not set', icon: Building2 },
          { label: 'Year', value: user.year || 'Not set', icon: GraduationCap },
        ]
      : [
          { label: 'Department', value: user.department || 'Not set', icon: Building2 },
          {
            label: 'Subjects',
            value: user.subjects?.length ? user.subjects.join(', ') : 'Not set',
            icon: BookOpen,
          },
        ];

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="max-w-3xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <Button asChild variant="outline">
            <Link to="/dashboard">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Link>
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-xl">My Profile</CardTitle>
            <CardDescription>Role and academic details for your account.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center text-base font-semibold text-primary">
                {user.username?.charAt(0) || 'U'}
              </div>
              <div>
                <p className="font-semibold">{user.username}</p>
                <p className="text-sm text-muted-foreground">{user.email}</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">{toTitleCase(user.role)}</Badge>
              <Badge variant={user.isApproved ? 'default' : 'outline'}>
                {user.isApproved ? 'Approved' : 'Approval Pending'}
              </Badge>
              <Badge variant={user.isProfileComplete ? 'default' : 'outline'}>
                {user.isProfileComplete ? 'Profile Complete' : 'Profile Incomplete'}
              </Badge>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-lg border p-4">
                <div className="flex items-center gap-2 text-sm font-medium mb-2">
                  <User className="w-4 h-4 text-muted-foreground" />
                  Account
                </div>
                <div className="space-y-2 text-sm">
                  <p className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                    <span>{user.email}</span>
                  </p>
                  <p className="flex items-center gap-2">
                    {user.isApproved ? (
                      <CheckCircle2 className="w-4 h-4 text-primary" />
                    ) : (
                      <Clock3 className="w-4 h-4 text-muted-foreground" />
                    )}
                    <span>{user.isApproved ? 'Approved account' : 'Waiting for approval'}</span>
                  </p>
                </div>
              </div>

              <div className="rounded-lg border p-4">
                <div className="flex items-center gap-2 text-sm font-medium mb-2">
                  <GraduationCap className="w-4 h-4 text-muted-foreground" />
                  Education Details
                </div>
                <div className="space-y-2 text-sm">
                  {educationRows.map((item) => (
                    <p key={item.label} className="flex items-start gap-2">
                      <item.icon className="w-4 h-4 mt-0.5 text-muted-foreground shrink-0" />
                      <span>
                        <span className="text-muted-foreground">{item.label}: </span>
                        {item.value}
                      </span>
                    </p>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Profile;
