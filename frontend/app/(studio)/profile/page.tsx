'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User,
  Mail,
  MapPin,
  Globe,
  Camera,
  Trash2,
  Save,
  Loader2,
  Bell,
  Eye,
  Palette,
  Settings,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { UpdateProfilePayload, UserProfile, ProfileSettings } from '@/types/profile';

// ─── Preset banner colours ────────────────────────────────────────────────────
const BANNER_PRESETS = [
  '#1dd4f6', '#8ecfbe', '#6c63ff', '#ff6b6b',
  '#51cf66', '#ffd43b', '#ff922b', '#cc5de8',
  '#339af0', '#f06595',
];

// ─── Helpers ─────────────────────────────────────────────────────────────────
function getInitials(name?: string | null, email?: string): string {
  if (name) {
    return name
      .split(' ')
      .map((p) => p[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }
  return (email?.[0] ?? 'U').toUpperCase();
}

function isValidUrl(url: string): boolean {
  if (!url) return true;
  return url.startsWith('http://') || url.startsWith('https://');
}

// ─── Section wrapper ──────────────────────────────────────────────────────────
function Section({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-vertra-border/60 bg-vertra-surface p-5">
      <div className="mb-4 flex items-center gap-2 text-sm font-medium text-vertra-text">
        <span className="text-vertra-cyan">{icon}</span>
        {title}
      </div>
      {children}
    </div>
  );
}

// ─── Toggle switch ────────────────────────────────────────────────────────────
function Toggle({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  description?: string;
}) {
  return (
    <div className="flex items-center justify-between py-2">
      <div>
        <p className="text-sm text-vertra-text">{label}</p>
        {description && <p className="text-xs text-vertra-text-dim">{description}</p>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative h-5 w-9 rounded-full transition-colors focus:outline-none ${checked ? 'bg-vertra-cyan' : 'bg-vertra-border'
          }`}
      >
        <span
          className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-4' : 'translate-x-0.5'
            }`}
        />
      </button>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function ProfilePage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isDeletingAvatar, setIsDeletingAvatar] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [website, setWebsite] = useState('');
  const [location, setLocation] = useState('');
  const [bannerColor, setBannerColor] = useState('#1dd4f6');
  const [settings, setSettings] = useState<ProfileSettings>({});

  // ─── Load profile ───────────────────────────────────────────────────────────
  useEffect(() => {
    setIsLoading(true);
    fetch('/api/profile')
      .then(async (res) => {
        if (res.status === 401) {
          router.replace('/login');
          return null;
        }
        if (!res.ok) throw new Error('Failed to load profile');
        return res.json() as Promise<{ user: UserProfile }>;
      })
      .then((data) => {
        if (!data) return;
        const u = data.user;
        setProfile(u);
        setName(u.name ?? '');
        setBio(u.bio ?? '');
        setWebsite(u.website ?? '');
        setLocation(u.location ?? '');
        setBannerColor(u.banner_color ?? '#1dd4f6');
        setSettings(u.profile_settings ?? {});
      })
      .catch(() => {
        router.replace('/login');
      })
      .finally(() => setIsLoading(false));
  }, [router]);

  // ─── Save profile ───────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!website || isValidUrl(website)) {
      /* ok */
    } else {
      setErrorMsg('Website must start with http:// or https://');
      return;
    }

    setIsSaving(true);
    setErrorMsg(null);
    setSaveStatus('idle');

    const payload: UpdateProfilePayload = {
      name: name.trim() || undefined,
      bio: bio.trim() || undefined,
      website: website.trim() || undefined,
      location: location.trim() || undefined,
      banner_color: bannerColor,
      profile_settings: settings,
    };

    try {
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? 'Failed to save profile');
      }

      const data = (await res.json()) as { user: UserProfile };
      setProfile(data.user);
      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to save profile');
      setSaveStatus('error');
    } finally {
      setIsSaving(false);
    }
  };

  // ─── Avatar upload ──────────────────────────────────────────────────────────
  const handleAvatarChange = useCallback(
    async (file: File) => {
      const localPreview = URL.createObjectURL(file);
      setAvatarPreview(localPreview);
      setIsUploadingAvatar(true);
      setErrorMsg(null);

      try {
        const formData = new FormData();
        formData.append('file', file);

        const res = await fetch('/api/profile/avatar', {
          method: 'POST',
          body: formData,
        });

        if (!res.ok) {
          const data = (await res.json().catch(() => ({}))) as { error?: string };
          throw new Error(data.error ?? 'Failed to upload avatar');
        }

        const data = (await res.json()) as { user: UserProfile };
        setProfile(data.user);
        setAvatarPreview(null);
      } catch (err) {
        setAvatarPreview(null);
        setErrorMsg(err instanceof Error ? err.message : 'Failed to upload avatar');
      } finally {
        setIsUploadingAvatar(false);
        URL.revokeObjectURL(localPreview);
      }
    },
    [],
  );

  const handleDeleteAvatar = async () => {
    setIsDeletingAvatar(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/profile/avatar', { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to remove avatar');
      const data = (await res.json()) as { user: UserProfile };
      setProfile(data.user);
      setAvatarPreview(null);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to remove avatar');
    } finally {
      setIsDeletingAvatar(false);
    }
  };

  // ─── Settings helper ────────────────────────────────────────────────────────
  const setSetting = <K extends keyof ProfileSettings>(
    key: K,
    value: ProfileSettings[K],
  ) => setSettings((prev) => ({ ...prev, [key]: value }));

  const setNotification = (key: keyof NonNullable<ProfileSettings['notifications']>, v: boolean) =>
    setSettings((prev) => ({
      ...prev,
      notifications: { ...prev.notifications, [key]: v },
    }));

  // ─── Loading ────────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-vertra-cyan" />
      </div>
    );
  }

  if (!profile) return null;

  const avatarSrc = avatarPreview ?? profile.avatar ?? null;
  const initials = getInitials(profile.name, profile.email);
  const memberSince = new Date(profile.created_at).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
  });

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      {/* Page header */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-vertra-text">Profile</h1>
        <p className="mt-1 text-sm text-vertra-text-dim">
          Manage your public profile and personal settings
        </p>
      </div>

      {/* ── Banner + Avatar ─────────────────────────────────────────────────── */}
      <div className="mb-6 overflow-hidden rounded-xl border border-vertra-border/60">
        {/* Banner */}
        <div
          className="relative h-28 w-full transition-colors duration-300"
          style={{ backgroundColor: bannerColor }}
        >
          <div className="absolute inset-0 bg-linear-to-br from-white/10 to-black/20" />
        </div>

        {/* Avatar + meta row */}
        <div className="bg-vertra-surface px-5 pb-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            {/* Avatar */}
            <div className="-mt-10 flex items-end gap-4">
              <div className="relative">
                <div className="h-20 w-20 overflow-hidden rounded-full border-4 border-vertra-surface bg-vertra-surface-alt">
                  {avatarSrc ? (
                    <Image
                      src={avatarSrc}
                      alt="Profile picture"
                      width={80}
                      height={80}
                      className="h-full w-full object-cover"
                      unoptimized
                    />
                  ) : (
                    <div
                      className="flex h-full w-full items-center justify-center text-xl font-bold text-vertra-text"
                      style={{ backgroundColor: bannerColor + '40' }}
                    >
                      {initials}
                    </div>
                  )}

                  {(isUploadingAvatar || isDeletingAvatar) && (
                    <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/60">
                      <Loader2 className="h-5 w-5 animate-spin text-white" />
                    </div>
                  )}
                </div>

                {/* Upload button overlay */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute bottom-0 right-0 flex h-6 w-6 items-center justify-center rounded-full border border-vertra-border bg-vertra-surface-alt text-vertra-text-dim shadow hover:text-vertra-text"
                  title="Change profile picture"
                >
                  <Camera className="h-3 w-3" />
                </button>
              </div>

              <div className="pb-1">
                <p className="font-semibold text-vertra-text">
                  {profile.name ?? profile.email}
                </p>
                <p className="text-xs text-vertra-text-dim">Member since {memberSince}</p>
              </div>
            </div>

            {/* Avatar actions */}
            <div className="flex gap-2 pb-1">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploadingAvatar}
              >
                <Camera className="h-3.5 w-3.5" />
                Upload photo
              </Button>
              {profile.avatar && (
                <Button
                  variant="danger"
                  size="sm"
                  onClick={handleDeleteAvatar}
                  disabled={isDeletingAvatar}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Remove
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleAvatarChange(file);
          e.target.value = '';
        }}
      />

      {/* ── Error / success banner ───────────────────────────────────────────── */}
      <AnimatePresence>
        {(errorMsg || saveStatus === 'success') && (
          <motion.div
            key={errorMsg ?? 'success'}
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className={`mb-5 flex items-center gap-2.5 rounded-lg border px-4 py-3 text-sm ${saveStatus === 'success'
              ? 'border-vertra-success/30 bg-vertra-success/10 text-vertra-success'
              : 'border-vertra-error/30 bg-vertra-error/10 text-vertra-error'
              }`}
          >
            {saveStatus === 'success' ? (
              <CheckCircle2 className="h-4 w-4 shrink-0" />
            ) : (
              <AlertCircle className="h-4 w-4 shrink-0" />
            )}
            {saveStatus === 'success' ? 'Profile saved successfully.' : errorMsg}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid gap-4">
        {/* ── Basic info ───────────────────────────────────────────────────────── */}
        <Section icon={<User className="h-4 w-4" />} title="Basic Information">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs text-vertra-text-dim">Display Name</label>
              <Input
                leadingIcon={<User className="h-3.5 w-3.5" />}
                placeholder="Your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={80}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs text-vertra-text-dim">Email</label>
              <Input
                leadingIcon={<Mail className="h-3.5 w-3.5" />}
                value={profile.email}
                disabled
                containerClassName="opacity-50 cursor-not-allowed"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-xs text-vertra-text-dim">
                Bio
                <span className="ml-1 text-vertra-text-dim/60">
                  ({bio.length}/200)
                </span>
              </label>
              <div className="rounded-lg border border-vertra-border/50 bg-vertra-surface-alt/80 px-3 py-2.5 transition-colors focus-within:border-vertra-cyan/70">
                <textarea
                  className="w-full resize-none bg-transparent text-sm text-vertra-text outline-none placeholder:text-vertra-text-dim/50"
                  rows={3}
                  placeholder="Tell the world about yourself…"
                  value={bio}
                  onChange={(e) => setBio(e.target.value.slice(0, 200))}
                />
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-xs text-vertra-text-dim">Location</label>
              <Input
                leadingIcon={<MapPin className="h-3.5 w-3.5" />}
                placeholder="City, Country"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                maxLength={100}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs text-vertra-text-dim">Website</label>
              <Input
                leadingIcon={<Globe className="h-3.5 w-3.5" />}
                placeholder="https://yoursite.com"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                maxLength={200}
                type="url"
              />
            </div>
          </div>
        </Section>

        {/* ── Banner colour ────────────────────────────────────────────────────── */}
        <Section icon={<Palette className="h-4 w-4" />} title="Profile Banner">
          <p className="mb-3 text-xs text-vertra-text-dim">
            Choose an accent colour for your profile banner.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            {BANNER_PRESETS.map((color) => (
              <button
                key={color}
                type="button"
                onClick={() => setBannerColor(color)}
                className={`h-8 w-8 rounded-full border-2 transition-transform hover:scale-110 ${bannerColor === color
                  ? 'border-white scale-110'
                  : 'border-transparent'
                  }`}
                style={{ backgroundColor: color }}
                title={color}
              />
            ))}
            {/* Custom colour input */}
            <label
              className="flex h-8 w-8 cursor-pointer items-center justify-center overflow-hidden rounded-full border-2 border-vertra-border hover:border-vertra-text-dim"
              title="Custom colour"
            >
              <input
                type="color"
                value={bannerColor}
                onChange={(e) => setBannerColor(e.target.value)}
                className="h-10 w-10 -translate-x-1 -translate-y-1 cursor-pointer opacity-0 absolute"
              />
              <div
                className="h-full w-full rounded-full"
                style={{ backgroundColor: bannerColor }}
              />
            </label>
            <span className="font-mono text-xs text-vertra-text-dim">{bannerColor}</span>
          </div>
        </Section>

        {/* ── Privacy ─────────────────────────────────────────────────────────── */}
        <Section icon={<Eye className="h-4 w-4" />} title="Privacy">
          <div className="divide-y divide-vertra-border/40">
            <Toggle
              checked={settings.showOnlineStatus ?? false}
              onChange={(v) => setSetting('showOnlineStatus', v)}
              label="Show online status"
              description="Let others see when you're active"
            />
            <Toggle
              checked={settings.allowComments ?? true}
              onChange={(v) => setSetting('allowComments', v)}
              label="Allow project comments"
              description="Others can comment on your published projects"
            />
          </div>
        </Section>

        {/* ── Notifications ────────────────────────────────────────────────────── */}
        <Section icon={<Bell className="h-4 w-4" />} title="Notifications">
          <div className="divide-y divide-vertra-border/40">
            <Toggle
              checked={settings.notifications?.projectComments ?? true}
              onChange={(v) => setNotification('projectComments', v)}
              label="Project comments"
              description="When someone comments on your project"
            />
            <Toggle
              checked={settings.notifications?.newFollowers ?? true}
              onChange={(v) => setNotification('newFollowers', v)}
              label="New followers"
            />
            <Toggle
              checked={settings.notifications?.systemUpdates ?? true}
              onChange={(v) => setNotification('systemUpdates', v)}
              label="System updates"
              description="Product announcements and important changes"
            />
          </div>
        </Section>

        {/* ── Appearance ───────────────────────────────────────────────────────── */}
        <Section icon={<Settings className="h-4 w-4" />} title="Appearance">
          <div>
            <label className="mb-1.5 block text-xs text-vertra-text-dim">Theme</label>
            <div className="flex gap-2">
              {(['system', 'dark', 'light'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setSetting('theme', t)}
                  className={`rounded-lg border px-4 py-2 text-xs capitalize transition-colors ${(settings.theme ?? 'dark') === t
                    ? 'border-vertra-cyan bg-vertra-cyan/10 text-vertra-cyan'
                    : 'border-vertra-border text-vertra-text-dim hover:border-vertra-border/80 hover:text-vertra-text'
                    }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        </Section>

        {/* ── Danger zone ──────────────────────────────────────────────────────── */}
        <Section icon={<AlertCircle className="h-4 w-4" />} title="Account">
          <div className="rounded-lg border border-vertra-error/20 bg-vertra-error/5 p-4">
            <p className="text-sm font-medium text-vertra-error">Danger Zone</p>
            <p className="mt-1 text-xs text-vertra-text-dim">
              Deleting your account is permanent and cannot be undone.
            </p>
            <Button variant="danger" size="sm" className="mt-3" disabled>
              Delete Account
            </Button>
          </div>
        </Section>
      </div>

      {/* ── Save button ──────────────────────────────────────────────────────────── */}
      <div className="mt-6 flex justify-end">
        <Button
          variant="primary"
          size="md"
          onClick={handleSave}
          disabled={isSaving}
        >
          {isSaving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          {isSaving ? 'Saving…' : 'Save Changes'}
        </Button>
      </div>
    </div>
  );
}
