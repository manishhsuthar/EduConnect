import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/contexts/ThemeContext';
import { 
  MessageCircle, 
  Users, 
  Zap, 
  Shield, 
  BookOpen, 
  ArrowRight,
  CheckCircle,
  GraduationCap,
  Building,
  Sun,
  Moon
} from 'lucide-react';

const Landing = () => {
  const { theme, toggleTheme } = useTheme();

  const features = [
    {
      icon: MessageCircle,
      title: 'Real-time Messaging',
      description: 'Instant communication with classmates and faculty through organized channels.',
    },
    {
      icon: Users,
      title: 'Department Channels',
      description: 'Dedicated spaces for each department to collaborate and share resources.',
    },
    {
      icon: Zap,
      title: 'Quick Help',
      description: 'Get answers fast from peers and faculty who are online and ready to help.',
    },
    {
      icon: Shield,
      title: 'Secure & Private',
      description: 'Your academic discussions stay private within your institution.',
    },
    {
      icon: BookOpen,
      title: 'Resource Sharing',
      description: 'Share notes, assignments, and study materials effortlessly.',
    },
    {
      icon: GraduationCap,
      title: 'Faculty Connect',
      description: 'Direct access to faculty for guidance and academic support.',
    },
  ];

  const solutions = [
    {
      icon: Users,
      title: 'For Students',
      points: [
        'Connect with classmates instantly',
        'Get help from seniors and faculty',
        'Find project partners easily',
        'Stay updated on announcements',
      ],
    },
    {
      icon: Building,
      title: 'For Faculty',
      points: [
        'Broadcast announcements',
        'Answer student queries efficiently',
        'Share course materials',
        'Track student engagement',
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <MessageCircle className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold">EduConnect Hub</span>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/admin-login" className="text-muted-foreground hover:text-foreground text-sm">
              Admin
            </Link>
            <Button variant="ghost" size="icon" onClick={toggleTheme}>
              {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </Button>
            <Link to="/login">
              <Button variant="outline" size="sm">Sign In</Button>
            </Link>
            <Link to="/login">
              <Button size="sm" className="glow-sm">Get Started</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4">
        <div className="container mx-auto text-center">
          <div className="animate-fade-in">
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              Connect. Collaborate.{' '}
              <span className="text-gradient">Succeed Together.</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
              EduConnect Hub brings your academic department together in one platform. 
              Get instant help, find project partners, and streamline communication.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
              <Link to="/login">
                <Button size="lg" className="glow text-lg px-8">
                  Join Your Department
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </Link>
              <Button size="lg" variant="outline" className="text-lg px-8">
                Request Demo
              </Button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-8 max-w-xl mx-auto animate-fade-in" style={{ animationDelay: '0.2s' }}>
            {[
              { value: '5K+', label: 'Active Students' },
              { value: '50+', label: 'Departments' },
              { value: '95%', label: 'Response Rate' },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-3xl md:text-4xl font-bold text-primary">{stat.value}</div>
                <div className="text-sm text-muted-foreground">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 bg-card/50">
        <div className="container mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Everything Your Department Needs
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              EduConnect Hub solves the three biggest challenges in academic communication: 
              finding help, collaborating on projects, and staying connected.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <div
                key={feature.title}
                className="glass rounded-xl p-6 hover:border-primary/50 transition-all duration-300 animate-fade-in"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center mb-4">
                  <feature.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                <p className="text-muted-foreground text-sm">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Solutions Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Built for Everyone in Academia
            </h2>
          </div>
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {solutions.map((solution, index) => (
              <div
                key={solution.title}
                className="glass rounded-xl p-8 animate-fade-in"
                style={{ animationDelay: `${index * 0.15}s` }}
              >
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                    <solution.icon className="w-5 h-5 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold">{solution.title}</h3>
                </div>
                <ul className="space-y-3">
                  {solution.points.map((point) => (
                    <li key={point} className="flex items-start gap-2">
                      <CheckCircle className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                      <span className="text-muted-foreground">{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto">
          <div className="glass rounded-2xl p-8 md:p-12 text-center glow">
            <h2 className="text-2xl md:text-3xl font-bold mb-4">
              Ready to Transform Your Campus Communication?
            </h2>
            <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
              Join thousands of students and faculty who are already connected.
            </p>
            <Link to="/login">
              <Button size="lg" className="text-lg px-8">
                Get Started Free
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 border-t border-border">
        <div className="container mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-primary flex items-center justify-center">
              <MessageCircle className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-semibold">EduConnect Hub</span>
          </div>
          <p className="text-sm text-muted-foreground">
            © 2024 EduConnect Hub. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
