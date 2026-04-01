import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { CompanySettings, LineItem, ChallanItem, Payment } from '@/types';
import { numberToWords } from '@/utils/numberToWords';
import { api } from '@/utils/api';
import logoImg from '@/assets/logo.png';

interface DocumentPreviewProps {
  type: 'invoice' | 'quotation' | 'challan' | 'purchaseOrder';
  documentNumber: string;
  date: string;
  customerName: string;
  customerAddress: string;
  customerPhone: string;
  customerEmail?: string;
  items?: LineItem[];
  challanItems?: ChallanItem[];
  totalAmount?: number;
  totalQuantity?: number;
  orderNo?: string;
  notes?: string;
  amountInWords?: string;
  tax?: number;
  totalPaid?: number;
  payments?: Payment[];
  supplierName?: string;
  supplierAddress?: string;
  status?: string;
  signatureReceived?: string;
  signaturePrepared?: string;
  signatureAuthorize?: string;
}

const formatNumber = (num: number | string) => {
  const n = typeof num === 'string' ? parseFloat(num) : num;
  if (isNaN(n)) return '0';
  if (Number.isInteger(n)) return n.toLocaleString('en-IN');
  return n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const formatPlain = (num: number | string) => {
  const n = typeof num === 'string' ? parseFloat(num) : num;
  if (isNaN(n)) return '0';
  if (Number.isInteger(n)) return n.toString();
  return n.toFixed(2);
};

const formatDate = (dateStr: string) => {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  } catch { return dateStr; }
};

const NAVY = '#1B3A5C';
const ORANGE = '#E8792B';
const GREEN = '#16a34a';

const defaultSettings: CompanySettings = {
  name: 'S. M. Trade International',
  tagline: '1st Class Govt. Contractor, Supplier & Importer',
  address: 'House # 7, Road # 19/A, Sector # 4, Uttara, Dhaka-1230',
  phone: '+8801886766688',
  email: 'info@smtradeint.com',
  website: 'www.smtradeint.com',
  logo: '',
};

export function printDocument(docNumber: string) {
  document.title = docNumber;
  window.print();
  document.title = 'S. M. Trade International';
}

