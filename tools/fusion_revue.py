#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Fusionne les fichiers de revue (tools/revue/*.json) en deux fichiers chargés par l'app :

  data/effets.json      effets permanents des capacités acquises au niveau 1
  data/complements.json équipement structuré par profil, modificateurs et langues des
                        peuples, sous-choix de rang 1

Les revues ont été faites capacité par capacité à partir des textes du DRS (chaque entrée
porte la phrase qui la justifie). Ce script ne réinterprète rien, sauf les corrections
listées dans CORRECTIONS ci-dessous, qui sont argumentées une par une.
"""
import json, os, sys

RACINE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REVUE = os.path.join(RACINE, "tools", "revue")
DATA = os.path.join(RACINE, "data")

FICHIERS = ["aventuriers.json", "combattants.json", "mages.json", "mystiques.json", "peuples.json"]

# Cibles acceptées par le moteur (js/rules.js).
CIBLES = {"PV", "DEF", "INIT", "PC", "PM", "DR", "ATT_CONTACT", "ATT_DISTANCE", "ATT_MAGIQUE",
          "DM_CONTACT", "DM_DISTANCE"}
CONDITIONS = {"sansArmure", "armureLegere", "avecBouclier"}

# Corrections apportées après relecture des textes source (voir tools/verification.md).
CORRECTIONS = {
    # « Le rôdeur ajoute sa PER aux DM qu'il inflige à l'arc » : le bonus ne vaut que pour
    # les arcs, on le rattache aux armes concernées plutôt qu'à une condition inventée.
    "rodeur/voie-de-l-archer/1": {
        "effets": [
            {"cible": "DM_DISTANCE", "carac": "PER", "armes": ["arc-court", "arc-long"]},
            {"cible": "INIT", "valeur": 1},
        ],
    },
    # « il obtient +1 aux DM des attaques à distance avec les dagues et couteaux »
    "voleur/voie-du-roublard/1": {
        "effets": [
            {"cible": "DM_DISTANCE", "valeur": 1, "armes": ["dague-lancee", "couteaux-de-lancer"]},
        ],
    },
    # « il peut ajouter son INT à ses PV à la place de sa CON s'il le souhaite » : ce n'est
    # pas un bonus mais un remplacement, et il est facultatif.
    "forgesort/voie-du-golem/1": {
        "effets": [],
        "optionnels": [{"cible": "PV", "caracRemplace": {"de": "CON", "par": "INT"},
                        "libelle": "Utiliser l’INT à la place de la CON pour les PV"}],
    },
    # « Il gagne +2 en Initiative et en DEF lorsque son familier est en vue » : bonus lié à
    # une situation de jeu, on ne l'inscrit pas sur la feuille, on le rappelle.
    "magicien/voie-de-la-magie-universelle/2": {
        "effets": [],
        "note": "+2 en Initiative et en DEF lorsque le familier est en vue (non compté ici).",
    },
}

# Rappels affichés pour les capacités dont la règle ne se met pas en chiffres sur la feuille.
NOTES = {
    "voleur/voie-du-spadassin/1": "Tu peux remplacer ta FOR par ton AGI pour tes tests "
                                  "d’attaque au contact avec une arme légère à une main.",
    "barde/voie-de-l-escrime/1": "Tu peux remplacer ta FOR par ton AGI pour tes tests "
                                 "d’attaque au contact avec une arme légère à une main.",
    "moine/voie-du-poing/1": "Tes attaques à mains nues infligent 1d6 + FOR DM létaux au "
                             "lieu de 1d3 DM temporaires.",
}


def charger(nom):
    chemin = os.path.join(REVUE, nom)
    if not os.path.exists(chemin):
        print("manquant :", chemin)
        sys.exit(1)
    return json.load(open(chemin, encoding="utf-8"))


def verifier_effet(cle, effet, armes, erreurs):
    if effet.get("cible") not in CIBLES:
        erreurs.append("%s : cible inconnue %r" % (cle, effet.get("cible")))
    if "condition" in effet and effet["condition"] not in CONDITIONS:
        erreurs.append("%s : condition non gérée %r" % (cle, effet["condition"]))
    for slug in effet.get("armes", []):
        if slug not in armes:
            erreurs.append("%s : arme inconnue %r" % (cle, slug))


def main():
    revues = {nom: charger(nom) for nom in FICHIERS}
    armes = {a["slug"] for a in json.load(open(os.path.join(DATA, "armes.json"), encoding="utf-8"))}
    armures = {a["slug"] for a in json.load(open(os.path.join(DATA, "armures.json"), encoding="utf-8"))}

    effets, equipement, peuples, sous_choix = {}, {}, {}, {}
    erreurs = []

    for nom, revue in revues.items():
        for cle, entree in (revue.get("effets") or {}).items():
            if cle in effets:
                erreurs.append("clé en double : %s" % cle)
            effets[cle] = {"titre": entree.get("titre"), "effets": entree.get("effets", []),
                           "citation": entree.get("citation")}
        for slug, fiche in (revue.get("equipement") or {}).items():
            equipement[slug] = fiche
            if fiche.get("armureMax") and fiche["armureMax"] not in armures:
                erreurs.append("%s : armureMax inconnue %r" % (slug, fiche["armureMax"]))
        for slug, fiche in (revue.get("peuples") or {}).items():
            peuples[slug] = fiche
        for cle, fiche in (revue.get("sousChoix") or {}).items():
            sous_choix[cle] = fiche

    # corrections argumentées
    for cle, correction in CORRECTIONS.items():
        if cle not in effets:
            erreurs.append("correction sans effet d'origine : %s" % cle)
            continue
        effets[cle].update(correction)
    for cle, note in NOTES.items():
        effets.setdefault(cle, {"titre": None, "effets": []})
        effets[cle]["note"] = note

    # contrôles
    for cle, entree in effets.items():
        for effet in entree.get("effets", []):
            verifier_effet(cle, effet, armes, erreurs)
        for effet in entree.get("optionnels", []):
            verifier_effet(cle, effet, armes, erreurs)
    # toutes les refs d'équipement existent
    def verifier_objets(slug, liste):
        for objet in liste:
            if "choix" in objet:
                for option in objet["choix"]:
                    verifier_objets(slug, option)
                continue
            if "libre" in objet:
                continue
            ref = objet.get("ref")
            if ref not in armes and ref not in armures:
                erreurs.append("%s : référence d'équipement inconnue %r" % (slug, ref))
            for autre in objet.get("liste", []):
                if autre not in armes and autre not in armures:
                    erreurs.append("%s : référence inconnue dans liste %r" % (slug, autre))

    for slug, fiche in equipement.items():
        verifier_objets(slug, fiche.get("equipement", []))

    if erreurs:
        print("ERREURS :")
        for e in erreurs:
            print(" -", e)
        sys.exit(1)

    with open(os.path.join(DATA, "effets.json"), "w", encoding="utf-8") as f:
        json.dump(effets, f, ensure_ascii=False, indent=1)
        f.write("\n")
    with open(os.path.join(DATA, "complements.json"), "w", encoding="utf-8") as f:
        json.dump({"equipement": equipement, "peuples": peuples, "sousChoix": sous_choix},
                  f, ensure_ascii=False, indent=1)
        f.write("\n")
    print("data/effets.json : %d capacités (%d avec effet)" %
          (len(effets), len([e for e in effets.values() if e.get("effets")])))
    print("data/complements.json : %d profils équipés, %d peuples, %d sous-choix" %
          (len(equipement), len(peuples), len(sous_choix)))


if __name__ == "__main__":
    main()
