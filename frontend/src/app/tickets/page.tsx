"use client";

import { Suspense } from "react";
import { PageLoading } from "@/components/ui/skeleton";
import TicketsPageContent from "./TicketsPageContent";

export default function TicketsPage() {
  return (
    <Suspense fallback={<PageLoading label="Loading repairs..." />}>
      <TicketsPageContent />
    </Suspense>
  );
}
