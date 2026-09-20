#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Recoupement DRS ↔ livre, capacité par capacité.

  python3 tools/crosscheck.py            # résumé
  python3 tools/crosscheck.py --detail   # liste tous les écarts

Le DRS est la source des capacités (le texte du livre est en deux colonnes qui s'entremêlent
à l'extraction). Ce script vérifie que chaque titre de capacité et le début de son texte se
retrouvent bien dans le livre : un écart signale soit une coquille du DRS, soit une révision
entre les deux supports, et demande un arbitrage.
"""
import json, os, re, sys, unicodedata

RACINE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(RACINE, "tools"))
import extract_pdf as ex  # noqa: E402  (outil de développement, même dossier)

DATA = os.path.join(RACINE, "data")
PROFILS = ["arquebusier", "barde", "rodeur", "voleur", "barbare", "chevalier", "guerrier",
           "ensorceleur", "forgesort", "magicien", "sorcier", "druide", "moine", "pretre"]
PEUPLES = ["demi-orc", "elfe-haut", "elfe-sylvain", "gnome", "halfelin", "humain", "nain"]

# Pages PDF des chapitres (le demi-elfe n'a pas de voie propre).
PAGES_PROFILS = (60, 127)
PAGES_PEUPLES = (43, 60)
PAGES_MAGE = (59, 61)

# Nombre de caractères comparés au début du texte de chaque capacité.
DEBUT = 60


def aplatir(texte):
    """Comparaison insensible à la casse, aux accents, à la ponctuation et aux espaces."""
    texte = unicodedata.normalize("NFD", texte or "")
    texte = "".join(c for c in texte if unicodedata.category(c) != "Mn")
    return re.sub(r"[^a-z0-9]", "", texte.lower())


def texte_livre(pages):
    return aplatir(ex.recoller(ex.flux(*pages)))


def controler(nom_source, capacites, livre, ecarts):
    for cap in capacites:
        titre = aplatir(cap["titre"])
        debut = aplatir(cap["texte"])[:DEBUT]
        ou = "%s rang %d — %s" % (nom_source, cap["rang"], cap["titre"])
        if titre not in livre:
            ecarts.append((ou, "titre absent du livre"))
        elif debut and debut not in livre:
            ecarts.append((ou, "texte différent du livre (début : %s…)" % cap["texte"][:70]))


def controler_tags(livre_brut, capacites, nom_source, ecarts):
    """Compare les tags d'action et l'astérisque des sorts : le livre les note
    « 1. Cri de guerre (G) : » ou « 1. Murmures dans le vent (G)* : »."""
    for cap in capacites:
        motif = re.compile(r"%d\.\s*%s\s*((?:\([LAMG]\))*)(\*?)\s*:" %
                           (cap["rang"], re.escape(cap["titre"])))
        m = motif.search(livre_brut)
        if not m:
            continue  # titre différent (déjà signalé) ou coupé par la mise en colonnes
        tags_livre = re.findall(r"[LAMG]", m.group(1))
        if sorted(tags_livre) != sorted(cap.get("tags", [])):
            ecarts.append(("%s rang %d — %s" % (nom_source, cap["rang"], cap["titre"]),
                           "tags DRS %s / livre %s" % (cap.get("tags"), tags_livre)))
        if bool(m.group(2)) != bool(cap.get("sort")):
            ecarts.append(("%s rang %d — %s" % (nom_source, cap["rang"], cap["titre"]),
                           "sort DRS %s / livre %s" % (cap.get("sort"), bool(m.group(2)))))


def main():
    detail = "--detail" in sys.argv
    livre_profils = texte_livre(PAGES_PROFILS)
    livre_peuples = texte_livre(PAGES_PEUPLES)
    livre_mage = texte_livre(PAGES_MAGE)

    brut_profils = ex.recoller(ex.flux(*PAGES_PROFILS))
    brut_peuples = ex.recoller(ex.flux(*PAGES_PEUPLES))

    ecarts, total = [], 0
    for slug in PROFILS:
        profil = json.load(open(os.path.join(DATA, "profils", slug + ".json"), encoding="utf-8"))
        for voie in profil["voies"]:
            source = "%s / %s" % (profil["nom"], voie["nom"])
            controler(source, voie["capacites"], livre_profils, ecarts)
            controler_tags(brut_profils, voie["capacites"], source, ecarts)
            total += len(voie["capacites"])
    for slug in PEUPLES:
        peuple = json.load(open(os.path.join(DATA, "peuples", slug + ".json"), encoding="utf-8"))
        if not peuple.get("voie"):
            continue
        source = "%s / %s" % (peuple["nom"], peuple["voie"]["nom"])
        controler(source, peuple["voie"]["capacites"], livre_peuples, ecarts)
        controler_tags(brut_peuples, peuple["voie"]["capacites"], source, ecarts)
        total += len(peuple["voie"]["capacites"])
    mage = json.load(open(os.path.join(DATA, "voie-du-mage.json"), encoding="utf-8"))
    controler("Voie du mage", mage["capacites"], livre_mage, ecarts)
    total += len(mage["capacites"])

    titres_absents = [e for e in ecarts if "titre absent" in e[1]]
    textes = [e for e in ecarts if "texte différent" in e[1]]
    tags = [e for e in ecarts if e[1].startswith(("tags", "sort"))]
    print("%d capacités comparées : %d titres absents du livre, %d textes différents, "
          "%d écarts de tags ou de sort."
          % (total, len(titres_absents), len(textes), len(tags)))
    for ou, quoi in (ecarts if detail else titres_absents + tags):
        print(" -", ou, ":", quoi)
    if not detail and textes:
        print("   (relancer avec --detail pour la liste des textes)")


if __name__ == "__main__":
    main()
