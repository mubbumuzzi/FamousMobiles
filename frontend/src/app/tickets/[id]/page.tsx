import TicketDetailClient from "./TicketDetailClient";

export function generateStaticParams() {
  return [{ id: "view" }];
}

export default function TicketDetailPage() {
  return <TicketDetailClient />;
}
