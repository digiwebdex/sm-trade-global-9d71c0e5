import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { api } from '@/utils/api';
import { User } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2 } from 'lucide-react';

const emptyUser: { username: string; password: string; name: string; role: 'admin' | 'staff'; email: string } = { username: '', password: '', name: '', role: 'staff', email: '' };

export default function UsersPage() {
  const { isAdmin } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [editing, setEditing] = useState<User | null>(null);
  const [form, setForm] = useState(emptyUser);
  const [dialogOpen, setDialogOpen] = useState(false);

  const load = async () => {
    try {
      const data = await api.getUsers() as User[];
      setUsers(data);
    } catch (err) { toast.error('Failed to load users'); }
  };
  useEffect(() => { load(); }, []);

  if (!isAdmin) return <div className="p-8 text-center text-muted-foreground">Admin access required</div>;

  const handleSave = async () => {
    const cleanForm = { ...form, username: form.username.trim(), name: form.name.trim(), email: form.email.trim() };
    if (!cleanForm.username || !cleanForm.name) { toast.error('Username and name are required'); return; }
    try {
      if (editing) {
        const updates: any = { ...cleanForm };
        if (!updates.password) delete updates.password;
        await api.updateUser(editing.id, updates);
        toast.success('User updated');
      } else {
        if (!cleanForm.password) { toast.error('Password is required'); return; }
        await api.createUser(cleanForm);
        toast.success('User added');
      }
      setForm(emptyUser);
      setEditing(null);
      setDialogOpen(false);
      load();
    } catch (err) { toast.error('Failed to save user'); }
  };

  const handleEdit = (u: User) => {
    setEditing(u);
    setForm({ username: u.username, password: '', name: u.name, role: u.role, email: u.email });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Delete this user?')) {
      try {
        await api.deleteUser(id);
        toast.success('User deleted');
        load();
      } catch (err) { toast.error('Failed to delete user'); }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">User Management</h1>
          <p className="text-muted-foreground">Manage staff accounts</p>
        </div>
        <Button onClick={() => { setEditing(null); setForm(emptyUser); setDialogOpen(true); }} className="bg-secondary hover:bg-secondary/90">
          <Plus className="h-4 w-4 mr-2" /> Add User
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Username</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead className="w-24">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">{u.name}</TableCell>
                  <TableCell>{u.username}</TableCell>
                  <TableCell>{u.email}</TableCell>
                  <TableCell><span className={`px-2 py-1 rounded-full text-xs ${u.role === 'admin' ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>{u.role}</span></TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" onClick={() => handleEdit(u)}><Pencil className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" onClick={() => handleDelete(u.id)} className="text-destructive"><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? 'Edit User' : 'Add User'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><label className="text-sm font-medium">Name *</label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div><label className="text-sm font-medium">Username *</label><Input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} /></div>
            <div><label className="text-sm font-medium">{editing ? 'Password (leave empty to keep)' : 'Password *'}</label><Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></div>
            <div><label className="text-sm font-medium">Email</label><Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
            <div>
              <label className="text-sm font-medium">Role</label>
              <Select value={form.role} onValueChange={(v: 'admin' | 'staff') => setForm({ ...form, role: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="admin">Admin</SelectItem><SelectItem value="staff">Staff</SelectItem></SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleSave} className="bg-secondary hover:bg-secondary/90">Save</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
