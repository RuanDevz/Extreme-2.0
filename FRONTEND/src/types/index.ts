export interface ContentLite {
  slug: string;
}

export interface Model {
  id: number;
  model_id: string;
  name: string;
  photoUrl: string;
  bio: string;
  hairColor?: string;
  eyeColor?: string;
  bodyType?: string;
  bustSize?: string;
  height?: number;
  weight?: number;
  age?: number;
  placeOfBirth?: string;           // padronizado
  sexuality?: string;
  boobsType?: string;
  cupSize?: string;
  birthDate?: string;
  birthPlace: string
  ethnicity?: 'arab' | 'asian' | 'ebony' | 'indian' | 'latina' | 'white';
  tags: string[];
  views: number;
  slug: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  contentCount?: number;

  // relacionamento resumido
  contents?: ContentLite[];
}

export interface Content {
  id: number;
  model_id: string;
  slug: string;
  title: string;
  url: string;
  thumbnailUrl?: string;
  type: 'video' | 'image' | 'gallery';
  tags: string[];
  views: number;
  status: 'active' | 'broken' | 'reported' | 'removed';
  language: string;
  isActive: boolean;
  info?: {
    images?: number;
    videos?: number;
    size?: number;
  };
  createdAt: string;
  updatedAt: string;
  model?: Model;                   // relação inversa opcional
}

export interface Report {
  id: number;
  contentId?: number;
  modelId?: number;
  userId?: number;
  reason: 'broken_link' | 'child_content' | 'no_consent' | 'spam' | 'inappropriate' | 'other';
  description?: string;
  status: 'pending' | 'reviewed' | 'resolved' | 'dismissed';
  ipAddress?: string;
  createdAt: string;
  updatedAt: string;
}

export type SortOption = 'recent' | 'popular';
export type AdNetwork = 'linkvertise' | 'admaven';

export interface User {
  id: number;
  name: string;
  email: string;
  profilePhoto?: string;
  isVerified: boolean;
  language: string;
  country?: string;
  ageConfirmed: boolean;
  lastLoginAt?: string;
  isPremium: boolean;
  isAdmin: boolean;
  expiredPremium: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials extends LoginCredentials {
  name: string;
  language?: string;
  country?: string;
  ageConfirmed: boolean;
}

export interface AuthResponse {
  user: User;
  token: string;
}

export interface FilterOptions {
  ethnicity?: string;
  minAge?: number;
  maxAge?: number;
  hairColor?: string;
  eyeColor?: string;
  bodyType?: string;
  type?: string;
  tags?: string[];
  search?: string;
}

export interface PaginationInfo {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
}

export interface ApiResponse<T> {
  data?: T;
  models?: Model[];
  contents?: Content[];
  reports?: Report[];
  comments?: Comment[];
  pagination?: PaginationInfo;
  message?: string;
  error?: string;
}

export interface Comment {
  id: number;
  userId: number;
  contentId?: number;
  modelId?: number;
  parentId?: number;
  text: string;
  likes: number;
  isLiked: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  user: {
    id: number;
    name: string;
    isPremium: boolean;
    isAdmin: boolean;
    profilePhoto?: string;
  };
  replies?: Comment[];
}

export interface Like {
  id: number;
  userId: number;
  contentId?: number;
  modelId?: number;
  type: 'content' | 'model';
  createdAt: string;
  updatedAt: string;
}

export interface Notification {
  id: number;
  userId: number;
  type: 'comment_like' | 'comment_reply' | 'model_follow' | 'content_like';
  title: string;
  message: string;
  data?: any;
  isRead: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Recommendation {
  id: number;
  userId: number;
  modelId: number;
  description: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  updatedAt: string;
  model?: Model;
  user?: User;
}
