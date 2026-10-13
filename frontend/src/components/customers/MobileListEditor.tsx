"use client";

import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label, Field, selectClassName } from "@/components/ui/input";
import { CustomerMobile } from "@/lib/types";

const LABEL_OPTIONS = ["Primary", "Alternate", "Wife", "Husband", "Office", "Other"];

export function emptyMobile(isPrimary = false): CustomerMobile {
  return { number: "", label: isPrimary ? "Primary" : "Alternate", isPrimary };
}

type Props = {
  mobiles: CustomerMobile[];
  onChange: (mobiles: CustomerMobile[]) => void;
  /** Lock the first number (e.g. already typed during lookup). */
  lockFirstNumber?: boolean;
};

export function MobileListEditor({ mobiles, onChange, lockFirstNumber }: Props) {
  const update = (index: number, patch: Partial<CustomerMobile>) => {
    const next = mobiles.map((m, i) => {
      if (i !== index) {
        if (patch.isPrimary) return { ...m, isPrimary: false };
        return m;
      }
      return { ...m, ...patch };
    });
    onChange(next);
  };

  const add = () => onChange([...mobiles, emptyMobile(false)]);

  const remove = (index: number) => {
    if (mobiles.length <= 1) return;
    const next = mobiles.filter((_, i) => i !== index);
    if (!next.some((m) => m.isPrimary)) {
      next[0] = { ...next[0], isPrimary: true, label: next[0].label || "Primary" };
    }
    onChange(next);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label>Mobile numbers *</Label>
        <Button type="button" variant="outline" size="sm" onClick={add}>
          <Plus className="h-3.5 w-3.5" /> Add number
        </Button>
      </div>
      {mobiles.map((m, i) => (
        <div key={i} className="grid gap-2 sm:grid-cols-[1fr_140px_auto] sm:items-end">
          <Field>
            <Label className="text-xs text-slate-500">{m.isPrimary ? "Primary" : `Number ${i + 1}`}</Label>
            <Input
              type="tel"
              inputMode="numeric"
              placeholder="10-digit mobile"
              value={m.number}
              disabled={lockFirstNumber && i === 0}
              onChange={(e) => update(i, { number: e.target.value })}
            />
          </Field>
          <Field>
            <Label className="text-xs text-slate-500">Label</Label>
            <select
              className={selectClassName}
              value={m.label || (m.isPrimary ? "Primary" : "Alternate")}
              onChange={(e) => update(i, { label: e.target.value })}
            >
              {LABEL_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </Field>
          <div className="flex gap-2 pb-0.5">
            {!m.isPrimary && (
              <Button type="button" variant="ghost" size="sm" onClick={() => update(i, { isPrimary: true, label: "Primary" })}>
                Make primary
              </Button>
            )}
            {mobiles.length > 1 && !(lockFirstNumber && i === 0) && (
              <Button type="button" variant="ghost" size="icon" onClick={() => remove(i)} aria-label="Remove number">
                <Trash2 className="h-4 w-4 text-slate-500" />
              </Button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
