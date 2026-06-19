import { SHOP } from "@/lib/shop";

export function ShopContact({ className = "", showName = true }: { className?: string; showName?: boolean }) {
  return (
    <div className={`text-sm text-slate-600 ${className}`}>
      {showName && <p className="font-medium text-slate-800">{SHOP.name}</p>}
      <p>Owner: {SHOP.ownerName}</p>
      <p>Shop: {SHOP.mobile}</p>
      {SHOP.addressLines.map((line) => (
        <p key={line}>{line}</p>
      ))}
    </div>
  );
}

export function ShopTerms({ className = "" }: { className?: string }) {
  return (
    <div className={`rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-950 ${className}`}>
      <p className="mb-1 font-semibold">Important</p>
      <ul className="list-disc space-y-1 pl-4">
        {SHOP.terms.map((term) => (
          <li key={term}>{term}</li>
        ))}
      </ul>
    </div>
  );
}
