"use client";

import { motion } from "framer-motion";
import { CalendarDays, MapPin, Sparkles, Ticket } from "lucide-react";

interface Props {
  event: {
    title: string;
    city: string;
    venue: string;
    date: string;
    time: string;
    price: string;
    tier: string;
    image: string;
    accent: string;
    sold: number;
  };
}

export function EventCard({ event }: Props) {
  return (
    <motion.article
      whileHover={{ y: -8, scale: 1.01 }}
      transition={{ type: "spring", stiffness: 260, damping: 24 }}
      className="glass overflow-hidden rounded-lg"
    >
      <div className="relative h-64">
        <img src={event.image} alt={event.title} className="h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
        <div className={`absolute left-4 top-4 rounded-full bg-gradient-to-r ${event.accent} px-3 py-1 text-xs font-bold text-black`}>
          {event.tier}
        </div>
        <div className="absolute bottom-4 left-4 right-4">
          <h3 className="text-2xl font-black tracking-tight">{event.title}</h3>
          <div className="mt-2 flex flex-wrap gap-3 text-sm text-white/78">
            <span className="flex items-center gap-1"><MapPin size={15} />{event.venue}, {event.city}</span>
            <span className="flex items-center gap-1"><CalendarDays size={15} />{event.date} · {event.time}</span>
          </div>
        </div>
      </div>
      <div className="space-y-4 p-5">
        <div className="h-2 overflow-hidden rounded-full bg-white/10">
          <div className="h-full rounded-full bg-gradient-to-r from-electric to-neonPink" style={{ width: `${event.sold}%` }} />
        </div>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-white/45">Desde</p>
            <p className="text-xl font-black">{event.price}</p>
          </div>
          <button className="inline-flex items-center gap-2 rounded-md bg-white px-4 py-3 text-sm font-black text-black transition hover:bg-electric">
            <Ticket size={17} /> Comprar
          </button>
        </div>
        <div className="flex items-center gap-2 text-xs text-white/55">
          <Sparkles size={14} className="text-acid" /> QR dinamico, antifraude y acceso express incluido.
        </div>
      </div>
    </motion.article>
  );
}
