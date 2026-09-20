#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Contrôle d'intégrité des données (bloquant : sort en code 1 à la première erreur).

  python3 tools/check_data.py

Vérifie que les fichiers de data/ sont complets et cohérents avant de servir l'application :
comptes de capacités, rangs consécutifs, textes non tronqués, caractères encodables dans la
feuille PDF (WinAnsi), références d'équipement, effets bien formés, sorts repérés.
"""
import json, os, re, sys, unicodedata

RACINE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(RACINE, "data")

PROFILS = ["arquebusier", "barde", "rodeur", "voleur", "barbare", "chevalier", "guerrier",
           "ensorceleur", "forgesort", "magicien", "sorcier", "druide", "moine", "pretre"]
PEUPLES = ["demi-elfe", "demi-orc", "elfe-haut", "elfe-sylvain", "gnome", "halfelin",
           "humain", "nain"]
CARACS = {"AGI", "CON", "FOR", "PER", "CHA", "INT", "VOL"}
TAGS = {"L", "A", "M", "G"}
CIBLES = {"PV", "DEF", "INIT", "PC", "PM", "DR", "ATT_CONTACT", "ATT_DISTANCE", "ATT_MAGIQUE",
          "DM_CONTACT", "DM_DISTANCE"}

# Sorts de rang 1 attendus (§13.5 du brief) : au moins ceux-là doivent être marqués sort.
SORTS_ATTENDUS = ["Chant des héros", "Murmures dans le vent", "Divination", "Injonction",
                  "Mirage", "Choc", "Morsure de la forge", "Projectile de mana", "Arc de feu",
                  "Asphixie", "Armure de mana", "Lumière", "Malédiction", "Un pied dans la tombe",
                  "Saignements", "Ténèbres", "Baies magiques", "Peau d'écorce", "Arme bénie",
                  "Bénédiction", "Récupération mineure"]

erreurs = []
avertissements = []


def lire(chemin):
    with open(os.path.join(DATA, chemin), encoding="utf-8") as f:
        return json.load(f)


def erreur(message):
    erreurs.append(message)


def encodable_winansi(texte):
    """Caractères refusés par la feuille PDF (police standard Helvetica, encodage WinAnsi)."""
    mauvais = set()
    for c in texte:
        if c in "\n\t":
            continue
        try:
            c.encode("cp1252")
        except UnicodeEncodeError:
            mauvais.add("%s (U+%04X %s)" % (c, ord(c), unicodedata.name(c, "?")))
    return mauvais


def controler_capacites(source, voie, attendu=5):
    caps = voie.get("capacites", [])
    if len(caps) != attendu:
        erreur("%s : %d capacités au lieu de %d" % (source, len(caps), attendu))
        return
    rangs = [c["rang"] for c in caps]
    if rangs != list(range(1, attendu + 1)):
        erreur("%s : rangs %s" % (source, rangs))
    titres = set()
    for c in caps:
        ou = "%s rang %s" % (source, c["rang"])
        if not c.get("titre"):
            erreur("%s : titre vide" % ou)
        if c["titre"] in titres:
            erreur("%s : titre en double (%s)" % (ou, c["titre"]))
        titres.add(c["titre"])
        texte = c.get("texte") or ""
        if len(texte) < 40:
            erreur("%s : texte trop court (%d caractères) — %r" % (ou, len(texte), texte[:60]))
        for tag in c.get("tags", []):
            if tag not in TAGS:
                erreur("%s : tag inconnu %r" % (ou, tag))
        for champ, valeur in (("titre", c["titre"]), ("texte", texte)):
            mauvais = encodable_winansi(valeur)
            if mauvais:
                erreur("%s : caractères non encodables dans %s : %s" % (ou, champ, ", ".join(mauvais)))


def main():
    # ---------------------------------------------------------------- profils
    tous_sorts_rang1 = []
    nb_caps = 0
    for slug in PROFILS:
        profil = lire(os.path.join("profils", slug + ".json"))
        if profil["slug"] != slug:
            erreur("%s : slug incohérent (%s)" % (slug, profil["slug"]))
        if len(profil.get("voies", [])) != 5:
            erreur("%s : %d voies au lieu de 5" % (slug, len(profil.get("voies", []))))
        for champ in ("description", "pvText", "armesArmures", "equipementTexte"):
            if not profil.get(champ):
                erreur("%s : champ %s vide" % (slug, champ))
        slugs_voies = set()
        for voie in profil.get("voies", []):
            if voie["slug"] in slugs_voies:
                erreur("%s : voie en double %s" % (slug, voie["slug"]))
            slugs_voies.add(voie["slug"])
            controler_capacites("%s/%s" % (slug, voie["slug"]), voie)
            nb_caps += len(voie.get("capacites", []))
            for c in voie.get("capacites", []):
                if c["rang"] == 1 and c.get("sort"):
                    tous_sorts_rang1.append(c["titre"])

    # ---------------------------------------------------------------- peuples
    for slug in PEUPLES:
        peuple = lire(os.path.join("peuples", slug + ".json"))
        if not peuple.get("description"):
            erreur("%s : description vide" % slug)
        if peuple.get("voie"):
            controler_capacites("%s/%s" % (slug, peuple["voie"]["slug"]), peuple["voie"])
            nb_caps += 5
            if peuple["voie"]["capacites"][0].get("sort"):
                tous_sorts_rang1.append(peuple["voie"]["capacites"][0]["titre"])
        elif not peuple.get("voieAuChoix"):
            erreur("%s : ni voie de peuple ni voie au choix" % slug)
        noms = peuple.get("noms") or {}
        for genre in ("masculin", "feminin"):
            if len(noms.get(genre) or []) < 3 and slug != "demi-elfe":
                erreur("%s : moins de 3 noms typiques (%s)" % (slug, genre))
        # le DRS ne donne pas de liste pour le demi-elfe : « un prénom elfique et un nom de
        # famille humain ». L'application emprunte donc les prénoms elfiques (voir data.js).
        if slug == "demi-elfe" and not (noms.get("intro") or ""):
            erreur("demi-elfe : explication des noms absente")
        if not peuple.get("modificateursTexte"):
            erreur("%s : modificateurs absents" % slug)

    # ---------------------------------------------------------------- voie du mage
    mage = lire("voie-du-mage.json")
    controler_capacites("voie-du-mage", mage)
    nb_caps += len(mage.get("capacites", []))

    attendu_caps = 14 * 25 + 7 * 5 + 5   # le demi-elfe emprunte la voie d'un autre peuple
    if nb_caps != attendu_caps:
        erreur("%d capacités au total, %d attendues" % (nb_caps, attendu_caps))

    # ---------------------------------------------------------------- sorts de rang 1
    manquants = [t for t in SORTS_ATTENDUS if t not in tous_sorts_rang1]
    if manquants:
        erreur("sorts de rang 1 non repérés : %s" % manquants)
    if len(tous_sorts_rang1) < 20:
        erreur("seulement %d sorts de rang 1 repérés" % len(tous_sorts_rang1))

    # ---------------------------------------------------------------- résumés et familles
    resumes = lire("resumes.json")
    if len(resumes["profils"]) != 14:
        erreur("résumés de profils : %d" % len(resumes["profils"]))
    if len(resumes["peuples"]) != 8:
        erreur("résumés de peuples : %d" % len(resumes["peuples"]))
    for slug, fiche in resumes["profils"].items():
        cles = fiche.get("caracsCles") or []
        if len(cles) != 3:
            erreur("%s : %d caractéristiques clés" % (slug, len(cles)))
        for c in cles:
            for code in (c if isinstance(c, list) else [c]):
                if code not in CARACS:
                    erreur("%s : caractéristique clé inconnue %r" % (slug, code))
        if fiche.get("caracMagie") and fiche["caracMagie"] not in CARACS:
            erreur("%s : caractéristique de magie inconnue" % slug)

    familles = lire("familles.json")
    for cle in ("aventuriers", "combattants", "mages", "mystiques"):
        f = familles.get(cle) or {}
        for champ in ("pv", "dr", "description", "resume"):
            if not f.get(champ):
                erreur("famille %s : champ %s manquant" % (cle, champ))

    # ---------------------------------------------------------------- tables
    tables = lire("tables.json")
    for cle, n in (("ideaux", 20), ("travers", 20), ("secrets1", 20), ("secrets2", 20),
                   ("bizarreries", 10)):
        if len(tables.get(cle) or []) != n:
            erreur("tables.%s : %d entrées au lieu de %d" % (cle, len(tables.get(cle) or []), n))
    if len(tables.get("langues") or []) != 10:
        erreur("tables.langues : %d entrées" % len(tables.get("langues") or []))
    for slug in PEUPLES:
        if slug not in tables["ages"]:
            erreur("âge manquant pour %s" % slug)
        if slug not in tables["tailles"]:
            erreur("taille/poids manquants pour %s" % slug)
        else:
            t = tables["tailles"][slug]
            if t["tailleCm"][0] >= t["tailleCm"][1] or t["poidsKg"][0] >= t["poidsKg"][1]:
                erreur("bornes incohérentes pour %s : %s" % (slug, t))

    # ---------------------------------------------------------------- équipement et effets
    armes = {a["slug"]: a for a in lire("armes.json")}
    armures = {a["slug"]: a for a in lire("armures.json")}
    if len(armes) != 36:
        avertissements.append("%d armes (22 de contact + 14 à distance attendues)" % len(armes))
    if len(armures) != 9:
        avertissements.append("%d armures" % len(armures))

    complements = lire("complements.json")
    for slug in PROFILS:
        fiche = complements["equipement"].get(slug)
        if not fiche:
            erreur("équipement manquant pour %s" % slug)
            continue
        if fiche.get("armureMax") and fiche["armureMax"] not in armures:
            erreur("%s : armureMax inconnue %r" % (slug, fiche["armureMax"]))
        if not fiche.get("equipement"):
            erreur("%s : liste d'équipement vide" % slug)

        def verifier(objets, chemin):
            for objet in objets:
                if "choix" in objet:
                    for i, option in enumerate(objet["choix"]):
                        verifier(option, "%s/choix%d" % (chemin, i))
                    continue
                if "libre" in objet:
                    continue
                for ref in [objet.get("ref")] + list(objet.get("liste", [])):
                    if ref not in armes and ref not in armures:
                        erreur("%s : référence inconnue %r (%s)" % (slug, ref, chemin))

        verifier(fiche["equipement"], "equipement")

    for slug in PEUPLES:
        fiche = complements["peuples"].get(slug)
        if not fiche:
            erreur("complément manquant pour le peuple %s" % slug)
            continue
        if not fiche.get("modificateurs"):
            erreur("%s : modificateurs structurés absents" % slug)
        for mod in fiche["modificateurs"]:
            if "regle" in mod:
                continue
            for code in mod.get("choix", []):
                if code not in CARACS:
                    erreur("%s : modificateur sur une caractéristique inconnue %r" % (slug, code))
        if not fiche.get("langues"):
            erreur("%s : langues absentes" % slug)

    effets = lire("effets.json")
    for cle, entree in effets.items():
        morceaux = cle.split("/")
        if len(morceaux) != 3 or morceaux[2] not in ("1", "2"):
            erreur("clé d'effet mal formée : %s" % cle)
            continue
        for effet in entree.get("effets", []) + entree.get("optionnels", []):
            if effet.get("cible") not in CIBLES:
                erreur("%s : cible inconnue %r" % (cle, effet.get("cible")))
            if effet.get("carac") and effet["carac"] not in CARACS:
                erreur("%s : caractéristique inconnue %r" % (cle, effet["carac"]))
            for ref in effet.get("armes", []):
                if ref not in armes:
                    erreur("%s : arme inconnue %r" % (cle, ref))

    # ---------------------------------------------------------------- textes de l'app
    creation = lire("creation.json")
    for cle in ("role", "pv", "dr", "pc", "pm", "init", "equipement", "def", "attaques", "dm",
                "questionsDescription", "methodeRapide"):
        if not creation["livre"].get(cle):
            erreur("creation.livre.%s absent" % cle)
    if len(creation["livre"]["etapes"]) != 15:
        erreur("les 15 étapes de la création : %d trouvées" % len(creation["livre"]["etapes"]))
    if len(creation["echelle"]) != 9:
        erreur("échelle des valeurs : %d lignes" % len(creation["echelle"]))
    for cle in ("prologue", "guideHistoire", "noteObjetNegocie", "avertissementModeLibre",
                "notePrompt", "bizarreries"):
        if not creation["maison"].get(cle):
            erreur("texte maison manquant : %s" % cle)

    aide = lire("aide.json")
    for code in CARACS:
        fiche = aide["caracs"].get(code)
        if not fiche or not fiche.get("actionsType"):
            erreur("aide : « Actions type » manquantes pour %s" % code)
    for code in ("L", "A", "M", "G", "sort", "d4°"):
        if not aide["termes"].get(code):
            erreur("aide : terme %s manquant" % code)

    # ---------------------------------------------------------------- tout texte en WinAnsi
    for nom in ("creation.json", "aide.json", "tables.json", "armes.json", "armures.json",
                "familles.json", "resumes.json", "complements.json", "effets.json"):
        brut = open(os.path.join(DATA, nom), encoding="utf-8").read()
        mauvais = encodable_winansi(brut)
        if mauvais:
            erreur("%s : caractères non encodables : %s" % (nom, ", ".join(sorted(mauvais))))

    # ---------------------------------------------------------------- bilan
    for a in avertissements:
        print("  avertissement :", a)
    if erreurs:
        print("%d ERREUR(S) :" % len(erreurs))
        for e in erreurs:
            print(" -", e)
        sys.exit(1)
    print("Données conformes : %d capacités, %d armes, %d armures, %d sorts de rang 1."
          % (nb_caps, len(armes), len(armures), len(tous_sorts_rang1)))


if __name__ == "__main__":
    main()
