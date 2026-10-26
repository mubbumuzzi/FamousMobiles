import { Suspense } from "react";
import CustomerDetailClient from "./CustomerDetailClient";

export function generateStaticParams() {
  return [{ id: "view" }];
}

export default function CustomerDetailPage() {
  return (
    <Suspense fallback={null}>
      <CustomerDetailClient />
    </Suspense>
  );
}
