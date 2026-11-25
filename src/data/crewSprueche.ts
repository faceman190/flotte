// =====================================================================================
// Sprüche der Crew (seit 2026-11-20): was die Leute in Stationen sagen, wenn der Pilot vorbeigeht.
// Grundton wie in docs/story.md: raue Arbeiter-Science-Fiction mit Hoffnung. Der Pilot bleibt im Text ohne Geschlecht („Pilot“, Rufzeichen).
// Platzhalter: {name} = Rufzeichen des Piloten, {n} = Zahl (Abschüsse), {station}/{ware} in den Gerüchten.
// Abschnitte der Geschichte: prolog (vor dem Eid), ch1–ch5 (Kapitel läuft), nach1–nach5 (Kapitel fertig, nächstes noch nicht begonnen).
// Kein Satz verrät etwas, das im jeweiligen Abschnitt noch nicht bekannt ist.
// =====================================================================================

export const ALLTAG = [
  'Dritte Schicht in Folge. Wenn ich noch eine Schweißnaht sehe, schweiß ich mich selbst fest.',
  'Die Kantine hat heute wieder Algenbrot. Rate mal, was es morgen gibt.',
  'Meine Tochter will auch fliegen. Ich hab ihr gesagt: erst die Mathe.',
  'Die Erzquote für diesen Monat ist schon wieder hoch. Wer rechnet sich so was aus?',
  'Mein Großvater hat noch einen Himmel gekannt. Blau, sagt er. Einfach blau.',
  'Wenn das Licht flackert, ist es die Leitung in Abschnitt sieben. Ist es immer.',
  'Pass auf deine Filter auf. Erzstaub kriecht überall rein.',
  'Jedes Schiff zählt, hat meine Mutter immer gesagt. Und jede Schraube.',
  'Ich hab seit Wochen keinen Stern gesehen. Nur Hangardecke.',
  'Die Kinder spielen wieder „Riss“. Einer ist das Tor, die anderen rennen.',
  'Kaffee gibt’s keinen. Aber das Zeug aus dem Automaten ist heiß. Immerhin.',
  'Wer hat die Werkzeugkiste an Platz vier stehen lassen? Ich war’s nicht.',
  'Noch zwei Schichten, dann hab ich frei. Dann schlaf ich. Zwei Tage am Stück.',
  'Altwelten hin oder her. Das hier ist unser Zuhause.',
  'Nachts knacken die Rumpfplatten. Man gewöhnt sich dran, sagen alle.',
  'Wir sind zu wenige, um uns zu streiten. Und trotzdem schaffen wir es jeden Tag.',
  'Ich hab gestern Eis geschmolzen, und das Wasser roch nach Metall. Das ist doch nicht normal.',
  'Die Erzpreise steigen, die Löhne nicht. Wie immer.',
  'Weißt du, was mir fehlt? Regen. Nie welchen gesehen, und er fehlt mir trotzdem.',
  'Flieg sauber da draußen, ja?',
  'Mein Bruder fliegt Patrouille bei Rotfels. Jedes Mal, wenn der Funk knackt, halt ich die Luft an.',
  'Die Werft braucht wieder Stahl. Die Werft braucht immer Stahl.',
  'Wieder ein Tag ohne Ferrox. Ich zähle die.',
  'Kennst du den Eid noch auswendig? Ich sag ihn jeden Morgen. Hilft beim Aufstehen.',
  'Brummer hat heute wieder im Funk gesungen. Gute Laune, schätze ich.',
  'Wenn du in die Grauzone fliegst, nimm mehr Munition mit, als du denkst.',
  'Mein Ausweis ist schon wieder abgelaufen. Als ob hier jemand fremd wäre.',
  'Ich hab mal eine echte Orange gesehen. Auf einem Bild. Sah lecker aus.',
  'Hörst du das Summen? Das sind die Lüfter. Wenn sie still sind, solltest du rennen.',
  'Hast du schon gegessen? Iss was. Piloten vergessen das immer.',
];

