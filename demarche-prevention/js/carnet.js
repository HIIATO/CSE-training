/* =========================================================================
   carnet.js — le carnet DUERP repliable.

   Une icone dans la barre du haut ouvre un panneau qui montre l'etat courant
   du document unique, consultable depuis n'importe quel ecran, sans manger
   la place de jeu. C'est le fil conducteur rendu visible.
   ========================================================================= */

var Carnet = (function(){

  var elVoile, elPanneau, elCorps, elCompteur, elPastille, elBtn;
  var ouvert = false;
  var utDepliees = {};   /* memorise les blocs ouverts pendant la session */

  function init(){
    elVoile    = document.getElementById('voile');
    elPanneau  = document.getElementById('carnet');
    elCorps    = document.getElementById('carnet-corps');
    elCompteur = document.getElementById('carnet-compteur');
    elPastille = document.getElementById('carnet-pastille');
    elBtn      = document.getElementById('btn-carnet');

    elBtn.addEventListener('click', ouvrir);
    elVoile.addEventListener('click', fermer);
    document.getElementById('btn-fermer-carnet').addEventListener('click', fermer);
    document.addEventListener('keydown', function(e){
      if(e.key === 'Escape' && ouvert) fermer();
    });
    rafraichirPastille();
  }

  function ouvrir(){
    dessiner();
    elVoile.hidden = false;
    elPanneau.hidden = false;
    ouvert = true;
    document.getElementById('tel').classList.add('carnet-ouvert');
  }

  function fermer(){
    elVoile.hidden = true;
    elPanneau.hidden = true;
    ouvert = false;
    document.getElementById('tel').classList.remove('carnet-ouvert');
  }

  function basculer(){ ouvert ? fermer() : ouvrir(); }

  /* Pastille de comptage sur l'icone : signale qu'une ligne s'est ajoutee. */
  function rafraichirPastille(){
    if(!elPastille) return;
    var n = Etat.nbRisques();
    elPastille.textContent = String(n);
    elPastille.hidden = n === 0;
  }

  /* Petit effet quand un risque vient d'entrer au DUERP. */
  function signaler(libelle){
    rafraichirPastille();
    if(elPastille && !elPastille.hidden){
      elPastille.style.animation = 'none';
      void elPastille.offsetWidth;
      elPastille.style.animation = 'popBadge .46s cubic-bezier(.2,.85,.25,1) both';
    }
    if(libelle) UI.toast('Ajouté au DUERP : ' + libelle);
  }

  /* ------------------------------ Rendu -------------------------------- */

  function dessiner(){
    var p = Etat.get();
    var total = Etat.nbRisques();
    elCompteur.textContent = total + (total > 1 ? ' risques' : ' risque');

    UI.vider(elCorps);

    if(total === 0){
      elCorps.appendChild(
        UI.el('div', { class:'vide' }, [
          UI.el('span', { class:'ico', html:'&#128203;' }),
          UI.el('div', { html:'Votre document unique est encore vierge.<br>'
            + 'Chaque risque que vous identifierez viendra s\'y inscrire, '
            + 'puis s\'enrichira de sa cotation et de sa mesure.' })
        ])
      );
      return;
    }

    p.duerp.forEach(function(bloc){
      var ouverte = utDepliees[bloc.ut] !== false;   /* depliee par defaut */
      var noeud = UI.el('div', { class:'ut-bloc' + (ouverte ? ' ouvert' : '') });

      var tete = UI.el('button', { class:'ut-tete' }, [
        UI.el('span', { class:'chev', html:'&#9654;' }),
        UI.el('span', { class:'nom', texte:bloc.ut }),
        UI.el('span', { class:'nb', texte:bloc.risques.length + (bloc.risques.length>1?' risques':' risque') })
      ]);
      tete.addEventListener('click', function(){
        utDepliees[bloc.ut] = !noeud.classList.contains('ouvert');
        noeud.classList.toggle('ouvert');
      });
      noeud.appendChild(tete);

      var liste = UI.el('div', { class:'ut-liste' });
      bloc.risques.forEach(function(r){
        var meta = UI.el('div', { class:'meta' });

        if(!r.visible) meta.appendChild(UI.el('span', { class:'mini', texte:'risque invisible' }));
        if(r.nature)   meta.appendChild(UI.el('span', { class:'mini', texte:r.nature }));
        if(r.cotation){
          meta.appendChild(UI.el('span', { class:'mini', texte:'F ' + r.cotation.frequence }));
          meta.appendChild(UI.el('span', { class:'mini', texte:'G ' + r.cotation.gravite }));
          meta.appendChild(UI.el('span', { class:'mini crit', texte:'criticité ' + r.cotation.criticite }));
        }else{
          meta.appendChild(UI.el('span', { class:'mini', texte:'à coter' }));
        }
        if(r.mesureChoisie){
          meta.appendChild(UI.el('span', { class:'mini mesure', texte:r.mesureChoisie }));
        }

        liste.appendChild(UI.el('div', { class:'risque-l' }, [
          UI.el('div', { class:'lib', texte:r.libelle }),
          meta
        ]));
      });
      noeud.appendChild(liste);
      elCorps.appendChild(noeud);
    });
  }

  return {
    init:init, ouvrir:ouvrir, fermer:fermer, basculer:basculer,
    rafraichirPastille:rafraichirPastille, signaler:signaler, dessiner:dessiner
  };

})();
