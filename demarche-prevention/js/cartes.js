/* =========================================================================
   cartes.js — composant "pile de cartes a glisser", reutilisable.

   Construit une seule fois, utilise par l'etape 4 (double notation frequence
   et gravite) et, plus tard, par les jauges de culture de prevention.

   PileCartes.creer({
     hote:      element ou monter la pile,
     cartes:    [ { id, kicker, titre, texte } , ... ],
     gauche:    { libelle:'Trop rare', tampon:'RARE' },
     droite:    { libelle:'Frequent', tampon:'FREQUENT' },
     jauge:     true,                       // afficher "carte 2 / 6"
     onDecision: function(carte, sens, index){},   // sens : 'gauche'|'droite'
     onFin:      function(decisions){}             // [{carte, sens}]
   });

   Le geste fonctionne a la souris comme au doigt (Pointer Events). Les deux
   boutons sous la pile font la meme chose : le glissement n'est jamais le
   seul moyen de decider (cibles de 44px, accessibilite).
   ========================================================================= */

var PileCartes = (function(){

  var SEUIL_RATIO = 0.28;   /* part de la largeur a franchir pour decider */
  var SEUIL_VITESSE = 0.55; /* px/ms : un geste vif decide aussi */

  function creer(config){
    var hote = config.hote;
    var cartes = config.cartes || [];
    var gauche = config.gauche || { libelle:'Non', tampon:'NON' };
    var droite = config.droite || { libelle:'Oui', tampon:'OUI' };
    var decisions = [];
    var index = 0;
    var occupe = false;

    UI.vider(hote);

    var pile     = UI.el('div', { class:'pile' });
    var jauge    = UI.el('div', { class:'pile-jauge' });
    var actions  = UI.el('div', { class:'pile-actions' }, [
      UI.el('button', { class:'btn g', texte:gauche.libelle,
                        onclick:function(){ decider('gauche'); } }),
      UI.el('button', { class:'btn d', texte:droite.libelle,
                        onclick:function(){ decider('droite'); } })
    ]);

    hote.appendChild(pile);
    if(config.jauge !== false) hote.appendChild(jauge);
    hote.appendChild(actions);

    /* ------------------------------ Rendu ------------------------------ */

    function dessiner(){
      UI.vider(pile);
      var restantes = cartes.length - index;
      if(restantes <= 0){
        actions.style.visibility = 'hidden';
        jauge.textContent = '';
        return;
      }
      actions.style.visibility = 'visible';
      jauge.textContent = (index+1) + ' / ' + cartes.length;

      /* On dessine au plus 3 cartes, de la plus profonde a la plus haute,
         pour que la derniere ajoutee soit celle du dessus. */
      var profondeur = Math.min(3, restantes);
      for(var d = profondeur-1; d >= 0; d--){
        var carte = cartes[index+d];
        var n = noeudCarte(carte);
        n.style.zIndex = String(10 - d);
        n.style.transform = 'translateY(' + (d*10) + 'px) scale(' + (1 - d*0.045) + ')';
        n.style.opacity = d === 2 ? '0.6' : '1';
        if(d === 0){ n.classList.add('dessus'); brancherGeste(n); }
        else { n.style.pointerEvents = 'none'; }
        pile.appendChild(n);
      }
    }

    function noeudCarte(carte){
      return UI.el('div', { class:'pile-carte' }, [
        UI.el('div', { class:'pile-tampon g', texte:gauche.tampon || gauche.libelle }),
        UI.el('div', { class:'pile-tampon d', texte:droite.tampon || droite.libelle }),
        carte.kicker ? UI.el('div', { class:'kicker', texte:carte.kicker }) : null,
        UI.el('div', { class:'grand', texte:carte.titre || '' }),
        carte.texte ? UI.el('div', { class:'petit', texte:carte.texte }) : null
      ]);
    }

    /* ------------------------------ Geste ------------------------------ */

    function brancherGeste(n){
      var actif = false, idPointeur = null;
      var x0 = 0, y0 = 0, t0 = 0, dx = 0, dy = 0;
      var largeur = 1;

      var tamponG = n.querySelector('.pile-tampon.g');
      var tamponD = n.querySelector('.pile-tampon.d');

      n.addEventListener('pointerdown', function(e){
        if(occupe) return;
        actif = true;
        idPointeur = e.pointerId;
        x0 = e.clientX; y0 = e.clientY; t0 = e.timeStamp;
        dx = 0; dy = 0;
        largeur = n.offsetWidth || 300;
        n.setPointerCapture(idPointeur);
        n.classList.add('glisse');
        n.classList.remove('pose');
      });

      n.addEventListener('pointermove', function(e){
        if(!actif || e.pointerId !== idPointeur) return;
        dx = e.clientX - x0;
        dy = e.clientY - y0;
        var rot = (dx / largeur) * 14;
        n.style.transform = 'translate(' + dx + 'px,' + (dy*0.35) + 'px) rotate(' + rot + 'deg)';
        var force = Math.min(1, Math.abs(dx) / (largeur * SEUIL_RATIO));
        tamponD.style.opacity = dx > 0 ? force : 0;
        tamponG.style.opacity = dx < 0 ? force : 0;
      });

      function relacher(e){
        if(!actif || (e.pointerId !== undefined && e.pointerId !== idPointeur)) return;
        actif = false;
        n.classList.remove('glisse');
        try{ n.releasePointerCapture(idPointeur); }catch(err){}

        var duree = Math.max(1, e.timeStamp - t0);
        var vitesse = Math.abs(dx) / duree;
        var franchi = Math.abs(dx) > largeur * SEUIL_RATIO || vitesse > SEUIL_VITESSE;

        if(franchi && Math.abs(dx) > 12){
          envoler(n, dx > 0 ? 'droite' : 'gauche');
        }else{
          /* retour a sa place */
          n.classList.add('pose');
          n.style.transform = 'translateY(0) scale(1)';
          tamponD.style.opacity = 0;
          tamponG.style.opacity = 0;
        }
      }

      n.addEventListener('pointerup', relacher);
      n.addEventListener('pointercancel', relacher);
    }

    /* --------------------------- Decision ------------------------------ */

    function decider(sens){
      if(occupe) return;
      var n = pile.querySelector('.pile-carte.dessus');
      if(!n) return;
      envoler(n, sens);
    }

    function envoler(n, sens){
      if(occupe) return;
      occupe = true;
      var carte = cartes[index];
      var large = (pile.offsetWidth || 360) * 1.6;
      var cible = sens === 'droite' ? large : -large;

      n.classList.remove('pose');
      n.classList.add('partie');
      n.style.transform = 'translate(' + cible + 'px,40px) rotate(' + (sens==='droite'?24:-24) + 'deg)';

      var tampon = n.querySelector('.pile-tampon.' + (sens==='droite'?'d':'g'));
      if(tampon) tampon.style.opacity = 1;

      setTimeout(function(){
        decisions.push({ carte:carte, sens:sens });
        index++;
        occupe = false;
        if(config.onDecision) config.onDecision(carte, sens, index-1);
        dessiner();
        if(index >= cartes.length && config.onFin) config.onFin(decisions);
      }, 300);
    }

    dessiner();

    return {
      decider: decider,
      decisions: function(){ return decisions.slice(); },
      restantes: function(){ return cartes.length - index; },
      redessiner: dessiner
    };
  }

  return { creer: creer };

})();
