#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Récupère les profils, les peuples et la voie du mage sur le DRS officiel
(https://drs.chroniques-oubliees.fr) et écrit les JSON de data/.

Bibliothèque standard uniquement (urllib + re). Les textes de règles sont repris
mot pour mot ; seuls les caractères sont normalisés (tirets insécables, espaces
insécables, guillemets), voir nettoyer().

  python3 tools/scrape_drs.py            # tout
  python3 tools/scrape_drs.py barbare    # un ou plusieurs slugs
"""
import json, os, re, sys, time, urllib.request, html as htmlmod

RACINE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CACHE = os.path.join(RACINE, "tools", ".cache-drs")
BASE = "https://drs.chroniques-oubliees.fr"

PROFILS = ["arquebusier", "barde", "rodeur", "voleur", "barbare", "chevalier", "guerrier",
           "ensorceleur", "forgesort", "magicien", "sorcier", "druide", "moine", "pretre"]
PEUPLES = ["demi-elfe", "demi-orc", "elfe-haut", "elfe-sylvain", "gnome", "halfelin", "humain", "nain"]

FAMILLES = {
    "arquebusier": "aventuriers", "barde": "aventuriers", "rodeur": "aventuriers", "voleur": "aventuriers",
    "barbare": "combattants", "chevalier": "combattants", "guerrier": "combattants",
    "ensorceleur": "mages", "forgesort": "mages", "magicien": "mages", "sorcier": "mages",
    "druide": "mystiques", "moine": "mystiques", "pretre": "mystiques",
}
NOMS_PROFILS = {
    "arquebusier": "Arquebusier", "barde": "Barde", "rodeur": "Rôdeur", "voleur": "Voleur",
    "barbare": "Barbare", "chevalier": "Chevalier", "guerrier": "Guerrier",
    "ensorceleur": "Ensorceleur", "forgesort": "Forgesort", "magicien": "Magicien",
    "sorcier": "Sorcier", "druide": "Druide", "moine": "Moine", "pretre": "Prêtre",
}
NOMS_PEUPLES = {
    "demi-elfe": "Demi-elfe", "demi-orc": "Demi-orc", "elfe-haut": "Elfe haut",
    "elfe-sylvain": "Elfe sylvain", "gnome": "Gnome", "halfelin": "Halfelin",
    "humain": "Humain", "nain": "Nain",
}

# --------------------------------------------------------------------------- outils texte

def nettoyer(t):
    """Normalise le texte extrait : espaces et tirets insécables, espaces multiples."""
    if t is None:
        return None
    t = htmlmod.unescape(t)
    t = t.replace(" ", " ").replace(" ", " ").replace(" ", " ")
    t = t.replace("‑", "-").replace("‐", "-").replace("−", "-")
    t = t.replace("–", "-").replace("—", "-")
    t = re.sub(r"<[^>]+>", "", t)
    t = re.sub(r"[ \t]+", " ", t)
    t = re.sub(r" *\n *", "\n", t)
    return t.strip()

def sans_balises(t):
    return nettoyer(t)

def telecharger(url, nom_cache):
    os.makedirs(CACHE, exist_ok=True)
    chemin = os.path.join(CACHE, nom_cache)
    if os.path.exists(chemin):
        return open(chemin, encoding="utf-8").read()
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=60) as r:
        s = r.read().decode("utf-8")
    open(chemin, "w", encoding="utf-8").write(s)
    time.sleep(0.6)
    return s

# --------------------------------------------------------------------------- parsing

RE_TITRE_CAP = re.compile(
    r'<div class="font-semibold font-mendl-sans">(\d+)<!-- -->\s*·\s*<!-- -->(.*?)</div>'
    r'(.*?)</div></div></div><div class="prose leading-snug px-5">(.*?)</div>', re.S)

def parser_capacites(html):
    """Renvoie la liste des capacités dans l'ordre d'apparition."""
    caps = []
    for m in RE_TITRE_CAP.finditer(html):
        rang = int(m.group(1))
        titre_brut = m.group(2)
        zone_tags = m.group(3)
        corps = m.group(4)
        sort = 'class="sr-only">*<' in titre_brut or "capability-type-spell-bg" in zone_tags
        titre = nettoyer(re.sub(r'<span class="sr-only">\*</span>', "", titre_brut))
        tags = re.findall(r'<div class="-ms-\[2px\]">([LAMG])</div>', zone_tags)
        # paragraphes du texte
        paras = re.findall(r"<p>(.*?)</p>", corps, re.S)
        if not paras:
            paras = [corps]
        texte = "\n".join(nettoyer(p) for p in paras).strip()
        caps.append({"rang": rang, "titre": titre, "tags": tags, "sort": sort, "texte": texte})
    return caps

def parser_voies(html):
    """Noms des voies, dans l'ordre (cadres décoratifs)."""
    return [nettoyer(m) for m in re.findall(r'style="padding:5px"><div>(.*?)</div>', html)]

def bloc_encadre(html):
    """Contenu du cadre d'informations (prose no-margin-top-headings dark)."""
    i = html.find('class="prose no-margin-top-headings dark"')
    if i < 0:
        return ""
    return html[i:i + 20000]

def section_h2(bloc, titre):
    """Paragraphes qui suivent un <h2>titre</h2> jusqu'au <h2> suivant."""
    m = re.search(r"<h2>%s</h2>(.*?)(?=<h2>|</div>)" % re.escape(titre), bloc, re.S)
    if not m:
        return None
    paras = re.findall(r"<p>(.*?)</p>", m.group(1), re.S)
    if not paras:
        return nettoyer(m.group(1)) or None
    return "\n".join(nettoyer(p) for p in paras).strip()

def description_intro(html):
    m = re.search(r'<div class="prose"><p>(.*?)</p>', html, re.S)
    return nettoyer(m.group(1)) if m else None

def grouper_en_voies(caps, noms_voies, attendu=5):
    """Découpe la liste plate des capacités en voies de 5 rangs."""
    voies, courante = [], None
    for c in caps:
        if c["rang"] == 1:
            courante = []
            voies.append(courante)
        if courante is None:
            continue
        courante.append(c)
    sortie = []
    for i, groupe in enumerate(voies):
        nom = noms_voies[i] if i < len(noms_voies) else "Voie %d" % (i + 1)
        sortie.append({"slug": slugifier(nom), "nom": nom, "capacites": groupe})
    return sortie

def slugifier(t):
    t = nettoyer(t).lower()
    remplacements = {"à": "a", "â": "a", "ä": "a", "é": "e", "è": "e", "ê": "e", "ë": "e",
                     "î": "i", "ï": "i", "ô": "o", "ö": "o", "ù": "u", "û": "u", "ü": "u",
                     "ç": "c", "’": " ", "'": " ", "œ": "oe"}
    for a, b in remplacements.items():
        t = t.replace(a, b)
    t = re.sub(r"[^a-z0-9]+", "-", t)
    return t.strip("-")

# --------------------------------------------------------------------------- profils

def profil(slug):
    html = telecharger("%s/fantasy/profils/%s" % (BASE, slug), "profil-%s.html" % slug)
    bloc = bloc_encadre(html)
    puces = [nettoyer(p) for p in re.findall(r"<li>(.*?)</li>", bloc, re.S)]
    caps = parser_capacites(html)
    voies = grouper_en_voies(caps, parser_voies(html))
    return {
        "slug": slug,
        "nom": NOMS_PROFILS[slug],
        "famille": FAMILLES[slug],
        "description": description_intro(html),
        "pvText": " · ".join(puces),
        # le DRS titre tantôt « Armes & armures », tantôt « Armes & armures maîtrisées »
        "armesArmures": (section_h2(bloc, "Armes &amp; armures maîtrisées")
                         or section_h2(bloc, "Armes &amp; armures")),
        "equipementTexte": section_h2(bloc, "Équipement de départ"),
        "voies": voies,
        "source": "%s/fantasy/profils/%s" % (BASE, slug),
    }

# --------------------------------------------------------------------------- peuples

def reperes(bloc):
    m = re.search(r"<h2>Repères</h2>(.*?)(?=<h2>|</div>)", bloc, re.S)
    if not m:
        return {}
    txt = m.group(1)
    def champ(nom):
        mm = re.search(r"<strong>%s\s*:</strong>\s*(.*?)(?:<br/>|</p>)" % re.escape(nom), txt, re.S)
        return nettoyer(mm.group(1)) if mm else None
    return {
        "ageDepartTexte": champ("Âge de départ"),
        "esperanceVieTexte": champ("Espérance de vie"),
        "tailleTexte": champ("Taille"),
        "poidsTexte": champ("Poids"),
        "traits": champ("Traits"),
    }

def noms_typiques(bloc):
    m = re.search(r"<h2>Noms typiques</h2>(.*?)(?=<h2>|</div>)", bloc, re.S)
    if not m:
        return {"intro": None, "masculin": [], "feminin": []}
    txt = m.group(1)
    paras = re.findall(r"<p>(.*?)</p>", txt, re.S)
    intro, masc, fem = [], [], []
    for p in paras:
        brut = nettoyer(p)
        if p.strip().startswith("<strong>Masculin"):
            masc = decouper_noms(brut)
        elif p.strip().startswith("<strong>Féminin"):
            fem = decouper_noms(brut)
        else:
            intro.append(brut)
    return {"intro": "\n".join(intro) or None, "masculin": masc, "feminin": fem}

def decouper_noms(texte):
    texte = re.sub(r"^(Masculin|Féminin)\.?\s*", "", texte)
    texte = re.sub(r"\betc\.?\s*$", "", texte.strip()).strip(" .")
    noms = [n.strip(" .") for n in texte.split(",")]
    return [n for n in noms if n]

# Le livre (p. imprimée 46) : « Le demi-elfe ne possède pas de voie de peuple dédiée,
# selon l'héritage culturel et le lieu de l'éducation de son personnage, le joueur devra
# choisir entre la voie de l'humain ou une des voies de peuple d'elfe (elfe sylvain ou
# elfe haut). » Le DRS, lui, affiche la voie de l'elfe haut sur la page du demi-elfe :
# on suit le livre et on propose les trois voies au choix.
VOIE_AU_CHOIX = {
    "demi-elfe": {
        "texte": "Le demi-elfe ne possède pas de voie de peuple dédiée, selon l\u2019héritage "
                 "culturel et le lieu de l\u2019éducation de son personnage, le joueur devra choisir "
                 "entre la voie de l\u2019humain ou une des voies de peuple d\u2019elfe (elfe sylvain "
                 "ou elfe haut).",
        "peuples": ["humain", "elfe-sylvain", "elfe-haut"],
        "source": "livre, p. imprimée 46",
    }
}


def peuple(slug):
    html = telecharger("%s/fantasy/peuples/%s" % (BASE, slug), "peuple-%s.html" % slug)
    bloc = bloc_encadre(html)
    caps = parser_capacites(html)
    voies = grouper_en_voies(caps, parser_voies(html))
    d = {
        "slug": slug,
        "nom": NOMS_PEUPLES.get(slug, slug),
        "description": description_intro(html),
        "modificateursTexte": section_h2(bloc, "Caractéristiques"),
        "reperes": reperes(bloc),
        "noms": noms_typiques(bloc),
        "voie": voies[0] if voies else None,
        "source": "%s/fantasy/peuples/%s" % (BASE, slug),
    }
    if slug in VOIE_AU_CHOIX:
        d["voie"] = None
        d["voieAuChoix"] = VOIE_AU_CHOIX[slug]
    return d

def voie_du_mage():
    html = telecharger("%s/fantasy/peuples/mage" % BASE, "peuple-mage.html")
    caps = parser_capacites(html)
    voies = grouper_en_voies(caps, parser_voies(html))
    return {
        "slug": "voie-du-mage",
        "nom": (voies[0]["nom"] if voies else "Voie du mage"),
        "description": description_intro(html),
        "capacites": voies[0]["capacites"] if voies else [],
        "source": "%s/fantasy/peuples/mage" % BASE,
    }

# --------------------------------------------------------------------------- écriture

def ecrire(chemin, donnees):
    os.makedirs(os.path.dirname(chemin), exist_ok=True)
    with open(chemin, "w", encoding="utf-8") as f:
        json.dump(donnees, f, ensure_ascii=False, indent=1)
        f.write("\n")

def revue(chemin, donnees, voies):
    """Fichier lisible pour la relecture humaine."""
    lignes = ["%s — %s" % (donnees.get("nom"), donnees.get("source")), ""]
    if donnees.get("description"):
        lignes += ["DESCRIPTION : " + donnees["description"], ""]
    for cle in ("pvText", "armesArmures", "equipementTexte", "modificateursTexte"):
        if donnees.get(cle):
            lignes += ["%s : %s" % (cle, donnees[cle]), ""]
    for v in voies:
        lignes.append("### " + v["nom"])
        for c in v["capacites"]:
            tags = ("(" + ")(".join(c["tags"]) + ")") if c["tags"] else ""
            lignes.append("  %d. %s %s%s" % (c["rang"], c["titre"], tags, "*" if c["sort"] else ""))
            lignes.append("     " + c["texte"].replace("\n", "\n     "))
        lignes.append("")
    open(chemin, "w", encoding="utf-8").write("\n".join(lignes))

def main():
    cibles = sys.argv[1:]
    faits = 0
    for slug in PROFILS:
        if cibles and slug not in cibles:
            continue
        d = profil(slug)
        ecrire(os.path.join(RACINE, "data", "profils", slug + ".json"), d)
        revue(os.path.join(CACHE, slug + ".review.txt"), d, d["voies"])
        n = sum(len(v["capacites"]) for v in d["voies"])
        print("profil %-12s : %d voies, %d capacités%s" % (slug, len(d["voies"]), n,
              "  ⚠" if (len(d["voies"]) != 5 or n != 25) else ""))
        faits += 1
    for slug in PEUPLES:
        if cibles and slug not in cibles:
            continue
        d = peuple(slug)
        ecrire(os.path.join(RACINE, "data", "peuples", slug + ".json"), d)
        revue(os.path.join(CACHE, slug + ".review.txt"), d, [d["voie"]] if d["voie"] else [])
        n = len(d["voie"]["capacites"]) if d["voie"] else 0
        libelle = d["voie"]["nom"] if d["voie"] else "voie au choix : " + ", ".join(d["voieAuChoix"]["peuples"])
        print("peuple %-12s : %s, %d capacités%s" % (slug, libelle, n,
              "  ⚠" if (n != 5 and "voieAuChoix" not in d) else ""))
        faits += 1
    if not cibles or "mage" in cibles:
        d = voie_du_mage()
        ecrire(os.path.join(RACINE, "data", "voie-du-mage.json"), d)
        revue(os.path.join(CACHE, "mage.review.txt"), d, [{"nom": d["nom"], "capacites": d["capacites"]}])
        print("voie du mage : %d capacités%s" % (len(d["capacites"]), "  ⚠" if len(d["capacites"]) != 5 else ""))
    print("terminé (%d fichiers)" % faits)

if __name__ == "__main__":
    main()
