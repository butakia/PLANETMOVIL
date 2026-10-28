// Catálogo base de modelos. Formato: "Marca|Modelo|RAM|Almacenamiento|tipo"
// RAM 0 = sin RAM / no aplica. tipo: c = celular, t = tablet, b = básico (teclas)
export const BRAND_COLORS: Record<string, string> = {
  Samsung: "#1428a0",
  Honor: "#0ea5e9",
  Xiaomi: "#ff6700",
  Redmi: "#e11d48",
  Motorola: "#0f766e",
  ZTE: "#2563eb",
  Nokia: "#124191",
  Apple: "#6b7280",
  Infinix: "#16a34a",
  Tecno: "#0891b2",
  Ipro: "#9333ea",
  Lesia: "#db2777",
  Etoway: "#ca8a04",
  Azumi: "#7c3aed",
  Logic: "#475569",
  Blackphone: "#111827",
  Corn: "#d97706",
  Unonu: "#65a30d",
  Gol: "#b91c1c",
  Advance: "#0d9488",
  Virzo: "#4f46e5",
  Otros: "#64748b",
};

export const COLORS: [string, string][] = [
  ["Negro", "#111827"], ["Azul", "#2563eb"], ["Morado", "#7c3aed"], ["Blanco", "#f8fafc"],
  ["Verde", "#16a34a"], ["Gris", "#9ca3af"], ["Dorado", "#d4a017"], ["Plateado", "#cbd5e1"],
  ["Rojo", "#dc2626"], ["Rosado", "#ec4899"], ["Celeste", "#38bdf8"], ["Azul marino", "#1e3a8a"],
  ["Naranja", "#f97316"], ["Turquesa", "#14b8a6"], ["Titanio", "#78716c"],
];

const RAW = `
Samsung|A05|4|64|c
Samsung|A05S|4|128|c
Samsung|A06|4|64|c
Samsung|A15|4|128|c
Samsung|A15 5G|6|128|c
Samsung|A16|4|128|c
Samsung|A17|4|128|c
Samsung|A25 5G|8|256|c
Samsung|A26 5G|8|256|c
Samsung|A35 5G|8|256|c
Samsung|A36 5G|8|256|c
Samsung|A55 5G|8|256|c
Samsung|A56 5G|8|256|c
Samsung|M33 5G|6|256|c
Honor|X5 Plus|4|64|c
Honor|X5B|4|64|c
Honor|X5B Plus|4|256|c
Honor|X6A|4|128|c
Honor|X6A Plus|4|128|c
Honor|X6B|4|128|c
Honor|X6B Plus|4|256|c
Honor|X7B|8|256|c
Honor|X7C|8|256|c
Honor|X8A|8|256|c
Honor|X8B|8|256|c
Honor|X8C|8|256|c
Honor|X9B|8|512|c
Honor|X9C|8|256|c
Honor|200 Lite|8|256|c
Honor|200|8|256|c
Honor|400 Lite|8|256|c
Honor|Play 20|4|128|c
Honor|Play 20A|4|128|c
Honor|Play 20C|4|128|c
ZTE|Blade A35 Core|2|32|c
ZTE|Blade A34|4|64|c
ZTE|Blade A35|4|64|c
ZTE|Blade A54|4|128|c
ZTE|Blade A55|4|128|c
ZTE|Nubia Music|4|128|c
ZTE|Blade L220 3G|1|16|c
ZTE|Blade V50 Vita|8|256|c
ZTE|Blade V50 Design|8|256|c
Motorola|Moto E14|2|64|c
Motorola|Moto E15|2|64|c
Motorola|Moto G04|4|128|c
Motorola|Moto G04s|4|128|c
Motorola|Moto G05|4|128|c
Motorola|Moto G14|4|128|c
Motorola|Moto G15|4|128|c
Motorola|Moto G23|4|128|c
Motorola|Moto G24|4|256|c
Motorola|Moto G35 5G|4|128|c
Motorola|Moto G51 5G|4|128|c
Motorola|Moto G55 5G|8|256|c
Redmi|A3|4|64|c
Redmi|A3X|4|128|c
Redmi|A5|4|128|c
Redmi|9A|2|32|c
Redmi|13C|4|128|c
Redmi|14C|4|128|c
Redmi|15C|4|128|c
Redmi|Note 13|6|128|c
Redmi|Note 13 Pro|8|256|c
Redmi|Note 14|8|256|c
Redmi|Note 14 Pro|8|256|c
Xiaomi|Poco C75|6|128|c
Nokia|105 2G|0|0|b
Nokia|105 4G|0|0|b
Nokia|105 Dual 2G|0|0|b
Nokia|106 2G|0|0|b
Nokia|110 2G|0|0|b
Nokia|110 4G|0|0|b
Nokia|208|0|0|b
Apple|iPhone 11|0|128|c
Apple|iPhone 12|0|256|c
Apple|iPhone 13|0|128|c
Apple|iPhone 14|0|128|c
Apple|iPhone 15|0|128|c
Infinix|Hot 40i|4|128|c
Infinix|Hot 50|8|256|c
Infinix|Smart 8|4|128|c
Infinix|Smart 9|4|128|c
Tecno|Spark Go|4|128|c
Tecno|Spark 20|8|256|c
Ipro|F183S 4G|0|0|b
Ipro|K5 4G|0|0|b
Ipro|A6 Mini|0|0|b
Ipro|A7 Mini|0|0|b
Lesia|Mega|0|0|b
Lesia|Play 4G Lite|0|0|b
Etoway|Danna 4G|0|0|b
Etoway|Force 3G|0|0|b
Azumi|L6Z|0|0|b
Logic|F6G 3G|0|0|b
Logic|Zil 4G|0|0|b
Blackphone|B110 2G|0|0|b
Blackphone|B3R 3G|0|0|b
Blackphone|3G|0|0|b
Blackphone|2G|0|0|b
Corn|GT10 4G|0|0|b
Corn|GT20 4G|0|0|b
Corn|GT50 4G|0|0|b
Unonu|U13 2G|0|0|b
Gol|Z1 Roma Jr|0|0|b
Advance|Tablet Prime PR6171|2|16|t
Advance|Tablet PR5850|1|16|t
Advance|Tablet PR6172|2|16|t
Virzo|Tablet Virzo|2|32|t
Otros|Tablet Dino TR8990|2|32|t
`;

