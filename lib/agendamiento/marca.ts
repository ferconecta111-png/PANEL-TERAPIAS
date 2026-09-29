/**
 * Look de cada link publico de agendamiento — copiado de los tokens de color
 * reales del sitio propio de cada terapeuta, para que este formulario no se
 * sienta como "otra herramienta" sino como parte de su misma pagina.
 */
export interface MarcaTerapeuta {
  nombreCorto: string;
  bg: string;
  surface: string;
  text: string;
  textFaint: string;
  border: string;
  accent: string;
  accentDeep: string;
  accentTint: string;
  fontDisplay: string;
  fontBody: string;
  googleFonts: string;
}

const MARCAS: Record<string, MarcaTerapeuta> = {
  elizabeth: {
    nombreCorto: "Elizabet",
    bg: "#f7f8f6",
    surface: "#ffffff",
    text: "#1c2224",
    textFaint: "#626c6e",
    border: "#dfe6e6",
    accent: "#A97D79",
    accentDeep: "#7A4F49",
    accentTint: "#f3e1de",
    fontDisplay: "'Fraunces', Georgia, serif",
    fontBody: "'Manrope', -apple-system, 'Segoe UI', sans-serif",
    googleFonts:
      "https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,500;0,9..144,600;0,9..144,700;1,9..144,500&family=Manrope:wght@400;500;600;700;800&display=swap",
  },
  adriana: {
    nombreCorto: "Adriana",
    bg: "#fbf1ea",
    surface: "#ffffff",
    text: "#2d2129",
    textFaint: "#7a6a72",
    border: "#ecdfd8",
    accent: "#c1694a",
    accentDeep: "#9c4f36",
    accentTint: "#f4e3da",
    fontDisplay: "'Fraunces', Georgia, serif",
    fontBody: "'Manrope', -apple-system, 'Segoe UI', sans-serif",
    googleFonts:
      "https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,500;0,9..144,600;1,9..144,500&family=Manrope:wght@400;500;600;700;800&display=swap",
  },
};

const MARCA_DEFAULT: MarcaTerapeuta = MARCAS.elizabeth!;

export function marcaDe(slug: string): MarcaTerapeuta {
  return MARCAS[slug] ?? MARCA_DEFAULT;
}