export default function DocumentPreview(props: DocumentPreviewProps) {
  const [settings, setSettings] = useState<CompanySettings>(defaultSettings);

  useEffect(() => {
    api.getSettings().then((d: any) => {
      if (d && d.name) setSettings(d);
    }).catch(() => {});
  }, []);

  const { type, documentNumber, date, customerName, customerAddress, customerPhone, customerEmail, items, challanItems, totalAmount, totalQuantity, orderNo, notes, tax, totalPaid, payments } = props;

  const typeConfig: Record<string, { label: string; toLabel: string; dateLabel: string }> = {
    invoice: { label: 'BILL', toLabel: 'BILL TO', dateLabel: 'BILL DATE :' },
    quotation: { label: 'QUOTATION', toLabel: 'TO', dateLabel: 'QUOTATION DATE :' },
    challan: { label: 'CHALLAN', toLabel: 'DELIVERY TO', dateLabel: 'CHALLAN DATE :' },
    purchaseOrder: { label: 'PURCHASE ORDER', toLabel: 'TO', dateLabel: 'PO DATE :' },
  };

  const config = typeConfig[type];

  const [qrDataUrl, setQrDataUrl] = useState('');
  useEffect(() => {
    const routeMap: Record<string, string> = {
      invoice: 'invoice', quotation: 'quotation', challan: 'challan', purchaseOrder: 'purchase-order',
    };
    const baseUrl = window.location.origin;
    const docId = documentNumber.toLowerCase().replace(/[^a-z0-9-]/g, '-');
    const viewUrl = `${baseUrl}/verify/${routeMap[type]}/${docId}`;
    QRCode.toDataURL(viewUrl, { width: 120, margin: 1, color: { dark: '#1B3A5C', light: '#ffffff' } })
      .then(url => setQrDataUrl(url))
      .catch(() => setQrDataUrl(''));
  }, [documentNumber, type]);

  const isChallan = type === 'challan';
  const isInvoice = type === 'invoice';

  const subtotal = Number(totalAmount) || 0;
  const taxAmount = Number(tax) || 0;
  const grandTotal = subtotal + taxAmount;
  const paidAmount = Number(totalPaid) || 0;
  const balance = grandTotal - paidAmount;

  const statusConfig: Record<string, { color: string; bg: string; label: string }> = {
    paid: { color: GREEN, bg: '#dcfce7', label: 'Paid' },
    partial: { color: ORANGE, bg: '#fff7ed', label: 'Partial' },
    sent: { color: '#dc2626', bg: '#fef2f2', label: 'Unpaid' },
    draft: { color: '#6b7280', bg: '#f3f4f6', label: 'Draft' },
    accepted: { color: GREEN, bg: '#dcfce7', label: 'Accepted' },
    rejected: { color: '#dc2626', bg: '#fef2f2', label: 'Rejected' },
    delivered: { color: GREEN, bg: '#dcfce7', label: 'Delivered' },
    received: { color: GREEN, bg: '#dcfce7', label: 'Received' },
  };

  const statusInfo = statusConfig[props.status || 'draft'] || statusConfig.draft;

  return (
    <div className="bg-white mx-auto shadow-lg document-preview-wrapper" id="document-preview" style={{ fontFamily: "'Segoe UI', Arial, sans-serif", color: '#333', fontSize: '13px', width: '794px', minHeight: '1123px', maxHeight: '1123px', overflow: 'hidden' }}>
      <div style={{ border: '2px solid #d0d0d0', minHeight: '1119px', maxHeight: '1119px', display: 'flex', flexDirection: 'column' }} className="document-border">
        
        {/* ===== HEADER ===== */}
        <div style={{ padding: '18px 35px 12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
              <div style={{ 
                width: '72px', height: '72px', borderRadius: '50%', 
                border: '2.5px solid #2B5797', 
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0, overflow: 'hidden', backgroundColor: '#fff'
              }}>
                <img src={logoImg} alt="Logo" style={{ width: '95px', height: '95px', objectFit: 'cover' }} />
              </div>
              <div>
                <h1 style={{ fontSize: '19px', fontWeight: '900', color: '#1f3b8a', margin: 0, letterSpacing: '0px', fontFamily: "Arial, Helvetica, sans-serif", textTransform: 'uppercase' }}>
                  S. M. TRADE INTERNATIONAL
                </h1>
                <p style={{ fontSize: '13px', color: '#999', margin: '0', fontWeight: 'normal', fontStyle: 'normal', fontFamily: "Arial, Helvetica, sans-serif", letterSpacing: '0.2px' }}>
                  1st Class Govt. Contractor, Supplier &amp; Importer
                </p>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                <h2 style={{
                  fontSize: type === 'invoice' ? '32px' : type === 'quotation' ? '16px' : '18px',
                  fontWeight: '900',
                  color: NAVY,
                  margin: 0,
                  fontFamily: "Arial, Helvetica, sans-serif",
                  letterSpacing: type === 'invoice' ? '4px' : '0px',
                  lineHeight: 1.05,
                  whiteSpace: 'nowrap',
                  textAlign: 'center',
                }}>
                  {config.label}
                </h2>
                <p style={{
                  color: ORANGE,
                  fontSize: '13px',
                  fontWeight: 'bold',
                  margin: '1px 0 0',
                  lineHeight: 1.1,
                  whiteSpace: 'nowrap',
                  textAlign: 'center',
                  width: '100%',
                }}>
                  {documentNumber}
                </p>
                {isChallan && orderNo && (
                  <p style={{ fontSize: '11px', color: '#666', margin: '2px 0 0', textAlign: 'right' }}>Order No. {orderNo}</p>
                )}
              </div>
            </div>
          </div>
        </div>

        <div style={{ height: '2px', backgroundColor: NAVY, margin: '0 35px' }} />

        <div style={{ padding: '14px 35px 10px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ display: 'flex', alignItems: 'stretch' }}>
            <div style={{ width: '6px', backgroundColor: '#1f3b8a', borderRadius: '0px', marginRight: '12px', flexShrink: 0 }}></div>
            <div>
            <p style={{ fontSize: '10px', color: '#888', fontWeight: 'bold', marginBottom: '1px', letterSpacing: '0.5px' }}>{config.toLabel}</p>
            <p style={{ fontSize: '14px', fontWeight: 'bold', color: '#111', margin: '0 0 1px' }}>
              {props.supplierName || customerName}
            </p>
            {customerEmail && (
              <p style={{ fontSize: '11px', color: ORANGE, margin: '1px 0', lineHeight: '1.4' }}>{customerEmail}</p>
            )}
            {customerPhone && (
              <p style={{ fontSize: '11px', color: '#111', margin: '1px 0', lineHeight: '1.4' }}>{customerPhone}</p>
            )}
            <p style={{ fontSize: '11px', color: '#555', margin: '1px 0', lineHeight: '1.4' }}>
              {props.supplierAddress || customerAddress}
            </p>
            </div>
          </div>
          <div style={{ textAlign: 'right', fontSize: '12px', whiteSpace: 'nowrap' }}>
            <span style={{ color: '#888', fontSize: '11px' }}>{config.dateLabel}</span>{' '}
            <strong style={{ color: '#222' }}>{formatDate(date)}</strong>
          </div>
        </div>

        <div style={{ padding: '6px 35px 0', position: 'relative' }}>
          
          <div style={{
            position: 'absolute', top: '45%', left: '50%',
            transform: 'translate(-50%, -50%)', opacity: 0.06, zIndex: 0, pointerEvents: 'none',
          }}>
            <img src={logoImg} alt="" style={{ width: '320px', height: '320px' }} />
          </div>

          {isChallan && challanItems ? (
            <table style={{ width: '100%', borderCollapse: 'collapse', position: 'relative', zIndex: 1 }}>
              <thead>
                <tr style={{ borderBottom: `2px solid ${NAVY}` }}>
                  <th style={{ padding: '8px 6px', textAlign: 'center', fontSize: '11px', fontWeight: 'bold', color: NAVY, whiteSpace: 'nowrap' }}>SL.</th>
                  <th style={{ padding: '8px 6px', textAlign: 'center', fontSize: '11px', fontWeight: 'bold', color: NAVY }}>ITEM NAME & DETAILS</th>
                  <th style={{ padding: '8px 6px', textAlign: 'center', fontSize: '11px', fontWeight: 'bold', color: NAVY, whiteSpace: 'nowrap' }}>SIZE</th>
                  <th style={{ padding: '8px 6px', textAlign: 'center', fontSize: '11px', fontWeight: 'bold', color: NAVY, whiteSpace: 'nowrap' }}>UNIT</th>
                  <th style={{ padding: '8px 6px', textAlign: 'center', fontSize: '11px', fontWeight: 'bold', color: NAVY, whiteSpace: 'nowrap' }}>DELIVERY QTY</th>
                  <th style={{ padding: '8px 6px', textAlign: 'center', fontSize: '11px', fontWeight: 'bold', color: NAVY, whiteSpace: 'nowrap' }}>BALANCE QTY</th>
                </tr>
              </thead>
              <tbody>
                {challanItems.map((item, i) => (
                  <tr key={item.id} style={{ borderBottom: '1px solid #e0e0e0' }}>
                    <td style={{ padding: '6px 8px', textAlign: 'center', fontSize: '12px' }}>{i + 1}</td>
                    <td style={{ padding: '6px 8px', fontSize: '12px' }}>{item.itemName}{item.details && <><br/><span style={{ fontSize: '10px', color: '#666' }}>{item.details}</span></>}</td>
                    <td style={{ padding: '6px 8px', textAlign: 'center', fontSize: '12px' }}>{item.size}</td>
                    <td style={{ padding: '6px 8px', textAlign: 'center', fontSize: '12px' }}>{item.unit}</td>
                    <td style={{ padding: '6px 8px', textAlign: 'center', fontSize: '12px' }}>{formatNumber(item.deliveryQty)}</td>
                    <td style={{ padding: '6px 8px', textAlign: 'center', fontSize: '12px' }}>{formatNumber(item.balanceQty)}</td>
                  </tr>
                ))}
                {(() => {
                  const totalBalance = challanItems.reduce((sum, item) => sum + (Number(item.balanceQty) || 0), 0);
                  return (
                    <tr style={{ backgroundColor: NAVY }}>
                      <td colSpan={4} style={{ padding: '8px', textAlign: 'right', fontWeight: 'bold', color: 'white', fontSize: '12px' }}>Total Quantity</td>
                      <td style={{ padding: '8px', textAlign: 'center', fontWeight: 'bold', color: 'white', fontSize: '12px' }}>{formatNumber(totalQuantity || 0)} Pcs</td>
                      <td style={{ padding: '8px', textAlign: 'center', fontWeight: 'bold', color: 'white', fontSize: '12px' }}>{formatNumber(totalBalance)} Pcs</td>
                    </tr>
                  );
                })()}
              </tbody>
            </table>
          ) : items ? (
            <>
              <table style={{ width: '100%', borderCollapse: 'collapse', position: 'relative', zIndex: 1 }}>
                <thead>
                  <tr style={{ borderBottom: `2px solid ${NAVY}` }}>
                    <th style={{ padding: '8px 8px', textAlign: 'left', fontSize: '11px', fontWeight: 'bold', color: '#888', textTransform: 'uppercase', width: '40%' }}>DESCRIPTION</th>
                    <th style={{ padding: '8px 8px', textAlign: 'center', fontSize: '11px', fontWeight: 'bold', color: '#888', textTransform: 'uppercase', width: '18%' }}>QTY</th>
                    <th style={{ padding: '8px 8px', textAlign: 'center', fontSize: '11px', fontWeight: 'bold', color: '#888', textTransform: 'uppercase', width: '22%' }}>UNIT PRICE</th>
                    <th style={{ padding: '8px 8px', textAlign: 'right', fontSize: '11px', fontWeight: 'bold', color: '#888', textTransform: 'uppercase', width: '20%' }}>TOTAL</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id} style={{ borderBottom: '1px solid #e8e8e8' }}>
                      <td style={{ padding: '7px 8px', fontSize: '12px' }}>{item.description}</td>
                      <td style={{ padding: '7px 8px', textAlign: 'center', fontSize: '12px' }}>{formatNumber(item.quantity)}</td>
                      <td style={{ padding: '7px 8px', textAlign: 'center', fontSize: '12px' }}>{formatNumber(item.unitPrice)}</td>
                      <td style={{ padding: '7px 8px', textAlign: 'right', fontSize: '12px', fontWeight: 'bold' }}>{formatNumber(item.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div style={{ 
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                marginTop: '12px', padding: '10px 16px',
                backgroundColor: NAVY, borderRadius: '4px',
                position: 'relative', zIndex: 1
              }}>
                <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#fff' }}>Total Amount</span>
                <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#fff' }}>BDT {formatNumber(isInvoice ? grandTotal : subtotal)}</span>
              </div>
            </>
          ) : null}

          {totalAmount !== undefined && totalAmount > 0 && !isChallan && (
            <div style={{ textAlign: 'right', padding: '0', fontSize: '11px', color: NAVY, marginTop: '4px' }}>
              <strong>In Word :</strong> {props.amountInWords || numberToWords(isInvoice ? balance : subtotal)}.
            </div>
          )}

          {isInvoice && payments && payments.length > 0 && (
            <div style={{ marginTop: '16px', position: 'relative', zIndex: 1 }}>
              <div style={{ border: '1px solid #e0e0e0', borderRadius: '6px', overflow: 'hidden' }}>
                <div style={{ padding: '8px 14px', backgroundColor: '#f9fafb', borderBottom: '1px solid #e0e0e0' }}>
                  <strong style={{ fontSize: '12px', color: NAVY }}>PAYMENT HISTORY</strong>
                </div>
                {payments.map((p) => (
                  <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 14px', borderBottom: '1px solid #f0f0f0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontSize: '11px', color: '#666' }}>{formatDate(p.date)}</span>
                      <span style={{ 
                        backgroundColor: NAVY, color: 'white', padding: '2px 8px', borderRadius: '3px',
                        fontSize: '10px', fontWeight: 'bold',
                      }}>{p.method}</span>
                      <span style={{ fontSize: '11px', color: '#555' }}>{p.description}</span>
                    </div>
                    <span style={{ fontWeight: 'bold', fontSize: '12px', color: GREEN }}>{formatNumber(p.amount)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {notes && (
          <div style={{ padding: '8px 35px', fontSize: '11px', color: '#666' }}>
            <strong>Notes:</strong> {notes}
          </div>
        )}

        <div style={{ marginTop: 'auto', breakInside: 'avoid', pageBreakInside: 'avoid' }}>
          <div style={{ padding: '10px 35px 8px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
            {[
              { label: 'Received by', sig: props.signatureReceived || settings.signatureReceived },
              { label: 'Prepared by', sig: props.signaturePrepared || settings.signaturePrepared },
              { label: 'Authorize by', sig: props.signatureAuthorize || settings.signatureAuthorize },
            ].map((item) => (
              <div key={item.label} style={{ textAlign: 'center', width: '160px' }}>
                <div style={{
                  width: '160px', height: '50px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '4px',
                }}>
                  {item.sig ? (
                    <img src={item.sig} alt={item.label} style={{ maxWidth: '140px', maxHeight: '45px', objectFit: 'contain' }} />
                  ) : null}
                </div>
                <div style={{ borderTop: '1.5px solid #333', paddingTop: '4px', fontSize: '11px', color: '#555' }}>{item.label}</div>
              </div>
            ))}
          </div>

          <div style={{ 
            borderTop: '2px solid #aaa', padding: '6px 35px 0', fontSize: '10px', color: '#555',
          }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ marginBottom: '2px' }}>
                <span style={{ color: '#1f3b8a' }}>{settings.email}</span>, <span style={{ color: '#1f3b8a' }}>{settings.website}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                <span>{settings.phone}</span>
                <span style={{ color: '#ccc' }}>|</span>
                <span>{settings.address}</span>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '-18px' }}>
              {qrDataUrl && <img src={qrDataUrl} alt="QR" style={{ width: '55px', height: '55px' }} />}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
