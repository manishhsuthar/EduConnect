import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { MessageCircle, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const departments = [
  'Computer Science',
  'Civil Engineering',
  'Electrical Engineering',
  'Mechanical Engineering',
  'Electronics & Communication',
  'Information Technology',
];

const years = ['1st Year', '2nd Year', '3rd Year', '4th Year'];

const ProfileSetup = () => {
  const { user, updateProfile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const [department, setDepartment] = useState('');
  const [year, setYear] = useState('');
  const [subjects, setSubjects] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    if (!user) {
      toast({
        title: 'Error',
        description: 'User not found. Please login again.',
        variant: 'destructive',
      });
      setIsLoading(false);
      return;
    }

    if (user.role === 'student') {
      if (!department || !year) {
        toast({
          title: 'Error',
          description: 'Please fill in all required fields',
          variant: 'destructive',
        });
        setIsLoading(false);
        return;
      }
    } else {
      if (!department || !subjects) {
        toast({
          title: 'Error',
          description: 'Please fill in all required fields',
          variant: 'destructive',
        });
        setIsLoading(false);
        return;
      }
    }

    try {
      const formData = new FormData();
      formData.append('userId', user.id);
      formData.append('department', department);
      if (user.role === 'student') {
        formData.append('year', year);
      } else {
        formData.append('subjects', subjects);
      }

      const res = await fetch('/api/auth/profile-setup', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Failed to update profile');
      }

      if (user.role === 'student') {
        updateProfile({ department, year });
      } else {
        updateProfile({ 
          department, 
          subjects: subjects.split(',').map(s => s.trim()) 
        });
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error?.message || 'Failed to update profile.',
        variant: 'destructive',
      });
      setIsLoading(false);
      return;
    }

    toast({
      title: 'Profile Complete!',
      description: 'Welcome to EduConnect Hub.',
    });
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
            <MessageCircle className="w-6 h-6 text-primary-foreground" />
          </div>
          <span className="text-2xl font-bold">EduConnect Hub</span>
        </div>

        {/* Card */}
        <div className="glass rounded-2xl p-8 animate-fade-in">
          {/* Progress */}
          <div className="flex items-center justify-center gap-2 mb-6">
            <div className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center text-sm font-medium">
              ✓
            </div>
            <div className="w-16 h-1 bg-primary rounded" />
            <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">
              2
            </div>
          </div>

          <h2 className="text-2xl font-bold text-center mb-2">
            Welcome, {user?.username?.split(' ')[0]}!
          </h2>
          <p className="text-muted-foreground text-center text-sm mb-6">
            Complete your profile to get started
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Role Badge */}
            <div className="flex justify-center mb-4">
              <span className="px-4 py-1 rounded-full bg-primary/20 text-primary text-sm font-medium">
                {user?.role}
              </span>
            </div>

            <div className="space-y-2">
              <Label htmlFor="department">Department *</Label>
              <Select value={department} onValueChange={setDepartment}>
                <SelectTrigger>
                  <SelectValue placeholder="Select your department" />
                </SelectTrigger>
                <SelectContent>
                  {departments.map((dept) => (
                    <SelectItem key={dept} value={dept}>
                      {dept}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {user?.role === 'student' ? (
              <div className="space-y-2">
                <Label htmlFor="year">Year *</Label>
                <Select value={year} onValueChange={setYear}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select your year" />
                  </SelectTrigger>
                  <SelectContent>
                    {years.map((y) => (
                      <SelectItem key={y} value={y}>
                        {y}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="subjects">Subjects You Teach *</Label>
                <Input
                  id="subjects"
                  placeholder="e.g., Data Structures, Algorithms"
                  value={subjects}
                  onChange={(e) => setSubjects(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Separate multiple subjects with commas
                </p>
              </div>
            )}

            <Button type="submit" className="w-full glow-sm" disabled={isLoading}>
              {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Complete Profile
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ProfileSetup;
