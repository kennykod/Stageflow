import type { Script } from "../types";

/**
 * Original, fictional demo dialogue written for StageFlow.
 * No copyrighted third-party material is included.
 * `null` = stage direction.
 */
type L = [string | null, string];

const FYREN: Record<string, L[]> = {
  "s-f-11": [
    [null, "En brygga i gryningen. Dimma. Postbåtens motor tystnar. INGRID kliver i land med en resväska. ELOF kastar upp en tamp."],
    ["c-elof", "Du har inte ändrat dig då. Jag trodde du skulle ändra dig vid Grundskär."],
    ["c-ingrid", "Jag ändrade mig vid Grundskär. Och sedan ändrade jag mig tillbaka."],
    ["c-elof", "Det tar fyrtio minuter till fastlandet. Du hinner ändra dig några gånger till."],
    ["c-ingrid", "Är han uppe?"],
    ["c-elof", "Gösta är alltid uppe. Han säger att fyren inte sover, så varför skulle han?"],
    [null, "GÖSTA kommer ner för stigen. Han stannar en bit ifrån henne."],
    ["c-gosta", "Du skrev att du skulle komma på tisdag."],
    ["c-ingrid", "Det är tisdag, pappa."],
    ["c-gosta", "Jaså. Ja. Då stämmer det."],
    ["c-ingrid", "Du ser trött ut."],
    ["c-gosta", "Jag ser ut som en man som har tänt samma lampa i fyrtio år. Det är inte samma sak som trött."],
    ["c-elof", "Jag lämnar posten i lådan som vanligt. Det finns ett brev med kommunens stämpel."],
    ["c-gosta", "Lägg det under de andra."],
    [null, "ELOF tvekar, lägger brevet i lådan och går tillbaka till båten. Motorn startar."],
    ["c-ingrid", "Vilka andra?"],
    ["c-gosta", "Kom in nu. Kaffet blir kallt, och det är det enda jag fortfarande kan göra ordentligt."],
  ],
  "s-f-12": [
    [null, "Lanternin högst upp i fyren. Kvällsljus. GÖSTA putsar linsen med en trasa. INGRID står i dörröppningen."],
    ["c-ingrid", "Den är automatisk sedan nittiotalet. Du vet att du inte behöver putsa den."],
    ["c-gosta", "Ingenting är automatiskt. Det är bara någon annan som gör det."],
    ["c-ingrid", "Kommunen vill släcka den. Det står i brevet."],
    ["c-gosta", "Har du öppnat mina brev?"],
    ["c-ingrid", "Det låg sju stycken i lådan, pappa. Sju."],
    ["c-gosta", "Båtarna har GPS nu. Det säger de. Men en GPS har aldrig stått här och sett en storm komma in från Gotska Sandön."],
    ["c-ingrid", "Ingen ber dig att sluta titta på stormar."],
    ["c-gosta", "Nej. De ber mig sluta vara här."],
    [null, "Paus. Linsen börjar rotera. Ljuset sveper över dem båda."],
    ["c-ingrid", "Minns du när du lät mig tända den första gången?"],
    ["c-gosta", "Du var sju år och du grät för att det var för vackert."],
    ["c-ingrid", "Jag grät för att jag trodde att jag hade tänt hela havet."],
    ["c-gosta", "Det hade du ju."],
  ],
  "s-f-13": [
    [null, "Handelsboden. VIVEKA sorterar konservburkar. INGRID kommer in. Klockan över dörren pinglar."],
    ["c-viveka", "Nej men se. Fyrens prinsessa har kommit hem."],
    ["c-ingrid", "Hej Viveka. Har du fortfarande sånt där kaffe som smakar tjära?"],
    ["c-viveka", "Det är det enda folk här köper. Vi är ett envist släkte."],
    [null, "Klockan pinglar igen. MATTIAS kommer in. Han ser INGRID och stannar."],
    ["c-mattias", "Ingrid."],
    ["c-ingrid", "Mattias."],
    ["c-viveka", "Jaha. Då var det dags för det här också. Jag går och räknar något i lagret."],
    [null, "VIVEKA går ut. Tystnad."],
    ["c-mattias", "Jag hörde att du var tillbaka. Jag trodde inte på det."],
    ["c-ingrid", "Jag stannar bara tills pappa har bestämt sig."],
    ["c-mattias", "Gösta har aldrig bestämt sig för något i hela sitt liv. Han har bara väntat ut alla andra."],
    ["c-ingrid", "Och du? Varför är du här?"],
    ["c-mattias", "Min mamma dog i våras. Någon måste tömma huset."],
    ["c-ingrid", "Det visste jag inte. Förlåt."],
    ["c-mattias", "Det är femton år sedan, Ingrid. Det finns mycket du inte vet."],
  ],
  "s-f-14": [
    [null, "Bystämma i bönhuset. BYBORNA sitter i bänkar. PRÄSTEN står vid ett bord med papper. VIVEKA längst fram."],
    ["c-prasten", "Kommunen har meddelat att fyren släcks vid årsskiftet. Frågan är om byn vill yttra sig."],
    ["c-koren", "Släcks? Efter hundrafemtio år?"],
    ["c-viveka", "Det är inte fyren de släcker. Det är oss."],
    ["c-koren", "Vem ska då se oss från havet?"],
    ["c-prasten", "Jag förstår att det väcker känslor. Men vi måste skriva något konkret."],
    ["c-viveka", "Skriv att vi är här. Skriv att vi fortfarande är här."],
    ["c-koren", "Vi är här. Vi är fortfarande här."],
  ],
  "s-f-21": [
    [null, "Natt. Storm. Vinden tjuter. Ljuset från fyren sveper genom regnet. Alla har samlats vid bryggan med ficklampor."],
    ["c-elof", "Det är en segelbåt utanför Kråkgrund! De har tappat motorn!"],
    ["c-gosta", "Lampan. Någon måste gå upp till lampan."],
    ["c-ingrid", "Den går, pappa. Den är automatisk."],
    ["c-gosta", "Strömmen gick för tio minuter sedan. Ingenting är automatiskt."],
    ["c-mattias", "Reservaggregatet. Var är nyckeln?"],
    ["c-viveka", "Han har den i fickan. Han har alltid haft den i fickan."],
    [null, "GÖSTA tar fram nyckeln, tvekar, och ger den till INGRID."],
    ["c-gosta", "Du vet var den sitter."],
    ["c-ingrid", "Det var tjugo år sedan."],
    ["c-gosta", "Stegen har inte flyttat på sig."],
    ["c-koren", "Spring, Ingrid! Spring!"],
    [null, "INGRID springer. MATTIAS följer efter. Mörker. Sedan – ljuset tänds igen."],
  ],
  "s-f-22": [
    [null, "Minnesscen. Samma lanternin, trettio år tidigare. UNGA INGRID står på en pall. GÖSTA, yngre, håller henne om midjan."],
    ["c-ungaingrid", "Får jag trycka nu?"],
    ["c-gosta", "När jag säger till. Man tänder inte en fyr hur som helst."],
    ["c-ungaingrid", "Hur tänder man den då?"],
    ["c-gosta", "Man tittar ut över havet först. Man räknar båtarna. Och sedan lovar man att vara kvar tills de är hemma."],
    ["c-ungaingrid", "Alla båtar?"],
    ["c-gosta", "Alla båtar."],
    [null, "INGRID, vuxen, står i skuggan och ser på."],
    ["c-ingrid", "Det löftet var för stort för en sjuåring, pappa."],
    ["c-ungaingrid", "Nu?"],
    ["c-gosta", "Nu."],
  ],
  "s-f-23": [
    [null, "Köket. Morgon efter stormen. INGRID sitter med de sju breven framför sig. MATTIAS kommer in med två koppar kaffe."],
    ["c-mattias", "Segelbåten kom in till Grundskär. Alla tre ombord är oskadda."],
    ["c-ingrid", "Bra."],
    ["c-mattias", "Du har inte sovit."],
    ["c-ingrid", "Jag har läst. Han har svarat på varenda brev, Mattias. Han har bara aldrig skickat svaren."],
    ["c-mattias", "Vad skriver han?"],
    ["c-ingrid", "Att han förstår. Att han är gammal. Att han inte vet vem han är utan ljuset."],
    ["c-mattias", "Han vet vem han är. Han var den som tände ljuset i natt. Genom dig."],
    ["c-ingrid", "Jag var arg på dig i femton år för att du stannade. Och nu sitter jag här."],
    ["c-mattias", "Jag stannade inte, Ingrid. Jag kom tillbaka. Det är skillnad."],
    ["c-ingrid", "Är det?"],
    ["c-mattias", "Det är hela skillnaden."],
  ],
  "s-f-24": [
    [null, "Gryning. Fyrens tornrum. Alla fyra står vid fönstret. Havet är stilla."],
    ["c-viveka", "Kommunen ringde. De vill ha ett möte."],
    ["c-gosta", "De kan komma hit. Jag bjuder på kaffe som smakar tjära."],
    ["c-mattias", "Och om de ändå släcker den?"],
    ["c-gosta", "Då har vi i alla fall tänt den en sista gång tillsammans."],
    ["c-ingrid", "Jag stannar, pappa. Inte för fyrens skull."],
    ["c-gosta", "Jag vet. Det är därför du får."],
    [null, "Ljuset slocknar i takt med att solen stiger. Ridå."],
  ],
};

