export interface ServiceCategory {
  id: string
  name: string
  description: string
  icon: string
  baseRate: number // Base hourly rate in credits
  examples: string[]
  commonNeeds: string[] // What this category typically needs
  popular: boolean // Show in popular categories
}

// Nigerian market-focused service categories
export const NIGERIAN_CATEGORIES: ServiceCategory[] = [
  {
    id: 'legal',
    name: 'Legal & Business Registration',
    description: 'Legal services, business registration, contracts, CAC registration',
    icon: '⚖️',
    baseRate: 10,
    examples: ['Business Registration', 'Contract Review', 'Legal Consultation', 'CAC Documentation', 'Trademark Registration'],
    commonNeeds: ['tech', 'creative', 'marketing', 'accounting'],
    popular: true
  },
  {
    id: 'tech',
    name: 'Technology & Digital',
    description: 'Web development, mobile apps, IT support, digital solutions',
    icon: '💻',
    baseRate: 8,
    examples: ['Website Development', 'Mobile App Development', 'IT Support', 'Software Development', 'Digital Marketing Tools'],
    commonNeeds: ['legal', 'creative', 'marketing', 'accounting'],
    popular: true
  },
  {
    id: 'accounting',
    name: 'Accounting & Financial Services',
    description: 'Bookkeeping, tax preparation, financial planning, payroll',
    icon: '💰',
    baseRate: 7,
    examples: ['Bookkeeping', 'Tax Preparation', 'Financial Planning', 'Payroll Management', 'Budget Analysis'],
    commonNeeds: ['tech', 'legal', 'marketing', 'creative'],
    popular: true
  },
  {
    id: 'marketing',
    name: 'Marketing & Social Media',
    description: 'Social media management, content creation, advertising, branding',
    icon: '📱',
    baseRate: 6,
    examples: ['Social Media Management', 'Content Creation', 'Brand Design', 'Digital Advertising', 'SEO Services'],
    commonNeeds: ['creative', 'tech', 'photography', 'legal'],
    popular: true
  },
  {
    id: 'creative',
    name: 'Creative & Design',
    description: 'Graphic design, branding, video editing, creative writing',
    icon: '🎨',
    baseRate: 5,
    examples: ['Logo Design', 'Graphic Design', 'Video Editing', 'Creative Writing', 'Brand Identity'],
    commonNeeds: ['tech', 'marketing', 'photography', 'legal'],
    popular: true
  },
  {
    id: 'photography',
    name: 'Photography & Video',
    description: 'Event photography, product photography, video production',
    icon: '📸',
    baseRate: 5,
    examples: ['Event Photography', 'Product Photography', 'Video Production', 'Photo Editing', 'Wedding Photography'],
    commonNeeds: ['marketing', 'creative', 'tech', 'event_planning'],
    popular: true
  },
  {
    id: 'fashion',
    name: 'Fashion & Tailoring',
    description: 'Clothing design, tailoring, fashion consulting, alterations',
    icon: '👗',
    baseRate: 4,
    examples: ['Custom Tailoring', 'Fashion Design', 'Alterations', 'Fashion Consulting', 'Pattern Making'],
    commonNeeds: ['photography', 'marketing', 'legal', 'creative'],
    popular: false
  },
  {
    id: 'event_planning',
    name: 'Event Planning & Management',
    description: 'Wedding planning, corporate events, party planning, event coordination',
    icon: '🎉',
    baseRate: 4,
    examples: ['Wedding Planning', 'Corporate Events', 'Birthday Parties', 'Event Coordination', 'Venue Management'],
    commonNeeds: ['photography', 'food', 'creative', 'marketing'],
    popular: false
  },
  {
    id: 'food',
    name: 'Food & Catering',
    description: 'Catering services, meal preparation, food delivery, cooking classes',
    icon: '🍽️',
    baseRate: 3,
    examples: ['Catering Services', 'Meal Preparation', 'Food Delivery', 'Cooking Classes', 'Event Catering'],
    commonNeeds: ['event_planning', 'marketing', 'transportation', 'accounting'],
    popular: false
  },
  {
    id: 'tutoring',
    name: 'Education & Tutoring',
    description: 'Private tutoring, language classes, skill training, exam prep',
    icon: '📚',
    baseRate: 4,
    examples: ['Mathematics Tutoring', 'English Classes', 'Computer Training', 'Exam Preparation', 'Language Classes'],
    commonNeeds: ['tech', 'marketing', 'creative', 'accounting'],
    popular: false
  },
  {
    id: 'generator_repair',
    name: 'Generator & Equipment Repair',
    description: 'Generator maintenance, electrical repairs, equipment servicing',
    icon: '⚡',
    baseRate: 6,
    examples: ['Generator Repair', 'Electrical Work', 'Equipment Maintenance', 'Appliance Repair', 'Electrical Installation'],
    commonNeeds: ['transportation', 'accounting', 'marketing', 'legal'],
    popular: true
  },
  {
    id: 'transportation',
    name: 'Transportation & Delivery',
    description: 'Delivery services, logistics, transportation, moving services',
    icon: '🚚',
    baseRate: 2,
    examples: ['Delivery Services', 'Moving Services', 'Logistics', 'Transportation', 'Courier Services'],
    commonNeeds: ['accounting', 'tech', 'legal', 'marketing'],
    popular: false
  },
  {
    id: 'beauty_wellness',
    name: 'Beauty & Wellness',
    description: 'Hair styling, makeup, skincare, wellness services, spa services',
    icon: '💄',
    baseRate: 4,
    examples: ['Hair Styling', 'Makeup Services', 'Skincare', 'Manicure/Pedicure', 'Spa Services'],
    commonNeeds: ['photography', 'marketing', 'creative', 'accounting'],
    popular: false
  },
  {
    id: 'construction',
    name: 'Construction & Renovation',
    description: 'Building, renovation, plumbing, carpentry, home improvement',
    icon: '🔨',
    baseRate: 5,
    examples: ['Home Renovation', 'Plumbing', 'Carpentry', 'Painting', 'Electrical Work'],
    commonNeeds: ['accounting', 'legal', 'transportation', 'generator_repair'],
    popular: false
  },
  {
    id: 'agriculture',
    name: 'Agriculture & Farming',
    description: 'Crop farming, livestock, agricultural consulting, food production',
    icon: '🌾',
    baseRate: 3,
    examples: ['Crop Farming', 'Livestock Management', 'Agricultural Consulting', 'Food Production', 'Farm Management'],
    commonNeeds: ['transportation', 'accounting', 'tech', 'marketing'],
    popular: false
  },
  {
    id: 'cleaning',
    name: 'Cleaning & Maintenance',
    description: 'House cleaning, office cleaning, maintenance services',
    icon: '🧹',
    baseRate: 2,
    examples: ['House Cleaning', 'Office Cleaning', 'Deep Cleaning', 'Maintenance Services', 'Janitorial Services'],
    commonNeeds: ['transportation', 'accounting', 'marketing', 'tech'],
    popular: false
  }
]