export type CatalogItem = { brand: string; model: string; ram: number; storage: number; type: string };

export const CATALOG: CatalogItem[] = RAW.trim()
  .split("\n")
  .map((line) => {
    const [brand, model, ram, storage, type] = line.split("|");
    return { brand, model: `${brand} ${model}`, ram: +ram, storage: +storage, type };
  });

// Accesorios más vendidos. `brand: true` = depende del modelo/marca del celular (se pide aparte).
export const ACCESSORY_CATALOG: { name: string; brand: boolean }[] = [
  { name: "Cargador de pared", brand: true }, { name: "Cargador rápido tipo C", brand: true }, { name: "Cargador turbo", brand: true },
  { name: "Cargador iPhone", brand: false }, { name: "Cargador de auto", brand: true }, { name: "Cargador inalámbrico", brand: true },
  { name: "Cargador portátil (power bank)", brand: true },
  { name: "Cable USB", brand: true }, { name: "Cable USB V8 (micro USB)", brand: true }, { name: "Cable tipo C", brand: true },
  { name: "Cable tipo C a tipo C", brand: true }, { name: "Cable iPhone (Lightning)", brand: false }, { name: "Cable de datos", brand: true },
  { name: "Funda / Case", brand: true }, { name: "Funda de silicona", brand: true }, { name: "Funda antigolpes", brand: true },
  { name: "Funda tipo billetera", brand: true }, { name: "Funda transparente", brand: true },
  { name: "Vidrio templado", brand: true }, { name: "Vidrio templado 9D", brand: true }, { name: "Vidrio de privacidad", brand: true },
  { name: "Mica hidrogel", brand: true }, { name: "Protector de cámara", brand: true },
  { name: "Audífonos con cable", brand: true }, { name: "Audífonos Bluetooth", brand: true }, { name: "Audífonos inalámbricos (TWS)", brand: true },
  { name: "Audífonos de diadema", brand: false }, { name: "Parlante Bluetooth", brand: true },
  { name: "Memoria microSD", brand: true }, { name: "Adaptador OTG", brand: false }, { name: "Adaptador de audio", brand: false },
  { name: "Soporte para celular", brand: false }, { name: "Soporte de auto", brand: false }, { name: "Anillo / popsocket", brand: false },
  { name: "Batería", brand: true }, { name: "Smartwatch", brand: true }, { name: "Correa de reloj", brand: true },
  { name: "Lápiz táctil", brand: false }, { name: "Aro de luz", brand: false }, { name: "Trípode", brand: false },
  { name: "Extractor de SIM", brand: false }, { name: "Chip", brand: false },
];

// Marcas que se sugieren al escribir ("ca" → Cargador Samsung, Cargador Xiaomi…)
export const ACCESSORY_BRANDS = ["Samsung", "Xiaomi", "Motorola", "Huawei", "Oppo", "Honor", "Realme", "Vivo", "iPhone", "Infinix", "Tecno", "ZTE", "Genérico"];

export const ACCESSORY_TYPES = [
  "Cargador USB", "Cargador tipo C", "Cargador de auto", "Cable USB", "Cable tipo C", "Cable iPhone",
  "Audífonos con cable", "Audífonos inalámbricos", "Audífonos Bluetooth", "Parlante Bluetooth", "Power bank",
  "Case / Funda", "Mica / Vidrio templado", "Memoria SD", "Soporte para celular", "Smartwatch", "Adaptador", "Otro",
];
