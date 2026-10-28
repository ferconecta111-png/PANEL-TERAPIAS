import type { Metadata } from "next";
import FormularioLead from "./FormularioLead";

export const metadata: Metadata = {
  title: "Ebook gratuito — Cuando poder con todo se siente una carga",
};

const PASOS = [
  {
    numero: "01",
    titulo: "Escríbenos tus datos",
    texto: "Nombre, WhatsApp y correo — solo lo necesario para enviarte el ebook.",
  },
  {
    numero: "02",
    titulo: "Confirma el envío",
    texto: "Al enviar el formulario te llevamos directo a la página de descarga.",
  },
  {
    numero: "03",
    titulo: "Descarga tu ebook",
    texto: "Lo abres ahí mismo, en PDF, y lo trabajas a tu ritmo.",
  },
];

export default function EbookCargaPage() {
  return (
    <div className="ebook-carga">
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,500;0,9..144,600;1,9..144,500&family=Manrope:wght@400;500;600;700;800&display=swap"
      />

      {/* ---------- Promesa ---------- */}
      <section className="promesa">
        <div className="promesa-contenido">
          <p className="eyebrow">Ebook gratuito · autoexigencia</p>
          <h1>
            Cuando poder con todo
            <br />
            se siente una carga
          </h1>
          <p className="subtitulo">
            Una guía para comprender la autoexigencia y volver a reconocer tus propias
            necesidades — sin dejar de ser capaz, comprometida o sensible a los demás.
          </p>
          <a href="#formulario" className="cta-ancla">
            Quiero mi ebook gratis
          </a>
        </div>
      </section>

      {/* ---------- Mockup del ebook ---------- */}
      <section className="mockup">
        <div className="mockup-imagen">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/ebook-carga/portada.png" alt="Portada del ebook Cuando poder con todo se siente una carga" />
        </div>
        <div className="mockup-texto">
          <p className="eyebrow eyebrow-oscuro">Dentro del ebook</p>
          <h2>11 páginas para reconocer la diferencia entre poder hacerte cargo y sentir que siempre tienes que hacerlo</h2>
          <ul>
            <li>Señales que quizás ya normalizaste, sin darte cuenta</li>
            <li>Preguntas para detenerte y mirar qué sucede contigo</li>
            <li>Una pausa guiada para empezar a escuchar tus propias necesidades</li>
          </ul>
        </div>
      </section>

      {/* ---------- Paso a paso ---------- */}
      <section className="pasos">
        <p className="eyebrow eyebrow-oscuro" style={{ textAlign: "center" }}>
          Cómo lo recibes
        </p>
        <h2 className="pasos-titulo">Tres pasos, dos minutos</h2>
        <div className="pasos-grid">
          {PASOS.map(p => (
            <div className="paso" key={p.numero}>
              <span className="paso-numero">{p.numero}</span>
              <h3>{p.titulo}</h3>
              <p>{p.texto}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ---------- Formulario ---------- */}
      <section className="formulario" id="formulario">
        <div className="formulario-contenido">
          <p className="eyebrow">Último paso</p>
          <h2>Recibe tu ebook gratis</h2>
          <p className="formulario-sub">
            Elizabet García Duque · Psicóloga clínica
          </p>
          <FormularioLead />
        </div>
      </section>

      <style>{`
        .ebook-carga {
          --terracota: #A97D79;
          --terracota-deep: #7A4F49;
          --navy: #3F6470;
          --navy-deep: #2E3A3F;
          --arena: #EFD9CF;
          --blanco: #FDFAF3;
          --ink: #22282B;
          --ink-2: #55606A;
          --faint: #9AA5A8;
          font-family: 'Manrope', -apple-system, 'Segoe UI', sans-serif;
          color: var(--ink);
          background: var(--blanco);
          overflow-x: hidden;
        }
        .ebook-carga * { box-sizing: border-box; }
        .eyebrow {
          font-size: 13px; font-weight: 700; letter-spacing: 0.22em; text-transform: uppercase;
          color: var(--arena); margin: 0 0 18px;
        }
        .eyebrow-oscuro { color: var(--terracota-deep); }

        .promesa {
          background: linear-gradient(168deg, var(--terracota-deep) 0%, var(--terracota) 60%, var(--terracota) 100%);
          color: var(--blanco);
          padding: 88px 20px 96px;
        }
        .promesa-contenido { max-width: 640px; margin: 0 auto; text-align: center; }
        .promesa h1 {
          font-family: 'Fraunces', Georgia, serif; font-weight: 600;
          font-size: clamp(32px, 6vw, 52px); line-height: 1.15; margin: 0 0 22px; text-wrap: balance;
        }
        .subtitulo { font-size: 17px; line-height: 1.65; color: var(--arena); margin: 0 auto 34px; max-width: 480px; }
        .cta-ancla {
          display: inline-flex; align-items: center; gap: 10px;
          background: linear-gradient(155deg, #FFFFFF, var(--arena));
          color: var(--terracota-deep);
          font-weight: 800; font-size: 15.5px; padding: 17px 34px; border-radius: 999px;
          text-decoration: none; box-shadow: 0 14px 34px rgba(0,0,0,0.24), inset 0 1px 0 rgba(255,255,255,0.6);
          transition: transform 0.18s ease, box-shadow 0.18s ease;
        }
        .cta-ancla:hover {
          transform: translateY(-2px) scale(1.02);
          box-shadow: 0 18px 40px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.6);
        }
        .cta-ancla::after { content: "→"; font-weight: 700; transition: transform 0.18s ease; }
        .cta-ancla:hover::after { transform: translateX(3px); }

        .mockup {
          max-width: 1000px; margin: 0 auto; padding: 76px 20px;
          display: flex; align-items: center; gap: 64px; flex-wrap: wrap;
          justify-content: center;
        }
        .mockup-imagen {
          flex: 0 0 280px; max-width: 280px;
          box-shadow: 0 30px 60px rgba(122,79,73,0.28);
          border-radius: 10px;
        }
        .mockup-imagen img { width: 100%; display: block; border-radius: 10px; }
        .mockup-texto { flex: 1 1 380px; max-width: 440px; }
        .mockup-texto h2 {
          font-family: 'Fraunces', Georgia, serif; font-weight: 500; font-size: clamp(22px, 4vw, 28px);
          margin: 0 0 20px; color: var(--ink); text-wrap: balance;
        }
        .mockup-texto ul { margin: 0; padding: 0; list-style: none; display: flex; flex-direction: column; gap: 14px; }
        .mockup-texto li {
          position: relative; padding-left: 26px; font-size: 15.5px; line-height: 1.55; color: var(--ink-2);
        }
        .mockup-texto li::before {
          content: ""; position: absolute; left: 0; top: 7px; width: 9px; height: 9px;
          border-radius: 50%; background: var(--terracota);
        }

        .pasos { background: #F6EEEA; padding: 88px 20px; }
        .pasos-titulo {
          font-family: 'Fraunces', Georgia, serif; font-weight: 500; text-align: center;
          font-size: clamp(26px, 4vw, 34px); margin: 0 0 56px; color: var(--ink);
        }
        .pasos-grid {
          max-width: 980px; margin: 0 auto; display: grid;
          grid-template-columns: repeat(3, 1fr); gap: 32px;
        }
        .paso {
          background: var(--blanco); border-radius: 18px; padding: 32px 26px; text-align: left;
          box-shadow: 0 8px 24px rgba(122,79,73,0.08);
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        .paso:hover { transform: translateY(-4px); box-shadow: 0 16px 34px rgba(122,79,73,0.16); }
        .paso-numero {
          display: block; font-family: 'Fraunces', Georgia, serif; font-size: 34px; font-weight: 600;
          color: var(--arena); -webkit-text-stroke: 1px var(--terracota); margin-bottom: 14px;
        }
        .paso h3 { font-size: 17px; margin: 0 0 10px; color: var(--ink); }
        .paso p { font-size: 14.5px; line-height: 1.6; color: var(--ink-2); margin: 0; }

        .formulario { background: var(--navy-deep); color: var(--blanco); padding: 96px 20px 104px; }
        .formulario-contenido { max-width: 440px; margin: 0 auto; text-align: center; }
        .formulario h2 {
          font-family: 'Fraunces', Georgia, serif; font-weight: 500;
          font-size: clamp(28px, 5vw, 36px); margin: 0 0 12px;
        }
        .formulario-sub { color: var(--arena); font-size: 14.5px; margin: 0 0 40px; }

        @media (max-width: 720px) {
          .pasos-grid { grid-template-columns: 1fr; }
          .mockup { gap: 40px; }
        }
      `}</style>
    </div>
  );
}