// Helper functions
export const getCategoryById = (id: string): ServiceCategory | undefined => {
  return NIGERIAN_CATEGORIES.find(cat => cat.id === id)
}

export const getCategoryByName = (name: string): ServiceCategory | undefined => {
  return NIGERIAN_CATEGORIES.find(cat => cat.name.toLowerCase().includes(name.toLowerCase()))
}

export const getPopularCategories = (): ServiceCategory[] => {
  return NIGERIAN_CATEGORIES.filter(cat => cat.popular)
}

export const getAllCategoryNames = (): string[] => {
  return NIGERIAN_CATEGORIES.map(cat => cat.name)
}

export const getAllCategoryIds = (): string[] => {
  return NIGERIAN_CATEGORIES.map(cat => cat.id)
}

// Legacy category mapping (for backward compatibility with existing data)
export const LEGACY_CATEGORY_MAPPING: { [key: string]: string } = {
  'Legal': 'legal',
  'Tech': 'tech',
  'Creative': 'creative',
  'Fashion': 'fashion',
  'Food': 'food',
  'Professional': 'accounting', // Map generic professional to accounting
  'Accounting': 'accounting',
  'Marketing': 'marketing',
  'Photography': 'photography'
}

export const mapLegacyCategory = (legacyCategory: string): string => {
  return LEGACY_CATEGORY_MAPPING[legacyCategory] || legacyCategory.toLowerCase()
}

// Most common Nigerian business services (for matching algorithm)
export const COMMON_NIGERIAN_SERVICES = [
  'legal',
  'tech',
  'accounting',
  'marketing',
  'generator_repair',
  'creative',
  'photography'
]

// Business-to-business categories (typically have higher exchange rates)
export const B2B_CATEGORIES = [
  'legal',
  'tech',
  'accounting',
  'marketing',
  'creative'
]

// Consumer service categories (typically have lower exchange rates)
export const B2C_CATEGORIES = [
  'fashion',
  'food',
  'beauty_wellness',
  'cleaning',
  'transportation',
  'tutoring'
]
