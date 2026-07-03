export interface User {
  id: number;
  name: string;
  email: string;
  phone: string;
  password_hash?: string;
  referral_code: string;
  referrer_id: number | null;
  membership_active: number;
  membership_expiry: string | null;
  membership_tier: string;
  horizon_points: number;
  balance: number;
  crypto_wallet_address: string;
  city: string;
  country: string;
  created_at: string;
  status: string;
  kyc_status: 'not_submitted' | 'pending' | 'under_review' | 'verified' | 'rejected' | 'suspended';
  kyc_name?: string;
  kyc_dob?: string;
  kyc_nationality?: string;
  kyc_id_number?: string;
  kyc_id_front?: string;
  kyc_id_back?: string;
  kyc_selfie?: string;
  kyc_address_proof?: string;
  kyc_source_of_funds?: string;
  kyc_annual_income?: string;
  kyc_investment_experience?: string;
  kyc_phone_verified?: number;
  kyc_submitted_at?: string;
  daily_streak: number;
  last_checkin_date: string;
  notification_permission: number;
  is_incognito: number;
  is_president_club: number;
  carbon_trees_planted: number;
  carbon_lbs_saved: number;
  lottery_tickets: number;
}

export interface Payment {
  id: number;
  user_id: number;
  amount: number;
  currency: string;
  status: 'pending' | 'confirmed' | 'failed' | 'refunded';
  method: string;
  type: string;
  transaction_hash: string;
  payment_proof: string;
  country: string;
  created_at: string;
  updated_at: string;
  username?: string;
  useremail?: string;
}

export interface Referral {
  id: number;
  referrer_id: number;
  referred_user_id: number;
  status: 'pending' | 'paid';
  reward_amount: number;
  created_at: string;
  referred_user_name?: string;
  referred_user_email?: string;
}

export interface MapTracking {
  user_id: number;
  car_id: number;
  current_lat: number;
  current_lng: number;
  route_index: number;
  total_stops: number;
  delays_encountered: number;
  expedite_paid: number;
  last_updated: string;
}

export interface Delay {
  id: number;
  name: string;
  duration_days: number;
  trigger_after_km: number;
  expedite_fee: number;
}

export interface RewardItem {
  id: number;
  name: string;
  points_cost: number;
  image_url: string;
  description: string;
  status: string;
}

export interface RewardRedemption {
  id: number;
  user_id: number;
  item_name: string;
  points_spent: number;
  tracking_number: string;
  status: string;
  created_at: string;
}

export interface Vehicle {
  id: number;
  model: string;
  year: number;
  price: number;
  monthly_finance: number;
  range_miles: number;
  acceleration: string;
  battery: string;
  description: string;
  specs_json: string;
  badge: string;
  category: string;
  status: string;
  is_club_exclusive: number;
  rental_price_per_day: number;
  image_url: string;
  show_on_homepage: number;
  is_active: number;
}

export interface DashboardData {
  user: User;
  activeVehicle: {
    model: string;
    expectedDeliveryDate: string;
    totalPaid: number;
    installmentCount: number;
    monthlyPayment: number;
  } | null;
  tracking: MapTracking | null;
  delays: Delay[];
  redemptions: RewardRedemption[];
  referrals: Referral[];
  referralStats: {
    code: string;
    pendingCount: number;
    paidCount: number;
    estimatedEarnings: number;
    withdrawable: boolean;
  };
  leaderboard: Array<{ name: string; count: number; is_fake: number }>;
  notifications: Notification[];
  mysteryCar: MysteryCarSubscription | null;
  driveToEarn: DriveToEarnLog | null;
  presidentClub: { invited: boolean; referralCount: number };
  carbonOffset: { treesPlanted: number; lbsSaved: number };
  lotteryEntries: number;
  paymentMethods: PaymentMethodConfig[];
  insurancePolicies: InsurancePolicy[];
  unreadNotifications: number;
}

export interface Notification {
  id: number;
  user_id: number;
  type: string;
  title: string;
  message: string;
  is_read: number;
  sent_at: string;
}

export interface MysteryCarSubscription {
  id: number;
  user_id: number;
  active: number;
  current_car: string;
  next_delivery: string;
  monthly_charge: number;
  months_active: number;
  created_at: string;
}

export interface DriveToEarnLog {
  id: number;
  user_id: number;
  date: string;
  miles_driven: number;
  charging_time: number;
  points_earned: number;
  week_start: string;
}

export interface CarbonOffsetLog {
  id: number;
  user_id: number;
  miles_driven: number;
  lbs_co2_saved: number;
  trees_planted: number;
  logged_at: string;
}

export interface LotteryEntry {
  id: number;
  user_id: number;
  tickets: number;
  source: string;
  month: string;
  created_at: string;
}

export interface PaymentMethodConfig {
  id: number;
  method: string;
  enabled: number;
  recommended: number;
  processing_time: string;
  badge_color: string;
  fee_percent: number;
  crypto_bonus_percent: number;
  min_deposit: number;
  wallet_address: string;
  gas_fee: number;
}

export interface InsurancePolicy {
  id: number;
  user_id: number;
  policy_number: string;
  car_model: string;
  plan_name: string;
  monthly_premium: number;
  coverage_limit: number;
  status: string;
  created_at: string;
}

export interface BlogPost {
  id: number;
  title: string;
  content: string;
  image_url: string;
  published_at: string;
}

export interface BlogComment {
  id: number;
  post_id: number;
  user_id: number;
  comment: string;
  status: string;
  created_at: string;
  username?: string;
}

export interface SystemSetting {
  id: number;
  key: string;
  value: string;
  updated_at: string;
}

export interface CarouselSlide {
  id: number;
  image_url: string;
  title: string;
  subtitle: string;
  cta_text: string;
  cta_link: string;
  order_num: number;
  is_active: number;
}

export interface Testimonial {
  id: number;
  name: string;
  photo_url: string;
  quote: string;
  is_active: number;
}

export interface GamificationConfig {
  id: number;
  feature_key: string;
  enabled: number;
  config_json: string;
}

export interface EmailLog {
  id: number;
  user_id: number;
  template: string;
  status: string;
  sent_at: string;
}

export interface AdminLog {
  id: number;
  admin_id: number;
  action: string;
  details: string;
  ip_address: string;
  created_at: string;
}
