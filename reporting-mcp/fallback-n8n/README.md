# Repli n8n + API OpenAI

À activer **uniquement si** le point 7 de `../docs/00-HYPOTHESES-ET-MANQUANTS.md` est
tranché négativement : le compte Claude `ani.herman@gmail.com` ne permet pas de
déclencher une tâche planifiée quotidienne appelant un connecteur MCP personnalisé
authentifié par OAuth.

## Principe

Un workflow n8n, déclenché par un nœud Cron à `07:00 Africa/Abidjan`, qui :

1. appelle le service de reporting (`reporting-mcp-btob`) en HTTP directement — les mêmes
   règles de lecture seule, de gating de pagination et de limites de charge s'appliquent
   (le service ne change pas ; seul l'appelant planifié change) ;
2. transmet les indicateurs bruts obtenus (jamais de texte libre non structuré) à l'API
   OpenAI avec un prompt de mise en forme (voir `../docs/07-PROMPT-ANALYSE-ET-PLANIFICATION.md`
   pour la structure exacte attendue du rapport) ;
3. envoie le résultat par email à la **seule destination confirmée explicitement**
   (voir doc 00, point 9) via le nœud SMTP/Email de n8n.

`workflow.skeleton.json` fournit la structure des nœuds (Cron → HTTP Request → OpenAI →
Email) **sans aucun secret**, à importer dans n8n puis à compléter avec les identifiants
réels stockés dans le gestionnaire de credentials de n8n (jamais dans le JSON du
workflow).

## Secrets nécessaires (à créer dans n8n, jamais dans ce dépôt)

| Secret | Usage |
|---|---|
| Jeton/clé d'accès au service de reporting MCP/HTTP | Authentifie n8n auprès de `reporting-mcp-btob`, scope lecture seule uniquement |
| Clé API OpenAI | Génération du texte de synthèse à partir des indicateurs structurés |
| Identifiants SMTP (ou credentials du fournisseur d'email choisi) | Envoi du rapport à la destination confirmée |

## Budget indicatif

- Le coût OpenAI dépend du modèle choisi et du volume de tokens (indicateurs + prompt de
  mise en forme ≈ quelques centaines à ~1500 tokens en entrée, quelques centaines en
  sortie par rapport quotidien). **Je ne fige pas de chiffre de tarification ici** : les
  prix évoluent et une valeur écrite aujourd'hui serait fausse demain — se référer à la
  page de tarification officielle d'OpenAI au moment de l'activation pour calculer le
  coût mensuel réel (≈ 30 rapports/mois × tokens par rapport × prix par token en vigueur).
- Hébergement n8n : soit une instance déjà existante chez le client (coût marginal nul),
  soit une instance dédiée à provisionner (coût d'hébergement à budgéter séparément).
- Ce repli n'a **pas** été activé ni testé en conditions réelles depuis cette session
  (aucun accès à une instance n8n ni à une clé OpenAI n'a été fourni).

## Sécurité identique au connecteur MCP

- Le nœud HTTP Request vers le service de reporting utilise HTTPS et un jeton dédié
  scope lecture seule (peut être un jeton différent de celui de Claude, révocable
  indépendamment).
- Aucune donnée personnelle superflue n'est transmise à OpenAI : seuls les indicateurs
  agrégés et bornés définis dans `../docs/03-DICTIONNAIRE-INDICATEURS.md` le sont, jamais
  un export brut de la base.
- L'email n'est envoyé qu'à la destination confirmée ; si cette confirmation manque,
  le workflow doit être laissé désactivé plutôt que d'envoyer à une adresse devinée.
