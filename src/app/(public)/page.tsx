import Link from "next/link";
import connectToDatabase from "@/lib/mongodb";
import Post from "@/models/Post";
import PostCard from "@/components/PostCard";
import { getDriveFiles } from "@/lib/googleDrive";
import FadeIn from "@/components/motion/FadeIn";
import { StaggerGrid, StaggerItem } from "@/components/motion/StaggerGrid";
import { ArrowRight, BookOpen, Music2, Landmark } from "lucide-react";

export const dynamic = "force-dynamic";

async function getHomeData() {
  await connectToDatabase();
  const [knowledge, activities] = await Promise.all([
    Post.find({ category: "knowledge", published: true }).sort({ createdAt: -1 }).limit(3).lean(),
    Post.find({ category: "activity", published: true }).sort({ createdAt: -1 }).limit(3).lean(),
  ]);

  let songsCount = 0;
  let booksCount = 0;
  try {
    const [songs, books] = await Promise.all([
      getDriveFiles("songs").catch(() => []),
      getDriveFiles("books").catch(() => []),
    ]);
    songsCount = songs.length;
    booksCount = books.length;
  } catch {
    // ignore drive errors on home
  }

  return {
    knowledge: JSON.parse(JSON.stringify(knowledge)),
    activities: JSON.parse(JSON.stringify(activities)),
    songsCount,
    booksCount,
  };
}

export default async function HomePage() {
  const { knowledge, activities, songsCount, booksCount } = await getHomeData();

  return (
    <div className="pb-4">
      {/* Hero */}
      <section className="relative overflow-hidden px-4 pt-4 md:pt-6">
        <div className="container-page relative overflow-hidden rounded-3xl border border-amber-200/40 bg-gradient-to-br from-maroon via-maroon-light to-maroon-dark px-6 py-14 text-ivory shadow-glass sm:px-10 md:py-20">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -top-20 -left-10 h-64 w-64 rounded-full bg-saffron/30 blur-3xl" />
            <div className="absolute bottom-0 right-0 h-72 w-72 rounded-full bg-amber-200/20 blur-3xl" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.12),transparent_55%)]" />
          </div>
          <FadeIn className="relative max-w-3xl">
            <span className="inline-flex items-center rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.2em] text-amber-100 backdrop-blur-sm">
              Burmese Theravada Buddhist Monastery
            </span>
            <h1 className="mt-5 font-myanmar text-4xl font-bold leading-[1.15] text-white sm:text-5xl md:text-6xl">
              NweNyeinHill Monastery
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-relaxed text-ivory/90 sm:text-lg sm:leading-loose">
              A serene sanctuary for Dhamma learning, reflection, and compassionate service. Discover teachings, history, activities, chants, and our digital library.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <Link href="/knowledge" className="btn-primary w-full sm:w-auto">
                Explore Teachings <ArrowRight size={16} />
              </Link>
              <Link href="/library" className="btn w-full border border-white/30 bg-white/10 text-white backdrop-blur-sm hover:bg-white/20 sm:w-auto">
                Visit E-Book Library
              </Link>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* Latest Knowledge */}
      <section className="container-page py-14 md:py-16">
        <FadeIn className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-2xl md:text-3xl">Latest Dhamma Teachings</h2>
            <p className="mt-1 text-slate-600 leading-relaxed">Recent knowledge posts, reflections, and guidance.</p>
          </div>
          <Link href="/knowledge" className="inline-flex min-h-[44px] items-center text-sm font-semibold text-saffron-dark hover:text-maroon">
            View all <ArrowRight size={15} className="ml-1" />
          </Link>
        </FadeIn>
        {knowledge.length > 0 ? (
          <StaggerGrid className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 sm:gap-6">
            {knowledge.map((p: any) => (
              <StaggerItem key={p._id}><PostCard {...p} /></StaggerItem>
            ))}
          </StaggerGrid>
        ) : (
          <div className="card p-8 text-slate-600">No teachings published yet.</div>
        )}
      </section>

      {/* Recent Activities */}
      <section className="border-y border-amber-900/10 bg-white/40">
        <div className="container-page py-14 md:py-16">
          <FadeIn className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-2xl md:text-3xl">Recent Activities</h2>
              <p className="mt-1 text-slate-600 leading-relaxed">Community events, ceremonies, and monastery photo reports.</p>
            </div>
            <Link href="/activities" className="inline-flex min-h-[44px] items-center text-sm font-semibold text-saffron-dark hover:text-maroon">
              View all <ArrowRight size={15} className="ml-1" />
            </Link>
          </FadeIn>
          {activities.length > 0 ? (
            <StaggerGrid className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 sm:gap-6">
              {activities.map((p: any) => (
                <StaggerItem key={p._id}><PostCard {...p} /></StaggerItem>
              ))}
            </StaggerGrid>
          ) : (
            <div className="card p-8 text-slate-600">No activities published yet.</div>
          )}
        </div>
      </section>

      {/* Quick Access */}
      <section className="container-page py-14 md:py-16">
        <FadeIn>
          <h2 className="text-2xl md:text-3xl">Quick Access</h2>
          <p className="mt-1 text-slate-600 leading-relaxed">Listen, read, and explore the monastery&apos;s digital offerings.</p>
        </FadeIn>
        <StaggerGrid className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3 sm:gap-6">
          <StaggerItem>
            <Link href="/songs" className="card group flex h-full flex-col p-6 hover:border-saffron/30">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-saffron/10 text-saffron-dark"><Music2 size={22} /></div>
              <h3 className="mt-4 text-xl text-maroon">Dhamma Songs & Chants</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">Listen to paritta chanting and devotional songs anytime.</p>
              <p className="mt-5 text-sm font-semibold text-saffron-dark">{songsCount} tracks available</p>
            </Link>
          </StaggerItem>
          <StaggerItem>
            <Link href="/library" className="card group flex h-full flex-col p-6 hover:border-saffron/30">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-maroon/10 text-maroon"><BookOpen size={22} /></div>
              <h3 className="mt-4 text-xl text-maroon">E-Book & Document Library</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">Read and download Dhamma books in PDF and Word formats.</p>
              <p className="mt-5 text-sm font-semibold text-saffron-dark">{booksCount} documents available</p>
            </Link>
          </StaggerItem>
          <StaggerItem>
            <Link href="/history" className="card group flex h-full flex-col p-6 hover:border-saffron/30">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-800"><Landmark size={22} /></div>
              <h3 className="mt-4 text-xl text-maroon">Monastery History</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">Learn about our founding, lineage of abbots, and milestones.</p>
              <p className="mt-5 text-sm font-semibold text-saffron-dark">Explore the timeline →</p>
            </Link>
          </StaggerItem>
        </StaggerGrid>
      </section>
    </div>
  );
}