export const ORT_BASTION = [
  'Die Bastion ist älter als wir alle hier. Und sie hält immer noch.',
  'Im Haupthangar hat Maren Hollweg damals den Eid gesprochen. Da hinten, ungefähr.',
  'Zweitausendvierhundert kamen damals durch. Heute kennt man trotzdem noch jedes zweite Gesicht.',
  'Wenn die Bastion ausfällt, fällt die Crew mit. Also fällt sie nicht aus.',
  'Die Werft unten läuft Tag und Nacht. Spürst du das Zittern im Boden? Das ist sie.',
  'Achterberg hat heute wieder den neuen Jahrgang gescheucht. Die zittern jetzt noch.',
  'Hollweg sitzt wieder bis spät im Rat. Man sieht es ihm an.',
  'Auf Deck drei gibt’s das beste Licht. Darum ist hier immer so viel los.',
];
export const ORT_GILDE = [
  'Hier zählt nur, was durch die Öfen geht.',
  'Die Schmelze läuft heiß heute. Halt Abstand von den Rinnen.',
  'Krull sagt, ein guter Schürfer hört das Erz, bevor er es sieht.',
  'In der Hütte riecht alles nach Kupfer. Sogar das Essen.',
  'Der Rat redet, die Gilde arbeitet. So war’s schon immer.',
  'Bring Erz mit, dann reden wir.',
];
export const ORT_AUSSEN = [
  'Hier draußen kommt alle paar Wochen ein Frachter. Wenn wir Glück haben.',
  'Ein Außenposten ist nur so stark wie der letzte Pilot, der hier gelandet ist.',
  'Wir sind wenige hier. Jeder macht alles. Ich koche, schweiße und funke.',
  'Wenn der Funk ausfällt, sind wir allein. Daran denkt man nur nicht oft.',
  'Willkommen am Rand. Viel los ist hier nicht. Zum Glück.',
  'Die Bastion schickt Grüße und keinen Nachschub. Wie immer.',
];
export const ORT_GRENZE = [
  'Hier an der Grenze schläft man mit den Stiefeln an.',
  'Die Wacht hält die Linie. Jeden Tag ein Stück.',
  'Wer hier fliegt, fliegt zu zweit. Wenn er schlau ist.',
  'Gestern hat ein Jäger mit Ferrit am Rumpf angelegt. Kristalle, einfach festgewachsen.',
  'Die Ferrox kommen immer dahin, wo abgebaut wird. Also kommen sie hierher.',
];
// je Station ein paar eigene Sätze
export const ORT_STATION: Record<string, string[]> = {
  sonnenwacht: ['Rika Tamm schläft kaum. Sie hört dem Tor zu.', 'Die Trümmer da draußen waren mal das Halden-Tor. Man vergisst es, wenn man jeden Tag Erz daraus holt.'],
  wachtposten: ['Roth hat die Zielübungen verdoppelt. Ich hab Schwielen am Abzug.', 'Von hier aus sieht man bei klarer Sicht die Grauzone. Schön ist anders.'],
  splittermine: ['Kessler sagt, die Mine trägt noch zehn Jahre. Das sagt er seit zehn Jahren.', 'Pass auf in den Stollen. Das Ferrit hier summt, wenn man genau hinhört.'],
  lichtwerft: ['Das erste Schiff, das auf dieser Seite gebaut wurde, war eine Falke. Hier, in dieser Werft.', 'Wenn du ein neues Schiff willst, bist du hier richtig. Wenn du es bezahlen kannst.'],
  tess: ['Tess ist der letzte Hafen vor der Grenze. Danach kommt nur noch Schwarm.', 'Hier wird Ferrit eingeschmolzen. Sieh lieber nicht zu lange in die Glut.'],
  eisenkrone: ['Die Eisenkrone gehört der Gilde. Jeder Barren hier hat eine Geschichte.'],
  neuhafen: ['Neuhafen war mal eine Notunterkunft. Jetzt ist es der lauteste Markt im Menschenraum.'],
  kupfermine: ['Kupfer gibt’s hier genug. Eis nicht. Bring Eis mit, und du hast Freunde.'],
};

