/* =========================================================================
   ui.js — la coquille tour par tour.

   Un routeur d'ecrans minimal : un seul ecran est monte a la fois dans #vue.
   Chaque ecran est un objet enregistre par son identifiant :

     UI.ecran('accueil', {
       chrome: false,              // barre du haut visible ?
       titre: 'Identifier',        // titre de la barre du haut
       etape: 3,                   // etape mise en avant dans la progression
       carnet: true,               // icone carnet DUERP accessible ?
       monter: function(hote, params){ ... }   // dessine l'ecran
     });

   La position est memorisee dans la partie a chaque navigation, ce qui rend
   le "reprendre ou j'en etais" exact a la sous-etape pres.
   ========================================================================= */

var UI = (function(){

  var ecrans = {};
  var courant = null;
  var pileRetour = [];

  var elVue, elChrome, elTitre, elEtapes, elRetour, elCarnetBtn, elToast;

  function init(){
    elVue       = document.getElementById('vue');
    elChrome    = document.getElementById('chrome');
    elTitre     = document.getElementById('chrome-titre');
    elEtapes    = document.getElementById('etapes');
    elRetour    = document.getElementById('btn-retour');
    elCarnetBtn = document.getElementById('btn-carnet');
    elToast     = document.getElementById('toast');

    elRetour.addEventListener('click', retour);
    construireEtapes();
  }

  /* ------------------------- Petites fabriques ------------------------- */

  /* Cree un element : el('div', {class:'carte'}, [enfants ou texte]) */
  function el(balise, attrs, enfants){
    var n = document.createElement(balise);
    if(attrs){
      for(var k in attrs){
        if(!attrs.hasOwnProperty(k)) continue;
        var v = attrs[k];
        if(v === null || v === undefined || v === false) continue;
        if(k === 'class') n.className = v;
        else if(k === 'html') n.innerHTML = v;
        else if(k === 'texte') n.textContent = v;
        else if(k.indexOf('on') === 0 && typeof v === 'function'){
          n.addEventListener(k.slice(2).toLowerCase(), v);
        }
        else if(k === 'style' && typeof v === 'object'){
          for(var s in v){ if(v.hasOwnProperty(s)) n.style[s] = v[s]; }
        }
        else if(v === true) n.setAttribute(k, '');
        else n.setAttribute(k, v);
      }
    }
    if(enfants !== undefined && enfants !== null){
      if(!Array.isArray(enfants)) enfants = [enfants];
      enfants.forEach(function(c){
        if(c === null || c === undefined || c === false) return;
        n.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
      });
    }
    return n;
  }

  function vider(n){ while(n.firstChild) n.removeChild(n.firstChild); }

  /* --------------------------- Enregistrement -------------------------- */

  function ecran(id, def){ ecrans[id] = def; }

  function existe(id){ return !!ecrans[id]; }

  /* ------------------------------ Naviguer ----------------------------- */

  /* aller('identification', {scene:'labo'}) */
  function aller(id, params, options){
    var def = ecrans[id];
    if(!def){ console.error('Ecran inconnu : ' + id); return; }
    options = options || {};

    if(courant && !options.remplacer && courant.id !== id){
      pileRetour.push({ id:courant.id, params:courant.params });
      if(pileRetour.length > 40) pileRetour.shift();
    }
    if(options.racine) pileRetour = [];

    courant = { id:id, params:params||{}, def:def };

    /* barre du haut */
    var avecChrome = def.chrome !== false;
    elChrome.hidden = !avecChrome;
    elTitre.textContent = typeof def.titre === 'function'
      ? def.titre(courant.params) : (def.titre || '');
    elRetour.hidden = def.retour === false || !cibleRetour();
    elCarnetBtn.hidden = def.carnet === false;

    /* progression des etapes */
    if(def.etape){ majEtapes(def.etape); elEtapes.hidden = false; }
    else { elEtapes.hidden = true; }

    /* montage */
    vider(elVue);
    var hote = el('section', { class:'ecran', 'data-ecran':id });
    elVue.appendChild(hote);
    def.monter(hote, courant.params);

    /* memorise la position (sauvegarde immediate) */
    if(def.memoriser !== false){
      Etat.marquerPosition(id, courant.params, def.etape || null, def.sousEtape || null);
    }
    if(window.Carnet) Carnet.rafraichirPastille();
  }

  /* Ou mene la fleche retour ? L'ecran precedent s'il y en a un, sinon
     l'ecran parent declare. Ce second cas est indispensable apres un
     "reprendre ou j'en etais" : on atterrit en profondeur sans historique,
     et sans parent le joueur serait bloque sur l'ecran. */
  function cibleRetour(){
    if(pileRetour.length > 0){
      var p = pileRetour[pileRetour.length-1];
      return { id:p.id, params:p.params, depile:true };
    }
    var parent = courant && courant.def ? courant.def.parent : null;
    if(parent === undefined) parent = 'parcours';
    if(parent && parent !== (courant && courant.id) && ecrans[parent]){
      return { id:parent, params:{}, depile:false };
    }
    return null;
  }

  function retour(){
    var cible = cibleRetour();
    if(!cible) return;
    if(cible.depile) pileRetour.pop();
    /* on ne re-empile pas en revenant */
    var sauvegarde = pileRetour.slice();
    aller(cible.id, cible.params, { remplacer:true });
    pileRetour = sauvegarde;
    elRetour.hidden = !cibleRetour();
  }

  function rejouerEcran(){
    if(courant) aller(courant.id, courant.params, { remplacer:true });
  }

  function ecranCourant(){ return courant ? courant.id : null; }

  /* --------------------- Progression des 4 etapes ---------------------- */

  function construireEtapes(){
    vider(elEtapes);
    Etat.ETAPES.forEach(function(e){
      elEtapes.appendChild(
        el('div', { class:'etape', 'data-etape':e.num }, [
          el('div', { class:'etape-barre' }),
          el('div', { class:'etape-nom', texte:e.nom })
        ])
      );
    });
  }

  function majEtapes(active){
    var noeuds = elEtapes.querySelectorAll('.etape');
    for(var i=0;i<noeuds.length;i++){
      var num = parseInt(noeuds[i].getAttribute('data-etape'), 10);
      noeuds[i].className = 'etape'
        + (Etat.etapeTerminee(num) ? ' faite' : '')
        + (num === active ? ' active' : '');
    }
  }

  /* ------------------------------- Toast ------------------------------- */

  var minuteurToast = null;
  function toast(message, duree){
    elToast.textContent = message;
    elToast.hidden = false;
    clearTimeout(minuteurToast);
    minuteurToast = setTimeout(function(){ elToast.hidden = true; }, duree || 2600);
  }

  /* --------------------------- Blocs reutilisables --------------------- */

  /* En-tete d'ecran : sur-titre + titre + texte d'explication. */
  function entete(surTitre, titre, texte){
    return el('div', { class:'entete' }, [
      surTitre ? el('div', { class:'sur-titre', texte:surTitre }) : null,
      el('h2', { class:'titre', texte:titre, style:{marginTop:'6px'} }),
      texte ? el('p', { class:'texte', texte:texte, style:{marginTop:'10px'} }) : null
    ]);
  }

  function bouton(libelle, style, onClic, options){
    options = options || {};
    return el('button', {
      class:'btn ' + (style||'btn-primaire') + (options.petit?' btn-petit':''),
      texte:libelle,
      onclick:onClic,
      disabled:options.desactive || false
    });
  }

  /* Charge un JSON de contenu. Sur file:// le fetch echoue : on renvoie
     alors la valeur de secours pour que le jeu reste testable. */
  function chargerJSON(chemin, secours){
    return fetch(chemin, { cache:'no-cache' })
      .then(function(r){
        if(!r.ok) throw new Error(r.status + ' ' + chemin);
        return r.json();
      })
      .catch(function(e){
        console.warn('Contenu non charge (' + chemin + ') : ' + e.message);
        if(location.protocol === 'file:'){
          toast("Ouvrez le jeu avec demarrer.bat pour charger les contenus.", 5000);
        }
        return secours;
      });
  }

  return {
    init:init, el:el, vider:vider,
    ecran:ecran, existe:existe, aller:aller, retour:retour,
    rejouerEcran:rejouerEcran, ecranCourant:ecranCourant,
    majEtapes:majEtapes, toast:toast,
    entete:entete, bouton:bouton, chargerJSON:chargerJSON
  };

})();
