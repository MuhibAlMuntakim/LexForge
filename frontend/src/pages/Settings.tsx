import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { useGlobalContext } from "@/contexts/GlobalContext";
import { toast } from "@/components/ui/sonner";

const tabs = ["Account", "Company", "Billing", "API Keys", "Playbook Defaults"];
const USER_PROFILE_KEY = "user_profile";

type UserProfile = {
  fullName: string;
  email: string;
  role: string;
};

const getStoredUserProfile = (): UserProfile => {
  try {
    const raw = localStorage.getItem(USER_PROFILE_KEY);
    if (!raw) {
      return {
        fullName: "John Doe",
        email: "john@acmecorp.com",
        role: "General Counsel",
      };
    }
    const parsed = JSON.parse(raw) as Partial<UserProfile>;
    return {
      fullName: parsed.fullName || "John Doe",
      email: parsed.email || "john@acmecorp.com",
      role: parsed.role || "General Counsel",
    };
  } catch {
    return {
      fullName: "John Doe",
      email: "john@acmecorp.com",
      role: "General Counsel",
    };
  }
};

const SettingsPage = () => {
  const [activeTab, setActiveTab] = useState("Account");
  const { profilePicture, setProfilePicture } = useGlobalContext();
  const [profile, setProfile] = useState<UserProfile>(() => getStoredUserProfile());
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSaveAccountSettings = () => {
    localStorage.setItem(USER_PROFILE_KEY, JSON.stringify(profile));
    window.dispatchEvent(new Event("user-profile-updated"));
    toast("Account settings saved");
  };

  const handlePictureChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfilePicture(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage your account and preferences</p>
      </div>

      <div className="flex gap-6">
        {/* Tabs */}
        <div className="w-48 flex-shrink-0 space-y-1">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                activeTab === tab
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 bg-card border border-border rounded-xl p-6 max-w-2xl">
          {activeTab === "Account" && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-foreground">Account Settings</h3>
                <p className="text-sm text-muted-foreground">Manage your personal account details</p>
              </div>
              <Separator />
              <div className="grid gap-4">
                <div className="flex items-center gap-4 mb-2">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden border border-border">
                    {profilePicture ? (
                      <img src={profilePicture} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-primary text-xl font-semibold">JD</span>
                    )}
                  </div>
                  <div>
                    <input 
                      type="file" 
                      accept="image/*" 
                      className="hidden" 
                      ref={fileInputRef} 
                      onChange={handlePictureChange} 
                    />
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                        Upload Picture
                      </Button>
                      {profilePicture && (
                        <Button variant="ghost" size="sm" onClick={() => setProfilePicture(null)} className="text-destructive">
                          Remove
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label>Full Name</Label>
                  <Input
                    value={profile.fullName}
                    onChange={(e) => setProfile((prev) => ({ ...prev, fullName: e.target.value }))}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Email</Label>
                  <Input
                    value={profile.email}
                    onChange={(e) => setProfile((prev) => ({ ...prev, email: e.target.value }))}
                    type="email"
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Role</Label>
                  <Input
                    value={profile.role}
                    onChange={(e) => setProfile((prev) => ({ ...prev, role: e.target.value }))}
                  />
                </div>
              </div>
              <Button size="sm" onClick={handleSaveAccountSettings}>Save Changes</Button>
            </div>
          )}

          {activeTab === "Company" && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-foreground">Company Settings</h3>
                <p className="text-sm text-muted-foreground">Manage your organization details</p>
              </div>
              <Separator />
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label>Company Name</Label>
                  <Input defaultValue="Acme Corp" />
                </div>
                <div className="grid gap-2">
                  <Label>Industry</Label>
                  <Input defaultValue="Technology" />
                </div>
              </div>
              <Button size="sm">Save Changes</Button>
            </div>
          )}

          {activeTab === "Billing" && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-foreground">Billing</h3>
                <p className="text-sm text-muted-foreground">Manage your subscription and payment methods</p>
              </div>
              <Separator />
              <div className="p-4 rounded-lg bg-muted/50">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-foreground">Enterprise Plan</p>
                    <p className="text-sm text-muted-foreground">$499/month • Billed annually</p>
                  </div>
                  <Button variant="outline" size="sm">Manage</Button>
                </div>
              </div>
            </div>
          )}

          {activeTab === "API Keys" && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-foreground">API Keys</h3>
                <p className="text-sm text-muted-foreground">Manage API keys for integrations</p>
              </div>
              <Separator />
              <div className="p-4 rounded-lg border border-border">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-foreground">Production Key</p>
                    <p className="text-xs text-muted-foreground font-mono">sk_live_•••••••••••••••</p>
                  </div>
                  <Button variant="outline" size="sm">Regenerate</Button>
                </div>
              </div>
              <Button size="sm" className="gap-2">Create New Key</Button>
            </div>
          )}

          {activeTab === "Playbook Defaults" && (
             <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-foreground">Playbook Defaults</h3>
                <p className="text-sm text-muted-foreground">Set default rules for new playbooks</p>
              </div>
              <Separator />
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label>Default Severity Level</Label>
                  <Input defaultValue="Medium" />
                </div>
                <div className="grid gap-2">
                  <Label>Default Review Template</Label>
                  <Input defaultValue="Standard Enterprise Review" />
                </div>
              </div>
              <Button size="sm">Save Defaults</Button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default SettingsPage;