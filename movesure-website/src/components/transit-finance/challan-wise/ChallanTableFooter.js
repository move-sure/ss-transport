'use client';

import React from 'react';
import { Package, TrendingUp, FileText } from 'lucide-react';

export default function ChallanTableFooter({ financialSummary, footerTotals }) {
  if (!financialSummary || !footerTotals) return null;

  return (
    <div className="bg-gradient-to-r from-slate-100 to-gray-100 border-t-2 border-indigo-400 flex-shrink-0">
      <table className="w-full text-xs">
        <tfoot>
          <tr className="font-bold">
            <td className="px-1.5 py-2 w-8" />
            <td className="px-1.5 py-2 w-8" />
            <td className="px-1.5 py-2" />
            <td className="px-1.5 py-2" />
            <td className="px-1.5 py-2" />
            <td className="px-1.5 py-2" />
            <td className="px-1.5 py-2" />
            <td className="px-1.5 py-2" />
            <td className="px-1.5 py-2 text-right text-[10px] text-gray-500 font-bold uppercase">Totals →</td>
            {/* Packages */}
            <td className="px-1.5 py-2 text-right">
              <span className="text-indigo-800 font-extrabold text-xs">
                {financialSummary.totalPackages}
              </span>
            </td>
            {/* Weight */}
            <td className="px-1.5 py-2 text-right">
              <span className="text-violet-800 font-extrabold text-xs">
                {financialSummary.totalWeight.toFixed(0)}
              </span>
            </td>
            {/* Total Amount */}
            <td className="px-1.5 py-2 text-right">
              <span className="text-blue-800 font-extrabold text-xs bg-blue-50 px-2 py-0.5 rounded border border-blue-200 inline-block">
                ₹{footerTotals.totalAmount.toFixed(0)}
              </span>
            </td>
            <td className="px-1.5 py-2" />
            {/* DD Chrg */}
            <td className="px-1.5 py-2 text-right">
              {footerTotals.totalDdChrg > 0 ? (
                <span className="text-red-700 font-extrabold text-xs bg-red-50 px-2 py-0.5 rounded border border-red-200 inline-block">
                  -₹{footerTotals.totalDdChrg.toFixed(0)}
                </span>
              ) : (
                <span className="text-gray-400 text-[10px]">0</span>
              )}
            </td>
            {/* Kaat */}
            <td className="px-1.5 py-2 text-center">
              <span className="text-orange-800 font-extrabold text-xs bg-orange-50 px-2 py-0.5 rounded border border-orange-200 inline-flex items-center gap-1">
                <FileText className="w-3 h-3 text-orange-600" />
                {footerTotals.totalKaat.toFixed(0)}
              </span>
            </td>
            {/* PF */}
            <td className="px-1.5 py-2 text-right">
              <span className={`font-extrabold text-xs px-2 py-0.5 rounded border inline-block ${
                footerTotals.totalPf >= 0 ? 'text-green-700 bg-green-50 border-green-200' : 'text-red-700 bg-red-50 border-red-200'
              }`}>
                {footerTotals.totalPf.toFixed(0)}
              </span>
            </td>
            {/* Act.Rate - empty */}
            <td className="px-1.5 py-2" />
            {/* Profit */}
            <td className="px-1.5 py-2 text-right">
              <span className={`font-extrabold text-xs px-2 py-0.5 rounded border inline-flex items-center gap-1 ${
                footerTotals.totalProfit > 0 ? 'text-green-700 bg-green-50 border-green-200' :
                footerTotals.totalProfit < 0 ? 'text-red-700 bg-red-50 border-red-200' :
                'text-gray-700 bg-gray-50 border-gray-200'
              }`}>
                <TrendingUp className="w-3 h-3" />
                ₹{footerTotals.totalProfit.toFixed(0)}
              </span>
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
