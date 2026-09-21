# 6. Procédure de déploiement et de retour arrière

Aucune étape de cette procédure n'a été exécutée contre la production réelle depuis cette
session (voir doc 09 pour l'état précis). C'est la marche à suivre pour l'opérateur
disposant des accès nécessaires.

## Pré-requis (bloquants)

- [ ] Points 1 à 9 du fichier `00-HYPOTHESES-ET-MANQUANTS.md` confirmés.
- [ ] Compte technique API Perfex en lecture seule créé (doc 02).
- [ ] Hôte HTTPS cible identifié pour héberger le service de reporting (doc 01, point 8),
      joignable publiquement par Claude, isolé du serveur applicatif Perfex si possible.
- [ ] Serveur d'autorisation OAuth choisi (peut être un module léger dédié, ou un
      fournisseur existant si le client en a déjà un).

## Déploiement

1. **Provisionner l'hôte** : machine ou conteneur dédié, Node.js LTS, pare-feu limitant
   les connexions entrantes au port HTTPS du service et les sortantes à l'API Perfex
   + serveur d'autorisation OAuth.
2. **Copier `server/`** sur l'hôte, `npm ci --omit=dev`.
3. **Renseigner les secrets** dans le gestionnaire de secrets de la plateforme
   d'hébergement (jamais dans un fichier commité) : voir `server/.env.example` pour la
   liste exhaustive des variables attendues, aucune valeur réelle n'y figure.
4. **Vérifier `capabilityMap.js`** : chaque route utilisée doit être passée à
   `verified: true` seulement après un test manuel réussi de cette route précise contre
   l'API réelle (méthode, champs, pagination confirmés).
5. **Démarrer le service** (`npm run start`) derrière un reverse proxy TLS
   (terminaison HTTPS gérée par la plateforme ou un proxy dédié).
6. **Déclarer le connecteur MCP personnalisé** dans les réglages du compte Claude
   (`ani.herman@gmail.com`), avec l'URL HTTPS du service et le flux OAuth configuré.
7. **Premier rapport manuel** : depuis Claude, invoquer `get_status` puis
   `get_daily_kpis` sur une période courte (ex. hier) et comparer au rapport de référence
   (doc 08).
8. **Vérifier la compatibilité planification** : tester si le compte Claude peut
   déclencher ce connecteur via une tâche planifiée à 07 h 00 Africa/Abidjan. Si oui,
   configurer la tâche avec le prompt de doc 07. Si non → activer le repli n8n
   (`fallback-n8n/`).
9. **Valider l'envoi** : un envoi de rapport ne part que vers une destination confirmée
   explicitement (voir doc 00, point 9) — ne pas activer l'envoi tant que l'adresse n'est
   pas confirmée sans ambiguïté.

## Retour arrière (rollback)

Le retour arrière est conçu pour être immédiat et sans dépendance à l'ordre des étapes :

1. **Couper l'accès** (n'importe lequel suffit, faire les trois en cas de doute) :
   - révoquer le jeton/l'autorisation OAuth du connecteur côté Claude ;
   - désactiver ou supprimer le compte technique API côté Perfex ;
   - arrêter le service (`systemctl stop reporting-mcp` ou équivalent conteneur).
2. **Retirer le connecteur** des réglages du compte Claude.
3. **Désactiver la tâche planifiée** (native Claude ou workflow n8n).
4. **Aucune donnée persistante côté service** ne doit exister à supprimer si le service
   est resté sans état (stateless) comme conçu — vérifier qu'aucun cache disque de
   données métier n'a été ajouté hors de cette conception.
5. **Conserver les logs techniques** existants pour investigation (ils ne contiennent pas
   de données personnelles, voir doc 05), les purger selon la politique de rétention
   convenue.

## Désactivation planifiée (hors incident)

Même procédure que le rollback, déclenchable à la demande de l'utilisateur sans
qu'il s'agisse d'un incident : couper le jeton OAuth et/ou désactiver la tâche planifiée
suffit à arrêter les rapports journaliers sans désinstaller le service.
