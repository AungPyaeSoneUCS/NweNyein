import Link from "next/link";

export default function Footer() {
  return (
    <footer className="mt-8 border-t border-amber-900/10 bg-gradient-to-b from-maroon to-maroon-dark text-ivory mb-16 md:mb-0">
      <div className="container-page grid gap-8 py-12 md:grid-cols-3">
        <div>
          <h3 className="text-lg font-semibold text-saffron-light">NweNyeinHill Monastery</h3>
          <p className="mt-3 text-sm text-ivory/80 leading-relaxed">
            A serene place for Dhamma teachings, reflection, and community activities in the Burmese Theravada tradition.
          </p>
        </div>
        <div>
          <h4 className="text-sm font-semibold uppercase tracking-wide text-saffron-light">Explore</h4>
          <ul className="mt-3 space-y-2.5 text-sm">
            <li><Link href="/knowledge" className="text-ivory/90 hover:text-white">Knowledge & Teachings</Link></li>
            <li><Link href="/history" className="text-ivory/90 hover:text-white">Monastery History</Link></li>
            <li><Link href="/activities" className="text-ivory/90 hover:text-white">Activities & Gallery</Link></li>
            <li><Link href="/songs" className="text-ivory/90 hover:text-white">Dhamma Songs & Chants</Link></li>
            <li><Link href="/library" className="text-ivory/90 hover:text-white">E-Book Library</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="text-sm font-semibold uppercase tracking-wide text-saffron-light">Administration</h4>
          <ul className="mt-3 space-y-2.5 text-sm">
            <li><Link href="/admin" className="text-ivory/90 hover:text-white">Admin Portal</Link></li>
          </ul>
          <p className="mt-5 text-xs text-ivory/60 leading-relaxed">May all beings be happy and free from suffering.</p>
        </div>
      </div>
      <div className="border-t border-white/10 py-4 text-center text-xs text-ivory/70">
        © {new Date().getFullYear()} NweNyeinHill Monastery. All rights reserved.
      </div>
    </footer>
  );
}
