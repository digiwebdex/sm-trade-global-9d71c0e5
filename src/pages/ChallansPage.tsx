import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { api } from '@/utils/api';
import { generateId, generateDocNumber } from '@/utils/documentNumbers';
import { Challan, ChallanItem, Customer } from '@/types';
import DocumentPreview, { printDocument, downloadDocument } from '@/components/DocumentPreview';
import { toast } from 'sonner';
import { Plus, Trash2, Eye, ArrowLeft, Search, Pencil, Printer, Upload } from 'lucide-react';
import SignatureUploadField from '@/components/SignatureUploadField';

const emptyItem = (): ChallanItem => ({ id: generateId(), itemName: '', details: '', size: '', deliveryQty: 0, balanceQty: 0, unit: 'Pcs' });

export default function ChallansPage() {
  const navigate = useNavigate();
  const { action } = useParams();
  const [challans, setChallans] = useState<Challan[]>([]);
  const [search, setSearch] = useState('');

  const load = async () => {
    try {
      const data = await api.getChallans() as Challan[];
      setChallans(data);
    } catch (err) { toast.error('Failed to load challans'); }
  };
  useEffect(() => { load(); }, [action]);

  if (action === 'new' || action?.startsWith('edit-')) {
    return <ChallanForm editId={action.startsWith('edit-') ? action.replace('edit-', '') : undefined} onDone={() => { load(); navigate('/challans'); }} />;
  }
  if (action?.startsWith('view-')) {
    return <ChallanView id={action.replace('view-', '')} onBack={() => navigate('/challans')} />;
  }

  const filtered = challans.filter(c => c.challanNumber.toLowerCase().includes(search.toLowerCase()) || c.customerName.toLowerCase().includes(search.toLowerCase()));

  const handleDelete = async (id: string) => {
    if (confirm('Delete?')) {
      try {
        await api.deleteChallan(id);
        toast.success('Deleted');
        load();
      } catch (err) { toast.error('Failed to delete'); }
    }
  };

  const statusBadge = (status: string) => {
    const variants: Record<string, { className: string; label: string }> = {
      delivered: { className: 'bg-emerald-100 text-emerald-700 border-emerald-200', label: 'Delivered' },
      processing: { className: 'bg-yellow-100 text-yellow-700 border-yellow-200', label: 'Processing' },
      complete: { className: 'bg-teal-100 text-teal-700 border-teal-200', label: 'Complete' },
      draft: { className: 'bg-gray-100 text-gray-600 border-gray-200', label: 'Draft' },
    };
    const v = variants[status] || variants.draft;
    return <Badge variant="outline" className={`${v.className} font-semibold text-xs`}>{v.label}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Challans</h1>
          <p className="text-muted-foreground">Manage delivery notes</p>
        </div>
        <Button onClick={() => navigate('/challans/new')} className="bg-secondary hover:bg-secondary/90"><Plus className="h-4 w-4 mr-2" /> New Challan</Button>
      </div>
      <Card>
        <CardHeader>
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search by challan # or customer..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Challan #</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Order No</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="w-32 text-center">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No challans found</TableCell></TableRow>
              ) : filtered.map((c) => (
                <TableRow key={c.id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/challans/view-${c.id}`)}>
                  <TableCell className="font-bold text-primary">{c.challanNumber}</TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium text-sm">{c.customerName}</p>
                      <p className="text-xs text-muted-foreground">{c.customerAddress}</p>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">{new Date(c.date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</TableCell>
                  <TableCell className="font-medium">{c.orderNo}</TableCell>
                  <TableCell className="text-center">{statusBadge(c.status)}</TableCell>
                  <TableCell>
                    <div className="flex gap-1 justify-center" onClick={(e) => e.stopPropagation()}>
                      <Button size="icon" variant="ghost" onClick={() => navigate(`/challans/view-${c.id}`)} title="View"><Eye className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" onClick={() => navigate(`/challans/edit-${c.id}`)} title="Edit"><Pencil className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" onClick={() => handleDelete(c.id)} className="text-destructive" title="Delete"><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function ChallanForm({ editId, onDone }: { editId?: string; onDone: () => void }) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [existing, setExisting] = useState<Challan | null>(null);
  const [loading, setLoading] = useState(true);

  const [form, setForm] = useState({
    customerId: '',
    customerName: '',
    customerAddress: '',
    customerPhone: '',
    date: new Date().toISOString().split('T')[0],
    challanNumber: '',
    orderNo: '',
    items: [emptyItem()],
    status: 'draft' as 'draft' | 'delivered',
    notes: '',
    signatureReceived: '',
    signaturePrepared: '',
    signatureAuthorize: '',
  });

  useEffect(() => {
    const init = async () => {
      try {
        const [custs, chals] = await Promise.all([
          api.getCustomers() as Promise<Customer[]>,
          api.getChallans() as Promise<Challan[]>,
        ]);
        setCustomers(custs);

        let editData: Challan | null = null;
        if (editId) {
          editData = await api.getChallan(editId) as Challan;
          setExisting(editData);
        }

        setForm({
          customerId: editData?.customerId || '',
          customerName: editData?.customerName || '',
          customerAddress: editData?.customerAddress || '',
          customerPhone: editData?.customerPhone || '',
          date: editData?.date || new Date().toISOString().split('T')[0],
          challanNumber: editData?.challanNumber || generateDocNumber('CLN', chals.map(c => c.challanNumber)),
          orderNo: editData?.orderNo || '',
          items: editData?.items || [emptyItem()],
          status: editData?.status || 'draft',
          notes: editData?.notes || '',
          signatureReceived: editData?.signatureReceived || '',
          signaturePrepared: editData?.signaturePrepared || '',
          signatureAuthorize: editData?.signatureAuthorize || '',
        });
      } catch (err) { toast.error('Failed to load data'); }
      setLoading(false);
    };
    init();
  }, [editId]);

  if (loading) return <div className="p-8 text-center text-muted-foreground">Loading...</div>;

  const selectCustomer = (id: string) => {
    const c = customers.find(c => c.id === id);
    if (c) setForm({ ...form, customerId: c.id, customerName: c.name, customerAddress: c.address, customerPhone: c.phone });
  };

  const updateItem = (index: number, field: keyof ChallanItem, value: any) => {
    const items = [...form.items];
    (items[index] as any)[field] = value;
    setForm({ ...form, items });
  };

  const totalQuantity = form.items.reduce((s, i) => s + i.deliveryQty, 0);

  const handleSave = async () => {
    if (!form.customerName) { toast.error('Select a customer'); return; }
    const data: Challan = { ...form, id: editId || generateId(), totalQuantity, createdAt: existing?.createdAt || new Date().toISOString() };
    try {
      if (editId) await api.updateChallan(editId, data);
      else await api.createChallan(data);
      toast.success(editId ? 'Updated' : 'Created');
      onDone();
    } catch (err) { toast.error('Failed to save challan'); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4"><Button variant="ghost" onClick={onDone}><ArrowLeft className="h-4 w-4 mr-2" /> Back</Button><h1 className="text-2xl font-bold">{editId ? 'Edit Challan' : 'New Challan'}</h1></div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle>Challan Details</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div><label className="text-sm font-medium">Challan #</label><Input value={form.challanNumber} onChange={(e) => setForm({ ...form, challanNumber: e.target.value })} className="font-bold" /></div>
              <div><label className="text-sm font-medium">Date</label><Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></div>
              <div><label className="text-sm font-medium">Order No</label><Input value={form.orderNo} onChange={(e) => setForm({ ...form, orderNo: e.target.value })} /></div>
            </div>
            <div><label className="text-sm font-medium">Select Customer (or type manually below)</label>
              <Select value={form.customerId} onValueChange={selectCustomer}><SelectTrigger><SelectValue placeholder="Select customer" /></SelectTrigger><SelectContent>{customers.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent></Select></div>
            <div className="grid grid-cols-1 gap-3">
              <div><label className="text-sm font-medium">Customer Name *</label><Input value={form.customerName} onChange={(e) => setForm({ ...form, customerName: e.target.value })} placeholder="Customer name" /></div>
              <div><label className="text-sm font-medium">Customer Address</label><Textarea value={form.customerAddress} onChange={(e) => setForm({ ...form, customerAddress: e.target.value })} placeholder="Address" rows={2} /></div>
              <div><label className="text-sm font-medium">Customer Phone</label><Input value={form.customerPhone} onChange={(e) => setForm({ ...form, customerPhone: e.target.value })} placeholder="Phone" /></div>
            </div>
            <div><label className="text-sm font-medium">Status</label>
              <Select value={form.status} onValueChange={(v: any) => setForm({ ...form, status: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="draft">Draft</SelectItem><SelectItem value="processing">Processing</SelectItem><SelectItem value="delivered">Delivered</SelectItem><SelectItem value="complete">Complete</SelectItem></SelectContent></Select></div>
            <div>
              <div className="flex justify-between items-center mb-3">
                <label className="text-sm font-semibold flex items-center gap-2" style={{ color: '#1B3A5C' }}>
                  <span className="text-lg">📦</span> Challan Items
                </label>
                <Button size="sm" variant="outline" onClick={() => setForm({ ...form, items: [...form.items, emptyItem()] })}><Plus className="h-3 w-3 mr-1" /> Add Item</Button>
              </div>
              <div className="space-y-3">
                {form.items.map((item, i) => (
                  <div key={item.id} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-muted-foreground">{i + 1}.</span>
                      <Input className="flex-1" placeholder="Item Name" value={item.itemName} onChange={(e) => updateItem(i, 'itemName', e.target.value)} />
                      <Button size="icon" variant="ghost" className="text-muted-foreground hover:text-destructive shrink-0" onClick={() => setForm({ ...form, items: form.items.filter((_, j) => j !== i) })}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-muted-foreground mb-1 block">Details</label>
                        <Input placeholder="Details" value={item.details} onChange={(e) => updateItem(i, 'details', e.target.value)} />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground mb-1 block">Size</label>
                        <Input placeholder="Size" value={item.size} onChange={(e) => updateItem(i, 'size', e.target.value)} />
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="text-xs text-muted-foreground mb-1 block">Delivery Qty</label>
                        <Input type="number" value={item.deliveryQty} onChange={(e) => updateItem(i, 'deliveryQty', parseFloat(e.target.value) || 0)} className="text-center" />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground mb-1 block">Balance Qty</label>
                        <Input type="number" value={item.balanceQty} onChange={(e) => updateItem(i, 'balanceQty', parseFloat(e.target.value) || 0)} className="text-center" />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground mb-1 block">Unit</label>
                        <Input placeholder="Pcs" value={item.unit} onChange={(e) => updateItem(i, 'unit', e.target.value)} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="text-right mt-3 font-bold" style={{ color: '#1B3A5C' }}>Total Delivery Qty: {totalQuantity}</div>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Signatures</label>
              <div className="grid grid-cols-3 gap-3">
                {([['signatureReceived','Received by'],['signaturePrepared','Prepared by'],['signatureAuthorize','Authorize by']] as const).map(([key, label]) => (
                  <SignatureUploadField key={key} label={label} value={form[key]} onChange={(v) => setForm({ ...form, [key]: v })} />
                ))}
              </div>
            </div>
            <div><label className="text-sm font-medium">Notes</label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
            <Button onClick={handleSave} className="w-full bg-secondary hover:bg-secondary/90">Save Challan</Button>
          </CardContent>
        </Card>
        <DocumentPreview type="challan" documentNumber={form.challanNumber} date={form.date} customerName={form.customerName} customerAddress={form.customerAddress} customerPhone={form.customerPhone} challanItems={form.items} totalQuantity={totalQuantity} orderNo={form.orderNo} notes={form.notes} status={form.status} signatureReceived={form.signatureReceived} signaturePrepared={form.signaturePrepared} signatureAuthorize={form.signatureAuthorize} />
      </div>
    </div>
  );
}

function ChallanView({ id, onBack }: { id: string; onBack: () => void }) {
  const navigate = useNavigate();
  const [c, setC] = useState<Challan | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getChallan(id).then((d: any) => { setC(d); setLoading(false); }).catch(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="p-8 text-center text-muted-foreground">Loading...</div>;
  if (!c) return <div>Not found</div>;

  const handleShare = async () => {
    const shareData = { title: `Challan ${c.challanNumber}`, text: `Challan ${c.challanNumber} - ${c.customerName}`, url: window.location.href };
    if (navigator.share) { try { await navigator.share(shareData); } catch {} }
    else { await navigator.clipboard.writeText(window.location.href); toast.success('Link copied to clipboard!'); }
  };

  return (
    <div className="space-y-4">
      <div className="no-print">
        <div className="flex items-center gap-4 mb-4">
          <Button variant="ghost" onClick={onBack}><ArrowLeft className="h-4 w-4 mr-2" /> Back</Button>
          <div>
            <h1 className="text-2xl font-bold">{c.challanNumber}</h1>
            <p className="text-sm text-muted-foreground">Challan Preview</p>
          </div>
          <Badge variant="outline" className={c.status === 'delivered' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'}>
            {c.status.charAt(0).toUpperCase() + c.status.slice(1)}
          </Badge>
        </div>
        <div className="flex flex-wrap gap-3 mb-4">
          <Button onClick={() => downloadDocument(c.challanNumber)} variant="outline" className="gap-2"><Download className="h-4 w-4" /> Download Challan</Button>
          <Button onClick={() => printDocument(c.challanNumber)} variant="outline" className="gap-2"><Printer className="h-4 w-4" /> Print</Button>
          <Button onClick={handleShare} variant="outline" className="gap-2"><Eye className="h-4 w-4" /> Share</Button>
          <Button onClick={() => navigate(`/challans/edit-${id}`)} variant="outline" className="gap-2"><Pencil className="h-4 w-4" /> Quick Edit</Button>
          <Button onClick={() => navigate(`/challans/edit-${id}`)} className="bg-secondary hover:bg-secondary/90 gap-2"><Pencil className="h-4 w-4" /> Full Edit</Button>
        </div>
      </div>
      <DocumentPreview type="challan" documentNumber={c.challanNumber} date={c.date} customerName={c.customerName} customerAddress={c.customerAddress} customerPhone={c.customerPhone} challanItems={c.items} totalQuantity={c.totalQuantity} orderNo={c.orderNo} notes={c.notes} status={c.status} signatureReceived={c.signatureReceived} signaturePrepared={c.signaturePrepared} signatureAuthorize={c.signatureAuthorize} />
    </div>
  );
}
