"use client";

import * as React from "react";
import { formatIBAN, validateIBAN } from "@/features/transactions/import/detect-iban";
import { formatTRY } from "@/lib/money";

type Person = {
  id: string;
  name: string;
  amount: number;
};

type HiddenReceiptProps = {
  people: Person[];
  subtotal: number;
  tip: number;
  tipPercentage: number;
  total: number;
  iban: string;
};

export const HiddenReceipt = React.forwardRef<HTMLDivElement, HiddenReceiptProps>(
  ({ people, subtotal, tip, tipPercentage, total, iban }, ref) => {
    const now = new Date();
    const dateStr = now.toLocaleDateString("tr-TR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
    const timeStr = now.toLocaleTimeString("tr-TR", {
      hour: "2-digit",
      minute: "2-digit",
    });

    // Filter out empty people
    const validPeople = people.filter(
      (p) => p.name.trim() || parseFloat(String(p.amount)) > 0
    );

    return (
      <div
        ref={ref}
        className="w-[400px] bg-[#f5f5f5] p-6 font-mono text-sm text-black shadow-lg"
        style={{
          position: "absolute",
          left: "-9999px",
          top: "0",
          visibility: "hidden",
          whiteSpace: "nowrap",
        }}
      >
        <div className="space-y-3" style={{ whiteSpace: "normal" }}>
          {/* Header */}
          <div className="text-center">
            <h2 className="text-lg font-bold uppercase tracking-wider">
              HESAP ÖZETİ
            </h2>
            <p className="text-xs text-gray-600">
              {dateStr} {timeStr}
            </p>
          </div>

          {/* Separator */}
          <div className="border-t border-dashed border-gray-400"></div>

          {/* People List */}
          <div className="space-y-2">
            {validPeople.length > 0 ? (
              validPeople.map((person, index) => {
                const personAmount = parseFloat(String(person.amount)) || 0;
                const personTip = personAmount * (tipPercentage / 100);
                const personTotal = personAmount + personTip;

                return (
                  <div key={person.id} className="space-y-1">
                    <div className="flex justify-between">
                      <span className="font-semibold">
                        {person.name.trim() || `Kişi ${index + 1}`}
                      </span>
                      <span>{formatTRY(personTotal)}</span>
                    </div>
                    {personAmount > 0 && (
                      <div className="flex justify-between text-xs text-gray-600">
                        <span>Yemek: {formatTRY(personAmount)}</span>
                        {tipPercentage > 0 && (
                          <span>Bahşiş: {formatTRY(personTip)}</span>
                        )}
                      </div>
                    )}
                    {index < validPeople.length - 1 && (
                      <div className="border-t border-dashed border-gray-300"></div>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="text-center text-gray-500 py-4">
                Henüz kişi eklenmedi
              </div>
            )}
          </div>

          {/* Separator */}
          <div className="border-t border-dashed border-gray-400"></div>

          {/* Totals */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span>Ara Toplam:</span>
              <span>{formatTRY(subtotal)}</span>
            </div>
            {tipPercentage > 0 && (
              <div className="flex justify-between text-xs">
                <span>Bahşiş (%{tipPercentage}):</span>
                <span>{formatTRY(tip)}</span>
              </div>
            )}
            <div className="flex justify-between border-t border-gray-400 pt-1 font-bold">
              <span>TOPLAM:</span>
              <span>{formatTRY(total)}</span>
            </div>
          </div>

          {/* IBAN */}
          {iban.trim() && validateIBAN(iban) && (
            <>
              <div className="border-t border-dashed border-gray-400"></div>
              <div className="space-y-1 text-xs">
                <div className="font-semibold">IBAN:</div>
                <div className="break-all">{formatIBAN(iban)}</div>
              </div>
            </>
          )}

          {/* Footer */}
          <div className="border-t border-dashed border-gray-400 pt-2 text-center text-xs text-gray-500">
            UniCebim ile oluşturuldu
          </div>
        </div>
      </div>
    );
  }
);

HiddenReceipt.displayName = "HiddenReceipt";

