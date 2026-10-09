import type { Character, Membership, Production, SavedGroup, Scene } from "../types";

export function buildProductions(premiereOffsetDate: (days: number) => string): Production[] {
  return [
    {
      id: "prod-fyren",
      title: "Fyren",
      subtitle: "Ett drama om att stanna kvar",
      genre: "Drama · Nyskrivet",
      stageRoomId: "room-klara",
      premiere: premiereOffsetDate(24),
      color: "indigo",
      status: "repetition",
      directorId: "p-mikael",
    },
    {
      id: "prod-vinter",
      title: "Vinterresan",
      subtitle: "En nyskriven musikal",
      genre: "Musikal · Urpremiär",
      stageRoomId: "room-stora",
      premiere: premiereOffsetDate(45),
      color: "rose",
      status: "repetition",
      directorId: "p-hanna",
    },
    {
      id: "prod-natt",
      title: "Nattfjärilar",
      subtitle: "Dansföreställning i en akt",
      genre: "Dans",
      stageRoomId: "room-lilla",
      premiere: premiereOffsetDate(62),
      color: "teal",
      status: "planering",
      directorId: "p-noa",
    },
    {
      id: "prod-hav",
      title: "Kvinnorna vid havet",
      subtitle: "Kammarspel",
      genre: "Kammarspel · Spelas nu",
      stageRoomId: "room-studion",
      premiere: premiereOffsetDate(-18),
      color: "amber",
      status: "spelas",
      directorId: "p-karin",
    },
  ];
}

export const CHARACTERS: Character[] = [
  // Fyren
  { id: "c-ingrid", productionId: "prod-fyren", name: "Ingrid", description: "Fyrvaktarens dotter, 34 år", personIds: ["p-sara"] },
  { id: "c-gosta", productionId: "prod-fyren", name: "Gösta", description: "Fyrvaktare, Ingrids far", personIds: ["p-bengt"] },
  { id: "c-mattias", productionId: "prod-fyren", name: "Mattias", description: "Återvänder efter femton år", personIds: ["p-oskar"] },
  { id: "c-viveka", productionId: "prod-fyren", name: "Viveka", description: "Granne, driver handelsboden", personIds: ["p-maria"] },
  { id: "c-elof", productionId: "prod-fyren", name: "Elof", description: "Postbåtsförare", personIds: ["p-tomas"] },
  { id: "c-prasten", productionId: "prod-fyren", name: "Prästen", description: "Dubbelroll med Elof", personIds: ["p-tomas"] },
  { id: "c-ungaingrid", productionId: "prod-fyren", name: "Unga Ingrid", description: "Ingrid som barn – dubbelbesatt", personIds: ["p-alva", "p-lo"] },
  { id: "c-koren", productionId: "prod-fyren", name: "Byborna", description: "Kör/ensemble", personIds: ["p-greta", "p-jakob", "p-nora", "p-daniel"] },
  // Vinterresan
  { id: "c-maja", productionId: "prod-vinter", name: "Maja", description: "Reser norrut för att möta sin farmor", personIds: ["p-sara"] },
  { id: "c-anton", productionId: "prod-vinter", name: "Anton", description: "Sovvagnskonduktörens son", personIds: ["p-olle"] },
  { id: "c-signe", productionId: "prod-vinter", name: "Farmor Signe", personIds: ["p-birgitta"] },
  { id: "c-konduktoren", productionId: "prod-vinter", name: "Konduktören", personIds: ["p-jakob"] },
  { id: "c-resenarer", productionId: "prod-vinter", name: "Resenärerna", description: "Ensemble", personIds: ["p-nora", "p-daniel", "p-emma", "p-ali"] },
  // Nattfjärilar
  { id: "c-fjarilen", productionId: "prod-natt", name: "Fjärilen", personIds: ["p-saga"] },
  { id: "c-ljuset", productionId: "prod-natt", name: "Ljuset", personIds: ["p-felix"] },
  { id: "c-skuggorna", productionId: "prod-natt", name: "Skuggorna", personIds: ["p-yusuf", "p-tilda", "p-aino", "p-max"] },
  // Kvinnorna vid havet
  { id: "c-agnes", productionId: "prod-hav", name: "Agnes", personIds: ["p-helena"] },
  { id: "c-ruth", productionId: "prod-hav", name: "Ruth", personIds: ["p-annakarin"] },
  { id: "c-lisen", productionId: "prod-hav", name: "Lisen", personIds: ["p-mira"] },
  { id: "c-hedda", productionId: "prod-hav", name: "Hedda", personIds: ["p-maria"] },
];

