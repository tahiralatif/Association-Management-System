"use client";

import { useState, useEffect } from "react";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/components/ui/toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader, StatusBadge, Textarea } from "@/components/ui/shared";
import { User, Save, Lock, Shield } from "lucide-react";

interface MyProfile {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  roles: string[];
  member_profile?: {
    phone?: string;
    organization?: string;
    job_title?: string;
    bio?: string;
    status: string;
    tier?: string;
    member_number?: string;
    joined_at?: string;
    expires_at?: string;
    address?: Record<string, string>;
    social_links?: Record<string, string>;
    interests?: string[];
    email_opt_in?: boolean;
  };
}

export default function ProfilePage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [profile, setProfile] = useState<MyProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  // Profile form
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [organization, setOrganization] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [bio, setBio] = useState("");

  // Password form
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    try {
      const data = await apiFetch<MyProfile>("/api/v1/members/me");
      setProfile(data);
      setFirstName(data.first_name || "");
      setLastName(data.last_name || "");
      setPhone(data.member_profile?.phone || "");
      setOrganization(data.member_profile?.organization || "");
      setJobTitle(data.member_profile?.job_title || "");
      setBio(data.member_profile?.bio || "");
    } catch (e) {
      	toast("error", "Failed to load profile");
    } finally {
      setLoading(false);
    }
  }

  async function saveProfile() {
    setSaving(true);
    try {
      await apiFetch("/api/v1/members/me", {
        method: "PATCH",
        body: JSON.stringify({
          first_name: firstName,
          last_name: lastName,
          phone,
          organization,
          job_title: jobTitle,
          bio,
        }),
      });
      	toast("success", "Profile updated successfully");
      loadProfile();
    } catch (e: any) {
      	toast("error", e.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  }

  async function changePassword() {
    if (newPassword !== confirmPassword) {
      	toast("error", "Passwords don't match");
      return;
    }
    if (newPassword.length < 8) {
      	toast("error", "Password must be at least 8 characters");
      return;
    }
    setChangingPassword(true);
    try {
      await apiFetch("/api/v1/members/me/change-password", {
        method: "POST",
        body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
      });
      	toast("success", "Password changed successfully");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (e: any) {
      	toast("error", e.message || "Failed to change password");
    } finally {
      setChangingPassword(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-teal-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl space-y-6">
      <PageHeader
        title="My Profile"
        description="Manage your account settings and personal information"
      />

      {/* Profile Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Personal Information
          </CardTitle>
          <CardDescription>Your basic profile details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>First Name</Label>
              <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Last Name</Label>
              <Input value={lastName} onChange={(e) => setLastName(e.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input value={profile?.email || ""} disabled className="bg-slate-50" />
            <p className="text-xs text-slate-400">Email cannot be changed</p>
          </div>
          <div className="space-y-2">
            <Label>Phone</Label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+1 (555) 000-0000" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Organization</Label>
              <Input value={organization} onChange={(e) => setOrganization(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Job Title</Label>
              <Input value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Bio</Label>
            <Textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={3} placeholder="Tell us about yourself..." />
          </div>
          <div className="flex justify-end">
            <Button onClick={saveProfile} disabled={saving} className="bg-teal-600 hover:bg-teal-700">
              <Save className="h-4 w-4 mr-2" />
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Membership Info */}
      {profile?.member_profile && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Membership Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-slate-500">Member Number</span>
                <p className="font-medium">{profile.member_profile.member_number || "—"}</p>
              </div>
              <div>
                <span className="text-slate-500">Status</span>
                <p><StatusBadge status={profile.member_profile.status} /></p>
              </div>
              <div>
                <span className="text-slate-500">Tier</span>
                <p className="font-medium capitalize">{profile.member_profile.tier || "—"}</p>
              </div>
              <div>
                <span className="text-slate-500">Joined</span>
                <p className="font-medium">
                  {profile.member_profile.joined_at
                    ? new Date(profile.member_profile.joined_at).toLocaleDateString()
                    : "—"}
                </p>
              </div>
              <div>
                <span className="text-slate-500">Expires</span>
                <p className="font-medium">
                  {profile.member_profile.expires_at
                    ? new Date(profile.member_profile.expires_at).toLocaleDateString()
                    : "—"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Change Password */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            Change Password
          </CardTitle>
          <CardDescription>Update your account password</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Current Password</Label>
            <Input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>New Password</Label>
              <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Confirm New Password</Label>
              <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
            </div>
          </div>
          <div className="flex justify-end">
            <Button onClick={changePassword} disabled={changingPassword} variant="outline">
              <Lock className="h-4 w-4 mr-2" />
              {changingPassword ? "Changing..." : "Change Password"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
