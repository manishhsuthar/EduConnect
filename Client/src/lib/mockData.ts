export interface User {
  id: string;
  name: string;
  email: string;
  role: 'Student' | 'Faculty';
  avatar?: string;
  department?: string;
  year?: string;
  subjects?: string[];
  profileCompleted: boolean;
  isOnline: boolean;
}

export interface Channel {
  id: string;
  name: string;
  description: string;
  icon: string;
  unreadCount: number;
}

export interface Message {
  id: string;
  channelId: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  content: string;
  timestamp: Date;
}

export interface DirectMessage {
  id: string;
  recipientId: string;
  recipientName: string;
  recipientAvatar?: string;
  lastMessage: string;
  timestamp: Date;
  unreadCount: number;
  isOnline: boolean;
}

// Mock Users
export const mockUsers: User[] = [
  {
    id: '1',
    name: 'Aditya Kumar',
    email: 'aditya@edu.com',
    role: 'Student',
    department: 'Computer Science',
    year: '3rd Year',
    profileCompleted: true,
    isOnline: true,
  },
  {
    id: '2',
    name: 'Dr. Priya Sharma',
    email: 'priya@edu.com',
    role: 'Faculty',
    department: 'Computer Science',
    subjects: ['Data Structures', 'Algorithms'],
    profileCompleted: true,
    isOnline: true,
  },
  {
    id: '3',
    name: 'Rahul Verma',
    email: 'rahul@edu.com',
    role: 'Student',
    department: 'Civil Engineering',
    year: '2nd Year',
    profileCompleted: true,
    isOnline: false,
  },
  {
    id: '4',
    name: 'Dr. Amit Patel',
    email: 'amit@edu.com',
    role: 'Faculty',
    department: 'Civil Engineering',
    subjects: ['Structural Analysis', 'Concrete Technology'],
    profileCompleted: true,
    isOnline: true,
  },
  {
    id: '5',
    name: 'Sneha Gupta',
    email: 'sneha@edu.com',
    role: 'Student',
    department: 'Computer Science',
    year: '4th Year',
    profileCompleted: true,
    isOnline: false,
  },
  {
    id: '6',
    name: 'Vikram Singh',
    email: 'vikram@edu.com',
    role: 'Student',
    department: 'Electrical Engineering',
    year: '2nd Year',
    profileCompleted: false,
    isOnline: true,
  },
];

// Mock Channels - General is first and default
export const mockChannels: Channel[] = [
  {
    id: 'general',
    name: 'General',
    description: 'General discussions for everyone',
    icon: 'Hash',
    unreadCount: 3,
  },
  {
    id: 'cs',
    name: 'Computer Science',
    description: 'CS department discussions',
    icon: 'Code',
    unreadCount: 5,
  },
  {
    id: 'civil',
    name: 'Civil Engineering',
    description: 'Civil engineering discussions',
    icon: 'Building2',
    unreadCount: 0,
  },
  {
    id: 'electrical',
    name: 'Electrical Engineering',
    description: 'EE department discussions',
    icon: 'Zap',
    unreadCount: 2,
  },
  {
    id: 'announcements',
    name: 'Announcements',
    description: 'Official announcements',
    icon: 'Megaphone',
    unreadCount: 1,
  },
  {
    id: 'help',
    name: 'Help & Support',
    description: 'Get help from peers and faculty',
    icon: 'HelpCircle',
    unreadCount: 0,
  },
];

// Mock Messages
export const mockMessages: Message[] = [
  {
    id: '1',
    channelId: 'general',
    senderId: '2',
    senderName: 'Dr. Priya Sharma',
    content: 'Welcome to EduConnect Hub! Feel free to ask any questions.',
    timestamp: new Date(Date.now() - 3600000 * 2),
  },
  {
    id: '2',
    channelId: 'general',
    senderId: '1',
    senderName: 'Aditya Kumar',
    content: 'Thanks! This platform looks great. 🎉',
    timestamp: new Date(Date.now() - 3600000),
  },
  {
    id: '3',
    channelId: 'general',
    senderId: '3',
    senderName: 'Rahul Verma',
    content: 'Hello everyone! Excited to be here.',
    timestamp: new Date(Date.now() - 1800000),
  },
  {
    id: '4',
    channelId: 'cs',
    senderId: '2',
    senderName: 'Dr. Priya Sharma',
    content: 'Tomorrow we\'ll discuss binary trees in detail. Please review the notes.',
    timestamp: new Date(Date.now() - 7200000),
  },
  {
    id: '5',
    channelId: 'cs',
    senderId: '5',
    senderName: 'Sneha Gupta',
    content: 'Can anyone explain the time complexity of heap operations?',
    timestamp: new Date(Date.now() - 5400000),
  },
  {
    id: '6',
    channelId: 'cs',
    senderId: '1',
    senderName: 'Aditya Kumar',
    content: 'Insert and delete are O(log n), heapify is O(n). Happy to explain more!',
    timestamp: new Date(Date.now() - 3600000),
  },
  {
    id: '7',
    channelId: 'civil',
    senderId: '4',
    senderName: 'Dr. Amit Patel',
    content: 'Reminder: Submit your structural analysis assignments by Friday.',
    timestamp: new Date(Date.now() - 86400000),
  },
  {
    id: '8',
    channelId: 'civil',
    senderId: '3',
    senderName: 'Rahul Verma',
    content: 'Is it okay to submit in PDF format?',
    timestamp: new Date(Date.now() - 43200000),
  },
  {
    id: '9',
    channelId: 'announcements',
    senderId: '2',
    senderName: 'Dr. Priya Sharma',
    content: '📢 Mid-semester exams scheduled for next month. Check the portal for dates.',
    timestamp: new Date(Date.now() - 172800000),
  },
];

// Mock Direct Messages
export const mockDirectMessages: DirectMessage[] = [
  {
    id: 'dm1',
    recipientId: '2',
    recipientName: 'Dr. Priya Sharma',
    lastMessage: 'Sure, I can help with that project.',
    timestamp: new Date(Date.now() - 1800000),
    unreadCount: 1,
    isOnline: true,
  },
  {
    id: 'dm2',
    recipientId: '5',
    recipientName: 'Sneha Gupta',
    lastMessage: 'See you at the library at 4!',
    timestamp: new Date(Date.now() - 3600000),
    unreadCount: 0,
    isOnline: false,
  },
  {
    id: 'dm3',
    recipientId: '3',
    recipientName: 'Rahul Verma',
    lastMessage: 'Did you finish the assignment?',
    timestamp: new Date(Date.now() - 7200000),
    unreadCount: 2,
    isOnline: false,
  },
];

// Helper functions
export const getMessagesByChannel = (channelId: string): Message[] => {
  return mockMessages.filter(msg => msg.channelId === channelId);
};

export const getChannelById = (channelId: string): Channel | undefined => {
  return mockChannels.find(ch => ch.id === channelId);
};

export const getUserById = (userId: string): User | undefined => {
  return mockUsers.find(user => user.id === userId);
};

export const getOnlineUsers = (): User[] => {
  return mockUsers.filter(user => user.isOnline);
};

// Unapproved faculty for admin
export const mockUnapprovedFaculty: User[] = [
  {
    id: '7',
    name: 'Dr. Neha Joshi',
    email: 'neha@edu.com',
    role: 'Faculty',
    department: 'Mechanical Engineering',
    subjects: ['Thermodynamics'],
    profileCompleted: true,
    isOnline: false,
  },
];
