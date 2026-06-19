"use client";

import { useEffect, useState } from "react";
import { StaffLayout } from "@/components/layout/StaffLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { useAuthGuard } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import { InventoryItem } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";

export default function InventoryPage() {
  const { user, loading: authLoading } = useAuthGuard();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [adjustId, setAdjustId] = useState("");
  const [qty, setQty] = useState("");

  const load = () => api<InventoryItem[]>("/inventory").then(setItems);
  useEffect(() => { load(); }, []);

  const adjust = async (id: string, type: "adjust" | "deduct") => {
    await api(`/inventory/${id}/${type}`, { method: "POST", body: JSON.stringify({ quantity: Number(qty), notes: "" }) });
    setQty(""); setAdjustId(""); load();
  };

  if (authLoading) return null;

  return (
    <StaffLayout userName={user?.fullName} role={user?.role}>
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Inventory</h1>
        <div className="space-y-2">
          {items.map((item) => (
            <Card key={item.id}>
              <CardContent className="flex flex-wrap items-center justify-between gap-2 p-4">
                <div>
                  <p className="font-medium">{item.partName}</p>
                  <p className="text-sm text-slate-500">SKU: {item.sku} · Qty: {item.quantity}</p>
                  <p className="text-xs text-slate-400">Cost: {formatCurrency(Number(item.costPrice))} · Sell: {formatCurrency(Number(item.sellingPrice))}</p>
                </div>
                {item.lowStock && <Badge variant="destructive">Low Stock</Badge>}
                {adjustId === item.id ? (
                  <div className="flex gap-2">
                    <Input type="number" value={qty} onChange={(e) => setQty(e.target.value)} className="w-20" />
                    <Button size="sm" onClick={() => adjust(item.id, "adjust")}>Add</Button>
                    <Button size="sm" variant="outline" onClick={() => adjust(item.id, "deduct")}>Deduct</Button>
                  </div>
                ) : (
                  <Button size="sm" variant="outline" onClick={() => setAdjustId(item.id)}>Adjust</Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </StaffLayout>
  );
}
