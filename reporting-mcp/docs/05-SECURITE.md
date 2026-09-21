# 5. Sécurité

## Transport

- HTTPS obligatoire de bout en bout (Claude ↔ service de reporting ↔ API Perfex). Le
  service refuse de démarrer si `PERFEX_BASE_URL` n'est pas en `https://` (sauf
  `NODE_ENV=test` avec un hôte de fixtures local explicite).
- TLS vérifié par défaut (pas de `rejectUnauthorized: false`, pas de désactivation de la
  vérification de certificat).

## Authentification Claude → service de reporting

- OAuth 2.1 avec PKCE, conforme au modèle des connecteurs distants personnalisés de
  Claude (autorisation → jeton d'accès court, jeton de rafraîchissement, scope
  `reporting:read` unique). **À valider contre la documentation Anthropic à jour au
  moment du déploiement réel**, car le détail exact du flux supporté par les connecteurs
  personnalisés peut évoluer — je ne fige pas cette hypothèse comme un fait, voir
  `auth.js`.
- Jetons d'accès courts (recommandé ≤ 1 h), jetons de rafraîchissement révocables
  individuellement.
- Un jeton = un scope = un périmètre société, résolu et figé côté serveur d'autorisation,
  jamais négocié par l'appelant (voir doc 02).
- Endpoint de révocation exposé et documenté dans la procédure de retour arrière (doc 06)
  pour couper l'accès immédiatement en cas de doute.

## Authentification service de reporting → API Perfex

- Secret stocké uniquement en variable d'environnement / gestionnaire de secrets
  (`.env` non commité — voir `.gitignore` du dossier `server/`), jamais en dur dans le
  code, jamais dans les logs.
- Le compte technique utilisé côté Perfex doit être **dédié** (pas de réutilisation d'un
  compte administrateur existant), nommé explicitement (ex. `svc-reporting-readonly`) et
  révocable indépendamment de tout compte humain.

## Contrôle de périmètre par requête

Chaque appel d'outil MCP est validé, dans cet ordre, avant tout appel sortant :

1. jeton valide, non expiré, non révoqué ;
2. scope `reporting:read` présent ;
3. périmètre société résolu depuis le jeton (jamais depuis les paramètres d'entrée) ;
4. schéma d'entrée strict (types, enums de module autorisés, bornes de dates et de
   pagination — rejet immédiat si hors bornes, pas de troncature silencieuse qui
   fausserait un total) ;
5. seulement alors, appel à une route `capabilityMap.js` marquée `verified: true`.

## Requêtes paramétrées / pas de SQL libre

- Aucun outil MCP n'accepte de fragment SQL, de nom de table, ni de filtre "brut" en
  entrée.
- Si le repli option B (accès base direct, doc 01) est un jour activé, toutes les
  requêtes sont pré-écrites avec paramètres liés (`?`/paramètres nommés), jamais construites
  par concaténation de chaînes.

## Minimisation des champs

- Chaque outil ne retourne que les champs listés dans le dictionnaire d'indicateurs
  (doc 03). Pas de "dump" d'objet source complet.
- Les identifiants clients sont des références internes (`client_ref` = id Perfex), pas
  le nom/email/téléphone, sauf si un indicateur en a explicitement besoin et que c'est
  documenté comme tel.
- Les données RH nominatives détaillées sont hors périmètre par défaut (voir doc 02).

## Limites de charge

Voir `docs/04-LIMITES-DE-CHARGE.md` — rate limiting par jeton/IP, plafond de pagination,
timeouts, retries bornés.

## Révocation

- Révocation immédiate possible à trois niveaux indépendants : (a) révoquer le jeton
  OAuth côté serveur d'autorisation, (b) désactiver/supprimer le compte API technique
  côté Perfex, (c) arrêter le service de reporting. Chacun suffit seul à couper l'accès.
- Procédure détaillée dans `docs/06-DEPLOIEMENT-ROLLBACK.md`.

## Journalisation

- Le logger (`logger.js`) journalise : horodatage, outil appelé, identifiant de jeton
  tronqué/haché (jamais le jeton en clair), code de statut, durée, nombre
  d'enregistrements traités (compte, pas contenu).
- Le logger **n'écrit jamais** : le corps des requêtes/réponses, les montants par client
  nommé, un identifiant personnel (nom, email, téléphone), ni le secret d'API Perfex.
- Rétention des logs technique : proposée à 30 jours glissants (à confirmer avec la
  politique de conservation du client), rotation automatique, pas d'export externe.

## Base de données

- La base Perfex de production reste privée, jamais exposée directement à Claude.
- Si le repli option B est activé, connexion uniquement depuis l'hôte du service de
  reporting (pas d'ouverture réseau supplémentaire vers l'extérieur), idéalement via une
  réplique en lecture.

## Ce qui n'est pas et ne sera pas exposé

- Aucune route de création, modification, suppression.
- Aucune relance client automatisée.
- Aucune écriture comptable, aucun paiement, aucun export FEC en écriture.
- Aucune exécution SQL libre.
- Aucun accès direct aux tables d'authentification/session de Perfex.
