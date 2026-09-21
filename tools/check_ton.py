#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Contrôle du ton : l'application vouvoie le joueur, partout.

  python3 tools/check_ton.py          # 0 = rien à signaler, 1 = tutoiement détecté

Le script n'examine que ce que le joueur peut lire : les textes maison de
tools/extract_pdf.py et de data/creation.json, la table des bizarreries, et les chaînes
de caractères du code de l'interface. Les commentaires du code, les textes du livre et
ceux du DRS sont laissés tranquilles : ils ne sont pas de nous.
"""
import ast, json, os, re, sys

RACINE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

FICHIERS_JS = ["js/main.js", "js/rules.js", "js/ui.js", "js/dice.js"] + [
    os.path.join("js", "steps", f) for f in sorted(os.listdir(os.path.join(RACINE, "js", "steps")))
    if f.endswith(".js")
]

# Pronoms de la deuxième personne du singulier : très peu de faux positifs.
PRONOMS = re.compile(
    r"(?<![\wÀ-ÿ])(tu|toi|ton|ta|tes|tien|tiens|tienne|tiennes|t[’'](?:en|y|a|as|es))(?![\wÀ-ÿ])",
    re.IGNORECASE)

# Impératifs à la deuxième personne du singulier, seulement en tête de phrase : ailleurs,
# ces formes sont presque toujours de l'indicatif (« le nombre indique… », « leur donne… »).
IMPERATIFS = re.compile(
    r"(?:^|(?<=[.!?:;»])\s|\n)\s*"
    r"(choisis|écris|lance|relance|tire|indique|donne|envoie|colle|copie|raccourcis|reviens|"
    r"applique|place|repars|modifie|raconte|laisse|regarde|ajoute|garde|remplis|vérifie|clique|"
    r"imagine|recommence|télécharge|prends|dis)(?![\wÀ-ÿ])",
    re.IGNORECASE)

# Chaînes légitimes malgré un marqueur (noms communs, mots du livre…).
TOLERE = {
    "Ta fiche est prête",          # remplacé, gardé ici en exemple de la forme attendue
}

signalements = []


def examiner(origine, texte, ligne=None):
    if not isinstance(texte, str) or texte in TOLERE:
        return
    for motif, genre in ((PRONOMS, "pronom"), (IMPERATIFS, "impératif")):
        trouve = motif.search(texte)
        if trouve:
            ou = "%s:%s" % (origine, ligne) if ligne else origine
            signalements.append((ou, genre, trouve.group(trouve.lastindex or 0).strip(),
                                 texte.strip()[:90]))
            return


def parcourir(origine, valeur, ligne=None):
    if isinstance(valeur, str):
        examiner(origine, valeur, ligne)
    elif isinstance(valeur, dict):
        for cle, v in valeur.items():
            parcourir("%s > %s" % (origine, cle), v, ligne)
    elif isinstance(valeur, list):
        for i, v in enumerate(valeur):
            parcourir("%s[%d]" % (origine, i), v, ligne)


def chaines_python(chemin, nom_constante):
    """Le littéral d'une constante Python, lu par l'analyseur syntaxique (jamais par regex)."""
    arbre = ast.parse(open(chemin, encoding="utf-8").read())
    for noeud in arbre.body:
        if isinstance(noeud, ast.Assign) and any(
                isinstance(c, ast.Name) and c.id == nom_constante for c in noeud.targets):
            return ast.literal_eval(noeud.value)
    return None


def chaines_js(chemin):
    """Littéraux de chaîne d'un fichier JS, hors commentaires (// et /* */)."""
    source = open(chemin, encoding="utf-8").read()
    sortie = []
    i, ligne, n = 0, 1, len(source)
    while i < n:
        c = source[i]
        if c == "\n":
            ligne += 1
            i += 1
        elif source.startswith("//", i):
            j = source.find("\n", i)
            i = n if j < 0 else j
        elif source.startswith("/*", i):
            j = source.find("*/", i + 2)
            j = n if j < 0 else j + 2
            ligne += source.count("\n", i, j)
            i = j
        elif c in "'\"`":
            debut, j = i, i + 1
            while j < n and source[j] != c:
                j += 2 if source[j] == "\\" else 1
            morceau = source[debut + 1:j]
            sortie.append((ligne, morceau))
            ligne += source.count("\n", debut, j)
            i = j + 1
        else:
            i += 1
    return sortie


def main():
    # 1. textes maison, à la source
    maison = chaines_python(os.path.join(RACINE, "tools", "extract_pdf.py"), "MAISON")
    if maison is None:
        print("MAISON introuvable dans tools/extract_pdf.py")
        sys.exit(1)
    parcourir("tools/extract_pdf.py > MAISON", maison)

    # 2. textes maison, tels qu'ils ont été écrits dans les données
    creation = json.load(open(os.path.join(RACINE, "data", "creation.json"), encoding="utf-8"))
    parcourir("data/creation.json > maison", creation.get("maison", {}))
    tables = json.load(open(os.path.join(RACINE, "data", "tables.json"), encoding="utf-8"))
    parcourir("data/tables.json > bizarreries", tables.get("bizarreries", []))

    # 3. libellés de l'interface
    for relatif in FICHIERS_JS:
        chemin = os.path.join(RACINE, relatif)
        if not os.path.exists(chemin):
            continue
        for ligne, texte in chaines_js(chemin):
            examiner(relatif, texte, ligne)

    if signalements:
        print("%d tutoiement(s) à corriger :" % len(signalements))
        for ou, genre, mot, extrait in signalements:
            print(" - %s : %s « %s » dans « %s »" % (ou, genre, mot, extrait))
        sys.exit(1)
    print("Ton conforme : aucun tutoiement dans les textes destinés au joueur.")


if __name__ == "__main__":
    main()
