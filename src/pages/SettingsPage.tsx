import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { api } from '@/utils/api';
import { CompanySettings } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Save, Upload, X, KeyRound, Eye, EyeOff } from 'lucide-react';

function ChangePasswordCard() {
  const { user } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!user?.id) { toast.error('Not signed in'); return; }
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error('All password fields are required'); return;
    }
    if (newPassword.length < 6) { toast.error('New password must be at least 6 characters'); return; }
    if (newPassword !== confirmPassword) { toast.error('New passwords do not match'); return; }
    if (newPassword === currentPassword) { toast.error('New password must differ from current password'); return; }
    setSaving(true);
    try {
      await api.changePassword(user.id, currentPassword, newPassword);
      toast.success('Password updated successfully');
      setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to update password');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><KeyRound className="h-5 w-5" /> Change Password</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">Update the password for <span className="font-medium text-foreground">{user?.email || user?.username}</span>.</p>
        <div>
          <label className="text-sm font-medium">Current Password</label>
          <div className="relative">
            <Input type={showCurrent ? 'text' : 'password'} value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} autoComplete="current-password" />
            <button type="button" onClick={() => setShowCurrent(s => !s)} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground">
              {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>
        <div>
          <label className="text-sm font-medium">New Password</label>
          <div className="relative">
            <Input type={showNew ? 'text' : 'password'} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} autoComplete="new-password" />
            <button type="button" onClick={() => setShowNew(s => !s)} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground">
              {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <p className="text-xs text-muted-foreground mt-1">Minimum 6 characters.</p>
        </div>
        <div>
          <label className="text-sm font-medium">Confirm New Password</label>
          <Input type={showNew ? 'text' : 'password'} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} autoComplete="new-password" />
        </div>
        <Button onClick={handleSubmit} disabled={saving} className="bg-secondary hover:bg-secondary/90">
          <KeyRound className="h-4 w-4 mr-2" /> {saving ? 'Updating...' : 'Update Password'}
        </Button>
      </CardContent>
    </Card>
  );
}

function SignatureUpload({ label, value, onChange }: { label: string; value?: string; onChange: (val: string) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 500 * 1024) { toast.error('File too large (max 500KB)'); return; }
    const reader = new FileReader();
    reader.onload = () => onChange(reader.result as string);
    reader.readAsDataURL(file);
  };

  return (
    <div>
      <label className="text-sm font-medium">{label}</label>
      <div className="mt-1 border rounded-lg p-3 flex items-center gap-3 bg-muted/30">
        {value ? (
          <>
            <div className="w-[120px] h-[50px] border rounded flex items-center justify-center bg-white">
              <img src={value} alt={label} className="max-w-[110px] max-h-[45px] object-contain" />
            </div>
            <Button size="sm" variant="ghost" className="text-destructive" onClick={() => onChange('')}><X className="h-4 w-4 mr-1" /> Remove</Button>
          </>
        ) : (
          <Button size="sm" variant="outline" onClick={() => inputRef.current?.click()}>
            <Upload className="h-4 w-4 mr-1" /> Upload Signature
          </Button>
        )}
        <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
      </div>
    </div>
  );
}

const defaultSettings: CompanySettings = {
  name: 'S. M. Trade International',
  tagline: '1st Class Govt. Contractor, Supplier & Importer',
  address: 'House # 7, Road # 19/A, Sector # 4, Uttara, Dhaka-1230',
  phone: '+8801886766688',
  email: 'info@smtradeint.com',
  website: 'www.smtradeint.com',
  logo: '',
};

export default function SettingsPage() {
  const { isAdmin } = useAuth();
  const [settings, setSettings] = useState<CompanySettings>(defaultSettings);

  useEffect(() => {
    api.getSettings().then((d: any) => {
      if (d && d.name) setSettings(d);
    }).catch(() => {});
  }, []);

  const handleSave = async () => {
    try {
      await api.updateSettings(settings);
      toast.success('Company settings saved');
    } catch (err) { toast.error('Failed to save settings'); }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Settings</h1>
        <p className="text-muted-foreground">Manage your account and company configuration</p>
      </div>

      <ChangePasswordCard />

      {!isAdmin ? null : (<>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle>Company Information</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div><label className="text-sm font-medium">Company Name</label><Input value={settings.name} onChange={(e) => setSettings({ ...settings, name: e.target.value })} /></div>
            <div><label className="text-sm font-medium">Tagline</label><Input value={settings.tagline} onChange={(e) => setSettings({ ...settings, tagline: e.target.value })} /></div>
            <div><label className="text-sm font-medium">Address</label><Textarea value={settings.address} onChange={(e) => setSettings({ ...settings, address: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="text-sm font-medium">Phone</label><Input value={settings.phone} onChange={(e) => setSettings({ ...settings, phone: e.target.value })} /></div>
              <div><label className="text-sm font-medium">Email</label><Input value={settings.email} onChange={(e) => setSettings({ ...settings, email: e.target.value })} /></div>
            </div>
            <div><label className="text-sm font-medium">Website</label><Input value={settings.website} onChange={(e) => setSettings({ ...settings, website: e.target.value })} /></div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Document Signatures</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">Upload signature images to appear on all documents (Invoice, Quotation, Challan, PO).</p>
            <SignatureUpload label="Received by - Signature" value={settings.signatureReceived} onChange={(v) => setSettings({ ...settings, signatureReceived: v })} />
            <SignatureUpload label="Prepared by - Signature" value={settings.signaturePrepared} onChange={(v) => setSettings({ ...settings, signaturePrepared: v })} />
            <SignatureUpload label="Authorize by - Signature" value={settings.signatureAuthorize} onChange={(v) => setSettings({ ...settings, signatureAuthorize: v })} />
          </CardContent>
        </Card>
      </div>

      <Button onClick={handleSave} className="bg-secondary hover:bg-secondary/90"><Save className="h-4 w-4 mr-2" /> Save Settings</Button>
      </>)}
    </div>
  );
}
