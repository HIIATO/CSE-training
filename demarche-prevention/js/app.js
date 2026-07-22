/* =========================================================================
   app.js — demarrage, ecran d'accueil, carte du parcours.

   Phase 0 : fondations. Les quatre etapes sont declarees mais pas encore
   jouables ; elles seront branchees une par une (identification, analyse,
   mesure, puis preparation).
   ========================================================================= */

var App = (function(){

  var parcours = null;   /* contenu charge depuis data/parcours.json */

  /* Secours si le fichier JSON ne peut pas etre lu (ouverture en file://). */
  var SECOURS = {
    titre:'La démarche de prévention',
    surTitre:'Formation CSE / SSCT',
    accroche:'Quatre étapes, un seul document : le vôtre.',
    etapes: Etat.ETAPES.map(function(e){
      return { num:e.num, cle:e.cle, nom:e.nom, titre:e.titre,
               resume:'', ecran:e.cle, disponible:false };
    })
  };

  /* ============================== Accueil ============================== */

  UI.ecran('accueil', {
    chrome:false, carnet:false, memoriser:false,
    monter: function(hote){
      var reprise = Etat.partieExiste();
      var n = Etat.nbRisques();

      var bloc = UI.el('div', { class:'accueil' });

      bloc.appendChild(UI.el('img', { class:'marque', src:'assets/hiiato.svg', alt:'Hiiato' }));

      bloc.appendChild(UI.el('div', {}, [
        UI.el('div', { class:'sur-titre-clair', texte:parcours.surTitre }),
        UI.el('h1', { texte:parcours.titre }),
        UI.el('p', { class:'intro', texte:parcours.accroche })
      ]));

      var bas = UI.el('div', { style:{display:'flex',flexDirection:'column',gap:'12px'} });

      bas.appendChild(UI.el('div', { class:'chiffres' }, [
        UI.el('div', {}, [ UI.el('b', { texte:'4' }), UI.el('i', { texte:'étapes' }) ]),
        UI.el('div', {}, [ UI.el('b', { texte:'1' }), UI.el('i', { texte:'document unique' }) ]),
        reprise ? UI.el('div', {}, [
          UI.el('b', { texte:String(n) }),
          UI.el('i', { texte: n>1 ? 'risques inscrits' : 'risque inscrit' })
        ]) : null
      ]));

      if(reprise){
        bas.appendChild(boutonCTA(
          'Reprendre où j\'en étais',
          libellePosition(),
          function(){ reprendre(); }
        ));
        bas.appendChild(boutonCTA(
          'Nouvelle partie',
          'Le DUERP en cours sera effacé',
          function(){ confirmerNouvelle(); },
          true
        ));
      }else{
        bas.appendChild(boutonCTA(
          'Commencer',
          '4 étapes · votre DUERP se remplit au fil du jeu',
          function(){ nouvelle(); }
        ));
      }

      bas.appendChild(UI.el('div', { class:'mention', texte:'Hiiato · outil de formation' }));
      bloc.appendChild(bas);
      hote.appendChild(bloc);
    }
  });

  function boutonCTA(titre, sousTitre, onClic, secondaire){
    return UI.el('button', {
      class:'cta' + (secondaire ? ' secondaire' : ''),
      onclick:onClic
    }, [
      UI.el('span', { style:{flex:'1'} }, [
        UI.el('span', { class:'cta-t', texte:titre }),
        sousTitre ? UI.el('span', { class:'cta-s', texte:sousTitre }) : null
      ]),
      UI.el('span', { class:'fleche', html:'&rarr;' })
    ]);
  }

  /* Decrit en une ligne ou le joueur s'etait arrete. */
  function libellePosition(){
    var m = Etat.get().meta;
    var e = null;
    parcours.etapes.forEach(function(x){ if(x.num === m.etapeCourante) e = x; });
    if(!e) return 'Reprise du parcours';
    return 'Étape ' + e.num + ' · ' + e.titre;
  }

  function nouvelle(){
    Etat.reinitialiser();
    UI.aller('parcours', {}, { racine:true });
  }

  function confirmerNouvelle(){
    if(confirm('Effacer la partie en cours et repartir d\'un DUERP vierge ?')) nouvelle();
  }

  function reprendre(){
    var m = Etat.get().meta;
    if(m.ecran && m.ecran !== 'accueil' && UI.existe(m.ecran)){
      UI.aller(m.ecran, m.params || {}, { racine:true });
    }else{
      UI.aller('parcours', {}, { racine:true });
    }
  }

  /* ============================== Parcours ============================= */

  UI.ecran('parcours', {
    chrome:true, titre:'Le parcours', carnet:true, retour:false,
    monter: function(hote){
      var corps = UI.el('div', { class:'corps' });

      corps.appendChild(UI.entete(
        'Votre progression',
        'Quatre étapes, un seul document',
        'Chaque étape enrichit le même DUERP. Ouvrez le carnet en haut à droite pour le consulter à tout moment.'
      ));

      parcours.etapes.forEach(function(e){
        corps.appendChild(carteEtape(e));
      });

      corps.appendChild(UI.el('div', { style:{height:'4px'} }));
      corps.appendChild(UI.bouton('Banc d\'essai (formateur)', 'btn-discret', function(){
        UI.aller('banc');
      }, { petit:true }));

      var pied = UI.el('div', { class:'pied' }, [
        UI.bouton('Retour à l\'accueil', 'btn-sombre', function(){
          UI.aller('accueil', {}, { racine:true });
        })
      ]);

      hote.appendChild(corps);
      hote.appendChild(pied);
    }
  });

  function carteEtape(e){
    var faite = Etat.etapeTerminee(e.num);
    var jouable = e.disponible && UI.existe(e.ecran);

    var puce = faite
      ? UI.el('span', { class:'puce vert', texte:'terminée' })
      : (jouable ? UI.el('span', { class:'puce bleu', texte:'à jouer' })
                 : UI.el('span', { class:'puce', texte:'bientôt' }));

    var carte = UI.el('button', {
      class:'option',
      style:{ alignItems:'flex-start', padding:'15px', borderRadius:'16px',
              opacity: jouable || faite ? '1' : '.62' },
      onclick: function(){
        if(jouable) UI.aller(e.ecran, {});
        else UI.toast('Cette étape arrive à la prochaine livraison.');
      }
    }, [
      UI.el('span', { class:'badge', texte:String(e.num),
                      style: faite ? { background:'var(--c-good)', color:'#fff' } : null }),
      UI.el('span', { class:'lbl', style:{display:'flex',flexDirection:'column',gap:'6px'} }, [
        UI.el('span', { texte:e.titre, style:{fontWeight:'700',fontSize:'16px'} }),
        e.resume ? UI.el('span', { texte:e.resume,
          style:{fontSize:'13.5px',lineHeight:'1.45',color:'var(--c-muted)'} }) : null,
        puce
      ])
    ]);
    return carte;
  }

  /* ====================== Banc d'essai (phase 0) ======================= */
  /* Ecran temporaire : il sert a verifier les fondations (pile de cartes,
     ecriture dans le DUERP, sauvegarde apres chaque decision). Il sera
     retire quand les quatre etapes seront branchees. */

  UI.ecran('banc', {
    chrome:true, titre:'Banc d\'essai', carnet:true,
    monter: function(hote){
      var corps = UI.el('div', { class:'corps' });
      corps.appendChild(UI.entete('Vérification', 'Les fondations',
        'Trois contrôles : le geste de glissement, l\'écriture au DUERP, la reprise après fermeture.'));

      corps.appendChild(UI.bouton('Tester la pile de cartes', 'btn-primaire', function(){
        UI.aller('banc-cartes');
      }));

      corps.appendChild(UI.bouton('Inscrire 3 risques d\'exemple', 'btn-fantome', function(){
        Etat.ajouterRisque('Laboratoire', { libelle:'Chute de hauteur (escalier du sous-sol)', nature:'Chute de hauteur', source:'test' });
        Etat.ajouterRisque('Laboratoire', { libelle:'Éclairage vieillissant', nature:'Ambiance de travail', source:'test' });
        var r = Etat.ajouterRisque('Laboratoire', { libelle:'RPS (isolement, charge)', nature:'Risques psychosociaux', visible:false, source:'test' });
        Etat.coter(r.id, 3, 3);
        Etat.majRisque(r.id, { mesureChoisie:'Binôme et point hebdomadaire' });
        Carnet.signaler('3 risques d\'exemple');
        UI.rejouerEcran();
      }));

      corps.appendChild(UI.bouton('Ouvrir le carnet DUERP', 'btn-fantome', function(){
        Carnet.ouvrir();
      }));

      corps.appendChild(UI.el('div', { class:'carte' }, [
        UI.el('div', { class:'sur-titre gris', texte:'État de la sauvegarde' }),
        UI.el('p', { class:'texte', texte:
          Etat.nbRisques() + ' risque(s) · ' + Etat.get().historique.length + ' décision(s) journalisée(s)' }),
        UI.el('p', { class:'texte', style:{fontSize:'13px'}, texte:
          'Fermez l\'onglet puis rouvrez : vous devez revenir exactement ici.' })
      ]));

      var pied = UI.el('div', { class:'pied' }, [
        UI.bouton('Tout effacer', 'btn-discret', function(){
          if(confirm('Effacer la partie enregistrée ?')){
            Etat.reinitialiser();
            UI.aller('accueil', {}, { racine:true });
          }
        }, { petit:true })
      ]);

      hote.appendChild(corps);
      hote.appendChild(pied);
    }
  });

  UI.ecran('banc-cartes', {
    chrome:true, titre:'Pile de cartes', carnet:true, parent:'banc',
    monter: function(hote){
      var corps = UI.el('div', { class:'corps', style:{gap:'12px', paddingBottom:'8px'} });
      corps.appendChild(UI.entete('Fréquence', 'Cette formulation, elle est claire ?',
        'Tapez un bouton, ou glissez la carte. C\'est vous qui tranchez.'));

      var zone = UI.el('div', { class:'pile-zone',
        style:{flex:'1',display:'flex',flexDirection:'column',minHeight:'340px'} });
      corps.appendChild(zone);
      hote.appendChild(corps);

      /* Les cartes ne disent PAS si l'echelle est floue ou precise : c'est au
         joueur de le decider. Le jeu ne doit jamais donner le verdict avant
         que le joueur ne se soit prononce. */
      PileCartes.creer({
        hote: zone,
        cartes: [
          { id:'c1', kicker:'À quelle fréquence ?', titre:'Rare' },
          { id:'c2', kicker:'À quelle fréquence ?', titre:'Parfois' },
          { id:'c3', kicker:'À quelle fréquence ?', titre:'Moins d\'1 fois par an' },
          { id:'c4', kicker:'À quelle fréquence ?', titre:'Souvent' },
          { id:'c5', kicker:'À quelle fréquence ?', titre:'1 à 10 fois par an' },
          { id:'c6', kicker:'À quelle fréquence ?', titre:'Tous les jours' }
        ],
        gauche:{ libelle:'C\'est flou',   tampon:'FLOU' },
        droite:{ libelle:'C\'est précis', tampon:'PRÉCIS' },
        onDecision: function(carte, sens){
          Etat.journaliser('jugement-echelle', { carte:carte.id, jugement:sens });
          Etat.sauvegarderPartie();
        },
        onFin: function(decisions){
          var precises = decisions.filter(function(d){ return d.sens === 'droite'; }).length;
          zone.appendChild(UI.el('div', { class:'carte', style:{marginTop:'8px'} }, [
            UI.el('div', { class:'sur-titre', texte:'Vos jugements' }),
            UI.el('p', { class:'texte', texte:'Vous avez jugé ' + precises
              + ' formulation(s) précise(s) sur ' + decisions.length + '.' }),
            UI.bouton('Recommencer', 'btn-fantome', function(){ UI.rejouerEcran(); }, { petit:true })
          ]));
        }
      });
    }
  });

  /* ============================= Demarrage ============================= */

  function demarrer(){
    UI.init();
    Carnet.init();

    UI.chargerJSON('data/parcours.json', SECOURS).then(function(contenu){
      parcours = contenu || SECOURS;
      Etat.chargerPartie();
      UI.aller('accueil', {}, { racine:true });
    });
  }

  return { demarrer:demarrer, parcours:function(){ return parcours; } };

})();

document.addEventListener('DOMContentLoaded', App.demarrer);
