import CustomerDetailClient from "./CustomerDetailClient";

export function generateStaticParams() {
  return [{ id: "view" }];
}

export default function CustomerDetailPage() {
  return <CustomerDetailClient />;
}