const VINTER: Record<string, L[]> = {
  "s-v-11": [
    [null, "Stockholms central, kväll. Ånga, högtalarröster, RESENÄRERNA rör sig i mönster. MAJA med en för stor ryggsäck."],
    ["c-konduktoren", "Nattåget mot Narvik avgår från spår tolv. Var vänlig ha biljetten redo."],
    ["c-maja", "Ursäkta, är det här tåget som stannar i Kiruna?"],
    ["c-konduktoren", "Alla tåg stannar någonstans, fröken. Det här stannar i Kiruna klockan tio i morgon förmiddag, om snön tillåter."],
    ["c-resenarer", "Om snön tillåter, om snön tillåter, allting här beror på om snön tillåter."],
    ["c-maja", "Och om den inte tillåter?"],
    ["c-konduktoren", "Då får man lära känna sina medpassagerare."],
  ],
  "s-v-12": [
    [null, "Sovvagnen. Rytmiskt dunk från rälsen. ANTON sitter på en pall i korridoren och läser. MAJA kommer ut i pyjamas."],
    ["c-anton", "Kan du inte sova heller?"],
    ["c-maja", "Det är för tyst. Konstigt, med tanke på hur mycket det skramlar."],
    ["c-anton", "Man vänjer sig. Jag har sovit på det här tåget varje jul sedan jag var fyra."],
    ["c-maja", "Jag har aldrig träffat min farmor. Hon skrev ett brev. Det är allt jag har."],
    ["c-anton", "Vad skrev hon?"],
    ["c-maja", "Att det är dags. Bara det. Att det är dags."],
    ["c-konduktoren", "Nästa: Boden. Uppehåll fyra minuter. Den som röker gör det utomhus och snabbt."],
  ],
};

