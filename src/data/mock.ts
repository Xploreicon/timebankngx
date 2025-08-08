import { Category, Service, Trade, User, Message } from "@/types";

const cities = ["Lagos", "Abuja", "Port Harcourt", "Kano"] as const;

const users: User[] = [
  { id: 'u1', businessName: 'Ada Tech Labs', phone: '+2348012345671', email: 'ada@tech.ng', category: 'Tech', location: 'Lagos', timeCredits: 120, trustScore: 92, verificationStatus: true, createdAt: new Date() },
  { id: 'u2', businessName: 'Chinedu Legal', phone: '+2348012345672', email: 'chinedu@legal.ng', category: 'Legal', location: 'Abuja', timeCredits: 45, trustScore: 80, verificationStatus: true, createdAt: new Date() },
  { id: 'u3', businessName: 'Ngozi Creative Hub', phone: '+2348012345673', email: 'ngozi@creative.ng', category: 'Creative', location: 'Lagos', timeCredits: 75, trustScore: 88, verificationStatus: true, createdAt: new Date() },
  { id: 'u4', businessName: "Bola's Fashion", phone: '+2348012345674', email: 'bola@fashion.ng', category: 'Fashion', location: 'Kano', timeCredits: 20, trustScore: 70, verificationStatus: false, createdAt: new Date() },
  { id: 'u5', businessName: 'Femi Foods', phone: '+2348012345675', email: 'femi@foods.ng', category: 'Food', location: 'Lagos', timeCredits: 60, trustScore: 85, verificationStatus: true, createdAt: new Date() },
  { id: 'u6', businessName: 'Zainab Consults', phone: '+2348012345676', email: 'zainab@pro.ng', category: 'Professional', location: 'Abuja', timeCredits: 110, trustScore: 95, verificationStatus: true, createdAt: new Date() },
  { id: 'u7', businessName: 'Ifeanyi Dev Studio', phone: '+2348012345677', email: 'ifeanyi@dev.ng', category: 'Tech', location: 'Port Harcourt', timeCredits: 35, trustScore: 78, verificationStatus: false, createdAt: new Date() },
  { id: 'u8', businessName: 'Aisha Media', phone: '+2348012345678', email: 'aisha@media.ng', category: 'Creative', location: 'Abuja', timeCredits: 90, trustScore: 90, verificationStatus: true, createdAt: new Date() },
  { id: 'u9', businessName: 'Seyi Legal Aid', phone: '+2348012345679', email: 'seyi@legal.ng', category: 'Legal', location: 'Lagos', timeCredits: 55, trustScore: 82, verificationStatus: true, createdAt: new Date() },
  { id: 'u10', businessName: 'Funke Eats', phone: '+2348012345680', email: 'funke@eats.ng', category: 'Food', location: 'Port Harcourt', timeCredits: 15, trustScore: 68, verificationStatus: false, createdAt: new Date() },
];

