"use client";

import { motion } from "framer-motion";
import { BarChart3, Bell, Bot, Crown, Gauge, Heart, LockKeyhole, MailCheck, Music2, QrCode, Search, ShieldCheck, Sparkles, TicketX, Users } from "lucide-react";
import { Scene } from "../components/Scene";
import { EventCard } from "../components/EventCard";
import { events, stats } from "../lib/data";

const features = [
  { Icon: QrCode, title: "QR cifrado", text: "Tokens AES-256-GCM, firma HMAC, expiracion y uso unico." },
  { Icon: ShieldCheck, title: "Anti fraude", text: "Reescaneos, duplicados, ubicacion y dispositivo quedan auditados." },
  { Icon: Crown, title: "VIP OS", text: "Reservas, mesas, backstage, wallet interna y upgrades." },
  { Icon: Bot, title: "IA de eventos", text: "Recomendaciones, riesgo de fraude y ranking personalizado." },
  { Icon: Users, title: "Social live", text: "Likes, historias, comentarios, chat y comunidad por evento." },
  { Icon: BarChart3, title: "Analytics", text: "Ventas, accesos, mapas, asistentes y reportes en tiempo real." }
];

const adminTiles = [
  { Icon: Gauge, title: "Live capacity", value: "8,421 / 10,000" },
  { Icon: LockKeyhole, title: "Fraud risk", value: "0.32%" },
  { Icon: Bell, title: "Alerts", value: "12 active" }
];

const rescueDesk = [
  { Icon: Search, title: "Buscar compra", copy: "Correo, nombre, telefono, ID de usuario o ID de boleto." },
  { Icon: QrCode, title: "Mostrar QR", copy: "Regenera un QR temporal de 15 minutos para resolver en puerta." },
  { Icon: MailCheck, title: "Reenviar QR", copy: "Crea notificacion y reenvio controlado con auditoria." },
  { Icon: TicketX, title: "Invalidar/Reembolsar", copy: "Cancela, revoca, reembolsa y deja log de administrador." }
];