// Abschnitte der Geschichte
export const STORY: Record<string, string[]> = {
  prolog: [
    'Bald ist deine Vereidigung, oder? Achterberg wird dich nicht schonen.',
    'Erster Flug? Atme ruhig. Der Milan verzeiht mehr, als man denkt.',
    'Wenn du den Eid sprichst, sprich ihn laut. Hollweg hört genau hin.',
    'Neue Piloten erkennt man daran, dass sie zu oft aus dem Fenster schauen.',
  ],
  ch1: [
    'Hast du’s gehört? Das Halden-Tor sendet. Nach achtunddreißig Jahren.',
    'Alle hängen an den Funkgeräten. Vielleicht sind es die Altwelten. Vielleicht holen sie uns doch.',
    'Mein Vater sagt, das Tor ist tot. Aber Tote senden nicht.',
    'Wenn das wirklich die Altwelten sind … was sagen wir denen? Dass wir gut zurechtkommen?',
    'Im Sonnenfeld sollen Ferrox gesichtet worden sein. Zwei Sprünge von hier.',
    'Rika Tamm hat die ganze Nacht Antennen gerichtet. Sie sagt, das Tor klingt anders als früher.',
  ],
  nach1: [
    'Die Weitsicht. Eines der elf Schiffe. Und wir hören ihre Kennung. Mir wird ganz anders.',
    'Das Signal war gar nicht die Altwelten. Das Tor selbst ruft. Unheimlich.',
    'Rat, Wacht und Gilde wollen alle was anderes. Wie immer, nur lauter.',
  ],
  ch2: [
    'Krull sagt, das Ferrit singt. Ich sag, Krull hat zu lange in den Ofen geguckt.',
    'Rat und Gilde streiten schon wieder. Diesmal über Ferrit.',
    'Im Splittergürtel soll man das Ferrit summen hören, wenn man den Funk aufdreht.',
    'Wenn die Gilde tiefer rein will, soll sie halt fliegen. Ich bleib hier.',
    'Die Weitsicht. Ich krieg den Namen nicht mehr aus dem Kopf.',
  ],
  nach2: [
    'Eine Rettungskapsel der Weitsicht, mitten in einer Ruine der Erbauer. Wie kommt die da hin?',
    'Der Archivkristall liegt jetzt bei uns. Hoffentlich weiß jemand, was man damit macht.',
  ],
  ch3: [
    'Über die Narbe hat man nie geredet. Und jetzt redet jeder darüber.',
    'Mein Onkel war bei der Narbe. Er sagt kein Wort dazu. Nicht eins.',
    'Der Rat hat den Flug in die Narbe verboten. Als ob sich die Ferrox an Verbote halten.',
    'Die Eidwacht. Das einzige Trägerschiff, das wir je selbst gebaut haben. Und es liegt da draußen.',
  ],
  nach3: [
    'Achterberg hat damals vierhundert Leute rausgeholt. Gegen den Befehl. Ich würd ihr die Hand schütteln.',
    'Keiner wird zurückgelassen. Jetzt weiß ich endlich, woher der Satz wirklich kommt.',
    'Die Weitsicht fliegt Richtung Kern. Wer fliegt da freiwillig hin?',
  ],
  ch4: [
    'Staffel Vier wartet am Rand der Narbe. Die besten Piloten, die wir haben.',
    'Ins Stummfeld? Da gibt’s keinen Funk. Da hört dich keiner mehr.',
    'Achterberg hat recht gehabt, damals. Jetzt sagen es sogar die Alten.',
    'Ferrit-Leser, Leitkristall … Krull redet nur noch in Wörtern, die keiner kennt.',
  ],
  nach4: [
    'Dreitausend Schläfer aus der Weitsicht. Für die sind neun Tage vergangen. Für uns achtunddreißig Jahre.',
    'Die Ferrox sind Schürfmaschinen. Maschinen, die nie einer abgeschaltet hat. Das muss man erst mal verdauen.',
    'Varga siezt jeden. Sogar Brummer. Der weiß gar nicht, wie ihm geschieht.',
    'Die Leute aus der Weitsicht fragen nach Orten, die es nicht mehr gibt. Was soll man da sagen?',
    'Zehn Kennungen, alle noch unterwegs. Ich kann seit Tagen nicht schlafen.',
  ],
  ch5: [
    'Jedes Schiff, das aus dem Sprung fällt, ruft den Schwarm. Neunzig Sekunden, dann sind sie da.',
    'Sander rechnet mit Sternkarten, die keiner mehr kennt. Und er hat trotzdem recht.',
    'Zehn Schiffe, je dreitausend Schläfer. Wir müssen sie alle holen. Alle.',
    'Die Weckanlage braucht Eis und Helium. Wer welches hat, soll es zu Krull bringen.',
  ],
  nach5: [
    'Über dreißigtausend Menschen. Wir waren sechstausend. Wo sollen die alle schlafen?',
    'Der Kranich liegt noch in der Narbe. Aber alle Schläfer sind raus. Keiner wurde zurückgelassen.',
    '„Halden hört euch.“ Was soll das heißen? Wer ist Halden?',
    'Neun Schiffe vor Anker bei der Bastion. Ich steh jeden Morgen am Fenster und zähle sie.',
    'Die Ferrox waren in Heimstatt. Hier. Bei uns. Das vergess ich nie.',
    'In der Kantine sitzen jetzt Leute, die die Altwelten noch gesehen haben. Ich frag sie aus, bis sie gehen.',
  ],
};

