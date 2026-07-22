/* =========================================================================
   etat.js — l'objet "partie" et sa persistance.

   Un SEUL objet est serialise en JSON dans localStorage sous une cle unique,
   et reecrit apres CHAQUE decision. Le joueur peut fermer l'application en
   plein milieu d'une etape : il rouvre exactement la ou il s'est arrete.

   Le fil conducteur de tout le jeu est `partie.duerp`.
   ========================================================================= */

var Etat = (function(){

  var CLE = 'hiiato.demarche-prevention';
  var VERSION = 1;

  /* Ordre de JEU (different de l'ordre de construction) :
     etape 2 preparation, 3 identification, 4 analyse, 5 mesure. */
  var ETAPES = [
    { num:2, cle:'preparation',    nom:'Préparer',  titre:'Préparer la démarche' },
    { num:3, cle:'identification', nom:'Identifier',titre:'Identifier les risques' },
    { num:4, cle:'analyse',        nom:'Analyser',  titre:'Analyser et coter' },
    { num:5, cle:'mesure',         nom:'Agir',      titre:'Choisir une mesure' }
  ];

  var partie = null;

  /* --------------------------- Partie vierge --------------------------- */

  function nouvellePartie(){
    return {
      meta:{
        version: VERSION,
        creeLe: new Date().toISOString(),
        majLe: new Date().toISOString(),
        etapeCourante: 2,     /* numero d'etape dans l'ordre de jeu */
        sousEtape: null,      /* identifiant libre gere par chaque module */
        ecran: 'accueil',     /* dernier ecran affiche, pour "reprendre" */
        params: {},           /* parametres de cet ecran */
        etapesTerminees: []   /* numeros d'etapes achevees */
      },
      /* Le document unique : une entree par unite de travail. */
      duerp: [],
      /* Etape 2 — groupes d'acteurs. */
      acteurs:{ pilotage:[], travail:[], pilote:null, copilote:null },
      /* Etape 2 — decoupage entonnoir (entreprise / etablissement / UT). */
      decoupage:{ entreprise:null, etablissements:[] },
      /* Journal des decisions, utile au debrief et au formateur. */
      historique:[],
      /* Reserve aux extensions futures : jauges de culture de prevention,
         PAPRIPACT, annee en cours, rapport annuel. Non implemente ici. */
      extensions:{}
    };
  }

  /* ------------------------- Charger / sauver -------------------------- */

  function chargerPartie(){
    try{
      var brut = localStorage.getItem(CLE);
      if(!brut) return null;
      var p = JSON.parse(brut);
      if(!p || !p.meta) return null;
      if(p.meta.version !== VERSION){
        /* Version differente : on ne tente pas de migration a l'aveugle. */
        return null;
      }
      partie = p;
      return partie;
    }catch(e){
      console.warn('Partie illisible, on repart de zero.', e);
      return null;
    }
  }

  function sauvegarderPartie(){
    if(!partie) return false;
    partie.meta.majLe = new Date().toISOString();
    try{
      localStorage.setItem(CLE, JSON.stringify(partie));
      return true;
    }catch(e){
      console.error('Sauvegarde impossible', e);
      if(window.UI) UI.toast("Sauvegarde impossible sur cet appareil.");
      return false;
    }
  }

  function reinitialiser(){
    try{ localStorage.removeItem(CLE); }catch(e){}
    partie = nouvellePartie();
    sauvegarderPartie();
    return partie;
  }

  function partieExiste(){
    try{ return !!localStorage.getItem(CLE); }catch(e){ return false; }
  }

  function get(){
    if(!partie) partie = nouvellePartie();
    return partie;
  }

  /* --------------------- Position dans le parcours --------------------- */

  /* Memorise l'ecran courant a chaque navigation : c'est ce qui permet
     le "reprendre ou j'en etais" au niveau de la sous-etape, pas du niveau. */
  function marquerPosition(ecran, params, etape, sousEtape){
    var p = get();
    p.meta.ecran = ecran;
    p.meta.params = params || {};
    if(etape) p.meta.etapeCourante = etape;
    if(sousEtape !== undefined) p.meta.sousEtape = sousEtape;
    sauvegarderPartie();
  }

  function terminerEtape(num){
    var p = get();
    if(p.meta.etapesTerminees.indexOf(num) === -1){
      p.meta.etapesTerminees.push(num);
      p.meta.etapesTerminees.sort();
    }
    journaliser('etape-terminee', { etape:num });
    sauvegarderPartie();
  }

  function etapeTerminee(num){
    return get().meta.etapesTerminees.indexOf(num) !== -1;
  }

  /* ------------------------------ DUERP -------------------------------- */

  /* Retourne (en la creant au besoin) l'unite de travail portant ce nom. */
  function ut(nom){
    var p = get();
    for(var i=0;i<p.duerp.length;i++){
      if(p.duerp[i].ut === nom) return p.duerp[i];
    }
    var bloc = { ut:nom, risques:[] };
    p.duerp.push(bloc);
    return bloc;
  }

  /* Ajoute un risque identifie. Renvoie l'objet risque (existant ou cree).
     Appelee a chaque decouverte : la sauvegarde suit immediatement. */
  function ajouterRisque(nomUT, donnees){
    var bloc = ut(nomUT);
    var libelle = donnees.libelle || '';
    for(var i=0;i<bloc.risques.length;i++){
      if(bloc.risques[i].libelle === libelle) return bloc.risques[i];
    }
    var r = {
      id: 'r' + Date.now().toString(36) + Math.floor(Math.random()*1000).toString(36),
      libelle: libelle,
      source: donnees.source || null,      /* scene / dialogue / ... */
      visible: donnees.visible !== false,  /* faux = risque invisible (RPS) */
      danger: donnees.danger || null,      /* propriete intrinseque */
      exposition: donnees.exposition || null, /* exposition d'une personne */
      nature: donnees.nature || null,      /* famille de risque */
      cotation: null,                      /* { frequence, gravite, criticite } */
      mesureChoisie: null
    };
    bloc.risques.push(r);
    journaliser('risque-identifie', { ut:nomUT, libelle:libelle });
    sauvegarderPartie();
    return r;
  }

  function trouverRisque(id){
    var p = get();
    for(var i=0;i<p.duerp.length;i++){
      for(var j=0;j<p.duerp[i].risques.length;j++){
        if(p.duerp[i].risques[j].id === id){
          return { ut:p.duerp[i].ut, risque:p.duerp[i].risques[j] };
        }
      }
    }
    return null;
  }

  function majRisque(id, champs){
    var t = trouverRisque(id);
    if(!t) return null;
    for(var k in champs){ if(champs.hasOwnProperty(k)) t.risque[k] = champs[k]; }
    sauvegarderPartie();
    return t.risque;
  }

  /* Cotation : la criticite est toujours le produit F x G. */
  function coter(id, frequence, gravite){
    var t = trouverRisque(id);
    if(!t) return null;
    t.risque.cotation = {
      frequence: frequence,
      gravite: gravite,
      criticite: frequence * gravite
    };
    journaliser('risque-cote', { id:id, f:frequence, g:gravite });
    sauvegarderPartie();
    return t.risque.cotation;
  }

  function tousLesRisques(){
    var p = get(), out = [];
    for(var i=0;i<p.duerp.length;i++){
      for(var j=0;j<p.duerp[i].risques.length;j++){
        out.push({ ut:p.duerp[i].ut, risque:p.duerp[i].risques[j] });
      }
    }
    return out;
  }

  function nbRisques(){ return tousLesRisques().length; }

  /* ---------------------------- Historique ----------------------------- */

  function journaliser(action, details){
    var p = get();
    p.historique.push({
      le: new Date().toISOString(),
      etape: p.meta.etapeCourante,
      action: action,
      details: details || {}
    });
    /* Garde-fou memoire : on ne conserve que les 500 derniers evenements. */
    if(p.historique.length > 500) p.historique.splice(0, p.historique.length-500);
  }

  return {
    ETAPES: ETAPES,
    CLE: CLE,
    get: get,
    nouvellePartie: nouvellePartie,
    chargerPartie: chargerPartie,
    sauvegarderPartie: sauvegarderPartie,
    reinitialiser: reinitialiser,
    partieExiste: partieExiste,
    marquerPosition: marquerPosition,
    terminerEtape: terminerEtape,
    etapeTerminee: etapeTerminee,
    ut: ut,
    ajouterRisque: ajouterRisque,
    trouverRisque: trouverRisque,
    majRisque: majRisque,
    coter: coter,
    tousLesRisques: tousLesRisques,
    nbRisques: nbRisques,
    journaliser: journaliser
  };

})();
