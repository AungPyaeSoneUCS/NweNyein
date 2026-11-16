import Link from "next/link";
import { WifiOff, Home } from "lucide-react";

export const metadata = { title: "Offline" };

export default function OfflinePage() {
  return (
    <div className="container-page flex min-h-[70vh] items-center justify-center py-10">
      <div className="card w-full max-w-md p-8 text-center">
        <span className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-maroon/10 text-maroon">
          <WifiOff size={26} />
        </span>
        <h1 className="mt-4 text-2xl text-maroon">You&apos;re offline</h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          This page needs a connection. Previously visited pages still work from your device.
        </p>
        <Link href="/" className="btn-primary mt-6 inline-flex">
          <Home size={16} /> Back to home
        </Link>
      </div>
    </div>
  );
}