// Was der Pilot seit dem letzten Besuch getan hat (Vergleich mit dem Stand beim letzten Aussteigen)
export const TAT: Record<string, string[]> = {
  abschuss: [
    'Man hört, du hast draußen aufgeräumt. Gut so.',
    'Die Patrouille redet von dir, {name}. {n} Ferrox weniger, heißt es.',
    'Danke, dass du die Biester von unseren Frachtern fernhältst.',
  ],
  abschussViel: [
    'Da ist ja {name}! Die halbe Station redet von deinen Abschüssen.',
    'Wenn alle so fliegen würden wie du, hätten wir die Narbe nie verloren.',
    '{n} Ferrox seit dem letzten Mal? Ich geb dir einen aus. Irgendwann.',
  ],
  erz: [
    'Du riechst nach Erzstaub. Gute Schicht gehabt?',
    'Volle Laderäume sieht man gern. Die Werft dankt dir.',
  ],
  geld: [
    'Läuft gut für dich, was? Die Händler grinsen alle.',
    'Große Geschäfte, {name}? Vergiss nicht, wo du herkommst.',
  ],
  schiff: [
    'Neues Schiff? Schöne Linien. Pass gut drauf auf.',
    'Hab dein neues Schiff im Hangar gesehen. Respekt.',
  ],
  schaden: [
    'Dein Schiff sieht übel aus. Die Werkstatt hat noch Platz.',
    'Mit so einem Rumpf würd ich nicht mal bis zum Ring fliegen. Lass das richten.',
  ],
  prolog: ['Frisch vereidigt? Willkommen in der Crew, {name}.', 'Na, wie fühlt sich das Flottenband an? Schwerer, als es aussieht, oder?'],
  ch1: ['Du warst im Sonnenfeld, oder? Erzähl, was war da los?', 'Du hast die Kennung gefunden? Die Weitsicht? Ich hab Gänsehaut.'],
  ch2: ['Du warst auf Schlacke Prime? Bei den Ruinen? Ich hätte mich das nie getraut.'],
  ch3: ['Du hast die Wahrheit über die Narbe rausgeholt. Endlich sagt es mal jemand.'],
  ch4: ['Du warst im Kern. Im Kern! Und bist zurückgekommen. Mit der Weitsicht.', 'Das warst du, oder? Die Weitsicht nach Hause gebracht. Danke.'],
  ch5: ['Du warst bei der Schlacht um Heimstatt dabei. Danke. Von uns allen.', 'Wegen Leuten wie dir schlafen hier heute dreißigtausend Menschen sicher.'],
};

// Kurz nach einem Ferrox-Angriff im Sektor
export const ANGRIFF = [
  'Hast du den Alarm gehört? Ferrox im Sektor. Schon wieder.',
  'Meine Hände zittern noch. Die waren so nah dran.',
  'Die Patrouille ist raus. Hoffentlich reicht das.',
  'Wenn die Sirenen gehen, renn ich immer erst zum Fenster. Dumm, ich weiß.',
  'Flieg bloß nicht allein raus, solange die da draußen sind.',
  'Sie wollen das Metall. Und hier hängt eine ganze Station voll davon.',
  'Alle auf ihre Posten, hieß es. Ich hab gar keinen Posten. Also lauf ich einfach.',
];

// Aufgeschnappte Gesprächsfetzen aus den Gruppen (der Pilot kommt dazu, einer redet gerade)
export const GRUPPE = [
  '… und dann sagt sie: Das ist kein Erz, das ist Schlacke.',
  '… drei Tage ohne Schlaf, und die Pumpe läuft immer noch nicht.',
  '… ich sag dir, der Rat wartet, bis es zu spät ist.',
  '… nein, der Milan ist kein Anfängerschiff. Der ist nur ehrlich.',
  '… wenn die Gilde das Ferrit kriegt, steigen die Preise. Wart’s ab.',
  '… und mein Kleiner fragt, ob die Ferrox auch Kinder haben.',
  '… achtunddreißig Jahre, und wir reden immer noch über die Altwelten.',
  '… hast du gesehen, wie der beim Andocken die Kurve genommen hat?',
  '… nicht so laut. Da kommt ein Pilot.',
];
export const GRUPPE_STORY: Record<string, string[]> = {
  ch1: ['… das Signal. Wenn das wirklich die Altwelten sind …'],
  nach1: ['… die Weitsicht. Nach achtunddreißig Jahren. Stell dir das vor.'],
  ch2: ['… singendes Ferrit. Krull hat sie doch nicht mehr alle.'],
  nach3: ['… Achterberg? Die Ausbilderin? Gegen den Befehl? Respekt.'],
  ch4: ['… ins Stummfeld, ohne Funk. Ich würd mir in die Hose machen.'],
  nach4: ['… Schürfmaschinen. Nur Maschinen. Und wir haben vor denen gezittert.'],
  ch5: ['… neunzig Sekunden. Dann ist der Schwarm da. Jedes Mal.'],
  nach5: ['… dreißigtausend. Wir müssen anbauen. Decks, Ringe, alles.'],
};

