"use client";

import dynamic from "next/dynamic";
import type { MdseTimeline } from "@/types";

const MdseTimelineChart = dynamic(() => import("@/components/MdseTimelineChart"), { ssr: false });

interface MdseDetectorTimelineProps {
  timeline: MdseTimeline | null;
}

export default function MdseDetectorTimeline({ timeline }: MdseDetectorTimelineProps) {
  return (
    <section>
      <h2 className="text-xl font-bold text-zinc-100 mb-4">
        Detector Timeline
      </h2>
      <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
        <MdseTimelineChart data={timeline} />
      </div>
    </section>
  );
}