const sampleServices: Service[] = [
  { id: 's1', userId: 'u1', title: 'Web Development', description: 'Build modern websites', category: 'Tech', hourlyRate: 1, availability: true, skillLevel: 'Expert' },
  { id: 's2', userId: 'u1', title: 'App Prototyping', description: 'Clickable prototypes', category: 'Tech', hourlyRate: 1, availability: true, skillLevel: 'Intermediate' },
  { id: 's3', userId: 'u2', title: 'Contract Drafting', description: 'Standard agreements', category: 'Legal', hourlyRate: 1, availability: true, skillLevel: 'Expert' },
  { id: 's4', userId: 'u3', title: 'Brand Design', description: 'Logos and identity', category: 'Creative', hourlyRate: 1, availability: true, skillLevel: 'Expert' },
  { id: 's5', userId: 'u3', title: 'Social Media Graphics', description: 'Posts & banners', category: 'Creative', hourlyRate: 1, availability: true, skillLevel: 'Intermediate' },
  { id: 's6', userId: 'u4', title: 'Tailoring', description: 'Custom outfits', category: 'Fashion', hourlyRate: 1, availability: true, skillLevel: 'Expert' },
  { id: 's7', userId: 'u5', title: 'Catering', description: 'Event meals', category: 'Food', hourlyRate: 1, availability: true, skillLevel: 'Expert' },
  { id: 's8', userId: 'u5', title: 'Meal Plans', description: 'Weekly nutrition', category: 'Food', hourlyRate: 1, availability: true, skillLevel: 'Intermediate' },
  { id: 's9', userId: 'u6', title: 'Business Strategy', description: 'Growth plans', category: 'Professional', hourlyRate: 1, availability: true, skillLevel: 'Expert' },
  { id: 's10', userId: 'u6', title: 'Accounting', description: 'Book keeping', category: 'Professional', hourlyRate: 1, availability: true, skillLevel: 'Intermediate' },
  { id: 's11', userId: 'u7', title: 'Mobile App Fixes', description: 'Bug fixes', category: 'Tech', hourlyRate: 1, availability: true, skillLevel: 'Intermediate' },
  { id: 's12', userId: 'u7', title: 'API Integration', description: '3rd party APIs', category: 'Tech', hourlyRate: 1, availability: true, skillLevel: 'Expert' },
  { id: 's13', userId: 'u8', title: 'Video Editing', description: 'Reels & promos', category: 'Creative', hourlyRate: 1, availability: true, skillLevel: 'Intermediate' },
  { id: 's14', userId: 'u8', title: 'Photography', description: 'Product shoots', category: 'Creative', hourlyRate: 1, availability: true, skillLevel: 'Expert' },
  { id: 's15', userId: 'u9', title: 'Trademark Filing', description: 'Protect brand', category: 'Legal', hourlyRate: 1, availability: true, skillLevel: 'Expert' },
  { id: 's16', userId: 'u9', title: 'Legal Consultation', description: '30-min session', category: 'Legal', hourlyRate: 1, availability: true, skillLevel: 'Intermediate' },
  { id: 's17', userId: 'u10', title: 'Baking', description: 'Cakes & pastries', category: 'Food', hourlyRate: 1, availability: true, skillLevel: 'Intermediate' },
  { id: 's18', userId: 'u10', title: 'Event Snacks', description: 'Small chops', category: 'Food', hourlyRate: 1, availability: true, skillLevel: 'Expert' },
  { id: 's19', userId: 'u2', title: 'Compliance Check', description: 'Policy review', category: 'Legal', hourlyRate: 1, availability: true, skillLevel: 'Intermediate' },
  { id: 's20', userId: 'u4', title: 'Fashion Styling', description: 'Look curation', category: 'Fashion', hourlyRate: 1, availability: true, skillLevel: 'Intermediate' },
];

const sampleMessages = (from: string, to: string): Message[] => [
  { id: 'm1', senderId: from, text: 'Hi! Can we trade services?', timestamp: new Date() },
  { id: 'm2', senderId: to, text: 'Sure, what do you need?', timestamp: new Date() },
  { id: 'm3', senderId: from, text: 'A logo refresh for 3 hours', timestamp: new Date() },
];

const trades: Trade[] = [
  { id: 't1', proposerId: 'u1', providerId: 'u3', serviceOffered: sampleServices[0], serviceRequested: sampleServices[4], hoursOffered: 3, hoursRequested: 3, status: 'active', messages: sampleMessages('u1','u3'), createdAt: new Date(), completedAt: null },
  { id: 't2', proposerId: 'u2', providerId: 'u1', serviceOffered: sampleServices[2], serviceRequested: sampleServices[1], hoursOffered: 2, hoursRequested: 2, status: 'pending', messages: sampleMessages('u2','u1'), createdAt: new Date(), completedAt: null },
  { id: 't3', proposerId: 'u6', providerId: 'u5', serviceOffered: sampleServices[9], serviceRequested: sampleServices[6], hoursOffered: 5, hoursRequested: 5, status: 'completed', messages: sampleMessages('u6','u5'), createdAt: new Date(), completedAt: new Date() },
  { id: 't4', proposerId: 'u8', providerId: 'u9', serviceOffered: sampleServices[13], serviceRequested: sampleServices[16], hoursOffered: 4, hoursRequested: 4, status: 'active', messages: sampleMessages('u8','u9'), createdAt: new Date(), completedAt: null },
  { id: 't5', proposerId: 'u4', providerId: 'u10', serviceOffered: sampleServices[5], serviceRequested: sampleServices[17], hoursOffered: 3, hoursRequested: 3, status: 'disputed', messages: sampleMessages('u4','u10'), createdAt: new Date(), completedAt: null },
];

export const mock = { cities: Array.from(cities), users, services: sampleServices, trades };
