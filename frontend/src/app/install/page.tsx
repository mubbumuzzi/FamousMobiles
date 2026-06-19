import Link from "next/link";
import { ArrowLeft, Share, Smartphone, PlusSquare } from "lucide-react";

export const metadata = {
  title: "Install App — Famous Mobiles",
};

export default function InstallPage() {
  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8">
      <div className="mx-auto max-w-lg">
        <Link href="/login" className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-blue-600">
          <ArrowLeft className="h-4 w-4" />
          Back to login
        </Link>

        <div className="premium-card p-6">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600 text-white">
              <Smartphone className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">Add to Home Screen</h1>
              <p className="text-sm text-slate-500">Use Famous Mobiles like a normal app</p>
            </div>
          </div>

          <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            <strong>Important:</strong> On iPhone you must use <strong>Safari</strong> — not Chrome, not WhatsApp’s browser.
            If you opened this link from WhatsApp, tap <strong>⋯</strong> → <strong>Open in Safari</strong> first.
          </div>

          <section className="mb-8">
            <h2 className="mb-3 text-lg font-semibold text-slate-900">iPhone (Safari)</h2>
            <ol className="space-y-4 text-sm text-slate-700">
              <li className="flex gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">1</span>
                <span>
                  Open <strong>Safari</strong> and go to your Famous Mobiles site
                  (type the address in the bar — don&apos;t use Chrome).
                </span>
              </li>
              <li className="flex gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">2</span>
                <span className="flex items-start gap-2">
                  <Share className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
                  <span>
                    Tap the <strong>Share</strong> button — square with an arrow pointing up.
                    On newer iPhones it is at the <strong>bottom</strong> of Safari (not the top).
                  </span>
                </span>
              </li>
              <li className="flex gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">3</span>
                <span>
                  In the menu that opens, <strong>scroll down</strong>. &quot;Add to Home Screen&quot; is often
                  below the first row of icons — easy to miss.
                </span>
              </li>
              <li className="flex gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">4</span>
                <span className="flex items-start gap-2">
                  <PlusSquare className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
                  <span>
                    Tap <strong>Add to Home Screen</strong> → <strong>Add</strong>.
                    The Famous Mobiles icon will appear on your home screen.
                  </span>
                </span>
              </li>
            </ol>
            <p className="mt-4 text-xs text-slate-500">
              Still don&apos;t see it? In the Share menu tap <strong>Edit Actions</strong> or <strong>More</strong>,
              then enable <strong>Add to Home Screen</strong>.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-slate-900">Android (Chrome)</h2>
            <ol className="space-y-3 text-sm text-slate-700">
              <li>1. Open the site in <strong>Chrome</strong>.</li>
              <li>2. Tap menu <strong>⋮</strong> (top right).</li>
              <li>3. Tap <strong>Install app</strong> or <strong>Add to Home screen</strong>.</li>
            </ol>
          </section>
        </div>
      </div>
    </div>
  );
}
