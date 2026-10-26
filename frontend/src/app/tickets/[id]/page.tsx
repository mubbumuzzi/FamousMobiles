import { Suspense } from "react";
import TicketDetailClient from "./TicketDetailClient";

export function generateStaticParams() {
  return [{ id: "view" }];
}

export default function TicketDetailPage() {
  return (
    <Suspense fallback={null}>
      <TicketDetailClient />
    </Suspense>
  );
}