let lineCounter = 0;
function toScenes(map: Record<string, L[]>) {
  return Object.entries(map).map(([sceneId, lines]) => ({
    sceneId,
    lines: lines.map(([characterId, text]) => ({ id: `l-${sceneId}-${++lineCounter}`, characterId, text })),
  }));
}

export function buildScripts(verifiedAt: string): Script[] {
  lineCounter = 0;
  return [
    {
      id: "script-fyren",
      productionId: "prod-fyren",
      title: "Fyren",
      author: "Fiktiv demoförfattare",
      version: "Repetitionsmanus v3",
      status: "verifierad",
      verifiedBy: "p-ida",
      verifiedAt,
      rightsNote: "Fiktivt demomanus skrivet för StageFlow. I skarp drift: endast med upphovsrättsinnehavarens tillstånd och enligt gällande avtal.",
      source: "seed",
      scenes: toScenes(FYREN),
    },
    {
      id: "script-vinter",
      productionId: "prod-vinter",
      title: "Vinterresan",
      author: "Fiktiv demoförfattare",
      version: "Arbetsmanus v1 (akt 1)",
      status: "verifierad",
      verifiedBy: "p-hanna",
      verifiedAt,
      rightsNote: "Fiktivt demomanus. Endast akt 1 är digitaliserad i demon.",
      source: "seed",
      scenes: toScenes(VINTER),
    },
  ];
}
