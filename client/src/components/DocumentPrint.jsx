import React, { useState, useEffect } from 'react';
import { getProducts } from '../services/productService';
import logo from '../assets/logo-new.png';

const DocumentPrint = ({ data, type }) => {
  const [products, setProducts] = useState([]);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const res = await getProducts();
        setProducts(res.data);
      } catch (err) {
        console.error('Failed to load products for print resolution');
      }
    };
    fetchProducts();
  }, []);

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  // Resolve product name helper
  const getProductName = (id) => {
    if (!id) return '';
    const p = products.find((prod) => prod._id === id || prod._id === id._id);
    return p ? p.name : '';
  };

  // Determine dynamic columns based on actual data
  const hasLocation = data?.items?.some(i => i.location?.trim());
  const hasSize = data?.items?.some(i => i.size?.trim());
  const hasJamb = data?.items?.some(i => i.jambType === 'inventory' ? i.jambProduct : (i.jambCustom?.trim() || i.jamb?.trim()));
  const hasHinge = data?.items?.some(i => i.hingeType === 'inventory' ? i.hingeProduct : i.hingeCustom?.trim());
  const hasLH = data?.items?.some(i => i.leftHand !== undefined && i.leftHand !== null && i.leftHand !== '');
  const hasRH = data?.items?.some(i => i.rightHand !== undefined && i.rightHand !== null && i.rightHand !== '');

  const documentNumber = data?.orderNumber || data?.quotationNumber || '';

  return (
    <div className="bg-white print:bg-white w-full h-full text-gray-800">
      <style>{`
        @media print {
          @page {
            size: A4;
            margin: 10mm;
          }
          .print-avoid-break {
            page-break-inside: avoid;
            break-inside: avoid;
          }
        }
      `}</style>
      <div className="max-w-5xl mx-auto bg-white p-6 sm:p-8 print:p-0">
        
        {/* ── HEADER ── */}
        <div className="flex flex-col sm:flex-row justify-between items-start gap-6 mb-4 print:mb-2">
          {/* Company Info */}
          <div className="flex flex-col">
            <img 
              src={logo} 
              alt="DM Doors" 
              className="h-16 object-contain mb-3 self-start"
              onError={(e) => { e.target.style.display = 'none'; }}
            />
            <div className="text-gray-600 text-sm space-y-0.5 leading-tight font-medium print:text-[11px]">
              <p className="text-base font-bold text-brand-700 tracking-wide mb-1">Dynamic DM Doors</p>
              <p>9972 128 Street, Surrey, BC, Canada</p>
              <p>778-863-4028</p>
              <p>GST # 794862227RT0001</p>
            </div>
          </div>
          
          {/* Document Meta */}
          <div className="text-left sm:text-right">
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight uppercase mb-4 print:text-2xl print:mb-2">
              {type}
            </h1>
            <table className="w-full sm:w-auto ml-auto text-sm print:text-xs">
              <tbody>
                <tr>
                  <td className="pr-3 py-0.5 text-gray-500 font-semibold text-right">{type === 'QUOTATION' ? 'Quote No:' : 'Invoice No:'}</td>
                  <td className="py-0.5 font-bold text-gray-900 text-left">{documentNumber}</td>
                </tr>
                <tr>
                  <td className="pr-3 py-0.5 text-gray-500 font-semibold text-right">Date:</td>
                  <td className="py-0.5 font-bold text-gray-900 text-left">{formatDate(data?.createdAt)}</td>
                </tr>
                {type !== 'QUOTATION' && (
                  <tr>
                    <td className="pr-3 py-0.5 text-gray-500 font-semibold text-right">Due:</td>
                    <td className="py-0.5 font-bold text-gray-900 text-left">On Receipt</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── CUSTOMER SECTION ── */}
        <div className="mb-4 print:mb-2 flex flex-col sm:flex-row justify-between items-end">
          <div className="w-full sm:w-1/2">
            <h3 className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">Bill To</h3>
            <div className="text-gray-800 text-sm space-y-0.5 font-medium print:text-xs">
              <p className="text-base print:text-sm font-bold text-gray-900">{data?.customerInfo?.name || 'Walk-in Customer'}</p>
              {data?.customerInfo?.address && <p>{data.customerInfo.address}</p>}
              {data?.customerInfo?.email && <p>{data.customerInfo.email}</p>}
              {data?.customerInfo?.phone && <p>{data.customerInfo.phone}</p>}
            </div>
          </div>
          {data?.status === 'converted' && type === 'QUOTATION' && (
            <div className="mt-2 sm:mt-0 text-brand-700 font-bold bg-brand-50 border border-brand-200 px-3 py-1.5 uppercase tracking-widest text-[11px] inline-block rounded-lg shadow-sm">
              Converted to Order
            </div>
          )}
        </div>

        {/* ── LINE ITEMS (DOOR SCHEDULE) ── */}
        <div className="mb-4 print:mb-2 border border-gray-200 rounded-lg overflow-hidden shadow-sm">
          <table className="w-full text-left border-collapse">
            <thead className="bg-gray-50 text-gray-600 text-[10px] uppercase tracking-wider font-semibold border-b border-gray-200">
              <tr>
                <th className="px-3 py-1.5 print:py-1 text-center w-10">Qty</th>
                {hasLocation && <th className="px-3 py-1.5 print:py-1">Location</th>}
                <th className="px-3 py-1.5 print:py-1">Product Description</th>
                {hasSize && <th className="px-3 py-1.5 print:py-1">Size</th>}
                {hasJamb && <th className="px-3 py-1.5 print:py-1">Jamb</th>}
                {hasHinge && <th className="px-3 py-1.5 print:py-1">Hinge</th>}
                {hasLH && <th className="px-1.5 py-1.5 print:py-1 text-center w-8">L</th>}
                {hasRH && <th className="px-1.5 py-1.5 print:py-1 text-center w-8">R</th>}
                <th className="px-3 py-1.5 print:py-1 text-right w-20">Unit</th>
                <th className="px-3 py-1.5 print:py-1 text-right w-24">Total (CAD)</th>
              </tr>
            </thead>
            <tbody className="text-sm print:text-xs text-gray-800 divide-y divide-gray-100">
              {data?.items?.map((item, index) => {
                const p = item.product ? products.find((prod) => prod._id === item.product || prod._id === item.product._id) : null;
                const mainProductText = p ? p.name : item.customName;
                const inventoryDesc = p?.description;
                const jambText = item.jambType === 'inventory' && item.jambProduct ? getProductName(item.jambProduct) : (item.jambCustom || item.jamb || '');
                const hingeText = item.hingeType === 'inventory' && item.hingeProduct ? getProductName(item.hingeProduct) : (item.hingeCustom || '');

                return (
                  <tr key={item._id || index} className="print-avoid-break hover:bg-gray-50 transition-colors">
                    <td className="px-3 py-1.5 print:py-1 text-center font-bold text-gray-900 align-top">{item.quantity}</td>
                    {hasLocation && <td className="px-3 py-1.5 print:py-1 align-top text-gray-600">{item.location}</td>}
                    
                    <td className="px-3 py-1.5 print:py-1 align-top">
                      <span className="font-semibold text-gray-900">{mainProductText}</span>
                      
                      {inventoryDesc && (
                        <div className="text-[10px] text-gray-500 mt-0.5 leading-tight">{inventoryDesc}</div>
                      )}
                      
                      {/* Sub-description or notes */}
                      {item.description && (
                        <div className="text-[10px] text-gray-500 mt-1 italic bg-gray-50/50 p-1.5 rounded border border-gray-100 inline-block leading-tight">
                          {item.description}
                        </div>
                      )}
                      
                      {/* Bundle Items - Screen Only, Hidden in Print */}
                      {item.product?.bundles?.length > 0 && (
                        <div className="mt-1 space-y-0.5 print:hidden text-[10px] text-gray-500 pl-2 border-l-2 border-brand-200">
                          {item.product.bundles.map((b, i) => (
                            <div key={i} className="flex items-center gap-1">
                              <span className="text-brand-400">↳</span> 
                              <span>{b.product?.name || 'Unknown'}</span> 
                              <span className="bg-gray-100 text-gray-600 px-1 rounded">x{b.quantity}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </td>

                    {hasSize && <td className="px-3 py-1.5 print:py-1 align-top whitespace-nowrap text-gray-600 font-mono text-[11px]">{item.size}</td>}
                    {hasJamb && <td className="px-3 py-1.5 print:py-1 align-top text-gray-600">{jambText}</td>}
                    {hasHinge && <td className="px-3 py-1.5 print:py-1 align-top text-gray-600">{hingeText}</td>}
                    {hasLH && <td className="px-1.5 py-1.5 print:py-1 text-center align-top text-gray-600">{item.leftHand !== '' ? item.leftHand : ''}</td>}
                    {hasRH && <td className="px-1.5 py-1.5 print:py-1 text-center align-top text-gray-600">{item.rightHand !== '' ? item.rightHand : ''}</td>}
                    
                    <td className="px-3 py-1.5 print:py-1 text-right align-top text-gray-600">{Number(item.unitPrice).toFixed(2)}</td>
                    <td className="px-3 py-1.5 print:py-1 text-right align-top font-bold text-gray-900">{Number(item.lineTotal).toFixed(2)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* ── SUMMARY SECTION ── */}
        <div className="flex flex-col sm:flex-row justify-between items-start gap-6 print:gap-4 print-avoid-break">
          {/* Notes / Terms */}
          <div className="flex-1 w-full text-xs text-gray-600 pr-0 sm:pr-4">
            {data?.notes && (
              <div className="mb-3 bg-yellow-50/50 p-2.5 rounded-lg border border-yellow-100">
                <span className="font-bold text-yellow-800 uppercase tracking-wider block mb-1 text-[9px]">Document Notes</span>
                <p className="whitespace-pre-wrap text-[11px] text-yellow-900 leading-tight">{data.notes}</p>
              </div>
            )}
            
            <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 leading-tight text-[9px]">
              <div className="font-bold text-gray-900 mb-1.5 uppercase tracking-wider text-[9px]">
                THIS ORDER CONTAINS A CUSTOM, SPECIAL ORDER, OR NON-STOCK ITEM(S) &nbsp;&nbsp; Y &nbsp;&nbsp; N
              </div>
              <span className="font-bold uppercase tracking-wider block mb-0.5 text-gray-800">Terms and Conditions:</span>
              <p className="text-[9px] text-gray-600 text-justify">
                1) Claims of any kind must be made within 48 hours of purchase. 2) Any changes to an order are subject to a price change. 3) All returns must be made with original customer invoice. 4) We reserve the right to refuse a return due to damage, use, customer error or absence of original packaging. 5) No refunds or exchanges for custom, special order, or non-stocking items. 6) Restocking of credited items is charged at 25%. 7) Full payment is required prior to production for non-account holders. 8) Date of scheduled delivery is tentative as delays may occur due to unforeseen production issues. 9) Customers are responsible for providing a safe and accessible environment for receipt of delivery. 10) No credit given for assembled frames. 11) Management reserves the right to review this quote given by your salesperson and change any incorrectly quoted price.
              </p>
            </div>
          </div>

          {/* Totals */}
          <div className="w-full sm:w-64 border border-gray-200 rounded-lg overflow-hidden shadow-sm shrink-0">
            <table className="w-full text-[11px] print:text-[10px]">
              <tbody className="divide-y divide-gray-100 text-gray-600">
                <tr>
                  <td className="px-3 py-1.5 font-medium">Subtotal</td>
                  <td className="px-3 py-1.5 text-right font-semibold text-gray-900">{Number(data?.subtotal || 0).toFixed(2)}</td>
                </tr>
                {data?.discount > 0 && (
                  <tr className="bg-red-50/30">
                    <td className="px-3 py-1.5 font-medium text-red-600">Discount</td>
                    <td className="px-3 py-1.5 text-right font-semibold text-red-600">-{Number(data.discount).toFixed(2)}</td>
                  </tr>
                )}
                <tr>
                  <td className="px-3 py-1.5 font-medium">PST</td>
                  <td className="px-3 py-1.5 text-right font-semibold text-gray-900">{Number(data?.pst || 0).toFixed(2)}</td>
                </tr>
                <tr>
                  <td className="px-3 py-1.5 font-medium">Delivery</td>
                  <td className="px-3 py-1.5 text-right font-semibold text-gray-900">{Number(data?.delivery || 0).toFixed(2)}</td>
                </tr>
                <tr>
                  <td className="px-3 py-1.5 font-medium">GST</td>
                  <td className="px-3 py-1.5 text-right font-semibold text-gray-900">{Number(data?.gst || (data?.tax || 0)).toFixed(2)}</td>
                </tr>
                <tr className="bg-brand-50 text-[13px] print:text-[12px]">
                  <td className="px-3 py-2 font-bold text-brand-900 uppercase tracking-wider text-[11px] print:text-[10px]">Total CAD $</td>
                  <td className="px-3 py-2 text-right font-extrabold text-brand-700">{Number(data?.total || 0).toFixed(2)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* ── SIGNATURE SECTION ── */}
        <div className="mt-6 print:mt-4 pt-4 border-t border-gray-200 print-avoid-break">
          <p className="text-[11px] font-semibold text-gray-800 mb-6 max-w-2xl">
            By placing and signing for this order, I confirm the details of this order and I accept these terms and conditions.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-8 sm:gap-16">
            <div className="flex-1 max-w-[240px]">
              <div className="flex items-end gap-2 text-[11px] font-semibold text-gray-700">
                <span className="whitespace-nowrap">Printed Name:</span>
                <div className="border-b border-gray-300 flex-1 pl-1 pb-0.5 text-gray-900 text-sm font-bold">
                  {data?.customerInfo?.name || ''}
                </div>
              </div>
            </div>
            
            <div className="flex-1 max-w-[240px]">
              <div className="flex items-end gap-2 text-[11px] font-semibold text-gray-700">
                <span className="whitespace-nowrap">Signature:</span>
                <div className="border-b border-gray-300 flex-1"></div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default DocumentPrint;
