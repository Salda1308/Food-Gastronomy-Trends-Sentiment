// mobile/components/ui/tokens.ts

export const colors = {
  wall:       "#0d0d0f",
  wallDeep:   "#0a0a0c",
  poster:     "#141416",
  concrete:   "#1c1c1e",
  slab:       "#28282a",
  wire:       "#343436",
  chalk:      "#eeeae2",
  neon:       "#f5c518",
  heat:       "#da3636",
  sprayGreen: "#24a058",
  smoke:      "#9c9890",
} as const;

export const fonts = {
  aero:    "Aerosoldier",
  display: "CreatoDisplay-Regular",
  bebas:   "BebasNeue_400Regular",
} as const;

export const shadows = {
  poster: {
    shadowColor: "#000",
    shadowOffset: { width: 7, height: 9 },
    shadowOpacity: 0.55,
    shadowRadius: 0,
    elevation: 10,
  },
  posterHover: {
    shadowColor: "#000",
    shadowOffset: { width: 9, height: 12 },
    shadowOpacity: 0.60,
    shadowRadius: 0,
    elevation: 14,
  },
  tag: {
    shadowColor: "#000",
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 0.45,
    shadowRadius: 0,
    elevation: 4,
  },
} as const;

export const radius = {
  none: 0,
  sm: 2,
  full: 9999,
} as const;
