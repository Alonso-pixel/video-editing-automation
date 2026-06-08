import { loadFont as loadInter } from "@remotion/google-fonts/Inter";
import { loadFont as loadOutfit } from "@remotion/google-fonts/Outfit";

const { fontFamily: interFamily } = loadInter("normal", {
  weights: ["400", "500", "600", "700"],
  subsets: ["latin"],
});

const { fontFamily: outfitFamily } = loadOutfit("normal", {
  weights: ["400", "600", "700", "800"],
  subsets: ["latin"],
});

export const FONTS = {
  body: interFamily,
  heading: outfitFamily,
} as const;

/* ───────── Color palette ───────── */
export const COLORS = {
  // Background
  bgDark: "#0B1D26",
  bgMid: "#102A3A",
  bgLight: "#163B4E",

  // Bacteria (blues / teals)
  bacteriaA: "#4FC3F7",
  bacteriaB: "#29B6F6",
  bacteriaC: "#0288D1",
  bacteriaD: "#00ACC1",
  bacteriaE: "#26C6DA",

  // Yeast (ambers / golds)
  yeastA: "#FFB74D",
  yeastB: "#FFA726",
  yeastC: "#FF9800",

  // Health greens
  healthGreen: "#66BB6A",
  healthGreenLight: "#81C784",

  // Warning reds
  warningRed: "#EF5350",
  warningRedLight: "#E57373",

  // Character
  kefirBody: "#FFF8E1",
  kefirBodyShadow: "#F5E6C8",
  kefirDots: "#E8D5A3",
  kefirEyes: "#4E342E",
  kefirMouth: "#6D4C41",
  kefirCheek: "#FFCCBC",

  // Text
  textPrimary: "#FFFFFF",
  textSecondary: "#B0BEC5",
  textAccent: "#4FC3F7",
} as const;

/* ───────── Timing (in seconds) ───────── */
export const FPS = 30;

export const SCENE_TIMING = {
  scene1: { startSec: 0, durationSec: 15 },
  scene2: { startSec: 15, durationSec: 13 },
  scene3: { startSec: 28, durationSec: 12 },
} as const;

export const TOTAL_DURATION_SEC = 40;
export const TOTAL_DURATION_FRAMES = TOTAL_DURATION_SEC * FPS;

/* ───────── Chart data ───────── */
export const MICROBIAL_DATA = [
  { name: "Lactobacillus", count: 8, color: COLORS.bacteriaA },
  { name: "Lactococcus", count: 5, color: COLORS.bacteriaB },
  { name: "Acetobacter", count: 4, color: COLORS.bacteriaC },
  { name: "Saccharomyces", count: 4, color: COLORS.yeastA },
  { name: "Kluyveromyces", count: 3, color: COLORS.yeastB },
  { name: "Otros", count: 8, color: COLORS.bacteriaD },
] as const;

export const DIVERSITY_DATA = {
  before: [
    { label: "Firmicutes", value: 45, color: "#5C6BC0" },
    { label: "Bacteroidetes", value: 30, color: "#7986CB" },
    { label: "Proteobacteria", value: 15, color: "#9FA8DA" },
    { label: "Otros", value: 10, color: "#C5CAE9" },
  ],
  after: [
    { label: "Firmicutes", value: 35, color: COLORS.bacteriaA },
    { label: "Bacteroidetes", value: 28, color: COLORS.bacteriaB },
    { label: "Lactobacillales", value: 15, color: COLORS.healthGreen },
    { label: "Bifidobacterium", value: 10, color: COLORS.bacteriaE },
    { label: "Proteobacteria", value: 7, color: COLORS.yeastA },
    { label: "Otros", value: 5, color: COLORS.yeastB },
  ],
} as const;

export const LACTOSE_DATA = {
  withoutKefir: { digestion: 35, comfort: 30 },
  withKefir: { digestion: 85, comfort: 88 },
} as const;
