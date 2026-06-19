export default function OfflinePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-4 text-center">
      <h1 className="text-xl font-bold text-slate-900">You are offline</h1>
      <p className="text-slate-600">Famous Mobiles requires an internet connection for most features.</p>
      <a href="/" className="text-blue-600 hover:underline">Try again</a>
    </div>
  );
}