// Gerüchte: wahre Hinweise (Preise kommen zusätzlich aus dem Markt, siehe crewStimmen.ts)
export const GERUECHT_FEST = [
  'Ferrit gibt’s nirgends zu kaufen. In der Grauzone und am Nebeltor wachsen Kristallfelder, heißt es.',
  'Die Raffinerie in der Eisenkrone schmilzt dir Erz zu Barren. Barren bringen mehr, wenn du warten kannst.',
  'Seltene Erden findest du nur auf Planeten. Mit dem Rover, nicht mit dem Schiff.',
  'Helium-3 steckt im Eis kalter Planeten. Oder du kaufst es im Markt der Planetenstützpunkte.',
  'Auf manchen Planeten liegen verlassene Minen. Die Drohnen darin bewachen noch immer, was keiner mehr braucht.',
];
export const GERUECHT_PREIS = [            // {station} immer als Name ohne Artikel am Satzanfang oder als Subjekt
  '{ware} bringt gerade gutes Geld. Am meisten zahlt {station}, heißt es.',
  'Hast du {ware} an Bord? {station} kauft es dir teuer ab, hab ich gehört.',
  'Mein Schwager handelt mit {ware}. Er sagt, {station} zahlt gerade richtig gut.',
];

// Durchsagen der Station (einmal je Besuch, unten in der Mitte)
export const DURCHSAGE = {
  angriff: 'Ferrox-Kontakt im Sektor. Alle Piloten in Bereitschaft, Zivilpersonal bleibt auf den Decks.',
  prolog: 'Die Crew begrüßt ihren neuen Piloten. Willkommen an Bord, {name}.',
  ch1: 'Die Auswertung aus dem Sonnenfeld ist abgeschlossen. Der Rat bittet um Ruhe auf allen Decks.',
  ch2: 'Archivkristall von Schlacke Prime sicher an Bord. Der Rat dankt allen Beteiligten.',
  ch3: 'Der Flottenrat bestätigt den Bericht zur Narbe. Staffel Vier wird in Bereitschaft versetzt.',
  ch4: 'Die Weitsicht liegt vor Anker. Willkommen zu Hause, Weitsicht.',
  ch5: 'Neun Schiffe vor Anker, alle Schläfer geborgen. Die Crew dankt ihren Piloten.',
} as Record<string, string>;

// Städte auf den Planeten (city.ts): je Stadt eigene Sätze, dazu allgemeine für festen Boden; Wachen sagen eigene Sätze
export const ORT_STADT: Record<string, string[]> = {
  Talstadt: [
    'Talstadt war die erste Siedlung auf festem Boden. Jahr sechs. Mein Opa hat die ersten Pfähle gesetzt.',
    'Hier unten weht Wind. Echter Wind. Ich werd mich nie dran gewöhnen.',
    'Die Gilde hat hier das Sagen. Krull sitzt im Kontor und rechnet, Tag und Nacht.',
    'Auf der Bastion ist alles eng. Hier kannst du bis zum Horizont gucken.',
    'Pass auf die Lastkarren auf. Die bremsen für niemanden.',
    'Der Markt hier unten ist billiger als oben. Wenn du handeln kannst.',
  ],
  Neonhafen: [
    'Neonhafen schläft nie. Ich auch nicht mehr.',
    'Hier kriegst du alles. Es fragt nur keiner, woher.',
    'Die Lichter hier sieht man aus dem Orbit. Sagt man jedenfalls.',
    'Im Schleusenbräu gibt’s das beste Essen der Stadt. Und das einzige warme.',
    'Wer hier lange bleibt, fliegt mit leeren Taschen nach Hause.',
  ],
};
export const ORT_STADT_ALLE = [
  'Boden unter den Füßen. Echter Boden. Manchmal knie ich mich hin und fass ihn an.',
  'Draußen vor der Stadt sollte man nicht allein rumlaufen.',
  'Hier unten riecht alles nach Staub und Maschinenöl. Ich mag das.',
];
export const WACHE = [
  'Weitergehen, Pilot. Alles in Ordnung.',
  'Nichts Besonderes heute. Gut so.',
  'Halt die Augen offen. Nicht jeder hier meint es gut.',
  'Ich steh hier seit sechs Stunden. Die Stiefel bringen mich um.',
  'Waffen bleiben im Holster, solange ich hier stehe. Klar?',
];
