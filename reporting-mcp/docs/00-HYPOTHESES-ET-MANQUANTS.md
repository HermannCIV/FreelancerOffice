# 0. Hypothèses, constats et informations manquantes

## Constat de départ (à lire avant tout le reste)

Le dépôt `HermannCIV/FreelancerOffice` mis à disposition dans cette session **ne contient
que les fichiers de langue (`chinese/`, `french/`, …) d'un fork de Perfex CRM**. Il n'y a
ni contrôleur, ni modèle, ni migration, ni configuration d'API dans ce dépôt. Je n'ai donc
**aucun accès** :

- au code réellement déployé sur `GESTION.BTOB-TELECOM.COM` ;
- au schéma de base de données réel (tables, clés, index) ;
- à la version/config réelle du module API (`perfexapi.com` est un add-on commercial
  tiers pour Perfex CRM ; je connais sa doctrine générale — un jeu de routes REST
  organisées par module CRM — mais pas la liste exacte des routes actives, leur
  pagination, leurs champs, ni la version installée sur ce site) ;
- au panneau d'administration Perfex (Setup > API, gestion des rôles/permissions) ;
- au compte Claude `ani.herman@gmail.com` (plan, présence ou non d'une fonctionnalité de
  tâches planifiées compatible avec un connecteur MCP personnalisé).

**Conséquence méthodologique** : tout ce qui suit est construit pour être *branché* sur
la configuration réelle une fois celle-ci confirmée, jamais pour *deviner* cette
configuration. Le connecteur MCP ne code en dur aucune route API ni aucune table ; toutes
les routes sont déclarées dans `server/src/capabilityMap.js` avec un statut
`verified: false` par défaut, et le serveur refuse de démarrer en mode production tant
qu'un opérateur n'a pas confirmé (`verified: true`) chaque route qu'il active. C'est un
garde-fou anti-invention, pas une commodité.

## Informations manquantes qui conditionnent l'activation réelle

| # | Information manquante | Pourquoi elle bloque | Qui peut la fournir |
|---|---|---|---|
| 1 | Le module `perfexapi.com` (ou équivalent) est-il installé et actif sur cette instance ? Quelle version ? | Détermine si on réutilise l'API existante (étape 2, option A) ou s'il faut un accès lecture direct à la base (option B) | Admin Perfex BtoB Telecom |
| 2 | Liste exacte des routes REST disponibles et leur schéma de réponse (pagination, champs HT/TTC, statuts) | Sans ça, `capabilityMap.js` reste à l'état `verified: false` | Documentation embarquée du module + un admin ayant une clé API de test |
| 3 | Méthode d'authentification réellement supportée par le module API (clé API statique en en-tête, Bearer token, OAuth2) | Détermine si on peut mettre un vrai OAuth entre Claude et NOUS, mais aussi comment NOUS nous authentifions vers Perfex | Documentation du module / admin |
| 4 | La société gère-t-elle plusieurs entités/dépôts (multi-société) dans Perfex, ou une seule instance = une seule société ? | Conditionne l'isolation "par entreprise" demandée à l'étape 2/4 | Admin métier |
| 5 | Les modules `Inventaire` et `Gestion RH` cités dans la demande sont-ils des modules natifs Perfex, des add-ons tiers, ou un raccourci pour "Produits/Items" et "Staff" natifs ? | Perfex CRM natif n'a pas de module RH ni d'inventaire au sens ERP ; ce sont probablement soit des add-ons soit des modules maison | Admin/porteur du projet |
| 6 | Existe-t-il déjà un compte API en lecture seule, ou faut-il en créer un ? Quel rôle Perfex (staff role) lui attribuer ? | Conditionne l'étape "compte de base limité aux lectures" | Admin Perfex |
| 7 | Le compte Claude `ani.herman@gmail.com` dispose-t-il d'une fonctionnalité "tâches planifiées" (scheduled tasks) capable d'appeler un connecteur MCP personnalisé authentifié à 07 h 00 Africa/Abidjan ? | Conditionne le choix entre "planification native Claude" et "repli n8n + API OpenAI" (étape 8) | À vérifier directement dans l'interface Claude par l'utilisateur, aucune API ne me permet de l'interroger depuis ce dépôt |
| 8 | Hébergement cible du service de reporting isolé (le connecteur MCP ne peut pas tourner "dans" Claude ; il lui faut un hôte HTTPS joignable par Claude) | Conditionne le déploiement réel (étape 6) | Décision infra du client |
| 9 | Destinataire(s) réellement autorisé(s) : l'énoncé contient deux graphies (`ani.hermann@gmail.com` avec deux "n" en en-tête "Destination", vs `ani.herman@gmail.com` indiqué comme compte Claude) | Un envoi de rapport à la mauvaise adresse est une fuite de données ; on ne devine pas une adresse email | Confirmation explicite du destinataire exact avant toute activation d'envoi |
| 10 | Fuseau horaire de référence pour "hier" (Africa/Abidjan = UTC+0, sans DST) — à confirmer que le serveur d'hébergement et le planificateur utilisent bien ce fuseau et pas celui du serveur | Sinon la fenêtre "J-1" peut décaler d'un jour | Confirmation infra |

Tant que ces points ne sont pas confirmés, l'état du projet reste **préparé et vérifié en
local avec des données fictives**, jamais **activé en production**.

## Périmètre couvert malgré ces manques

Sur la base de la documentation publique généraliste des modules REST Perfex CRM
(structure par ressource : clients, factures, devis, dépenses, paiements, prospects/leads,
projets, contrats, staff), j'ai construit :

- une architecture qui réutilise en priorité l'API existante (conforme à l'étape 2) ;
- un connecteur MCP en lecture seule dont chaque route est un point de configuration
  explicite à vérifier, jamais une supposition figée dans le code ;
- une logique de calcul déterministe des totaux, testée avec des données fictives
  (`server/tests/`) ;
- toute la documentation (matrice de droits, dictionnaire d'indicateurs, procédure de
  déploiement/retour arrière, prompts) prête à être appliquée dès que les points 1 à 9
  sont confirmés.
