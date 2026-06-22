export type LeadStatus =
  | 'new'
  | 'hot_lead'
  | 'time_waste'
  | 'dnp'
  | 'irrelevant'
  | 'wrong_contact'

export interface Lead {
  id: string
  name: string
  phone: string
  alt_phone: string | null
  service: string
  message: string | null
  status: LeadStatus
  source: string
  created_at: string
  updated_at: string
}

export interface Service {
  id: string
  name: string
  slug: string
  description: string
  price: string
  image: string
  href: string
}

export interface BlogPost {
  slug: string
  title: string
  excerpt: string
  content: string
  image: string
  date: string
  readTime: string
  category: string
}

export const SERVICES = [
  'Casino Booking',
  'Sunset Cruise',
  'Dinner Cruise',
  'Party Cruise',
  'Family Cruise',
  'Private Yacht Charter',
  'Birthday Party Yacht',
  'Proposal Yacht',
  'Corporate Yacht',
  'Car Rental',
  'Taxi / Airport Transfer',
] as const

export type ServiceName = (typeof SERVICES)[number]
