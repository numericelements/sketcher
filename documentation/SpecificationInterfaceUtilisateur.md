# Sketcher - *Spécification de l'interface utilisateur*

## Introduction

### Objetif

 L'objectif de ce document est de fournir la spécification détaillée de l'interface utilisateur. Cette spécification définit le comportement extérieur observable du programme.  Elle porte ainsi sur les éléments qui permettent au dessinateur d'interagir avec l'application.

La première version de cette *spécification* est destinée à transmettre l'idée générale de la conception de l'interface utilisateur et du concept opérationnel du logiciel. De nombreux détails ont été omis à la fois pour des raisons de clarté ou parce qu'ils n'ont pas encore été abordés. Ce document sera mis à jour avec des détails supplémentaires au fur et à mesure de l'avancement de nos activités d'analyse et de conception. 

### Vue d'ensemble

L'application **Sketcher** vous permet de tracer et d'éditer des courbes. L'interface se veut à première vue minimaliste. Disponible sur le web, vous pouvez interagir avec l'application avec une souris, un stylet ou un écran tactile.

### Buts premiers

L'application se veut non seulement simple d'utilisation mais aussi transparente que possible au niveau de ses modèles mathématiques. Un premier but est de mettre en évidence l'élégance de la théorie des b-splines. 

### Utilisation de l'application - Les grandes lignes

### Projets

L'application **Sketcher** vous permet de modifier une courbe de plusieurs manières tout en contrôlant les propriétés géométriques de cette courbe. Elle permet également de déformer plusieurs courbes sélectionnées à la fois à l'aide de transformations générales du plan qui permettent de conserver des propriétés géométriques spécifiques. La combinaison de ces deux types de déformations, soit local et global, de manière fluide constitue le principal atout du logiciel. 

## Présentation du noyau mathématique

Le noyau mathématique de l'application repose sur les travaux de plusieurs mathématiciens célèbres. Pensons par exemple à Felix Klein (1849-1925) et Sophius Lie (1842-1899) pour les groupes de transformations du plan ou Sergei Bernstein (1880-1968) pour les polynômes de Bernstein et Isaac Jacob Schoenberg (1903-1990) pour les splines. Ces travaux sont à l'origine d'une littérature riche et actuelle qui permet de proposer cet outil de dessin.


Le paquetage « analytic-b-spline » que nous souhaitons publier sur npm  vise le traitement analytique des b-splines. « Analytique » vient de la même racine qu' « analyse », qui, en mathématiques, signifie vaguement l'étude des propriétés des objets.

Dans notre cas, résoudre analytiquement une équation revient à trouver une solution simplement en exploitant des règles connues : addition et soustraction, associativité, commutativité, etc.

Cela diffère d'une solution « numérique », dans laquelle une séquence de nombres est utilisée et comparée pour voir si l'égalité est respectée. 



### Interaction avec les éléments géométriques

À l'ouverture de l'application, un canevas blanc s'affiche. Les options sont alors très limitées. Une icône minimaliste permet l'accès au menu principal de l'application. La barre d'outil contient quand à elle un seul crayon. 

Il est immédiatement possible d'esquisser une courbe libre à main levée sans avoir a appuyer sur aucun bouton. Appuyer sur le crayon permet de faire apparaître les options : de dessin à main levée, de lignes droites et d'arc de cercle.

Cliquer sur le canevas sans se déplacer désélectionne l'icône de dessin. Aucune icône de la barre d'outil n'est alors sélectionnée.  

Appuyer sur une coube vous permet de la déplacer. Le polygône de contrôle s'affiche lorsque la courbe est relâchée. 

Lorsqu'aucun outil de création est sélectionné, il est possible de sélectionner des courbes. Après la sélection d'une courbe l'icône "b" pour fonction de base, l'icône  flèche vers le haut (shift) et la poubelle s'affichent. Il devient alors possible de passer en mode sélection multiple en appuyant sur la touche shift ou sur l'icône flèche vers le haut. En sélection multiple, l'icône sélection à l'aide d'un cadre s'affiche également.

