import type { Department, Person, Room } from "../types";

export const DEPARTMENTS: Department[] = [
  { id: "ensemble", name: "Skådespelare" },
  { id: "orkester", name: "Orkester" },
  { id: "dans", name: "Dans" },
  { id: "regi", name: "Regi & konstnärligt team" },
  { id: "teknik", name: "Teknik" },
  { id: "kostym-mask", name: "Kostym & mask" },
  { id: "produktion", name: "Produktion & inspicienter" },
];

type P = Omit<Person, "email"> & { email?: string };

const raw: P[] = [
  // Produktion
  { id: "p-lena", name: "Lena Bergström", title: "Produktionsledare", disciplines: ["produktionsledare"], department: "produktion", orgRole: "org_admin", hue: 215, phone: "070-111 22 33" },
  { id: "p-petra", name: "Petra Lind", title: "Produktionssamordnare", disciplines: ["produktionsledare"], department: "produktion", orgRole: "staff", hue: 190 },
  { id: "p-johanna", name: "Johanna Viklund", title: "Inspicient", disciplines: ["inspicient"], department: "produktion", orgRole: "staff", hue: 30 },
  { id: "p-erik", name: "Erik Dahl", title: "Inspicient", disciplines: ["inspicient"], department: "produktion", orgRole: "staff", hue: 140 },
  // Regi
  { id: "p-mikael", name: "Mikael Strand", title: "Regissör", disciplines: ["regissor"], department: "regi", orgRole: "staff", hue: 260, phone: "070-222 33 44" },
  { id: "p-hanna", name: "Hanna Ek", title: "Regissör", disciplines: ["regissor"], department: "regi", orgRole: "staff", hue: 330 },
  { id: "p-noa", name: "Noa Berg", title: "Koreograf", disciplines: ["koreograf", "dansare"], department: "regi", orgRole: "staff", hue: 170 },
  { id: "p-karin", name: "Karin Wallin", title: "Regissör", disciplines: ["regissor"], department: "regi", orgRole: "staff", hue: 15 },
  { id: "p-ida", name: "Ida Forsberg", title: "Dramaturg", disciplines: ["dramaturg"], department: "regi", orgRole: "staff", hue: 290 },
  // Teknik
  { id: "p-amir", name: "Amir Haddad", title: "Ljudtekniker", disciplines: ["tekniker"], department: "teknik", orgRole: "staff", hue: 200, phone: "070-333 44 55" },
  { id: "p-linnea", name: "Linnea Ström", title: "Ljusdesigner", disciplines: ["tekniker"], department: "teknik", orgRole: "staff", hue: 50 },
  { id: "p-viktor", name: "Viktor Ny", title: "Scentekniker", disciplines: ["tekniker"], department: "teknik", orgRole: "staff", hue: 100 },
  { id: "p-kim", name: "Kim Sandberg", title: "Rekvisitör", disciplines: ["tekniker"], department: "teknik", orgRole: "staff", hue: 75 },
  // Kostym & mask
  { id: "p-rebecka", name: "Rebecka Holm", title: "Kostymör", disciplines: ["kostym"], department: "kostym-mask", orgRole: "staff", hue: 345 },
  { id: "p-sofia", name: "Sofia Ali", title: "Maskör", disciplines: ["mask"], department: "kostym-mask", orgRole: "staff", hue: 10 },
  // Skådespelare
  { id: "p-sara", name: "Sara Lindqvist", title: "Skådespelare", disciplines: ["skadespelare"], department: "ensemble", orgRole: "staff", hue: 355, phone: "070-444 55 66" },
  { id: "p-bengt", name: "Bengt Holm", title: "Skådespelare", disciplines: ["skadespelare"], department: "ensemble", orgRole: "staff", hue: 25 },
  { id: "p-oskar", name: "Oskar Lund", title: "Skådespelare", disciplines: ["skadespelare"], department: "ensemble", orgRole: "staff", hue: 230 },
  { id: "p-maria", name: "Maria Sjöberg", title: "Skådespelare", disciplines: ["skadespelare"], department: "ensemble", orgRole: "staff", hue: 300 },
  { id: "p-tomas", name: "Tomas Nilsson", title: "Skådespelare", disciplines: ["skadespelare"], department: "ensemble", orgRole: "staff", hue: 120 },
  { id: "p-alva", name: "Alva Persson", title: "Skådespelare (barn)", disciplines: ["skadespelare"], department: "ensemble", orgRole: "staff", hue: 60 },
  { id: "p-lo", name: "Lo Ahmed", title: "Skådespelare (barn)", disciplines: ["skadespelare"], department: "ensemble", orgRole: "staff", hue: 160 },
  { id: "p-greta", name: "Greta Fransson", title: "Skådespelare", disciplines: ["skadespelare"], department: "ensemble", orgRole: "staff", hue: 280 },
  { id: "p-jakob", name: "Jakob Mäkinen", title: "Skådespelare", disciplines: ["skadespelare", "musiker"], department: "ensemble", orgRole: "staff", hue: 205 },
  { id: "p-nora", name: "Nora Eriksson", title: "Skådespelare", disciplines: ["skadespelare"], department: "ensemble", orgRole: "staff", hue: 320 },
  { id: "p-daniel", name: "Daniel Öberg", title: "Skådespelare", disciplines: ["skadespelare"], department: "ensemble", orgRole: "staff", hue: 90 },
  { id: "p-olle", name: "Olle Rydberg", title: "Skådespelare", disciplines: ["skadespelare"], department: "ensemble", orgRole: "staff", hue: 180 },
  { id: "p-birgitta", name: "Birgitta Lagerqvist", title: "Skådespelare", disciplines: ["skadespelare"], department: "ensemble", orgRole: "staff", hue: 35 },
  { id: "p-emma", name: "Emma Kask", title: "Skådespelare", disciplines: ["skadespelare", "dansare"], department: "ensemble", orgRole: "staff", hue: 250 },
  { id: "p-ali", name: "Ali Rahimi", title: "Skådespelare", disciplines: ["skadespelare"], department: "ensemble", orgRole: "staff", hue: 140 },
  { id: "p-helena", name: "Helena Borg", title: "Skådespelare", disciplines: ["skadespelare"], department: "ensemble", orgRole: "staff", hue: 5 },
  { id: "p-annakarin", name: "Anna-Karin Ståhl", title: "Skådespelare", disciplines: ["skadespelare"], department: "ensemble", orgRole: "staff", hue: 270 },
  { id: "p-mira", name: "Mira Johansson", title: "Skådespelare", disciplines: ["skadespelare"], department: "ensemble", orgRole: "staff", hue: 195 },
  // Orkester
  { id: "p-per", name: "Per Alm", title: "Kapellmästare", disciplines: ["musiker"], department: "orkester", orgRole: "staff", hue: 220 },
  { id: "p-elsa", name: "Elsa Nyberg", title: "Violinist", disciplines: ["musiker"], department: "orkester", orgRole: "staff", hue: 340, phone: "070-555 66 77" },
  { id: "p-johan", name: "Johan Berglund", title: "Cellist", disciplines: ["musiker"], department: "orkester", orgRole: "staff", hue: 110 },
  { id: "p-leila", name: "Leila Sadeghi", title: "Pianist", disciplines: ["musiker"], department: "orkester", orgRole: "staff", hue: 20 },
  { id: "p-mats", name: "Mats Holmgren", title: "Slagverkare", disciplines: ["musiker"], department: "orkester", orgRole: "staff", hue: 55 },
  // Dans
  { id: "p-felix", name: "Felix Andersson", title: "Dansare", disciplines: ["dansare"], department: "dans", orgRole: "staff", hue: 150 },
  { id: "p-saga", name: "Saga Lund", title: "Dansare", disciplines: ["dansare"], department: "dans", orgRole: "staff", hue: 310 },
  { id: "p-yusuf", name: "Yusuf Demir", title: "Dansare", disciplines: ["dansare"], department: "dans", orgRole: "staff", hue: 40 },
  { id: "p-tilda", name: "Tilda Ek", title: "Dansare", disciplines: ["dansare"], department: "dans", orgRole: "staff", hue: 240 },
  { id: "p-aino", name: "Aino Virtanen", title: "Dansare", disciplines: ["dansare"], department: "dans", orgRole: "staff", hue: 175 },
  { id: "p-max", name: "Max Holm", title: "Dansare", disciplines: ["dansare"], department: "dans", orgRole: "staff", hue: 85 },
];