export const SCENES: Scene[] = [
  // Fyren
  { id: "s-f-11", productionId: "prod-fyren", number: "1:1", title: "Ankomsten", characterIds: ["c-ingrid", "c-gosta", "c-elof"], durationMin: 9 },
  { id: "s-f-12", productionId: "prod-fyren", number: "1:2", title: "Lampan", characterIds: ["c-ingrid", "c-gosta"], durationMin: 7 },
  { id: "s-f-13", productionId: "prod-fyren", number: "1:3", title: "Mattias återvänder", characterIds: ["c-ingrid", "c-mattias", "c-viveka"], durationMin: 11 },
  { id: "s-f-14", productionId: "prod-fyren", number: "1:4", title: "Byborna", characterIds: ["c-koren", "c-viveka", "c-prasten"], durationMin: 6 },
  { id: "s-f-21", productionId: "prod-fyren", number: "2:1", title: "Stormen", characterIds: ["c-ingrid", "c-gosta", "c-mattias", "c-viveka", "c-elof", "c-koren"], durationMin: 12 },
  { id: "s-f-22", productionId: "prod-fyren", number: "2:2", title: "Minnet", characterIds: ["c-ungaingrid", "c-gosta", "c-ingrid"], durationMin: 8 },
  { id: "s-f-23", productionId: "prod-fyren", number: "2:3", title: "Brevet", characterIds: ["c-ingrid", "c-mattias"], durationMin: 10 },
  { id: "s-f-24", productionId: "prod-fyren", number: "2:4", title: "Gryningen", characterIds: ["c-ingrid", "c-gosta", "c-mattias", "c-viveka"], durationMin: 9 },
  // Vinterresan
  { id: "s-v-11", productionId: "prod-vinter", number: "1:1", title: "Centralstationen", characterIds: ["c-maja", "c-konduktoren", "c-resenarer"], durationMin: 10 },
  { id: "s-v-12", productionId: "prod-vinter", number: "1:2", title: "Nattåget", characterIds: ["c-maja", "c-anton", "c-konduktoren"], durationMin: 14 },
  { id: "s-v-21", productionId: "prod-vinter", number: "2:1", title: "Snöstormen", characterIds: ["c-maja", "c-anton", "c-resenarer"], durationMin: 12 },
  { id: "s-v-22", productionId: "prod-vinter", number: "2:2", title: "Hemkomsten", characterIds: ["c-maja", "c-signe"], durationMin: 9 },
  // Nattfjärilar
  { id: "s-n-1", productionId: "prod-natt", number: "Del 1", title: "Skymning", characterIds: ["c-skuggorna"], durationMin: 12 },
  { id: "s-n-2", productionId: "prod-natt", number: "Del 2", title: "Dragningen", characterIds: ["c-fjarilen", "c-ljuset"], durationMin: 10 },
  { id: "s-n-3", productionId: "prod-natt", number: "Del 3", title: "Svärmen", characterIds: ["c-fjarilen", "c-ljuset", "c-skuggorna"], durationMin: 15 },
  // Kvinnorna vid havet
  { id: "s-h-1", productionId: "prod-hav", number: "Akt 1", title: "Bryggan", characterIds: ["c-agnes", "c-ruth", "c-lisen", "c-hedda"], durationMin: 45 },
  { id: "s-h-2", productionId: "prod-hav", number: "Akt 2", title: "Natten", characterIds: ["c-agnes", "c-ruth", "c-lisen", "c-hedda"], durationMin: 40 },
];

function members(productionId: string, list: [string, Membership["role"], boolean, string][]): Membership[] {
  return list.map(([personId, role, fullSchedule, fn]) => ({ personId, productionId, role, fullSchedule, function: fn }));
}