Lorsque l'icône "b" est sélectionné alors une fenêtre d'édition des fonctions de bases s'affiche.  Un bouton défilant permet d'agrandir et ainsi mieux voir une section particulière des fonctions de base sur son domaine paramétrique. Toucher et déplacer la zone d'affichage des fonctions de bases permet de se déplacer horizontalement. La position des noeuds est affichée sur une barre en dessous. Il est possible de les déplacer. La sélection d'un noeud ou le touché de la ligne paramétrique permet d'afficher d'abord une position sur la ligne paramètrique ainsi que sur la courbe. Il devient alors possible d'insérer un noeud à cette position ou d'effacer un noeud sélectionné. La multiplicité des noeuds est montré à l'aide de traits verticaux multiple sous les fonctions de base.

 

### Les objectifs de l'édition

Pour obtenir un contrôle plus fin de votre courbe il vous est possible d'insérer des noeuds et ainsi d'augmenter le nombre de points de contrôle qui permettent de définir la forme de votre courbe. Vous avez alors entre les mains une courbe qui devient plus souple. Le contrôle du nombre de points d'extremum de courbure permet d'obtenir une courbe à la fois malléable et sur laquelle vous imposerez la structure que vous avez initialement définie et que vous souhaitez conserver. Vous pourrez ainsi explorer, par exemples, les spirales et des formes ovales dans leur plus grande généralité.

### Analyse de la structure

L'application peut se trouver dans différents états. Les états principaux sont les suivants : Dessin d'une courbe à main levée (freeDraw), dessin d'une ligne droite (line), dessin d'un arc de cercle (circleArc), sélection simple et sélection multiple de courbes.

À ces états principaux s'ajoute les actions courantes principales suivantes : aucune action en cours (none) qui permet d'attendre la prochaine action, l'action de dessiner une courbe (drawing), l'action de déplacemer une courbe (moving selected elements) et l'action de déplacer un point de contrôle (moving a control point).

Les éléments de dessins sont stocké dans une liste avec un numéro d'identifiaction unique. Les éléments de dessins sont les différents type de courbes b-splines et les différents type de contraintes géométriques qui peuvent être appliquées sur ces courbes b-splines.

Chaque courbe contient la liste des contraintes qui s'appliquent à elle-même. Si une courbe est effacée alors toutes les contraintes de la liste doivent également être effacées.

## Menus

### Menus de l'application

## Barres d'outils

### Barre d'outil standard

### Barre d'outil pour le cercle

L'icône d'arc de cercle permet de tracer soit un arc de cercle ou un cercle complet. Lorsqu'un arc de cercle est sélectionné alors la barre d'outil offre l'option de fermer le cercle. Lorsqu'un cercle complet est sélectionné alors la barre d'outil offre l'option d'ouvrir le cercle. 

L'arc de cercle est manipulé à l'aide de trois points. Le cercle complet est manipulé à l'aide d'un seul point situé sur le cercle. La position de ce point permet d'augmenter le rayon du cercle et donne également la position où ouvrir le cercle afin d'obtenir un arc.

### Barre d'outil pour une courbe B-spline

Il est possible de fermer la courbe en rapprochant les extrémités. Alors des noeuds sont ajoutés afin de supperposer $d$ noeuds où $d$ est le degré de la courbe. Il faut supprimer des noeuds multiples à la jonction pour augmenter la continuité si nécessaire.

Il est possible d'ouvrir la courbe en insérant suffisament de noeud et ensuite en choisissant des ciseaux qui s'ajoute au menu.

Par défaut le contrôle sur les extremums de courbure est actif. Une icône avec un point rouge permet de désactiver le contrôle. L'icône est une ellipse avec 4 points rouges sur ses extremums de courbure. Une icône avec un point bleu sur l'inflexion d'une cubique permet d'activer également le contrôle sur les inflexions.

Lorsque deux points d'extremum de courbure viennent en contact un X rouge vient s'ajouter à la superposition. Appuyer sur le X permet de supprimer le point d'extremum de courbure qui est en fait déjà absent mais qui peut réapparaître à tout moment puisque la contrainte le permet encore.


### B-Spline rationnelle complex

Les coordonnées des points de contrôle seulement sont conservées. Les poids sont calculés à partir des points de Farin. 

## Divers éléments d'interface

### Spécification de la sélection d'éléments

## Glossaire des termes

## Considérations particulières



