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
import { formatBDT } from '@/lib/utils';
import { generateId, generateDocNumber } from '@/utils/documentNumbers';
import { Quotation, LineItem, Customer } from '@/types';
import DocumentPreview, { printDocument } from '@/components/DocumentPreview';
import { toast } from 'sonner';
import { Plus, Trash2, Eye, ArrowLeft, Search, Pencil, Printer, Upload } from 'lucide-react';
import SignatureUploadField from '@/components/SignatureUploadField';

const emptyItem = (): LineItem => ({ id: generateId(), description: '', quantity: 1, unitPrice: 0, total: 0 });

export default function QuotationsPage() {
  const navigate = useNavigate();
  const { action } = useParams();
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [search, setSearch] = useState('');

  const load = async () => {
    try {
      const data = await api.getQuotations() as Quotation[];
      setQuotations(data);
    } catch (err) { toast.error('Failed to load quotations'); }
  };
  useEffect(() => { load(); }, [action]);

  if (action === 'new' || action?.startsWith('edit-')) {
    return <QuotationForm editId={action.startsWith('edit-') ? action.replace('edit-', '') : undefined} onDone={() => { load(); navigate('/quotations'); }} />;
  }
  if (action?.startsWith('view-')) {
    return <QuotationView id={action.replace('view-', '')} onBack={() => navigate('/quotations')} />;
  }

  const filtered = quotations.filter(q => q.quotationNumber.toLowerCase().includes(search.toLowerCase()) || q.customerName.toLowerCase().includes(search.toLowerCase()));

  const handleDelete = async (id: string) => {
    if (confirm('Delete this quotation?')) {
      try {
        await api.deleteQuotation(id);
        toast.success('Deleted');
        load();
      } catch (err) { toast.error('Failed to delete'); }
    }
  };

  const statusBadge = (status: string) => {
    const variants: Record<string, { className: string; label: string }> = {
      accepted: { className: 'bg-emerald-100 text-emerald-700 border-emerald-200', label: 'Accepted' },
      processing: { className: 'bg-yellow-100 text-yellow-700 border-yellow-200', label: 'Processing' },
      complete: { className: 'bg-teal-100 text-teal-700 border-teal-200', label: 'Complete' },
      sent: { className: 'bg-blue-100 text-blue-700 border-blue-200', label: 'Sent' },
      rejected: { className: 'bg-red-100 text-red-700 border-red-200', label: 'Rejected' },
      draft: { className: 'bg-gray-100 text-gray-600 border-gray-200', label: 'Draft' },
    };
    const v = variants[status] || variants.draft;
    return <Badge variant="outline" className={`${v.className} font-semibold text-xs`}>{v.label}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Quotations</h1>
          <p className="text-muted-foreground">Manage quotations</p>
        </div>
        <Button onClick={() => navigate('/quotations/new')} className="bg-secondary hover:bg-secondary/90"><Plus className="h-4 w-4 mr-2" /> New Quotation</Button>
      </div>
      <Card>
        <CardHeader>
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search by quotation # or customer..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Quotation #</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Amount (BDT)</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="w-32 text-center">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No quotations found</TableCell></TableRow>
              ) : filtered.map((q) => (
                <TableRow key={q.id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/quotations/view-${q.id}`)}>
                  <TableCell className="font-bold text-primary">{q.quotationNumber}</TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium text-sm">{q.customerName}</p>
                      <p className="text-xs text-muted-foreground">{q.customerAddress}</p>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">{new Date(q.date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</TableCell>
                  <TableCell className="text-right font-bold">৳{formatBDT(q.totalAmount)}</TableCell>
                  <TableCell className="text-center">{statusBadge(q.status)}</TableCell>
                  <TableCell>
                    <div className="flex gap-1 justify-center" onClick={(e) => e.stopPropagation()}>
                      <Button size="icon" variant="ghost" onClick={() => navigate(`/quotations/view-${q.id}`)} title="View"><Eye className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" onClick={() => navigate(`/quotations/edit-${q.id}`)} title="Edit"><Pencil className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" onClick={() => handleDelete(q.id)} className="text-destructive" title="Delete"><Trash2 className="h-4 w-4" /></Button>
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

function QuotationForm({ editId, onDone }: { editId?: string; onDone: () => void }) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [existing, setExisting] = useState<Quotation | null>(null);
  const [loading, setLoading] = useState(true);

  const [form, setForm] = useState({
    customerId: '',
    customerName: '',
    customerAddress: '',
    customerPhone: '',
    date: new Date().toISOString().split('T')[0],
    quotationNumber: '',
    items: [emptyItem()],
    status: 'draft' as 'draft' | 'sent' | 'accepted' | 'rejected',
    validUntil: '',
    notes: '',
    amountInWords: '',
    signatureReceived: '',
    signaturePrepared: '',
    signatureAuthorize: '',
  });

  useEffect(() => {
    const init = async () => {
      try {
        const [custs, quots] = await Promise.all([
          api.getCustomers() as Promise<Customer[]>,
          api.getQuotations() as Promise<Quotation[]>,
        ]);
        setCustomers(custs);

        let editData: Quotation | null = null;
        if (editId) {
          editData = await api.getQuotation(editId) as Quotation;
          setExisting(editData);
        }

        setForm({
          customerId: editData?.customerId || '',
          customerName: editData?.customerName || '',
          customerAddress: editData?.customerAddress || '',
          customerPhone: editData?.customerPhone || '',
          date: editData?.date || new Date().toISOString().split('T')[0],
          quotationNumber: editData?.quotationNumber || generateDocNumber('QTS', quots.map(q => q.quotationNumber)),
          items: editData?.items ? editData.items.map(i => ({ ...i, quantity: Number(i.quantity) || 0, unitPrice: Number(i.unitPrice) || 0, total: Number(i.total) || 0 })) : [emptyItem()],
          status: editData?.status || 'draft',
          validUntil: editData?.validUntil || '',
          notes: editData?.notes || '',
          amountInWords: editData?.amountInWords || '',
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

  const updateItem = (index: number, field: keyof LineItem, value: any) => {
    const items = [...form.items];
    (items[index] as any)[field] = value;
    items[index].quantity = Number(items[index].quantity) || 0;
    items[index].unitPrice = Number(items[index].unitPrice) || 0;
    items[index].total = items[index].quantity * items[index].unitPrice;
    setForm({ ...form, items });
  };

  const totalAmount = form.items.reduce((s, i) => s + (Number(i.total) || 0), 0);

  const handleSave = async () => {
    if (!form.customerName) { toast.error('Select a customer'); return; }
    const data: Quotation = { ...form, id: editId || generateId(), totalAmount, createdAt: existing?.createdAt || new Date().toISOString() };
    try {
      if (editId) await api.updateQuotation(editId, data);
      else await api.createQuotation(data);
      toast.success(editId ? 'Quotation updated' : 'Quotation created');
      onDone();
    } catch (err) { toast.error('Failed to save quotation'); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4"><Button variant="ghost" onClick={onDone}><ArrowLeft className="h-4 w-4 mr-2" /> Back</Button><h1 className="text-2xl font-bold">{editId ? 'Edit Quotation' : 'New Quotation'}</h1></div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle>Quotation Details</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><label className="text-sm font-medium">Quotation #</label><Input value={form.quotationNumber} onChange={(e) => setForm({ ...form, quotationNumber: e.target.value })} className="font-bold" /></div>
              <div><label className="text-sm font-medium">Date</label><Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></div>
            </div>
            <div><label className="text-sm font-medium">Select Customer (or type manually below)</label>
              <Select value={form.customerId} onValueChange={selectCustomer}><SelectTrigger><SelectValue placeholder="Select customer" /></SelectTrigger><SelectContent>{customers.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent></Select></div>
            <div className="grid grid-cols-1 gap-3">
              <div><label className="text-sm font-medium">Customer Name *</label><Input value={form.customerName} onChange={(e) => setForm({ ...form, customerName: e.target.value })} placeholder="Customer name" /></div>
              <div><label className="text-sm font-medium">Customer Address</label><Textarea value={form.customerAddress} onChange={(e) => setForm({ ...form, customerAddress: e.target.value })} placeholder="Address" rows={2} /></div>
              <div><label className="text-sm font-medium">Customer Phone</label><Input value={form.customerPhone} onChange={(e) => setForm({ ...form, customerPhone: e.target.value })} placeholder="Phone" /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="text-sm font-medium">Valid Until</label><Input type="date" value={form.validUntil} onChange={(e) => setForm({ ...form, validUntil: e.target.value })} /></div>
              <div><label className="text-sm font-medium">Status</label>
                <Select value={form.status} onValueChange={(v: any) => setForm({ ...form, status: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="draft">Draft</SelectItem><SelectItem value="processing">Processing</SelectItem><SelectItem value="sent">Sent</SelectItem><SelectItem value="accepted">Accepted</SelectItem><SelectItem value="complete">Complete</SelectItem><SelectItem value="rejected">Rejected</SelectItem></SelectContent></Select></div>
            </div>
            <div>
              <div className="flex justify-between items-center mb-3">
                <label className="text-sm font-semibold flex items-center gap-2" style={{ color: '#1B3A5C' }}>
                  <span className="text-lg">$</span> Line Items
                </label>
                <Button size="sm" variant="outline" onClick={() => setForm({ ...form, items: [...form.items, emptyItem()] })}><Plus className="h-3 w-3 mr-1" /> Add Item</Button>
              </div>
              <div className="space-y-3">
                {form.items.map((item, i) => (
                  <div key={item.id} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-muted-foreground">{i + 1}.</span>
                      <Input className="flex-1" placeholder="Item description" value={item.description} onChange={(e) => updateItem(i, 'description', e.target.value)} />
                      <Button size="icon" variant="ghost" className="text-muted-foreground hover:text-destructive shrink-0" onClick={() => setForm({ ...form, items: form.items.filter((_, j) => j !== i) })}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="text-xs text-muted-foreground mb-1 block">Qty</label>
                        <Input type="number" value={item.quantity} onChange={(e) => updateItem(i, 'quantity', parseFloat(e.target.value) || 0)} className="text-center" />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground mb-1 block">Unit Price</label>
                        <div className="flex items-center gap-1">
                          <span className="text-sm text-muted-foreground">৳</span>
                          <Input type="number" value={item.unitPrice} onChange={(e) => updateItem(i, 'unitPrice', parseFloat(e.target.value) || 0)} />
                        </div>
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground mb-1 block">Total</label>
                        <div className="text-right text-sm font-bold pt-2" style={{ color: '#1B3A5C' }}>৳{formatBDT(item.total)}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="text-right mt-3 text-lg font-bold" style={{ color: '#1B3A5C' }}>Total: ৳{formatBDT(totalAmount)}</div>
            </div>
            <div><label className="text-sm font-medium">Amount in Words</label><Input value={form.amountInWords} onChange={(e) => setForm({ ...form, amountInWords: e.target.value })} placeholder="Auto-generated if empty" /></div>
            <div>
              <label className="text-sm font-medium mb-2 block">Signatures</label>
              <div className="grid grid-cols-3 gap-3">
                {([['signatureReceived','Received by'],['signaturePrepared','Prepared by'],['signatureAuthorize','Authorize by']] as const).map(([key, label]) => (
                  <SignatureUploadField key={key} label={label} value={form[key]} onChange={(v) => setForm({ ...form, [key]: v })} />
                ))}
              </div>
            </div>
            <div><label className="text-sm font-medium">Notes</label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
            <Button onClick={handleSave} className="w-full bg-secondary hover:bg-secondary/90">Save Quotation</Button>
          </CardContent>
        </Card>
        <DocumentPreview type="quotation" documentNumber={form.quotationNumber} date={form.date} customerName={form.customerName} customerAddress={form.customerAddress} customerPhone={form.customerPhone} items={form.items} totalAmount={totalAmount} notes={form.notes} amountInWords={form.amountInWords} status={form.status} signatureReceived={form.signatureReceived} signaturePrepared={form.signaturePrepared} signatureAuthorize={form.signatureAuthorize} />
      </div>
    </div>
  );
}

function QuotationView({ id, onBack }: { id: string; onBack: () => void }) {
  const navigate = useNavigate();
  const [q, setQ] = useState<Quotation | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getQuotation(id).then((d: any) => { setQ(d); setLoading(false); }).catch(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="p-8 text-center text-muted-foreground">Loading...</div>;
  if (!q) return <div>Not found</div>;

  const handleShare = async () => {
    const shareData = { title: `Quotation ${q.quotationNumber}`, text: `Quotation ${q.quotationNumber} - ${q.customerName} - BDT ${formatBDT(q.totalAmount)}`, url: window.location.href };
    if (navigator.share) { try { await navigator.share(shareData); } catch {} }
    else { await navigator.clipboard.writeText(window.location.href); toast.success('Link copied to clipboard!'); }
  };

  return (
    <div className="space-y-4">
      <div className="no-print">
        <div className="flex items-center gap-4 mb-4">
          <Button variant="ghost" onClick={onBack}><ArrowLeft className="h-4 w-4 mr-2" /> Back</Button>
          <div>
            <h1 className="text-2xl font-bold">{q.quotationNumber}</h1>
            <p className="text-sm text-muted-foreground">Quotation Preview</p>
          </div>
          <Badge variant="outline" className={q.status === 'accepted' ? 'bg-emerald-100 text-emerald-700' : q.status === 'rejected' ? 'bg-red-100 text-red-700' : q.status === 'sent' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}>
            {q.status.charAt(0).toUpperCase() + q.status.slice(1)}
          </Badge>
        </div>
        <div className="flex flex-wrap gap-3 mb-4">
          <Button onClick={() => printDocument(q.quotationNumber)} variant="outline" className="gap-2"><Printer className="h-4 w-4" /> Download Quotation</Button>
          <Button onClick={() => printDocument(q.quotationNumber)} variant="outline" className="gap-2"><Printer className="h-4 w-4" /> Print</Button>
          <Button onClick={handleShare} variant="outline" className="gap-2"><Eye className="h-4 w-4" /> Share</Button>
          <Button onClick={() => navigate(`/quotations/edit-${id}`)} variant="outline" className="gap-2"><Pencil className="h-4 w-4" /> Quick Edit</Button>
          <Button onClick={() => navigate(`/quotations/edit-${id}`)} className="bg-secondary hover:bg-secondary/90 gap-2"><Pencil className="h-4 w-4" /> Full Edit</Button>
        </div>
      </div>
      <DocumentPreview type="quotation" documentNumber={q.quotationNumber} date={q.date} customerName={q.customerName} customerAddress={q.customerAddress} customerPhone={q.customerPhone} items={q.items} totalAmount={q.totalAmount} notes={q.notes} amountInWords={q.amountInWords} status={q.status} signatureReceived={q.signatureReceived} signaturePrepared={q.signaturePrepared} signatureAuthorize={q.signatureAuthorize} />
    </div>
  );
}
