/* =========================================================================
   sw.js — cache hors connexion.

   Une fois la page ouverte une premiere fois avec du reseau, le jeu se relance
   sans reseau : salle mal couverte, 4G capricieuse, mode avion.

   Trois strategies, selon ce qu'on sert :
     - la coquille (html, css, js, polices) : on sert le cache tout de suite,
       et on rafraichit en arriere-plan pour la fois suivante ;
     - les contenus (data/*.json) : on tente le reseau d'abord, pour que les
       modifications du formateur soient vues immediatement quand il y a du
       reseau, avec repli sur le cache sinon ;
     - les images (assets/) : cache d'abord, elles ne changent pas et sont
       lourdes.

   APRES CHAQUE MODIFICATION DU JEU, incrementez VERSION ci-dessous.
   Sans cela, les joueurs qui ont deja ouvert le jeu garderont l'ancienne
   coquille en cache.
   ========================================================================= */

var VERSION = 'v1';
var CACHE = 'demarche-prevention-' + VERSION;

/* Ce qui est mis en cache des l'installation. */
var COQUILLE = [
  './',
  './index.html',
  './css/style.css',
  './js/etat.js',
  './js/ui.js',
  './js/cartes.js',
  './js/carnet.js',
  './js/app.js',
  './fonts/figtree-latin.woff2',
  './fonts/figtree-latin-ext.woff2',
  './assets/hiiato.svg',
  './assets/icone.svg',
  './data/parcours.json',
  './manifest.webmanifest'
];

self.addEventListener('install', function(e){
  e.waitUntil(
    caches.open(CACHE).then(function(c){
      /* addAll echoue en bloc si un seul fichier manque : on tolere les
         absences pour qu'une ressource oubliee ne casse pas l'installation. */
      return Promise.all(COQUILLE.map(function(u){
        return c.add(u).catch(function(){ console.warn('sw: absent ' + u); });
      }));
    }).then(function(){ return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function(e){
  e.waitUntil(
    caches.keys().then(function(noms){
      return Promise.all(noms.map(function(n){
        if(n !== CACHE) return caches.delete(n);
      }));
    }).then(function(){ return self.clients.claim(); })
  );
});

function estContenu(url){ return url.pathname.indexOf('/data/') !== -1; }
function estImage(url){ return url.pathname.indexOf('/assets/') !== -1; }

self.addEventListener('fetch', function(e){
  var req = e.request;
  if(req.method !== 'GET') return;

  var url = new URL(req.url);
  if(url.origin !== location.origin) return;   /* rien d'externe a servir */

  /* Contenus : reseau d'abord, cache en repli. */
  if(estContenu(url)){
    e.respondWith(
      fetch(req).then(function(rep){
        if(rep && rep.ok){
          var copie = rep.clone();
          caches.open(CACHE).then(function(c){ c.put(req, copie); });
        }
        return rep;
      }).catch(function(){
        return caches.match(req).then(function(m){
          return m || new Response('{}', { headers:{'Content-Type':'application/json'} });
        });
      })
    );
    return;
  }

  /* Images : cache d'abord. */
  if(estImage(url)){
    e.respondWith(
      caches.match(req).then(function(m){
        return m || fetch(req).then(function(rep){
          if(rep && rep.ok){
            var copie = rep.clone();
            caches.open(CACHE).then(function(c){ c.put(req, copie); });
          }
          return rep;
        });
      })
    );
    return;
  }

  /* Coquille : cache immediat, rafraichissement en arriere-plan. */
  e.respondWith(
    caches.match(req).then(function(m){
      var reseau = fetch(req).then(function(rep){
        if(rep && rep.ok){
          var copie = rep.clone();
          caches.open(CACHE).then(function(c){ c.put(req, copie); });
        }
        return rep;
      }).catch(function(){
        /* Hors ligne et rien en cache : on renvoie la page d'accueil pour
           les navigations, sinon on laisse l'erreur remonter. */
        if(req.mode === 'navigate') return caches.match('./index.html');
        throw new Error('hors ligne');
      });
      return m || reseau;
    })
  );
});