export const MEMBERSHIPS: Membership[] = [
  ...members("prod-fyren", [
    ["p-lena", "producer", true, "Produktionsledare"],
    ["p-mikael", "scheduler", true, "Regi"],
    ["p-ida", "member", true, "Dramaturg"],
    ["p-johanna", "scheduler", true, "Inspicient"],
    ["p-amir", "member", true, "Ljuddesign"],
    ["p-linnea", "member", true, "Ljusdesign"],
    ["p-viktor", "member", false, "Scenteknik"],
    ["p-kim", "member", false, "Rekvisita"],
    ["p-rebecka", "member", false, "Kostym"],
    ["p-sofia", "member", false, "Mask"],
    ["p-sara", "member", false, "Ingrid"],
    ["p-bengt", "member", false, "Gösta"],
    ["p-oskar", "member", false, "Mattias"],
    ["p-maria", "member", false, "Viveka"],
    ["p-tomas", "member", false, "Elof / Prästen"],
    ["p-alva", "member", false, "Unga Ingrid"],
    ["p-lo", "member", false, "Unga Ingrid"],
    ["p-greta", "member", false, "Byborna"],
    ["p-jakob", "member", false, "Byborna"],
    ["p-nora", "member", false, "Byborna"],
    ["p-daniel", "member", false, "Byborna"],
  ]),
  ...members("prod-vinter", [
    ["p-lena", "producer", true, "Produktionsledare"],
    ["p-hanna", "scheduler", true, "Regi"],
    ["p-noa", "member", true, "Koreografi"],
    ["p-per", "member", true, "Kapellmästare"],
    ["p-erik", "scheduler", true, "Inspicient"],
    ["p-amir", "member", true, "Ljuddesign"],
    ["p-viktor", "member", false, "Scenteknik"],
    ["p-rebecka", "member", false, "Kostym"],
    ["p-sara", "member", false, "Maja"],
    ["p-olle", "member", false, "Anton"],
    ["p-birgitta", "member", false, "Farmor Signe"],
    ["p-jakob", "member", false, "Konduktören"],
    ["p-nora", "member", false, "Resenär"],
    ["p-daniel", "member", false, "Resenär"],
    ["p-emma", "member", false, "Resenär"],
    ["p-ali", "member", false, "Resenär"],
    ["p-elsa", "member", false, "Violin"],
    ["p-johan", "member", false, "Cello"],
    ["p-leila", "member", false, "Piano"],
    ["p-mats", "member", false, "Slagverk"],
  ]),
  ...members("prod-natt", [
    ["p-lena", "producer", true, "Produktionsledare"],
    ["p-noa", "scheduler", true, "Koreografi"],
    ["p-petra", "scheduler", true, "Produktionssamordnare"],
    ["p-linnea", "member", true, "Ljusdesign"],
    ["p-felix", "member", false, "Ljuset"],
    ["p-saga", "member", false, "Fjärilen"],
    ["p-yusuf", "member", false, "Skuggorna"],
    ["p-tilda", "member", false, "Skuggorna"],
    ["p-aino", "member", false, "Skuggorna"],
    ["p-max", "member", false, "Skuggorna"],
  ]),
  ...members("prod-hav", [
    ["p-lena", "producer", true, "Produktionsledare"],
    ["p-karin", "scheduler", true, "Regi"],
    ["p-petra", "scheduler", true, "Produktionssamordnare"],
    ["p-viktor", "member", false, "Scenteknik"],
    ["p-sofia", "member", false, "Mask"],
    ["p-helena", "member", false, "Agnes"],
    ["p-annakarin", "member", false, "Ruth"],
    ["p-mira", "member", false, "Lisen"],
    ["p-maria", "member", false, "Hedda"],
  ]),
];

export const GROUPS: SavedGroup[] = [
  { id: "g-f-team", productionId: "prod-fyren", name: "Konstnärligt team", personIds: ["p-mikael", "p-ida", "p-johanna"] },
  { id: "g-f-huvud", productionId: "prod-fyren", name: "Huvudroller", personIds: ["p-sara", "p-bengt", "p-oskar", "p-maria"] },
  { id: "g-f-barn", productionId: "prod-fyren", name: "Barnensemble (Unga Ingrid)", personIds: ["p-alva", "p-lo"] },
  { id: "g-f-teknik", productionId: "prod-fyren", name: "Teknikgrupp", personIds: ["p-amir", "p-linnea", "p-viktor", "p-kim"] },
  { id: "g-v-band", productionId: "prod-vinter", name: "Bandet", personIds: ["p-per", "p-elsa", "p-johan", "p-leila", "p-mats"] },
  { id: "g-v-solister", productionId: "prod-vinter", name: "Solister", personIds: ["p-sara", "p-olle", "p-birgitta"] },
  { id: "g-n-skuggor", productionId: "prod-natt", name: "Skuggorna", personIds: ["p-yusuf", "p-tilda", "p-aino", "p-max"] },
];
