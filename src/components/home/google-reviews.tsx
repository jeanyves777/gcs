"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Star, ExternalLink } from "lucide-react";
import { FadeUp } from "@/components/shared/motion";

interface Review {
  authorName: string;
  rating: number;
  text: string;
  relativeTime: string;
  profilePhoto: string | null;
  timestamp: number;
}

interface ReviewsData {
  rating: number | null;
  reviewCount: number | null;
  googleMapsUrl: string | null;
  reviews: Review[];
}

/* ── Star rating row ── */
function Stars({ rating, size = 16 }: { rating: number; size?: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={i <= rating ? "fill-amber-400 text-amber-400" : "fill-gray-200 text-gray-200 dark:fill-gray-600 dark:text-gray-600"}
          style={{ width: size, height: size }}
        />
      ))}
    </div>
  );
}

/* ── Single review card ── */
function ReviewCard({ review, index }: { review: Review; index: number }) {
  const [expanded, setExpanded] = useState(false);
  const shouldTruncate = review.text.length > 180;
  const displayText = shouldTruncate && !expanded ? review.text.slice(0, 180) + "..." : review.text;

  const initials = review.authorName
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      className="review-card flex-shrink-0 w-[340px] rounded-2xl p-6 flex flex-col gap-4 select-none"
      style={{
        background: "var(--bg-primary)",
        border: "1px solid var(--border)",
        boxShadow: "0 4px 24px rgba(0,0,0,0.06)",
      }}
    >
      {/* Header: avatar + name + time */}
      <div className="flex items-center gap-3">
        {review.profilePhoto ? (
          <img
            src={review.profilePhoto}
            alt={review.authorName}
            className="w-10 h-10 rounded-full object-cover"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white"
            style={{
              background: "linear-gradient(135deg, var(--brand-primary), var(--brand-accent))",
            }}
          >
            {initials}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate" style={{ color: "var(--text-primary)" }}>
            {review.authorName}
          </p>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            {review.relativeTime}
          </p>
        </div>
        {/* Google "G" icon */}
        <svg viewBox="0 0 24 24" className="w-5 h-5 flex-shrink-0" aria-hidden="true">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
        </svg>
      </div>

      {/* Stars */}
      <Stars rating={review.rating} />

      {/* Review text */}
      <p className="text-sm leading-relaxed flex-1" style={{ color: "var(--text-secondary)" }}>
        {displayText}
        {shouldTruncate && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="ml-1 font-medium hover:underline"
            style={{ color: "var(--brand-primary)" }}
          >
            {expanded ? "show less" : "read more"}
          </button>
        )}
      </p>
    </motion.div>
  );
}

/* ── Overall rating badge ── */
function RatingBadge({ rating, reviewCount }: { rating: number; reviewCount: number }) {
  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      whileInView={{ scale: 1, opacity: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6"
    >
      {/* Big rating number */}
      <div className="flex items-baseline gap-2">
        <span
          className="text-5xl font-black"
          style={{ color: "var(--text-primary)", fontFamily: "var(--font-display)" }}
        >
          {rating.toFixed(1)}
        </span>
        <span className="text-lg font-medium" style={{ color: "var(--text-muted)" }}>
          / 5
        </span>
      </div>

      <div className="flex flex-col items-center sm:items-start gap-1">
        {/* Animated stars */}
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((i) => (
            <motion.div
              key={i}
              initial={{ scale: 0, rotate: -180 }}
              whileInView={{ scale: 1, rotate: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: 0.3 + i * 0.1, type: "spring", stiffness: 200 }}
            >
              <Star
                className={
                  i <= Math.round(rating)
                    ? "fill-amber-400 text-amber-400"
                    : "fill-gray-200 text-gray-200 dark:fill-gray-600 dark:text-gray-600"
                }
                style={{ width: 24, height: 24 }}
              />
            </motion.div>
          ))}
        </div>
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
          Based on{" "}
          <span className="font-semibold" style={{ color: "var(--text-primary)" }}>
            {reviewCount}
          </span>{" "}
          reviews
        </p>
      </div>
    </motion.div>
  );
}

/* ── Skeleton loader ── */
function ReviewSkeleton() {
  return (
    <div className="flex gap-6 overflow-hidden py-4">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="flex-shrink-0 w-[340px] rounded-2xl p-6 animate-pulse"
          style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)" }}
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full" style={{ background: "var(--bg-tertiary)" }} />
            <div className="flex-1 space-y-2">
              <div className="h-3 rounded w-24" style={{ background: "var(--bg-tertiary)" }} />
              <div className="h-2 rounded w-16" style={{ background: "var(--bg-tertiary)" }} />
            </div>
          </div>
          <div className="flex gap-1 mb-4">
            {[1, 2, 3, 4, 5].map((s) => (
              <div key={s} className="w-4 h-4 rounded" style={{ background: "var(--bg-tertiary)" }} />
            ))}
          </div>
          <div className="space-y-2">
            <div className="h-3 rounded w-full" style={{ background: "var(--bg-tertiary)" }} />
            <div className="h-3 rounded w-4/5" style={{ background: "var(--bg-tertiary)" }} />
            <div className="h-3 rounded w-3/5" style={{ background: "var(--bg-tertiary)" }} />
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── Main component ── */
export function GoogleReviews() {
  const [data, setData] = useState<ReviewsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/reviews")
      .then((res) => res.json())
      .then((d: ReviewsData) => {
        setData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  // Don't render if no reviews available
  if (!loading && (!data || !data.reviews?.length)) return null;

  return (
    <section className="section-padding overflow-hidden" style={{ background: "var(--bg-secondary)" }}>
      <div className="container-gcs">
        <FadeUp>
          {/* Section header */}
          <div className="text-center mb-10">
            <div className="flex items-center justify-center gap-3 mb-4">
              {/* Google logo */}
              <svg viewBox="0 0 24 24" className="w-8 h-8" aria-hidden="true">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              <h2 className="font-bold" style={{ fontFamily: "var(--font-display)" }}>
                What Our Clients Say
              </h2>
            </div>
            <p className="max-w-xl mx-auto mb-8" style={{ color: "var(--text-secondary)" }}>
              Real reviews from real clients on Google
            </p>

            {/* Overall rating */}
            {!loading && data?.rating && data?.reviewCount && (
              <div className="flex justify-center mb-2">
                <RatingBadge rating={data.rating} reviewCount={data.reviewCount} />
              </div>
            )}
          </div>
        </FadeUp>

        {/* Reviews carousel */}
        {loading ? (
          <ReviewSkeleton />
        ) : (
          <div
            className="reviews-marquee-container"
            style={{ maskImage: "linear-gradient(to right, transparent, black 5%, black 95%, transparent)" }}
          >
            <div className="reviews-marquee">
              {/* First set */}
              {data!.reviews.map((review, i) => (
                <ReviewCard key={`a-${i}`} review={review} index={i} />
              ))}
              {/* Duplicate set for seamless loop */}
              {data!.reviews.map((review, i) => (
                <ReviewCard key={`b-${i}`} review={review} index={i} />
              ))}
            </div>
          </div>
        )}

        {/* "See all reviews" link */}
        {!loading && data?.googleMapsUrl && (
          <FadeUp delay={0.3}>
            <div className="text-center mt-10">
              <a
                href={data.googleMapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm font-semibold transition-colors hover:opacity-80"
                style={{ color: "var(--brand-primary)" }}
              >
                See all reviews on Google
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          </FadeUp>
        )}
      </div>
    </section>
  );
}
