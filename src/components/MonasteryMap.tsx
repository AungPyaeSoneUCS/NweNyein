"use client";

import { useState } from "react";
import {
  ExternalLink,
  Loader2,
  MapPin,
  Navigation,
  RefreshCw,
} from "lucide-react";
import {
  MAP_DIRECTIONS_URL,
  MAP_EMBED_URL,
  MAP_SHORT_URL,
  MONASTERY_LOCATION,
  SITE_NAME,
} from "@/lib/siteConfig";

type DistanceState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; km: number }
  | { status: "error"; message: string };

/** Great-circle distance in kilometres. */
function distanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const toRad = (degrees: number) => (degrees * Math.PI) / 180;
  const earthRadiusKm = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * earthRadiusKm * Math.asin(Math.sqrt(a));
}

function formatDistance(km: number) {
  if (km < 1) return `${Math.max(1, Math.round(km * 1000))} m`;
  return `${km.toFixed(1)} km`;
}

export default function MonasteryMap() {
  const [distance, setDistance] = useState<DistanceState>({ status: "idle" });

  function findMyDistance() {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setDistance({
        status: "error",
        message: "This browser cannot share your location. Use directions below instead.",
      });
      return;
    }

    setDistance({ status: "loading" });
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setDistance({
          status: "ready",
          km: distanceKm(
            latitude,
            longitude,
            MONASTERY_LOCATION.lat,
            MONASTERY_LOCATION.lng
          ),
        });
      },
      (error) => {
        const message =
          error.code === error.PERMISSION_DENIED
            ? "Location permission was denied. Allow location access in your browser, or use directions."
            : error.code === error.TIMEOUT
              ? "Location request timed out. Please try again or use directions."
              : "Your location is unavailable right now. Please try again or use directions.";
        setDistance({ status: "error", message });
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 300000 }
    );
  }

  const coordinateText = `${MONASTERY_LOCATION.lat.toFixed(6)}, ${MONASTERY_LOCATION.lng.toFixed(6)}`;

  return (
    <section className="container-page py-14 md:py-16" id="location">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200/70 bg-amber-50/70 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-saffron-dark">
            <MapPin size={13} /> Find Us
          </span>
          <h2 className="mt-3 text-2xl md:text-3xl">Visit the Monastery</h2>
          <p className="mt-1 text-slate-600 leading-relaxed">
            <span className="font-myanmar font-medium text-maroon">{SITE_NAME}</span>
            <span className="hidden sm:inline"> · </span>
            <span className="block sm:inline">See the map, get directions, or check how far you are.</span>
          </p>
        </div>
      </div>

      <div className="card overflow-hidden p-3 shadow-glass sm:p-4">
        <div className="grid gap-4 lg:grid-cols-12">
          {/* Map */}
          <div className="relative min-h-[280px] overflow-hidden rounded-2xl border border-amber-200/60 bg-ivory lg:col-span-7 lg:min-h-[380px]">
            <iframe
              src={MAP_EMBED_URL}
              title={`Google Map of ${SITE_NAME}`}
              className="absolute inset-0 h-full w-full border-0"
              allowFullScreen
              loading="lazy"
              referrerPolicy="strict-origin-when-cross-origin"
            />
          </div>

          {/* Location info */}
          <div className="flex flex-col gap-4 lg:col-span-5 lg:p-2">
            <div className="rounded-2xl border border-amber-900/10 bg-white/70 p-4 sm:p-5">
              <div className="flex items-start gap-3">
                <span className="inline-flex h-11 w-11 flex-none items-center justify-center rounded-xl bg-maroon/10 text-maroon">
                  <MapPin size={20} />
                </span>
                <div className="min-w-0">
                  <p className="font-myanmar text-base font-semibold leading-snug text-maroon sm:text-lg">
                    {SITE_NAME}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">Burmese Theravada Buddhist Monastery</p>
                </div>
              </div>
              <dl className="mt-4 space-y-2 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <dt className="text-slate-500">Coordinates</dt>
                  <dd className="font-mono text-xs text-charcoal">{coordinateText}</dd>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <dt className="text-slate-500">Google Maps</dt>
                  <dd>
                    <a
                      href={MAP_SHORT_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 font-medium text-saffron-dark hover:underline"
                    >
                      Open map link <ExternalLink size={12} />
                    </a>
                  </dd>
                </div>
              </dl>
            </div>

            {/* Distance from the visitor */}
            <div className="rounded-2xl border border-saffron/25 bg-gradient-to-br from-amber-50/80 to-white/80 p-4 sm:p-5">
              <div className="flex items-start gap-3">
                <span className="inline-flex h-11 w-11 flex-none items-center justify-center rounded-xl bg-saffron/15 text-saffron-dark">
                  <Navigation size={20} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-maroon">
                    How far from your current location?
                  </p>

                  {distance.status === "ready" ? (
                    <div className="mt-1">
                      <p className="text-2xl font-bold text-charcoal">
                        {formatDistance(distance.km)}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        about {(distance.km * 0.621371).toFixed(1)} mi away · straight-line distance
                      </p>
                    </div>
                  ) : distance.status === "error" ? (
                    <p className="mt-1 text-xs leading-relaxed text-slate-600">{distance.message}</p>
                  ) : (
                    <p className="mt-1 text-xs leading-relaxed text-slate-600">
                      Share your current location to calculate the straight-line distance to the monastery.
                    </p>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={findMyDistance}
                disabled={distance.status === "loading"}
                className="mt-4 inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border border-saffron/30 bg-white/80 px-4 text-sm font-medium text-maroon transition hover:bg-white disabled:cursor-wait disabled:opacity-70"
              >
                {distance.status === "loading" ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : distance.status === "ready" ? (
                  <RefreshCw size={16} />
                ) : (
                  <Navigation size={16} />
                )}
                {distance.status === "loading"
                  ? "Finding your location..."
                  : distance.status === "ready"
                    ? "Refresh distance"
                    : "Use my location"}
              </button>
            </div>

            <a
              href={MAP_DIRECTIONS_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary mt-auto w-full text-sm"
            >
              <Navigation size={16} /> Get directions
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
