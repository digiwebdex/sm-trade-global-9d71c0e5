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
import { PurchaseOrder, LineItem } from '@/types';
import DocumentPreview, { printDocument } from '@/components/DocumentPreview';
import { toast } from 'sonner';
import { Plus, Trash2, Eye, ArrowLeft, Search, Pencil, Printer, Upload } from 'lucide-react';
import SignatureUploadField from '@/components/SignatureUploadField';

const emptyItem = (): LineItem => ({ id: generateId(), description: '', quantity: 1, unitPrice: 0, total: 0 });

export default function PurchaseOrdersPage() {
  const navigate = useNavigate();
  const { action } = useParams();
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [search, setSearch] = useState('');

  const load = async () => {
    try {
      const data = await api.getPurchaseOrders() as PurchaseOrder[];
      setOrders(data);
    } catch (err) { toast.error('Failed to load purchase orders'); }
  };
  useEffect(() => { load(); }, [action]);

  if (action === 'new' || action?.startsWith('edit-')) {
    return <POForm editId={action.startsWith('edit-') ? action.replace('edit-', '') : undefined} onDone={() => { load(); navigate('/purchase-orders'); }} />;
  }
  if (action?.startsWith('view-')) {
    return <POView id={action.replace('view-', '')} onBack={() => navigate('/purchase-orders')} />;
  }

  const filtered = orders.filter(o => o.poNumber.toLowerCase().includes(search.toLowerCase()) || o.supplierName.toLowerCase().includes(search.toLowerCase()));

  const handleDelete = async (id: string) => {
    if (confirm('Delete?')) {
      try {
        await api.deletePurchaseOrder(id);
        toast.success('Deleted');
        load();
      } catch (err) { toast.error('Failed to delete'); }
    }
  };

  const statusBadge = (status: string) => {
    const variants: Record<string, { className: string; label: string }> = {
      received: { className: 'bg-emerald-100 text-emerald-700 border-emerald-200', label: 'Received' },
      processing: { className: 'bg-yellow-100 text-yellow-700 border-yellow-200', label: 'Processing' },
      complete: { className: 'bg-teal-100 text-teal-700 border-teal-200', label: 'Complete' },
      sent: { className: 'bg-blue-100 text-blue-700 border-blue-200', label: 'Sent' },
      draft: { className: 'bg-gray-100 text-gray-600 border-gray-200', label: 'Draft' },
    };
    const v = variants[status] || variants.draft;
    return <Badge variant="outline" className={`${v.className} font-semibold text-xs`}>{v.label}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Purchase Orders</h1>
          <p className="text-muted-foreground">Manage supplier orders</p>
        </div>
        <Button onClick={() => navigate('/purchase-orders/new')} className="bg-secondary hover:bg-secondary/90"><Plus className="h-4 w-4 mr-2" /> New PO</Button>
      </div>
      <Card>
        <CardHeader>
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search by PO # or supplier..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>PO #</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Amount (BDT)</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="w-32 text-center">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No purchase orders found</TableCell></TableRow>
              ) : filtered.map((o) => (
                <TableRow key={o.id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/purchase-orders/view-${o.id}`)}>
                  <TableCell className="font-bold text-primary">{o.poNumber}</TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium text-sm">{o.supplierName}</p>
                      <p className="text-xs text-muted-foreground">{o.supplierAddress}</p>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">{new Date(o.date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</TableCell>
                  <TableCell className="text-right font-bold">৳{formatBDT(o.totalAmount)}</TableCell>
                  <TableCell className="text-center">{statusBadge(o.status)}</TableCell>
                  <TableCell>
                    <div className="flex gap-1 justify-center" onClick={(e) => e.stopPropagation()}>
                      <Button size="icon" variant="ghost" onClick={() => navigate(`/purchase-orders/view-${o.id}`)} title="View"><Eye className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" onClick={() => navigate(`/purchase-orders/edit-${o.id}`)} title="Edit"><Pencil className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" onClick={() => handleDelete(o.id)} className="text-destructive" title="Delete"><Trash2 className="h-4 w-4" /></Button>
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

function POForm({ editId, onDone }: { editId?: string; onDone: () => void }) {
  const [existing, setExisting] = useState<PurchaseOrder | null>(null);
  const [loading, setLoading] = useState(true);

  const [form, setForm] = useState({
    supplierName: '',
    supplierAddress: '',
    supplierPhone: '',
    supplierEmail: '',
    date: new Date().toISOString().split('T')[0],
    poNumber: '',
    items: [emptyItem()],
    status: 'draft' as 'draft' | 'sent' | 'received',
    notes: '',
    amountInWords: '',
    signatureReceived: '',
    signaturePrepared: '',
    signatureAuthorize: '',
  });

  useEffect(() => {
    const init = async () => {
      try {
        const pos = await api.getPurchaseOrders() as PurchaseOrder[];

        let editData: PurchaseOrder | null = null;
        if (editId) {
          editData = await api.getPurchaseOrder(editId) as PurchaseOrder;
          setExisting(editData);
        }

        setForm({
          supplierName: editData?.supplierName || '',
          supplierAddress: editData?.supplierAddress || '',
          supplierPhone: editData?.supplierPhone || '',
          supplierEmail: editData?.supplierEmail || '',
          date: editData?.date || new Date().toISOString().split('T')[0],
          poNumber: editData?.poNumber || generateDocNumber('PO', pos.map(o => o.poNumber)),
          items: editData?.items ? editData.items.map(i => ({ ...i, quantity: Number(i.quantity) || 0, unitPrice: Number(i.unitPrice) || 0, total: Number(i.total) || 0 })) : [emptyItem()],
          status: editData?.status || 'draft',
          notes: editData?.notes || '',
          amountInWords: editData?.amountInWords || '',
          signatureReceived: (editData as any)?.signatureReceived || '',
          signaturePrepared: (editData as any)?.signaturePrepared || '',
          signatureAuthorize: (editData as any)?.signatureAuthorize || '',
        });
      } catch (err) { toast.error('Failed to load data'); }
      setLoading(false);
    };
    init();
  }, [editId]);

  if (loading) return <div className="p-8 text-center text-muted-foreground">Loading...</div>;

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
    if (!form.supplierName) { toast.error('Supplier name is required'); return; }
    const data: PurchaseOrder = { ...form, id: editId || generateId(), totalAmount, createdAt: existing?.createdAt || new Date().toISOString() };
    try {
      if (editId) await api.updatePurchaseOrder(editId, data);
      else await api.createPurchaseOrder(data);
      toast.success(editId ? 'Updated' : 'Created');
      onDone();
    } catch (err) { toast.error('Failed to save PO'); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4"><Button variant="ghost" onClick={onDone}><ArrowLeft className="h-4 w-4 mr-2" /> Back</Button><h1 className="text-2xl font-bold">{editId ? 'Edit PO' : 'New Purchase Order'}</h1></div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle>PO Details</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><label className="text-sm font-medium">PO #</label><Input value={form.poNumber} onChange={(e) => setForm({ ...form, poNumber: e.target.value })} className="font-bold" /></div>
              <div><label className="text-sm font-medium">Date</label><Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></div>
            </div>
            <div><label className="text-sm font-medium">Supplier Name *</label><Input value={form.supplierName} onChange={(e) => setForm({ ...form, supplierName: e.target.value })} /></div>
            <div><label className="text-sm font-medium">Supplier Address</label><Textarea value={form.supplierAddress} onChange={(e) => setForm({ ...form, supplierAddress: e.target.value })} placeholder="Address" rows={2} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="text-sm font-medium">Phone</label><Input value={form.supplierPhone} onChange={(e) => setForm({ ...form, supplierPhone: e.target.value })} /></div>
              <div><label className="text-sm font-medium">Email</label><Input value={form.supplierEmail} onChange={(e) => setForm({ ...form, supplierEmail: e.target.value })} /></div>
            </div>
            <div><label className="text-sm font-medium">Status</label>
              <Select value={form.status} onValueChange={(v: any) => setForm({ ...form, status: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="draft">Draft</SelectItem><SelectItem value="processing">Processing</SelectItem><SelectItem value="sent">Sent</SelectItem><SelectItem value="received">Received</SelectItem><SelectItem value="complete">Complete</SelectItem></SelectContent></Select></div>
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
                  <SignatureUploadField key={key} label={label} value={(form as any)[key]} onChange={(v) => setForm({ ...form, [key]: v })} />
                ))}
              </div>
            </div>
            <div><label className="text-sm font-medium">Notes</label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
            <Button onClick={handleSave} className="w-full bg-secondary hover:bg-secondary/90">Save PO</Button>
          </CardContent>
        </Card>
        <DocumentPreview type="purchaseOrder" documentNumber={form.poNumber} date={form.date} customerName={form.supplierName} customerAddress={form.supplierAddress} customerPhone={form.supplierPhone} supplierName={form.supplierName} supplierAddress={form.supplierAddress} items={form.items} totalAmount={totalAmount} notes={form.notes} amountInWords={form.amountInWords} signatureReceived={form.signatureReceived} signaturePrepared={form.signaturePrepared} signatureAuthorize={form.signatureAuthorize} />
      </div>
    </div>
  );
}

function POView({ id, onBack }: { id: string; onBack: () => void }) {
  const [o, setO] = useState<PurchaseOrder | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getPurchaseOrder(id).then((d: any) => { setO(d); setLoading(false); }).catch(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="p-8 text-center text-muted-foreground">Loading...</div>;
  if (!o) return <div>Not found</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4 no-print">
        <Button variant="ghost" onClick={onBack}><ArrowLeft className="h-4 w-4 mr-2" /> Back</Button>
        <h1 className="text-2xl font-bold">{o.poNumber}</h1>
        <Badge variant="outline" className={o.status === 'received' ? 'bg-emerald-100 text-emerald-700' : o.status === 'sent' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}>
          {o.status.charAt(0).toUpperCase() + o.status.slice(1)}
        </Badge>
        <Button onClick={() => printDocument(o.poNumber)} variant="outline"><Printer className="h-4 w-4 mr-2" /> Print / PDF</Button>
      </div>
      <DocumentPreview type="purchaseOrder" documentNumber={o.poNumber} date={o.date} customerName={o.supplierName} customerAddress={o.supplierAddress} customerPhone={o.supplierPhone} supplierName={o.supplierName} supplierAddress={o.supplierAddress} items={o.items} totalAmount={o.totalAmount} notes={o.notes} />
    </div>
  );
}
