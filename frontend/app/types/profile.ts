export interface UserProfile {
  id: string;
  email: string;
  name?: string | null;
  avatar?: string | null;
  bio?: string | null;
  website?: string | null;
  location?: string | null;
  banner_color: string;
  profile_settings: ProfileSettings;
  created_at: string;
  updated_at: string;
}

export interface ProfileSettings {
  /** Preferred UI theme override */
  theme?: 'system' | 'dark' | 'light';
  /** Show online status to other users */
  showOnlineStatus?: boolean;
  /** Allow project comments */
  allowComments?: boolean;
  /** Email notification preferences */
  notifications?: {
    projectComments?: boolean;
    newFollowers?: boolean;
    systemUpdates?: boolean;
  };
}

export interface UpdateProfilePayload {
  name?: string;
  bio?: string;
  website?: string;
  location?: string;
  banner_color?: string;
  profile_settings?: ProfileSettings;
}
