import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Tu ebook está listo — ¿En qué momento dejé de sentirme yo?",
};

export default function GraciasEbookPage() {
  return (
    <div className="gracias-ebook">
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,500;0,9..144,600;1,9..144,500&family=Manrope:wght@400;500;600;700;800&display=swap"
      />
      <div className="tarjeta">
        <span className="check">✓</span>
        <p className="eyebrow">Listo</p>
        <h1>Tu ebook ya está aquí</h1>
        <p className="texto">
          Gracias por tus datos. Descarga tu ejemplar en PDF haciendo clic en el botón de abajo
          — lo puedes guardar y leer a tu ritmo.
        </p>
        <a href="/ebook-voz/ebook-en-que-momento-deje-de-sentirme-yo.pdf" className="boton-descarga" download>
          Descargar mi ebook (PDF)
        </a>
      </div>
      <style>{`
        .gracias-ebook {
          min-height: 100vh; display: flex; align-items: center; justify-content: center;
          padding: 24px; font-family: 'Manrope', -apple-system, 'Segoe UI', sans-serif;
          background: linear-gradient(168deg, #3F6470 0%, #5C8A9B 60%, #5C8A9B 100%);
        }
        .tarjeta {
          background: #F7F8F6; color: #22282B; border-radius: 22px; padding: 48px 34px;
          max-width: 420px; width: 100%; text-align: center; box-shadow: 0 30px 70px rgba(0,0,0,0.25);
        }
        .check {
          display: inline-flex; align-items: center; justify-content: center;
          width: 52px; height: 52px; border-radius: 50%; background: #D7E6EA; color: #3F6470;
          font-size: 24px; font-weight: 800; margin-bottom: 20px;
        }
        .eyebrow { font-size: 12.5px; font-weight: 700; letter-spacing: 0.2em; text-transform: uppercase; color: #5C8A9B; margin: 0 0 10px; }
        h1 {
          font-family: 'Fraunces', Georgia, serif; font-weight: 600;
          font-size: 26px; line-height: 1.25; margin: 0 0 16px; text-wrap: balance;
        }
        .texto { font-size: 15px; line-height: 1.6; color: #55606A; margin: 0 0 30px; }
        .boton-descarga {
          display: inline-flex; align-items: center; justify-content: center; gap: 10px;
          background: linear-gradient(155deg, #3F6470, #2E3A3F);
          color: #fff; text-decoration: none; font-weight: 800; font-size: 15.5px;
          padding: 17px 24px; border-radius: 999px; width: 100%; box-sizing: border-box;
          box-shadow: 0 14px 30px rgba(46,58,63,0.4), inset 0 1px 0 rgba(255,255,255,0.2);
          transition: transform 0.18s ease, box-shadow 0.18s ease;
        }
        .boton-descarga:hover {
          transform: translateY(-2px) scale(1.02);
          box-shadow: 0 18px 38px rgba(46,58,63,0.5), inset 0 1px 0 rgba(255,255,255,0.2);
        }
      `}</style>
    </div>
  );
}
