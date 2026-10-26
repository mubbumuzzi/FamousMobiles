import TrackByIdClient from "./TrackByIdClient";

export function generateStaticParams() {
  return [{ trackingId: "view" }];
}

export default function TrackByIdPage() {
  return <TrackByIdClient />;
}