function emailFor(name: string) {
  const ascii = name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z\s-]/g, "")
    .trim()
    .replace(/\s+/g, ".");
  // Fictional domain on purpose – never a real address.
  return `${ascii}@stageflow-demo.se`;
}

export const PEOPLE: Person[] = raw.map((p) => ({ ...p, email: p.email ?? emailFor(p.name) }));

export const ROOMS: Room[] = [
  { id: "room-stora", name: "Stora scenen", location: "Huvudbyggnaden · Plan 2", capacity: 120, kind: "scen" },
  { id: "room-klara", name: "Klarascenen", location: "Huvudbyggnaden · Plan 4", capacity: 60, kind: "scen" },
  { id: "room-lilla", name: "Lilla scenen", location: "Huvudbyggnaden · Plan 3", capacity: 40, kind: "scen" },
  { id: "room-studion", name: "Studion", location: "Huvudbyggnaden · Entréplan", capacity: 30, kind: "scen" },
  { id: "room-repa", name: "Repsal A", location: "Repetitionshuset · Plan 3", capacity: 30, kind: "repsal" },
  { id: "room-repb", name: "Repsal B", location: "Repetitionshuset · Plan 3", capacity: 25, kind: "repsal" },
  { id: "room-repc", name: "Repsal C", location: "Repetitionshuset · Plan 4", capacity: 15, kind: "repsal" },
  { id: "room-dans", name: "Dansstudion", location: "Repetitionshuset · Plan 5", capacity: 25, kind: "studio" },
  { id: "room-musik", name: "Musiksalen", location: "Repetitionshuset · Källarplan", capacity: 20, kind: "musik" },
  { id: "room-las", name: "Läsrummet", location: "Huvudbyggnaden · Plan 6", capacity: 12, kind: "repsal" },
];

/** The switchable demo personas (subset of PEOPLE). */
export const PERSONAS: { personId: string; label: string; description: string }[] = [
  { personId: "p-lena", label: "Produktionsledare", description: "Full överblick över alla produktioner. Planerar, publicerar och följer upp kvittenser." },
  { personId: "p-mikael", label: "Regissör", description: "Planerar repetitioner för Fyren. Ser bara sin egen produktion i Control." },
  { personId: "p-sara", label: "Skådespelare", description: "Spelar Ingrid i Fyren och Maja i Vinterresan. Använder Personal i mobilen." },
  { personId: "p-amir", label: "Ljudtekniker", description: "Arbetar i två produktioner och har rätt att se hela produktionsschemat." },
  { personId: "p-elsa", label: "Musiker", description: "Violinist i Vinterresans orkester. Ser endast sina egna repetitioner." },
];
