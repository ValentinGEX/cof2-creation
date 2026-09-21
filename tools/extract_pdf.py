#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Extrait du livre (CBHS_06_Chroniques_Oubliees_2_web_v2.pdf) les textes et les tables
nécessaires à l'application : data/creation.json, data/tables.json, data/armes.json,
data/armures.json, data/aide.json.

Tout ce qui est règle du jeu est repris mot pour mot ; seule la ponctuation technique est
normalisée (tirets et espaces insécables, points de conduite, filigrane). Les textes écrits
pour l'application sont regroupés sous la clé « maison » de creation.json et ne viennent
jamais du livre.

Pagination : page PDF N = page imprimée N + 1 (la couverture a été retirée).
"""
import json, os, re, subprocess, sys

RACINE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LIVRE = os.path.join(RACINE, "CBHS_06_Chroniques_Oubliees_2_web_v2.pdf")
CACHE = os.path.join(RACINE, "tools", ".cache-pdf")

# --------------------------------------------------------------------------- extraction brute

def pdftotext(page_debut, page_fin, layout=False, zone=None):
    cle = "p%d-%d%s%s.txt" % (page_debut, page_fin, "-layout" if layout else "",
                              ("-z%d_%d_%d_%d" % zone) if zone else "")
    os.makedirs(CACHE, exist_ok=True)
    chemin = os.path.join(CACHE, cle)
    if os.path.exists(chemin):
        return open(chemin, encoding="utf-8").read()
    cmd = ["pdftotext", "-f", str(page_debut), "-l", str(page_fin)]
    if layout:
        cmd.append("-layout")
    if zone:
        cmd += ["-x", str(zone[0]), "-y", str(zone[1]), "-W", str(zone[2]), "-H", str(zone[3])]
    cmd += [LIVRE, "-"]
    s = subprocess.run(cmd, capture_output=True, text=True).stdout
    open(chemin, "w", encoding="utf-8").write(s)
    return s

ONGLETS = ("INTRO", "INTRODUCTION", "Création du personnage", "Famille des combattants", "Famille des aventuriers",
           "Famille des mages", "Famille des mystiques", "Peuples", "Équipement", "PARTI E I",
           "Règles de base", "Combat")

def nettoyer_leger(t):
    """Comme nettoyer(), mais conserve les espaces multiples (colonnes des tableaux)."""
    t = t.replace("\u2011", "-").replace("\u2010", "-").replace("\u2212", "-")
    t = t.replace("\u00a0", " ").replace("\u202f", " ").replace("\u2009", " ")
    t = t.replace("\x91", "•").replace("\uf074", "•").replace("\ufffd", "")
    return t


def nettoyer(t):
    """Normalisation unique de tout texte venant du PDF (voir §3.3 du brief)."""
    t = t.replace("‑", "-").replace("‐", "-").replace("−", "-")
    t = t.replace(" ", " ").replace(" ", " ").replace(" ", " ")
    t = t.replace("\x91", "•").replace("", "•").replace("�", "")
    t = re.sub(r"[ \t]+", " ", t)
    return t.strip()

def lignes_utiles(texte):
    """Retire filigrane, pieds de page et onglets latéraux."""
    sortie = []
    for ligne in nettoyer(texte).split("\n"):
        l = ligne.strip()
        if not l:
            sortie.append("")
            continue
        if "VALENTIN GERARD" in l or "fortunevgaming" in l:
            continue
        if re.fullmatch(r"(PAGE \d+ *[•·]? *PARTIE I|PARTIE I *[•·]? *PAGE \d+)", l):
            continue
        if l in ONGLETS or re.fullmatch(r"\d{1,3}", l):
            continue
        sortie.append(l)
    return sortie

def flux(page_debut, page_fin):
    return "\n".join(lignes_utiles(pdftotext(page_debut, page_fin)))

def recoller(texte):
    """Recolle les paragraphes coupés par la mise en colonnes et les césures du livre."""
    FIN_DE_PHRASE = (".", ":", "!", "?", "»", "…", ";")
    out = []
    for brute in texte.split("\n"):
        l = brute.strip()
        prec = out[-1] if out else ""
        if prec.endswith("-") and not l:
            continue  # ligne vide au milieu d'une césure
        if prec.endswith("-") and l and l[0].islower():
            out[-1] = prec[:-1] + l
            continue
        if not l:
            # saut de colonne au milieu d'une phrase : la ligne vide n'est pas un
            # vrai changement de paragraphe (on épargne les titres courts)
            if prec and len(prec) > 25 and not prec.endswith(FIN_DE_PHRASE):
                continue
            out.append("")
            continue
        if (prec and len(prec) > 3 and not prec.endswith(FIN_DE_PHRASE)
                and not l.startswith("•") and not re.match(r"^[A-ZÉÈÀÂÎÔÛ ’'-]{6,}$", l)):
            out[-1] = prec + " " + l
        else:
            out.append(l)
    texte = "\n".join(x.strip() for x in out if x.strip())
    return re.sub(r"(\w)- ([a-zà-ÿ])", r"\1\2", texte)


def extraire(pages, debut, fin=None, recolle=True, avec_debut=False):
    """Texte entre deux marqueurs. avec_debut conserve le marqueur de début (utile quand
    il fait partie de la phrase et non d'un titre)."""
    t = flux(*pages)
    i = t.find(debut)
    if i < 0:
        raise SystemExit("marqueur introuvable : %r (pages %s)" % (debut, pages))
    if not avec_debut:
        i += len(debut)
    j = t.find(fin, i) if fin else len(t)
    if j < 0:
        raise SystemExit("fin introuvable : %r (pages %s)" % (fin, pages))
    bout = t[i:j].strip()
    return recoller(bout) if recolle else bout

# --------------------------------------------------------------------------- tables

def table_ideaux_travers():
    """p. PDF 33 : colonnes d20 / Idéaux héroïques / Travers."""
    txt = pdftotext(33, 33, layout=True, zone=(255, 0, 225, 850))
    ideaux, travers = {}, {}
    for ligne in nettoyer_leger(txt).split("\n"):
        m = re.match(r"\s*(\d{1,2})\s+([A-ZÉÈÀÂÎÔÛ][^\s].*?)\s\s+([A-ZÉÈÀÂÎÔÛ].*?)\s*$", ligne)
        if m:
            n = int(m.group(1))
            if 1 <= n <= 20:
                ideaux[n] = m.group(2).strip()
                travers[n] = m.group(3).strip()
    return [ideaux[i] for i in range(1, 21)], [travers[i] for i in range(1, 21)]

def table_secrets(page):
    """p. PDF 34 et 35 : table des secrets intimes (1) et (2)."""
    txt = pdftotext(page, page, layout=True, zone=(255, 0, 225, 850))
    lignes = [l.rstrip() for l in nettoyer_leger(txt).split("\n")]
    entrees, i = {}, 0
    while i < len(lignes):
        l = lignes[i].strip()
        m = re.match(r"^(\d{1,2})\s+(\S.*)$", l)
        seul = re.fullmatch(r"(\d{1,2})", l)
        if m and 1 <= int(m.group(1)) <= 20:
            entrees[int(m.group(1))] = m.group(2).strip()
        elif seul and 1 <= int(seul.group(1)) <= 20:
            # numéro centré : le texte occupe la ligne au-dessus et celle en dessous
            haut = lignes[i - 1].strip() if i > 0 else ""
            bas = lignes[i + 1].strip() if i + 1 < len(lignes) else ""
            entrees[int(seul.group(1))] = recoller(haut + "\n" + bas).replace("\n", " ")
        i += 1
    manquants = [n for n in range(1, 21) if n not in entrees]
    if manquants:
        raise SystemExit("secrets manquants page %d : %s" % (page, manquants))
    return [entrees[i] for i in range(1, 21)]

def table_ages():
    """p. PDF 36 : âge de départ et espérance de vie."""
    txt = nettoyer_leger(pdftotext(36, 36, layout=True))
    peuples = ["demi-elfe", "demi-orc", "elfe-haut", "elfe-sylvain", "gnome", "humain", "nain", "halfelin"]
    depart = re.search(r"Âge de départ\s+((?:\d+\+\s*)+)", txt)
    esper = re.search(r"Espérance de vie\s+((?:\d+\s*)+)", txt)
    if not depart or not esper:
        raise SystemExit("table des âges introuvable")
    d = [int(x) for x in re.findall(r"(\d+)\+", depart.group(1))]
    e = [int(x) for x in esper.group(1).split()]
    if len(d) != 8 or len(e) != 8:
        raise SystemExit("table des âges incomplète : %s %s" % (d, e))
    return {p: [d[i], e[i]] for i, p in enumerate(peuples)}

def table_tailles():
    """p. PDF 36 : taille et poids moyens."""
    txt = nettoyer_leger(pdftotext(36, 36, layout=True))
    corres = {"Demi-elfe": "demi-elfe", "Demi-orc": "demi-orc", "Elfe haut": "elfe-haut",
              "Elfe sylvain": "elfe-sylvain", "Gnome": "gnome", "Halfelin": "halfelin",
              "Humain": "humain", "Nain": "nain"}
    def en_cm(v, unite):
        v = float(v.replace(",", "."))
        return int(round(v if unite == "cm" else v * 100))
    sortie = {}
    for nom, slug in corres.items():
        m = re.search(re.escape(nom) + r"\s+([\d,]+) (m|cm) à ([\d,]+) (m|cm)\s+(\d+) à (\d+) kg", txt)
        if not m:
            raise SystemExit("taille/poids introuvable pour %s" % nom)
        sortie[slug] = {"tailleCm": [en_cm(m.group(1), m.group(2)), en_cm(m.group(3), m.group(4))],
                        "poidsKg": [int(m.group(5)), int(m.group(6))]}
    return sortie

def table_langues():
    """p. PDF 36 : encadré « LISTES DES LANGUES » (colonne de droite)."""
    txt = recoller("\n".join(lignes_utiles(pdftotext(36, 36, layout=True, zone=(255, 300, 225, 320)))))
    langues = []
    for m in re.finditer(r"([A-ZÉÈÀÂÎÔÛ][\wÀ-ÿ’' -]*?)(\*?) \(([^)]+)\)", txt):
        nom = m.group(1).strip().split("LANGUES")[-1].strip()
        if not nom or len(nom) > 20:
            continue
        langue = {"nom": nom, "locuteurs": re.sub(r"\s+", " ", m.group(3)).strip()}
        if m.group(2) == "*":
            # note du livre sur l'argotien (p. imprimée 37)
            langue["note"] = ("L’argotien est l’argot des voleurs et une langue des signes ; il compte "
                              "pour deux langues si le profil principal du PJ n’est pas voleur ou barde.")
        langues.append(langue)
    if len(langues) != 10:
        raise SystemExit("liste des langues incomplète : %s" % [l["nom"] for l in langues])
    return langues

# --------------------------------------------------------------------------- armes et armures

def slug(t):
    t = t.lower()
    for a, b in {"à": "a", "â": "a", "é": "e", "è": "e", "ê": "e", "î": "i", "ï": "i", "ô": "o",
                 "û": "u", "ù": "u", "ç": "c", "’": " ", "'": " ", "œ": "oe"}.items():
        t = t.replace(a, b)
    return re.sub(r"[^a-z0-9]+", "-", t).strip("-")

def _lignes_tableau(page, colonne_notes):
    """Découpe un tableau en colonnes (partie gauche, note) et retire les parasites."""
    lignes = []
    for brute in nettoyer_leger(pdftotext(page, page, layout=True)).split("\n"):
        if not brute.strip():
            continue
        if ("VALENTIN GERARD" in brute or "PARTIE I" in brute or "PAGE " in brute
                or "Armes d’attaque" in brute or brute.strip() in ONGLETS
                or re.fullmatch(r"\s*\d{1,3}\s*", brute)):
            continue
        lignes.append((brute[:colonne_notes], brute[colonne_notes:].strip()))
    return lignes


def _colonne_notes(page, entete="Notes complémentaires"):
    for ligne in nettoyer_leger(pdftotext(page, page, layout=True)).split("\n"):
        i = ligne.find(entete)
        if i >= 0:
            return i
    raise SystemExit("en-tête « %s » introuvable page %d" % (entete, page))


def _assembler(lignes, motif, fabrique):
    """Reconstitue un tableau dont les notes débordent au-dessus et au-dessous de la ligne.

    Le tableau du livre centre le nom de l'arme sur les deux ou trois lignes de sa note.
    Une ligne de note isolée qui commence par une minuscule est la suite de la note de
    l'arme précédente ; sinon, c'est le début de la note de l'arme suivante."""
    objets, en_attente = [], []
    for gauche, note in lignes:
        m = re.match(motif, gauche)
        if m:
            obj = fabrique(m)
            obj["notes"] = " ".join(x for x in en_attente + [note] if x)
            objets.append(obj)
            en_attente = []
        elif not gauche.strip() and note:
            if objets and note[:1].islower():
                objets[-1]["notes"] = (objets[-1]["notes"] + " " + note).strip()
            else:
                en_attente.append(note)
        else:
            en_attente = []
    for o in objets:
        # césure de fin de ligne : « tempo- raires » -> « temporaires »
        o["notes"] = re.sub(r"- ([a-zà-ÿ])", r"\1", recoller(o["notes"]).replace("\n", " ")).strip()
    return objets


def armes_contact():
    """p. PDF 183 : armes d'attaque au contact."""
    cn = _colonne_notes(183)
    motif = (r"^\s*([A-ZÉÈÀÂÎÔÛ][\wÀ-ÿ’' -]+?)\s{2,}(\(?\d+d\d+(?:/\d+d\d+)?\)?)\s{2,}"
             r"(-|\d+ p[ac])\s{2,}(Contondants|Perforants|Tranchants)\s*$")

    def fabrique(m):
        nom, dm, prix, typ = [x.strip() for x in m.groups()]
        dm_principal, dm_deux = (dm.split("/") + [None])[:2]
        return {"slug": slug(nom), "nom": nom, "categorie": "contact",
                "dm": dm_principal, "dmDeuxMains": dm_deux, "portee": None,
                "prix": None if prix == "-" else prix, "typeDM": typ, "page": 183}

    armes = _assembler(_lignes_tableau(183, cn), motif, fabrique)
    for a in armes:
        n = a["notes"].lower()
        a["deuxMains"] = "arme à deux mains" in n
        a["uneOuDeuxMains"] = "une ou deux mains" in n
        a["legere"] = "légère" in n
        a["forAuxDM"] = "pas de FOR aux DM" not in a["notes"]
        a["critique19"] = "critique sur 19-20" in n
    return armes


def armes_distance():
    """p. PDF 185 : armes d'attaque à distance."""
    cn = _colonne_notes(185)
    motif = (r"^\s*([A-ZÉÈÀÂÎÔÛ][\wÀ-ÿ’' -]+?)\s{2,}(\d+\s?m)\s+(\d+d\d+)\s+(-|\d+ ?p[ac])\s+"
             r"(Contondants|Perforants|Tranchants)\s*$")

    def fabrique(m):
        nom, portee, dm, prix, typ = [x.strip() for x in m.groups()]
        s = slug(nom)
        if s in ("dague", "lance"):
            s += "-lancee"
        return {"slug": s, "nom": nom, "categorie": "distance", "dm": dm, "dmDeuxMains": None,
                "portee": re.sub(r"\s*m$", " m", portee),
                "prix": None if prix == "-" else re.sub(r"(\d)p", r"\1 p", prix),
                "typeDM": typ, "page": 185}

    armes = _assembler(_lignes_tableau(185, cn), motif, fabrique)
    for a in armes:
        n = a["notes"].lower()
        a["deuxMains"] = "deux mains" in n
        a["uneOuDeuxMains"] = False
        a["legere"] = False
        a["forAuxDM"] = False
        a["critique19"] = False
        a["armeAPoudre"] = "poudre" in n
    return armes


def armures():
    txt = nettoyer_leger(pdftotext(188, 188, layout=True))
    sortie = []
    for ligne in txt.split("\n"):
        m = re.match(r"^\s*([A-ZÉÈÀÂÎÔÛ][\wÀ-ÿ’',  -]+?)\d?\s{2,}\+(\d)\s+(\+\d|-)\s+(\d+\s?p[ac])\s*$", ligne)
        if m:
            nom, def_, agi, prix = [x.strip() for x in m.groups()]
            est_bouclier = "bouclier" in nom.lower()
            sortie.append({
                "slug": slug(nom.split(",")[0]), "nom": nom, "def": int(def_),
                "agiMax": None if agi == "-" else int(agi.lstrip("+")),
                "prix": re.sub(r"(\d)p", r"\1 p", prix),
                "type": "bouclier" if est_bouclier else "armure", "page": 188,
            })
    return sortie

# --------------------------------------------------------------------------- textes du chapitre 1

def textes_creation():
    t = {}
    # Le texte « Rôle » est réparti sur trois colonnes et deux pages : on le recompose
    # dans l'ordre de lecture du livre.
    t["role"] = "\n".join([
        extraire((20, 20), "1 · RÔLE"),
        extraire((22, 22), "Vous ressemble-t-il", "Si vous manquez d’idées", avec_debut=True),
        "Si vous manquez d’idées" + extraire((22, 22), "Si vous manquez d’idées", "commencer avec un concept")
        + " commencer avec un concept vague (un guerrier"
        + extraire((22, 22), "vague (un guerrier", "Enfin, il est toujours bon"),
    ]).strip()
    t["osgild"] = extraire((14, 15), "Les Terres d’Osgild ne sont qu’une petite",
                           "Pour ceux qui sont déjà familiers", avec_debut=True)
    t["etapes"] = [re.sub(r"\s*\(page \d+\)\.?$", "", l).split(". ", 1)[1]
                   for l in flux(22, 22).split("\n")
                   if re.match(r"^\d{1,2}\. .+\(page \d+\)\.?$", l.strip())]
    t["caracteristiquesIntro"] = extraire((26, 26), "4 · CARACTÉRISTIQUES",
                                          "Les quatre caractéristiques physiques")
    t["valeurDeBase"] = extraire((27, 27), "Valeur de base\ndes caractéristiques",
                                 "Échelle des valeurs")
    t["repartition"] = extraire((27, 27), "Répartissez les sept valeurs", "• Polyvalent", avec_debut=True)
    t["magie"] = extraire((27, 27), "Magie. Si vous voulez que votre personnage", "Exemple :", avec_debut=True)
    t["modificateurPeuple"] = extraire((27, 28), "Une fois les valeurs",
                                       "Modificateur de peuple\nPeuple", avec_debut=True)
    t["voies"] = extraire((29, 29), "5 · VOIES ET CAPACITÉS", "Exemple :")
    t["pv"] = extraire((30, 30), "6 · POINTS DE VIGUEUR (PV)", "7 · DÉ DE RÉCUPÉRATION")
    t["dr"] = extraire((30, 30), "7 · DÉ DE RÉCUPÉRATION (DR)", "Points de vigueur selon les familles")
    t["pc"] = extraire((30, 31), "8 · POINTS DE CHANCE (PC)", "9 · POINTS DE MANA")
    t["pm"] = extraire((30, 31), "Pour avoir des points de mana", "Chaque personnage reçoit aussi un équipe", avec_debut=True)
    t["init"] = extraire((31, 31), "10 · INITIATIVE", "11 · ÉQUIPEMENT")
    t["equipement"] = extraire((31, 31), "11 · ÉQUIPEMENT", "12 · DÉFENSE")
    t["def"] = extraire((31, 32), "12 · DÉFENSE", "Pour avoir des points de mana")
    t["attaques"] = extraire((32, 32), "13 · VALEURS D’ATTAQUE", "14 · DOMMAGES")
    t["dm"] = extraire((32, 32), "14 · DOMMAGES (DM)", "Exemple : Lhagva utilise un cime")
    t["toucheFinale"] = extraire((33, 33), "Il ne vous reste plus", "Les quelques questions suivantes", avec_debut=True)
    t["questionsDescription"] = extraire((33, 33), "vous aider :", "de vos aventures d’une session")
    t["questionsHistoire"] = extraire((34, 35), "D’où vient-il ?", "Pour répondre à ces questions", avec_debut=True)
    t["idealEtTravers"] = extraire((33, 33), "Idéal et travers", "Personnages prétirés :")
    t["secretsIntro"] = extraire((35, 35), "Pour le moment, si vous n’avez pas particuliè-",
                                 "Ces éléments d’histoire personnelle", avec_debut=True)
    t["age"] = extraire((35, 35), "Âge du personnage", "Taille et poids")
    t["taillePoids"] = extraire((35, 35), "Taille et poids", "Table des secrets intimes (2)")
    # la colonne voisine (table « Taille et poids ») se mêle au texte des langues en
    # mode flux : on arrête l'extrait au titre de cette table
    t["langues"] = extraire((36, 36), "Langues maîtrisées", "Taille et poids du personnage")
    t["methodeRapide"] = extraire((28, 28), "Si vous êtes débutant et que vous hésitez",
                                  "Exemple : Lhagva est une barbare", avec_debut=True)
    t["talentSecondaire"] = (extraire((36, 37), "Si votre MJ vous y autorise", "d’un cumul)", avec_debut=True)
                             + " d’un cumul)."
                             + "\nExemple : jouer d’un instrument de musique au choix, jouer aux échecs ou aux cartes, "
                               "calligraphie, cuisine, etc.")
    return t

# Le livre insère, au milieu de la présentation des aventuriers (p. imprimée 24), une phrase
# appartenant à la colonne voisine. On recolle la phrase d'origine.
CORRECTIONS_COLONNES = {
    "Ils portent des armures légères vigueur », 7, « Dé de récupération », et 8, "
    "« Points de chance »).\n(cuir ou cuir renforcé)":
        "Ils portent des armures légères (cuir ou cuir renforcé)",
}


def textes_familles():
    """Présentation des quatre familles (p. PDF 23-25).

    Le livre entrelace ici deux colonnes et les listes de profils : on ne garde que les
    paragraphes de présentation, jusqu'à la première puce de profil, en écartant les
    fragments venus d'une autre colonne (repérés par un guillemet fermant orphelin)."""
    familles = {}
    zone = recoller(flux(23, 25))
    bornes = [("aventuriers", "Aventuriers", "• Arquebusier"),
              ("combattants", "Combattants", "• Barbare"),
              ("mages", "Mages", "• Ensorceleur"),
              ("mystiques", "Mystiques", "• Druide")]
    for cle, debut, fin in bornes:
        i = zone.find("\n" + debut + "\n")
        if i < 0:
            i = zone.find("\n" + debut + " ")
        j = zone.find(fin, i + 1) if i >= 0 else -1
        if i < 0 or j < 0:
            raise SystemExit("famille introuvable : %s (%d, %d)" % (cle, i, j))
        paragraphes = []
        for par in zone[i + len(debut) + 1:j].strip().split("\n"):
            par = par.strip()
            if not par or par.startswith("•"):
                continue
            paragraphes.append(par)
        texte = "\n".join(paragraphes).strip()
        for faux, vrai in CORRECTIONS_COLONNES.items():
            texte = texte.replace(faux, vrai)
        familles[cle] = texte
    return familles


CODES_CARACS = {"Agilité": "AGI", "Constitution": "CON", "Force": "FOR", "Perception": "PER",
                "Charisme": "CHA", "Intelligence": "INT", "Volonté": "VOL"}


def _sans_titres(texte):
    """Retire les titres en capitales insérés au milieu du texte par la mise en page."""
    return "\n".join(l for l in texte.split("\n")
                     if not re.fullmatch(r"[A-ZÉÈÀÂÎÔÛ0-9 ’'()·•-]{6,}", l.strip()))


def familles():
    """Valeurs des quatre familles (p. PDF 25 pour le résumé chiffré, 23-25 pour les textes,
    30 pour le type de dé de récupération)."""
    resume = recoller(flux(25, 25))
    chiffres = {}
    for cle, nom in [("aventuriers", "Aventurier"), ("combattants", "Combattant"),
                     ("mages", "Mage"), ("mystiques", "Mystique")]:
        m = re.search(nom + r" : (\d) PV([^\x8d\n]*)", resume)
        if not m:
            raise SystemExit("famille introuvable dans le résumé : %s" % nom)
        suite = m.group(2)
        chiffres[cle] = {
            "nom": nom + "s", "pv": int(m.group(1)),
            "pcBonus": 1 if "PC supplémentaire" in suite else 0,
            "drBonus": 1 if "DR supplémentaire" in suite else 0,
            "rang2Mage": "capacité de rang 2 supplémentaire" in suite,
            "resume": re.sub(r"\s+", " ", (m.group(1) + " PV" + suite)).strip(),
        }
    # type de dé de récupération (p. PDF 30)
    dr = flux(30, 30)
    for cle, nom in [("aventuriers", "Aventuriers"), ("combattants", "Combattants"),
                     ("mages", "Mages"), ("mystiques", "Mystiques")]:
        m = re.search(r"• %s : (d\d+)" % nom, dr)
        if not m:
            raise SystemExit("type de DR introuvable : %s" % nom)
        chiffres[cle]["dr"] = m.group(1)
    for cle, texte in textes_familles().items():
        chiffres[cle]["description"] = texte
    return chiffres


def resumes_profils():
    """p. PDF 23-25 : « • Profil : résumé [Carac, Carac, Carac] ; voir page N. »"""
    t = _sans_titres(recoller(flux(23, 26)))
    sortie = {}
    motif = re.compile(r"• ([A-ZÉÈÀÂÎÔÛ][\wÀ-ÿ -]+?) : (.+?) \[([^\]]+)\]\s*;\s*voir page \d+", re.S)
    for m in motif.finditer(t):
        nom = re.sub(r"\s+", " ", m.group(1)).strip()
        resume = re.sub(r"\s+", " ", m.group(2)).strip()
        caracs_texte = re.sub(r"\s+", " ", m.group(3)).strip()
        codes = []
        for morceau in caracs_texte.split(","):
            morceau = morceau.strip()
            if " ou " in morceau:  # druide : « Constitution ou Agilité »
                codes.append([CODES_CARACS[x.strip()] for x in morceau.split(" ou ")])
            else:
                codes.append(CODES_CARACS[morceau])
        sortie[slug(nom)] = {"nom": nom, "resume": resume,
                             "caracsClesTexte": caracs_texte, "caracsCles": codes}
    if len(sortie) != 14:
        raise SystemExit("résumés de profils : %d trouvés (%s)" % (len(sortie), sorted(sortie)))
    return sortie


def resumes_peuples():
    """p. PDF 25 : « • Peuple : résumé (profils typiques : …) ; voir page N. »"""
    t = _sans_titres(recoller(flux(25, 26)))
    debut = t.find("3 · PEUPLES")
    t = t[debut:t.find("Le choix du peuple peut être influencé", debut)]
    t = re.sub(r"\n(?:•\n)+", "\n", t).replace("\n• ", "\n")
    t = re.sub(r"\n(?=[a-z(])", " ", t)
    sortie = {}
    motif = re.compile(r"^([A-ZÉÈÀÂÎÔÛ][\wÀ-ÿ -]+?) : (.+?) \(profils typiques : ([^)]+)\)",
                       re.S | re.M)
    for m in motif.finditer(t):
        nom = re.sub(r"\s+", " ", m.group(1)).strip()
        if nom in ("Aventurier", "Combattant", "Mage", "Mystique"):
            continue
        resume = re.sub(r"\s+", " ", m.group(2)).strip()
        typiques = [x.strip() for x in re.sub(r"\s+", " ", m.group(3)).split(",")]
        sortie[slug(nom)] = {"nom": nom, "resume": resume,
                             "profilsTypiques": [slug(x) for x in typiques]}
    if len(sortie) != 8:
        raise SystemExit("résumés de peuples : %d trouvés (%s)" % (len(sortie), sorted(sortie)))
    return sortie


# Bornes des sept caractéristiques dans le flux des pages PDF 26-27 : (code, libellé du
# livre, marqueur de fin des « Actions type »). Le livre est en deux colonnes et la
# définition du Charisme est coupée par un saut de colonne : elle est recomposée.
BORNES_CARACS = [
    ("AGI", "L’Agilité (AGI)", "• La Constitution (CON)"),
    ("CON", "La Constitution (CON)", "• La Force (FOR)"),
    ("FOR", "La Force (FOR)", "• La Perception (PER)"),
    ("PER", "La Perception (PER)", "Les trois caractéristiques mentales"),
    ("CHA", "Le Charisme (CHA)", "• L’Intelligence (INT)"),
    ("INT", "L’Intelligence (INT)", "• La Volonté (VOL)"),
    ("VOL", "La Volonté (VOL)", "Dans Chroniques Oubliées Fantasy"),
]


def aide():
    """Infobulles des caractéristiques : définition et « Actions type » (p. PDF 26-27)."""
    p = flux(26, 27)
    fiches = {}
    for code, libelle, fin in BORNES_CARACS:
        i = p.find(libelle)
        if i < 0:
            raise SystemExit("caractéristique introuvable : %s" % libelle)
        j = p.find("Actions type :", i)
        k = p.find(fin, j)
        if j < 0 or k < 0:
            raise SystemExit("bornes introuvables pour %s" % code)
        definition = recoller(p[i:j].strip()).replace("\n", " ")
        actions = recoller(p[j + len("Actions type :"):k].strip()).replace("\n", " ")
        if code == "CHA":
            suite = extraire((27, 27), "persuasion, la personnalité",
                             "Les points de chance découlent du CHA.", avec_debut=True)
            definition = (definition + " " + suite.replace("\n", " ")
                          + " Les points de chance découlent du CHA.")
        fiches[code] = {"titre": libelle.replace("L’", "").replace("La ", "").replace("Le ", ""),
                        "texte": re.sub(r"\s+", " ", definition).strip(),
                        "actionsType": re.sub(r"\s+", " ", actions).strip(),
                        "page": 26}
    return fiches


def caracs_magie():
    """Caractéristique de magie de chaque profil, d'après la phrase « Magie » du livre
    (p. imprimée 27) : « INT pour les sorts de magicien, de forgesort et de sorcier,
    CHA pour les sorts d'ensorceleur, de barde et prêtre, PER pour les sorts de druide »."""
    phrase = textes_creation()["magie"]
    m = re.search(r"correspondante \((.+?)\)", phrase, re.S)
    if not m:
        raise SystemExit("phrase « Magie » introuvable")
    liste = m.group(1)
    noms = {"magicien": "magicien", "forgesort": "forgesort", "sorcier": "sorcier",
            "ensorceleur": "ensorceleur", "barde": "barde", "prêtre": "pretre",
            "druide": "druide"}
    decoupe = [(mm.start(), mm.group(1)) for mm in re.finditer(r"\b(INT|CHA|PER|FOR|AGI|CON|VOL)\b", liste)]
    sortie = {}
    for k, (debut, code) in enumerate(decoupe):
        fin = decoupe[k + 1][0] if k + 1 < len(decoupe) else len(liste)
        segment = liste[debut:fin]
        for nom, slug_profil in noms.items():
            if nom in segment:
                sortie[slug_profil] = code
    attendus = {"magicien", "forgesort", "sorcier", "ensorceleur", "barde", "pretre", "druide"}
    if set(sortie) != attendus:
        raise SystemExit("caractéristiques de magie : %s" % sortie)
    return sortie


def aide_termes():
    """Infobulles des termes techniques : types d'action, sort, dé évolutif, valeurs dérivées."""
    actions = flux(205, 215)
    debut = actions.find("On distingue quatre types d’actions")
    if debut < 0:
        raise SystemExit("définition des actions introuvable")
    bloc = actions[debut:debut + 2000]

    def puce(marqueur, suivant):
        i = bloc.find(marqueur)
        j = bloc.find(suivant, i) if suivant else len(bloc)
        if i < 0 or j < 0:
            raise SystemExit("action introuvable : %s" % marqueur)
        return re.sub(r"\s+", " ", recoller(bloc[i:j]).replace("\n", " ")).strip()

    termes = {
        "L": {"titre": "Action limitée (L)", "page": 210,
              "texte": puce("L’action limitée (L)", "• L’action d’attaque (A)")},
        "A": {"titre": "Action d’attaque (A)", "page": 210,
              "texte": puce("L’action d’attaque (A)", "• L’action de mouvement (M)")},
        "M": {"titre": "Action de mouvement (M)", "page": 210,
              "texte": puce("L’action de mouvement (M)", "• L’action gratuite (G)")},
        "G": {"titre": "Action gratuite (G)", "page": 210,
              "texte": puce("L’action gratuite (G)", "Un personnage ne doit pas être surpris")},
        "sort": {"titre": "Sort (*)", "page": 210,
                 "texte": re.sub(r"\s+", " ", recoller(
                     actions[actions.find("Chaque capacité indique entre parenthèses"):
                             actions.find("On distingue quatre types d’actions")]).replace("\n", " ")).strip()},
        "d4°": {"titre": "Dé évolutif (d4°)", "page": 38,
                "texte": extraire((37, 43), "De plus, à partir du niveau 6 et tous les 3",
                                  "Temps d’apprentissage", avec_debut=True).replace("\n", " ")},
    }
    # valeurs dérivées : on reprend le premier paragraphe du point correspondant
    textes = textes_creation()
    derivees = [
        ("PV", "Points de vigueur (PV)", "pv", 30),
        ("DR", "Dé de récupération (DR)", "dr", 30),
        ("PC", "Points de chance (PC)", "pc", 30),
        ("PM", "Points de mana (PM)", "pm", 31),
        ("INIT", "Initiative", "init", 31),
        ("DEF", "Défense (DEF)", "def", 31),
        ("ATT", "Valeurs d’attaque", "attaques", 32),
        ("DM", "Dommages (DM)", "dm", 32),
        ("VOIES", "Voies et capacités", "voies", 29),
    ]
    for code, titre, cle, page in derivees:
        premier = textes[cle].split("\n")[0]
        termes[code] = {"titre": titre, "texte": premier, "page": page}
    termes["FAMILLE"] = {
        "titre": "Familles de profil", "page": 23,
        "texte": "Les quatorze profils sont répartis en quatre familles : aventuriers, "
                 "combattants, mages et mystiques. La famille donne les points de vigueur de "
                 "base, le dé de récupération et, pour certaines, un bonus.",
    }
    return termes


def echelle():
    """p. PDF 27 : encadré « Échelle des valeurs de caractéristiques » (colonne de droite).
    Comme pour les autres tableaux du livre, une description longue est centrée sur deux
    lignes autour de sa valeur."""
    txt = nettoyer_leger(pdftotext(27, 27, layout=True, zone=(235, 0, 245, 400)))
    lignes = [l.rstrip() for l in txt.split("\n")]
    sortie, en_attente = {}, []
    for k, ligne in enumerate(lignes):
        l = ligne.strip()
        m = re.match(r"^([+-]?\d)\s+(\S.*)$", l)
        seul = re.fullmatch(r"([+-]?\d)", l)
        if m and m.group(1) in ("-3", "-2", "-1", "0", "+1", "+2", "+3", "+4", "+5"):
            sortie[m.group(1)] = m.group(2).strip()
        elif seul:
            suite = lignes[k + 1].strip() if k + 1 < len(lignes) else ""
            haut = en_attente[-1] if en_attente else ""
            sortie[seul.group(1)] = re.sub(r"\s+", " ", (haut + " " + suite)).strip()
        elif l and not re.match(r"^(Valeur|Échelle|\d+|INTRO|Création)", l):
            en_attente.append(l)
        if m or seul:
            en_attente = []
    attendus = ["-3", "-2", "-1", "0", "+1", "+2", "+3", "+4", "+5"]
    manquants = [a for a in attendus if a not in sortie]
    if manquants:
        raise SystemExit("échelle incomplète : %s (%s)" % (manquants, sortie))
    return {a: sortie[a] for a in attendus}


# --------------------------------------------------------------------------- textes maison

# Textes écrits pour l'application (aucun ne vient du livre). Ton épique avec une touche
# d'humour, vouvoiement du joueur, jamais plus de deux courts paragraphes.
# À faire relire par Valentin (§9 du brief).
MAISON = {
    # L'écran de bienvenue présente le monde avec le texte du livre (creation.livre.osgild) :
    # pas de paraphrase maison là où l'ouvrage fait le travail.
    "guideHistoire": [
        "Racontez d’où vient votre personnage, ce qu’il a traversé, et ce qui l’a poussé à prendre "
        "la route. Surtout, que cette histoire justifie à sa façon votre idéal, votre travers, "
        "votre secret et votre bizarrerie : c’est là que le personnage devient quelqu’un.",
        "Une demi-page suffit. Laissez volontairement des zones d’ombre : votre MJ adore les "
        "combler, et c’est bien la seule chose qu’il fasse gratuitement.",
    ],
    "noteObjetNegocie": "Cela peut être lié à votre histoire (un porte-bonheur, une lettre, un "
                        "médaillon…) ou quelque chose de très pratique (une petite corde de 3 m, "
                        "une cuillère pour manger…). Le MJ tranche.",
    "avertissementModeLibre": "Vous êtes libre, mais une mauvaise répartition peut vous "
                              "handicaper. Exemple : un guerrier avec FOR à 0 touchera rarement "
                              "ses adversaires et fera peu de dégâts.",
    "notePrompt": "Ce texte reprend tout ce que vous avez choisi. Si le résultat ne vous plaît "
                  "pas, modifiez-le librement avant de le coller dans ChatGPT.",
    "noteBizarrerie": "Un petit grain de sel : de quoi faire rire la table au troisième round, "
                      "pas de quoi saboter l’aventure.",
    "noteTraits": "Les quatre sont obligatoires : relancez les dés autant que vous voulez, ou "
                  "écrivez-les vous-même.",
    "noteLangues": "Votre personnage parle d’office la langue de son peuple et la langue commune "
                   "de la région. Chaque point d’Intelligence au-dessus de zéro lui en offre une "
                   "de plus ; avec une Intelligence négative, il ne sait pas lire.",
    "ecrans": {
        "peuple": "Et de quel coin du monde venez-vous ?",
        "caracs": "Sept chiffres qui décideront de beaucoup de choses.",
        "equipement": "Ce que vous emportez, et ce que vous avez réussi à négocier.",
        "touche": "Les détails qui feront de vous quelqu’un plutôt que quelque chose.",
        "histoire": "Votre passé, en une demi-page.",
        "recap": "Votre fiche, votre portrait, et la porte de la taverne.",
    },
    # Infobulles du panneau « Fiche en construction » : elles disent à quoi sert la valeur,
    # pas comment elle se calcule. Ce sont des textes maison, jamais attribués au livre.
    "aide": {
        "AGI": {"titre": "Agilité (AGI)",
                "texte": "Tout ce qui demande vitesse et adresse : esquiver, grimper, se faufiler, "
                         "tirer à l’arc. Elle vous protège aussi, car elle entre dans votre Défense."},
        "CON": {"titre": "Constitution (CON)",
                "texte": "Votre résistance physique. Elle décide de ce que vous encaissez avant de "
                         "tomber, et de votre endurance face au poison, au froid ou à la fatigue."},
        "FOR": {"titre": "Force (FOR)",
                "texte": "Cogner, soulever, enfoncer une porte. C’est elle qui fait mal quand vous "
                         "frappez au corps à corps."},
        "PER": {"titre": "Perception (PER)",
                "texte": "Voir, entendre, flairer le piège ou le mensonge. C’est ce qui vous permet "
                         "de remarquer les choses avant qu’elles ne vous tombent dessus."},
        "CHA": {"titre": "Charisme (CHA)",
                "texte": "Convaincre, séduire, mentir, commander. Il décide aussi de votre réserve "
                         "de points de chance."},
        "INT": {"titre": "Intelligence (INT)",
                "texte": "Savoir, déduire, se souvenir. Elle dit combien de langues vous parlez et "
                         "si votre personnage sait lire."},
        "VOL": {"titre": "Volonté (VOL)",
                "texte": "Tenir bon : résister à la peur, à la douleur et à la magie. Chez beaucoup "
                         "de lanceurs de sorts, c’est elle qui fait la puissance."},
        "PV": {"titre": "Points de vigueur (PV)",
               "texte": "Ce que vous pouvez encaisser avant de tomber. À zéro, votre personnage est "
                        "hors de combat."},
        "DEF": {"titre": "Défense (DEF)",
                "texte": "La difficulté que vos adversaires doivent battre pour vous toucher. Plus "
                         "elle est haute, moins vous prenez de coups."},
        "INIT": {"titre": "Initiative",
                 "texte": "Qui agit en premier dans un combat : la plus haute joue en tête."},
        "PC": {"titre": "Points de chance (PC)",
               "texte": "Des jetons à dépenser quand un jet rate de peu ou qu’il faut tenter "
                        "l’impossible. Ils ne reviennent qu’en passant un niveau."},
        "DR": {"titre": "Dés de récupération (DR)",
               "texte": "Le dé que vous lancez pour reprendre des points de vigueur en cours "
                        "d’aventure. Le nombre indique combien de fois vous pouvez le faire."},
        "PM": {"titre": "Points de mana (PM)",
               "texte": "Le carburant de vos sorts. Chaque sort en consomme ; ils reviennent après "
                        "une bonne nuit de repos."},
        "ATT_CONTACT": {"titre": "Attaque au contact",
                        "texte": "Ce que vous ajoutez à votre dé quand vous frappez au corps à "
                                 "corps."},
        "ATT_DISTANCE": {"titre": "Attaque à distance",
                         "texte": "Ce que vous ajoutez à votre dé quand vous tirez ou lancez "
                                  "quelque chose."},
        "ATT_MAGIQUE": {"titre": "Attaque magique",
                        "texte": "Ce que vous ajoutez à votre dé quand vous visez quelqu’un avec "
                                 "un sort."},
    },
    # Table maison tirée au d20 (les vingt entrées sont relues par Valentin).
    "bizarreries": [
        "N’a pas de sous-vêtements. Jamais. Par principe.",
        "Refuse de passer par les portes : il n’entre et ne sort que par les fenêtres.",
        "Vomit dès qu’il aperçoit une personne âgée.",
        "Parle de lui à la troisième personne dès qu’il est stressé.",
        "Consulte sa cuillère avant toute décision importante, car elle « sait ».",
        "Éternue bruyamment chaque fois que quelqu’un prononce le mot « dragon ».",
        "Ne peut s’endormir que si quelqu’un lui chante une berceuse.",
        "Collectionne les cailloux « qui ont une bonne tête » et leur donne des prénoms.",
        "Salue solennellement chaque cheval qu’il croise, par respect.",
        "Compte tout à voix haute (marches, pièces, ennemis) et se trompe toujours.",
        "Refuse de manger quoi que ce soit de vert.",
        "Salue chaque porte avant de la franchir et s’excuse en la refermant.",
        "Dort avec ses bottes, persuadé qu’on les lui volera.",
        "Siffle faux quand il a peur, puis jure que ce n’était pas lui.",
        "Baptise ses armes et leur parle avant chaque combat.",
        "Ne boit jamais deux fois dans la même chope.",
        "Marchande absolument tout, y compris le prix d’un verre d’eau.",
        "Se signe trois fois devant toute statue, quelle que soit la divinité.",
        "Tient la liste de ceux qui lui doivent une pièce et la relit chaque soir.",
        "Prétend reconnaître chaque oiseau et invente leurs noms avec aplomb.",
    ],
}


# --------------------------------------------------------------------------- écriture

def ecrire(nom, donnees):
    chemin = os.path.join(RACINE, "data", nom)
    with open(chemin, "w", encoding="utf-8") as f:
        json.dump(donnees, f, ensure_ascii=False, indent=1)
        f.write("\n")
    print("écrit : data/%s" % nom)

def main():
    ideaux, travers = table_ideaux_travers()
    tables = {
        "_source": "Chroniques Oubliées Fantasy 2, chapitre 1 (p. imprimées 33 à 37) ; "
                   "la table des bizarreries est un ajout maison.",
        "ideaux": ideaux,
        "travers": travers,
        "secrets1": table_secrets(34),
        "secrets2": table_secrets(35),
        "ages": table_ages(),
        "tailles": table_tailles(),
        "langues": table_langues(),
        "bizarreries": MAISON["bizarreries"],
    }
    print("idéaux %d · travers %d · secrets1 %d · secrets2 %d · langues %d" %
          (len(tables["ideaux"]), len(tables["travers"]), len(tables["secrets1"]),
           len(tables["secrets2"]), len(tables["langues"])))
    ecrire("tables.json", tables)

    a = armes_contact() + armes_distance()
    print("armes : %d contact + %d distance" %
          (len([x for x in a if x['categorie'] == 'contact']),
           len([x for x in a if x['categorie'] == 'distance'])))
    ecrire("armes.json", a)
    arm = armures()
    print("armures : %d" % len(arm))
    ecrire("armures.json", arm)

    creation = {"_source": "Chroniques Oubliées Fantasy 2, chapitre 1. Textes du livre repris mot "
                           "pour mot ; les textes de la clé « maison » sont écrits pour l'application.",
                "livre": textes_creation(), "familles": textes_familles(), "echelle": echelle(),
                "maison": MAISON}
    ecrire("creation.json", creation)
    ecrire("aide.json", {"caracs": aide(), "termes": aide_termes()})
    ecrire("familles.json", familles())
    profils = resumes_profils()
    magie = caracs_magie()
    for slug_profil, fiche in profils.items():
        fiche["caracMagie"] = magie.get(slug_profil)
    ecrire("resumes.json", {"profils": profils, "peuples": resumes_peuples()})

if __name__ == "__main__":
    main()
