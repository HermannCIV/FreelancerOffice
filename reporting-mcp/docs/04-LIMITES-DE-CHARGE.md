# 4. Limites de charge

Objectif : ne jamais peser sensiblement sur l'application de production, et ne jamais
autoriser un usage qui ressemble à un scan ou à un test de charge.

| Limite | Valeur par défaut | Configurable via | Justification |
|---|---|---|---|
| Taille de page max par requête sortante vers l'API Perfex | 100 enregistrements | `PAGE_SIZE_MAX` | Évite les réponses volumineuses et le temps de blocage côté API source |
| Pages max par requête d'outil MCP | 20 (= 2000 enregistrements max par appel) | `MAX_PAGES_PER_QUERY` | Au-delà, l'outil renvoie `status: incomplete` plutôt que de continuer à paginer (voir doc 03) |
| Plage de dates max par appel (`get_daily_kpis`, `list_operations`) | 31 jours | `MAX_RANGE_DAYS` | Empêche un appel "tout l'historique" par erreur ou abus de prompt |
| Requêtes sortantes simultanées vers l'API Perfex | 2 | `MAX_CONCURRENCY` | Le service ne doit jamais générer de pointe de charge sur l'API de production |
| Délai minimal entre deux requêtes sortantes | 150 ms | `MIN_REQUEST_INTERVAL_MS` | Lissage volontaire, pas de rafale |
| Appels d'outils MCP par jeton par minute | 30 | `RATE_LIMIT_PER_TOKEN_PER_MIN` | Protège contre un prompt qui boucle |
| Appels d'outils MCP par IP par minute | 60 | `RATE_LIMIT_PER_IP_PER_MIN` | Défense en profondeur si le jeton est partagé par erreur |
| Timeout par requête sortante | 8 s | `UPSTREAM_TIMEOUT_MS` | Évite qu'un appel bloqué gèle un outil |
| Retries sur erreur réseau transitoire | 2, avec backoff exponentiel (300 ms, 900 ms) | `UPSTREAM_MAX_RETRIES` | Jamais de retry sur une erreur 4xx (droit refusé, mal formé) |
| Taille max de réponse traitée | 5 Mo par page | `MAX_RESPONSE_BYTES` | Coupe-circuit contre une réponse anormale |

## Ce que ces limites empêchent explicitement

- Un « rapport sur 5 ans » en un seul appel : refusé, l'appelant doit paginer par
  fenêtres ≤ 31 jours.
- Une boucle de sondage agressive depuis Claude (ex. prompt qui ré-interroge en boucle) :
  freinée par les quotas par jeton/minute.
- Un test de charge involontaire pendant la vérification : la procédure de vérification
  (doc 08) plafonne explicitement le nombre d'appels réels effectués en production (une
  poignée d'appels de lecture, jamais un balayage exhaustif).

## Mesures à produire lors de la vérification réelle

Lors de la lecture de production limitée (étape 7 de la démarche), consigner pour
comparaison :

- temps de réponse par appel (p50/p95) ;
- nombre total d'appels effectués et fenêtre couverte ;
- charge visible côté API Perfex si un indicateur est disponible côté hébergeur (à
  demander à l'admin, je n'ai pas accès à ces métriques depuis ce dépôt).

Voir `docs/08-VERIFICATION-ET-PREUVES.md` pour le gabarit de restitution.
