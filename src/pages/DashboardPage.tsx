import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { FileText, FilePlus, Truck, ShoppingCart, Users, Package, TrendingUp, DollarSign } from 'lucide-react';
import { api } from '@/utils/api';
import { formatBDT } from '@/lib/utils';
import { Invoice, Quotation, Challan, PurchaseOrder, Customer, Product } from '@/types';

type DashboardStats = {
  customerCount: number;
  invoiceCount: number;
  quotationCount: number;
  challanCount: number;
  poCount: number;
  productCount: number;
  paidInvoiceCount: number;
  totalRevenue: number;
};

export default function DashboardPage() {
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [challans, setChallans] = useState<Challan[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [serverStats, setServerStats] = useState<DashboardStats | null>(null);

  useEffect(() => {
    Promise.all([
      api.getDashboardStats().then((d: any) => setServerStats(d)).catch(() => {}),
      api.getInvoices().then((d: any) => setInvoices(d)).catch(() => {}),
      api.getQuotations().then((d: any) => setQuotations(d)).catch(() => {}),
      api.getChallans().then((d: any) => setChallans(d)).catch(() => {}),
      api.getPurchaseOrders().then((d: any) => setPurchaseOrders(d)).catch(() => {}),
      api.getCustomers().then((d: any) => setCustomers(d)).catch(() => {}),
      api.getProducts().then((d: any) => setProducts(d)).catch(() => {}),
    ]);
  }, []);

  const totalRevenue = serverStats?.totalRevenue ?? invoices.reduce((sum, inv) => sum + Number(inv.totalAmount || 0), 0);
  const paidInvoices = serverStats?.paidInvoiceCount ?? invoices.filter(i => i.status === 'paid').length;

  const stats = [
    { title: 'Total Invoices', value: serverStats?.invoiceCount ?? invoices.length, icon: FileText, color: 'bg-primary' },
    { title: 'Quotations', value: serverStats?.quotationCount ?? quotations.length, icon: FilePlus, color: 'bg-secondary' },
    { title: 'Challans', value: serverStats?.challanCount ?? challans.length, icon: Truck, color: 'bg-info' },
    { title: 'Revenue', value: `৳${formatBDT(totalRevenue)}`, icon: DollarSign, color: 'bg-success' },
  ];

  const quickActions = [
    { title: 'New Invoice', icon: FileText, path: '/invoices/new' },
    { title: 'New Quotation', icon: FilePlus, path: '/quotations/new' },
    { title: 'New Challan', icon: Truck, path: '/challans/new' },
    { title: 'New PO', icon: ShoppingCart, path: '/purchase-orders/new' },
  ];

  const recentInvoices = [...invoices].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 5);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Welcome back! Here's your business overview.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.title} className="overflow-hidden">
            <CardContent className="p-0">
              <div className="flex items-center">
                <div className={`${stat.color} p-4 flex items-center justify-center`}>
                  <stat.icon className="h-8 w-8 text-primary-foreground" />
                </div>
                <div className="p-4 flex-1">
                  <p className="text-sm text-muted-foreground">{stat.title}</p>
                  <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {quickActions.map((action) => (
              <Button
                key={action.title}
                variant="outline"
                className="h-20 flex-col gap-2 hover:bg-secondary hover:text-secondary-foreground transition-colors"
                onClick={() => navigate(action.path)}
              >
                <action.icon className="h-6 w-6" />
                <span className="text-sm">{action.title}</span>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Summary Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Recent Invoices</CardTitle>
          </CardHeader>
          <CardContent>
            {recentInvoices.length === 0 ? (
              <p className="text-sm text-muted-foreground">No invoices yet. Create your first invoice!</p>
            ) : (
              <div className="space-y-3">
                {recentInvoices.map((inv) => (
                  <div key={inv.id} className="flex justify-between items-center border-b pb-2 last:border-0">
                    <div>
                      <p className="font-medium text-sm">{inv.invoiceNumber}</p>
                      <p className="text-xs text-muted-foreground">{inv.customerName}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-sm">৳{formatBDT(inv.totalAmount)}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        inv.status === 'paid' ? 'bg-success/20 text-success' :
                        inv.status === 'sent' ? 'bg-info/20 text-info' : 'bg-muted text-muted-foreground'
                      }`}>{inv.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Business Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground flex items-center gap-2"><Users className="h-4 w-4" /> Customers</span>
                <span className="font-medium">{serverStats?.customerCount ?? customers.length}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground flex items-center gap-2"><Package className="h-4 w-4" /> Products</span>
                <span className="font-medium">{serverStats?.productCount ?? products.length}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground flex items-center gap-2"><TrendingUp className="h-4 w-4" /> Paid Invoices</span>
                <span className="font-medium">{paidInvoices}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground flex items-center gap-2"><ShoppingCart className="h-4 w-4" /> Purchase Orders</span>
                <span className="font-medium">{serverStats?.poCount ?? purchaseOrders.length}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
