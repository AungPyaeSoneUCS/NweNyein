import { getDriveFiles } from "@/lib/googleDrive";
import AudioPlayer from "@/components/AudioPlayer";
import FadeIn from "@/components/motion/FadeIn";

export const metadata = { title: "Dhamma Songs & Chants" };
export const revalidate = 3600;

export default async function SongsPage() {
  let tracks: any[] = [];
  let error: string | null = null;
  try {
    tracks = await getDriveFiles("songs");
  } catch (e) {
    console.error(e);
    error = "Unable to load songs at the moment. Please check Google Drive configuration.";
  }

  return (
    <div className="container-page py-10 md:py-14">
      <FadeIn className="mb-8 max-w-3xl">
        <span className="inline-flex rounded-full bg-saffron/15 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-saffron-dark">Chants & Audio</span>
        <h1 className="mt-3 text-3xl md:text-4xl leading-tight">Dhamma Songs & Chants</h1>
        <p className="mt-3 text-slate-600 leading-relaxed">
          Listen to paritta chanting and devotional Dhamma songs. Select a track to begin playback in the floating player.
        </p>
      </FadeIn>
      {error ? (
        <div className="card border-red-200/60 bg-red-50/70 p-6 text-red-700">{error}</div>
      ) : (
        <FadeIn delay={0.05}><AudioPlayer tracks={tracks} /></FadeIn>
      )}
    </div>
  );
}