export default function Home() {
  return (
    <main className="relative overflow-hidden">
      <div className="grid-mask pointer-events-none absolute inset-x-0 top-0 h-[860px]" />
      <nav className="fixed left-1/2 top-4 z-50 flex w-[min(1120px,calc(100%-24px))] -translate-x-1/2 items-center justify-between rounded-lg border border-white/10 bg-black/45 px-4 py-3 backdrop-blur-2xl">
        <div className="flex items-center gap-3">
          <div className="grid h-9 w-9 place-items-center rounded-md bg-white text-sm font-black text-black">G</div>
          <span className="text-sm font-black tracking-[0.28em]">GEN</span>
        </div>
        <div className="hidden items-center gap-6 text-sm text-white/70 md:flex">
          <a href="#eventos">Eventos</a>
          <a href="#admin">Admin</a>
          <a href="#staff">Staff</a>
          <a href="#social">Social</a>
        </div>
        <button className="rounded-md bg-electric px-4 py-2 text-sm font-black text-black shadow-neon">Entrar</button>
      </nav>

      <section className="relative min-h-screen px-4 pb-16 pt-28">
        <div className="mx-auto grid max-w-7xl items-center gap-10 lg:grid-cols-[1.04fr_0.96fr]">
          <motion.div initial={{ opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }} className="relative z-10">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-electric/30 bg-electric/10 px-4 py-2 text-sm text-electric">
              <Sparkles size={16} /> Premium Event Operating System
            </div>
            <h1 className="max-w-4xl text-6xl font-black leading-[0.95] tracking-tight md:text-8xl">
              GEN
              <span className="holo-text block">fiestas que se sienten del futuro.</span>
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-white/72">
              Crea eventos, vende boletos, cobra en linea, genera QR cifrados, valida accesos con app privada y convierte cada noche en una experiencia visual, social y medible.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <button className="rounded-md bg-white px-6 py-4 font-black text-black transition hover:bg-electric">Comprar boletos</button>
              <button className="glass rounded-md px-6 py-4 font-bold text-white transition hover:border-neonPink/70">Crear evento</button>
            </div>
            <div className="mt-10 grid max-w-3xl grid-cols-2 gap-3 md:grid-cols-4">
              {stats.map(([value, label]) => (
                <div key={label} className="glass rounded-lg p-4">
                  <p className="text-2xl font-black">{value}</p>
                  <p className="mt-1 text-xs text-white/50">{label}</p>
                </div>
              ))}
            </div>
          </motion.div>
          <div className="relative h-[520px] overflow-hidden rounded-lg border border-white/10 bg-black/20">
            <Scene />
            <div className="absolute bottom-5 left-5 right-5 grid gap-3 md:grid-cols-3">
              {["QR live", "Modo fiesta", "VIP access"].map((item) => (
                <div key={item} className="glass rounded-md px-4 py-3 text-sm font-bold">{item}</div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="eventos" className="px-4 py-16">
        <div className="mx-auto max-w-7xl">
          <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-electric">Trending now</p>
              <h2 className="mt-2 text-4xl font-black tracking-tight md:text-5xl">Eventos que ya estan vendiendo.</h2>
            </div>
            <div className="glass rounded-lg px-5 py-4 text-sm text-white/65">Cuenta regresiva global: <b className="text-white">04d 18h 22m</b></div>
          </div>
          <div className="grid gap-5 lg:grid-cols-3">
            {events.map((event) => <EventCard key={event.id} event={event} />)}
          </div>
        </div>
      </section>

      <section className="px-4 py-16">
        <div className="mx-auto grid max-w-7xl gap-4 md:grid-cols-2 lg:grid-cols-3">
          {features.map(({ Icon, title, text }) => (
            <div key={title} className="glass rounded-lg p-6">
              <Icon className="text-electric" size={26} />
              <h3 className="mt-5 text-xl font-black">{title}</h3>
              <p className="mt-3 leading-7 text-white/62">{text}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="admin" className="px-4 py-16">
        <div className="mx-auto grid max-w-7xl gap-5 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-neonPink">Command center</p>
            <h2 className="mt-2 text-4xl font-black tracking-tight md:text-5xl">Panel admin para operar como festival global.</h2>
            <p className="mt-5 leading-8 text-white/66">Ventas, ganancias, usuarios conectados, mapa de accesos, pagos, reportes, DJs, fraude, reservas y configuracion global desde una cabina visual de alto rendimiento.</p>
          </div>
          <div className="glass rounded-lg p-5">
            <div className="grid gap-4 md:grid-cols-3">
              {adminTiles.map(({ Icon, title, value }) => (
                <div key={title} className="rounded-md bg-white/7 p-4">
                  <Icon className="text-acid" size={22} />
                  <p className="mt-4 text-sm text-white/48">{title}</p>
                  <p className="mt-1 text-2xl font-black">{value}</p>
                </div>
              ))}
            </div>
            <div className="mt-5 h-72 rounded-md border border-white/10 bg-[linear-gradient(135deg,rgba(0,212,255,.18),rgba(255,43,214,.12)),url('https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=1400&q=80')] bg-cover bg-center p-5">
              <div className="inline-flex rounded-md bg-black/70 px-4 py-2 text-sm font-bold">Mapa de accesos en vivo</div>
            </div>
          </div>
        </div>
      </section>

      <section className="px-4 py-16">
        <div className="mx-auto max-w-7xl">
          <div className="mb-8">
            <p className="text-sm uppercase tracking-[0.3em] text-acid">Admin rescue desk</p>
            <h2 className="mt-2 text-4xl font-black tracking-tight md:text-5xl">Soporte de puerta para boletos perdidos.</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-4">
            {rescueDesk.map(({ Icon, title, copy }) => (
              <div key={title} className="glass rounded-lg p-5">
                <Icon className="text-electric" size={25} />
                <h3 className="mt-4 font-black">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-white/58">{copy}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="staff" className="px-4 py-16">
        <div className="mx-auto grid max-w-7xl items-center gap-8 lg:grid-cols-2">
          <div className="glass rounded-lg p-5">
            <div className="rounded-lg bg-black p-5">
              <div className="flex items-center justify-between">
                <span className="font-black">GEN Staff</span>
                <span className="rounded-full bg-acid px-3 py-1 text-xs font-black text-black">ONLINE</span>
              </div>
              <div className="my-8 grid aspect-square place-items-center rounded-lg border border-electric/40 bg-electric/10">
                <QrCode size={136} className="text-electric" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <button className="rounded-md bg-white py-3 font-black text-black">Validar</button>
                <button className="rounded-md bg-red-500/20 py-3 font-black text-red-200">Rechazar</button>
              </div>
            </div>
          </div>
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-acid">Private scanner</p>
            <h2 className="mt-2 text-4xl font-black tracking-tight md:text-5xl">La camara normal no decide. El backend decide.</h2>
            <p className="mt-5 leading-8 text-white/66">La app privada escanea, firma dispositivo, envia ubicacion y recibe estado exacto del boleto: comprador, tier, evento, acceso permitido o alerta de fraude.</p>
          </div>
        </div>
      </section>

      <section id="social" className="px-4 py-16">
        <div className="mx-auto max-w-7xl">
          <div className="mb-8 flex items-end justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-electric">Social pulse</p>
              <h2 className="mt-2 text-4xl font-black tracking-tight">Feed, historias y chat live.</h2>
            </div>
            <Music2 className="hidden text-neonPink md:block" size={40} />
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {["Aftermovie del Neon Garden", "DJ Nova acaba de confirmar", "Mesa VIP liberada en Tulum"].map((post, index) => (
              <div key={post} className="glass rounded-lg p-5">
                <div className="mb-4 h-40 rounded-md bg-gradient-to-br from-white/20 to-white/5" />
                <p className="font-black">{post}</p>
                <div className="mt-4 flex items-center gap-4 text-sm text-white/56">
                  <span className="flex items-center gap-1"><Heart size={15} />{128 + index * 41}</span>
                  <span>{24 + index * 7} comentarios</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
