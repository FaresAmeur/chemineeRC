// Documentation théorique du modèle — VERSION COMPLÈTE ET CORRIGÉE

import { useRef } from 'react';
import { Download, BookOpen } from 'lucide-react';

export function TheoryDocumentation() {
  const contentRef = useRef<HTMLDivElement>(null);

  const handleExport = () => {
    if (!contentRef.current) return;

    const content = contentRef.current.innerHTML;
    const blob = new Blob([
      `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Documentation Théorique — Simulateur de Cheminée Maçonnée</title>
  <style>
    body { font-family: 'Times New Roman', serif; max-width: 900px; margin: 40px auto; padding: 20px; line-height: 1.6; color: #1e293b; }
    h1 { color: #1e293b; border-bottom: 2px solid #3b82f6; padding-bottom: 10px; }
    h2 { color: #334155; margin-top: 30px; border-bottom: 1px solid #e2e8f0; padding-bottom: 5px; }
    h3 { color: #475569; }
    h4 { color: #64748b; margin-top: 15px; }
    code { background: #f1f5f9; padding: 2px 6px; border-radius: 3px; font-family: 'Consolas', monospace; font-size: 0.9em; }
    pre { background: #f8fafc; padding: 15px; border-radius: 6px; overflow-x: auto; border: 1px solid #e2e8f0; font-family: 'Consolas', monospace; }
    .formula { background: #eff6ff; padding: 15px; border-left: 4px solid #3b82f6; margin: 15px 0; font-family: 'Times New Roman', serif; font-size: 1.05em; }
    .formula-secondary { background: #f0fdf4; padding: 12px; border-left: 4px solid #22c55e; margin: 10px 0; font-family: 'Times New Roman', serif; }
    table { border-collapse: collapse; width: 100%; margin: 20px 0; }
    th, td { border: 1px solid #cbd5e1; padding: 10px; text-align: left; }
    th { background: #f1f5f9; font-weight: bold; }
    .warning { background: #fef3c7; padding: 12px 15px; border-radius: 6px; border-left: 4px solid #f59e0b; margin: 15px 0; }
    .info { background: #eff6ff; padding: 12px 15px; border-radius: 6px; border-left: 4px solid #3b82f6; margin: 15px 0; }
    .success { background: #f0fdf4; padding: 12px 15px; border-radius: 6px; border-left: 4px solid #22c55e; margin: 15px 0; }
    @media print { body { font-size: 11pt; } .formula { break-inside: avoid; } }
  </style>
</head>
<body>${content}</body>
</html>`
    ], { type: 'text/html' });

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'documentation-theorique-cheminee-v3.html';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <BookOpen className="w-6 h-6 text-blue-400" />
          <h2 className="text-xl font-bold text-slate-100">Documentation Théorique</h2>
        </div>
        <button
          onClick={handleExport}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
        >
          <Download className="w-4 h-4" />
          Exporter HTML
        </button>
      </div>

      <div
        ref={contentRef}
        className="prose prose-invert prose-slate max-w-none bg-slate-800/40 rounded-xl p-6 border border-slate-700"
      >
        <h1>Simulateur Analytique de Cheminée Maçonnée</h1>
        <p><em>Modèle RC Transitoire 1D Couplé Solide-Fluide — Version 3.0</em></p>

        {/* ================================================================= */}
        {/* SECTION 0: VULGARISATION */}
        {/* ================================================================= */}

        <div className="bg-blue-900/30 p-5 rounded-lg border border-blue-800/50 my-6">
          <h2 className="text-blue-300 !mt-0 !border-none">0. Comprendre la Physique (Vulgarisation)</h2>
          <p>
            Avant d'entrer dans les équations, voici les phénomènes physiques clés modélisés par ce simulateur :
          </p>
          <ul>
            <li><strong>Le Tirage Naturel (effet cheminée) :</strong> L'air chaud est plus léger (moins dense) que l'air froid.
            Dans un conduit vertical, cette différence de densité crée une force motrice naturelle : l'air chaud de l'appartement « flotte »
            vers le haut du conduit, créant une dépression en bas qui aspire de l'air frais. Plus il fait froid dehors et chaud dedans,
            plus ce tirage est intense. C'est exactement le même principe que celui qui fait monter la fumée dans une cheminée de foyer.</li>
            <li><strong>Dépression vs Surpression :</strong> Un conduit de ventilation fonctionne idéalement en <em>dépression</em>
            (pression intérieure inférieure à la pression extérieure) : il aspire l'air. Si le conduit est en <em>surpression</em>
            (par exemple un ventilateur qui pousse l'air dans un conduit bouché), l'air peut fuir par les joints et fissures
            de la maçonnerie vers les pièces habitées — risque d'intoxication au CO, de moisissures, ou de nuisances olfactives.</li>
            <li><strong>L'Inertie Thermique de la Maçonnerie :</strong> La brique pèse lourd (≈ 1800 kg/m³) et stocke beaucoup
            de chaleur (capacité thermique massique = 840 J/kg·K). Un conduit maçonné de 20 m de haut avec 22 cm d'épaisseur
            représente environ <strong>3 600 kg</strong> de terre cuite, soit une capacité thermique de <strong>~840 Wh/K</strong>.
            Cela signifie que la brique met des heures à se réchauffer ou se refroidir — un phénomène que le modèle RC capture via
            ses « capacités thermiques » discrètes.</li>
            <li><strong>Puissance vs Énergie :</strong> La <em>puissance thermique</em> (en Watts) est le taux instantané
            auquel la cheminée soustrait de la chaleur au bâtiment. L'<em>énergie cumulée</em> (en kWh) est le total de chaleur
            perdue sur toute la durée de simulation — c'est cette quantité qui impacte la facture de chauffage.</li>
            <li><strong>Effet Venturi en Toiture :</strong> Le vent passant au-dessus du sommet de la cheminée crée une
            zone de dépression (comme une aile d'avion), qui « aspire » l'air vers le haut et renforce le tirage.</li>
          </ul>
        </div>

        {/* ================================================================= */}
        {/* SECTION 1: INTRODUCTION */}
        {/* ================================================================= */}

        <h2>1. Introduction et Objectifs</h2>
        <p>
          Ce simulateur modélise le comportement thermique transitoire d'une cheminée maçonnée (conduit de fumée collectif)
          équipée d'un ventilateur, sur des durées allant de 15 minutes à 48 heures. Il prédit l'évolution temporelle de :
        </p>
        <ul>
          <li>la température de l'air le long du conduit (profil axial),</li>
          <li>la distribution de température dans l'épaisseur de la maçonnerie (profil radial),</li>
          <li>la température de l'appartement connecté au conduit,</li>
          <li>le débit d'air, la vitesse, et les pertes de pression,</li>
          <li>la puissance et l'énergie thermique échangées.</li>
        </ul>
        <div className="warning">
          <strong>Note importante :</strong> Ce modèle est une approximation analytique 1D, et <strong>non</strong> une simulation CFD.
          Il remplace les calculs CFD lourds (Fluent, OpenFOAM) par un modèle RC (résistance-capacité) adapté aux études paramétriques rapides.
          <strong> Aucun time-scaling n'est appliqué</strong> : 1 seconde simulée = 1 seconde physique réelle.
          Le schéma numérique est <strong>semi-implicite</strong> avec pas de temps adaptatif, ce qui permet d'atteindre des vitesses
          de calcul de l'ordre de 6h simulées en &lt; 500 ms.
        </div>

        {/* ================================================================= */}
        {/* SECTION 2: DESCRIPTION DU SYSTÈME */}
        {/* ================================================================= */}

        <h2>2. Description du Système</h2>
        <p>Le système étudié comprend :</p>
        <ul>
          <li>Un conduit maçonné vertical de hauteur totale configurable (20 m par défaut), dont la partie au-dessus du toit est de 1 m.</li>
          <li>Un coude (45° par défaut) situé à 0.5 m depuis le bas du conduit, au point de raccordement à l'appartement.</li>
          <li>Un ventilateur configurable en position (haut/bas) et en mode (aspiration/poussée), avec courbe P(Q) réaliste.</li>
          <li>Une paroi cylindrique en terre cuite (ou béton, inox, brique réfractaire) de 22 cm d'épaisseur, discrétisée radialement.</li>
          <li>Un appartement modélisé comme un volume d'air unique avec inertie thermique, infiltrations et déperditions.</li>
        </ul>

        <h3>2.1 Géométrie par défaut</h3>
        <table>
          <thead>
            <tr><th>Paramètre</th><th>Symbole</th><th>Valeur</th><th>Unité</th></tr>
          </thead>
          <tbody>
            <tr><td>Hauteur totale du conduit</td><td>H</td><td>20.0</td><td>m</td></tr>
            <tr><td>Hauteur jusqu'au toit</td><td>H<sub>toit</sub></td><td>19.0</td><td>m</td></tr>
            <tr><td>Diamètre intérieur</td><td>D<sub>int</sub></td><td>0.15</td><td>m</td></tr>
            <tr><td>Épaisseur du boisseau</td><td>e</td><td>0.22</td><td>m</td></tr>
            <tr><td>Diamètre extérieur</td><td>D<sub>ext</sub> = D<sub>int</sub> + 2e</td><td>0.59</td><td>m</td></tr>
            <tr><td>Rugosité relative</td><td>ε/D</td><td>0.01</td><td>—</td></tr>
            <tr><td>Angle du coude</td><td>θ</td><td>45</td><td>°</td></tr>
            <tr><td>Position du coude</td><td>z<sub>coude</sub></td><td>0.5</td><td>m</td></tr>
            <tr><td>Segments axiaux (discrétisation)</td><td>N<sub>z</sub></td><td>20</td><td>—</td></tr>
            <tr><td>Nœuds radiaux (boisseau)</td><td>N<sub>r</sub></td><td>4</td><td>—</td></tr>
          </tbody>
        </table>
        <p>Le rapport L/D = 20/0.15 = 133, ce qui justifie l'hypothèse d'écoulement 1D développé sur la quasi-totalité du conduit.</p>

        <h3>2.2 Propriétés des matériaux</h3>
        <table>
          <thead>
            <tr><th>Propriété</th><th>Terre cuite</th><th>Béton</th><th>Inox</th><th>Brique réfractaire</th><th>Unité</th></tr>
          </thead>
          <tbody>
            <tr><td>Densité (ρ<sub>s</sub>)</td><td>1800</td><td>2200</td><td>7900</td><td>2000</td><td>kg/m³</td></tr>
            <tr><td>Capacité thermique (c<sub>s</sub>)</td><td>840</td><td>880</td><td>500</td><td>900</td><td>J/kg·K</td></tr>
            <tr><td>Conductivité (k<sub>s</sub>)</td><td>0.72</td><td>1.4</td><td>15</td><td>1.0</td><td>W/m·K</td></tr>
            <tr><td>Émissivité (ε<sub>r</sub>)</td><td>0.9</td><td>0.85</td><td>0.2</td><td>0.85</td><td>—</td></tr>
            <tr><td>Diffusivité (α = k/ρc)</td><td>4.76×10⁻⁷</td><td>7.23×10⁻⁷</td><td>3.80×10⁻⁶</td><td>5.56×10⁻⁷</td><td>m²/s</td></tr>
          </tbody>
        </table>

        {/* ================================================================= */}
        {/* SECTION 3: PROPRIÉTÉS DE L'AIR */}
        {/* ================================================================= */}

        <h2>3. Propriétés Thermo-physiques de l'Air</h2>
        <p>
          Les propriétés de l'air sont calculées dynamiquement en fonction de la température (et de l'humidité pour c<sub>p</sub>),
          et non prises constantes. Elles sont regroupées dans une fonction unique (<code>calcAirProps</code>) et
          calculées <strong>une seule fois par pas de temps</strong> à la température moyenne de l'air dans le conduit.
        </p>

        <h3>3.1 Masse volumique — Loi des gaz parfaits</h3>
        <div className="formula">
          ρ = P / (R · T)
        </div>
        <p>Avec R = 287 J/kg·K (constante de l'air sec), T en Kelvin, P en Pascals.</p>
        <p>Ordres de grandeur : ρ(0°C) ≈ 1.29 kg/m³, ρ(20°C) ≈ 1.20 kg/m³, ρ(40°C) ≈ 1.13 kg/m³.</p>

        <h3>3.2 Viscosité dynamique — Loi de Sutherland</h3>
        <div className="formula">
          μ = μ<sub>ref</sub> · (T / T<sub>ref</sub>)<sup>3/2</sup> · (T<sub>ref</sub> + S) / (T + S)
        </div>
        <p>Avec μ<sub>ref</sub> = 1.716×10⁻⁵ Pa·s, T<sub>ref</sub> = 273.15 K, S = 110.4 K.</p>
        <p><em>Référence : Sutherland, W. (1893). Philosophical Magazine, 36(223), 507-531.</em></p>
        <p>Ordres de grandeur : μ(0°C) ≈ 1.72×10⁻⁵ Pa·s, μ(20°C) ≈ 1.82×10⁻⁵ Pa·s.</p>

        <h3>3.3 Conductivité thermique</h3>
        <div className="formula">
          k<sub>air</sub> = 0.0241 · (T / 273.15)<sup>0.9</sup> &nbsp; [W/m·K]
        </div>
        <p>Corrélation empirique valide entre -20°C et 100°C. Ordres de grandeur : k(0°C) ≈ 0.024, k(20°C) ≈ 0.026 W/m·K.</p>

        <h3>3.4 Capacité thermique massique</h3>
        <div className="formula">
          c<sub>p</sub> = 1005 + 1.86 · (HR × 100) &nbsp; [J/kg·K]
        </div>
        <p>
          Où HR est l'humidité relative (fraction 0-1). L'augmentation est légère (≈ +120 J/kg·K à 65% HR).
          Le nombre de Prandtl de l'air est pris constant : <strong>Pr = 0.71</strong>.
        </p>

        <h3>3.5 Constantes physiques utilisées</h3>
        <table>
          <thead>
            <tr><th>Constante</th><th>Symbole</th><th>Valeur</th><th>Unité</th></tr>
          </thead>
          <tbody>
            <tr><td>Accélération gravitationnelle</td><td>g</td><td>9.81</td><td>m/s²</td></tr>
            <tr><td>Constante gaz parfait air</td><td>R</td><td>287</td><td>J/kg·K</td></tr>
            <tr><td>Pression atmosphérique</td><td>P<sub>atm</sub></td><td>101 325</td><td>Pa</td></tr>
            <tr><td>Constante de Stefan-Boltzmann</td><td>σ</td><td>5.67×10⁻⁸</td><td>W/m²·K⁴</td></tr>
          </tbody>
        </table>

        {/* ================================================================= */}
        {/* SECTION 4: MODÈLE HYDRAULIQUE */}
        {/* ================================================================= */}

        <h2>4. Modèle Hydraulique</h2>

        <h3>4.1 Équation d'équilibre des pressions</h3>
        <p>Le débit d'air est déterminé par l'équilibre des forces motrices et résistantes :</p>
        <div className="formula">
          ΔP<sub>ventilateur</sub> + ΔP<sub>tirage</sub> + ΔP<sub>venturi</sub> = ΔP<sub>friction</sub> + Σ K<sub>i</sub> · (ρv²/2)
        </div>
        <p>Où :</p>
        <ul>
          <li><strong>ΔP<sub>ventilateur</sub></strong> : pression fournie par le ventilateur, selon sa courbe P(Q) (§4.6)</li>
          <li><strong>ΔP<sub>tirage</sub></strong> : tirage thermique naturel, intégré segment par segment (§4.4)</li>
          <li><strong>ΔP<sub>venturi</sub></strong> : dépression en toiture due au vent (§4.5)</li>
          <li><strong>ΔP<sub>friction</sub></strong> : pertes de charge réparties Darcy-Weisbach (§4.2)</li>
          <li><strong>Σ K<sub>i</sub></strong> : somme des pertes singulières (§4.3)</li>
        </ul>

        <h3>4.2 Pertes de charge réparties — Darcy-Weisbach</h3>
        <div className="formula">
          ΔP<sub>friction</sub> = f · (L / D) · (ρ · v² / 2)
        </div>
        <p>Le facteur de friction <code>f</code> (facteur de Darcy, sans dimension) est déterminé selon le régime :</p>

        <h4>Régime laminaire (Re &lt; 2300)</h4>
        <div className="formula-secondary">
          f = 64 / Re
        </div>
        <p>Solution exacte de Poiseuille pour un écoulement laminaire en conduit circulaire.</p>

        <h4>Zone de transition (2300 ≤ Re &lt; 4000)</h4>
        <div className="formula-secondary">
          f = f<sub>lam</sub>(2300) + [(Re - 2300) / 1700] · [f<sub>turb</sub>(4000) - f<sub>lam</sub>(2300)]
        </div>
        <p>Interpolation linéaire entre les deux régimes pour éviter toute discontinuité.</p>

        <h4>Régime turbulent (Re ≥ 4000) — Swamee-Jain</h4>
        <div className="formula">
          f = 0.25 / [log₁₀(ε / (3.7·D) + 5.74 / Re<sup>0.9</sup>)]²
        </div>
        <p>
          Cette approximation explicite de l'équation implicite de Colebrook-White a une erreur inférieure à 1%
          pour 10⁻⁶ &lt; ε/D &lt; 10⁻² et 5000 &lt; Re &lt; 10⁸.
        </p>
        <p><em>Références : Swamee & Jain (1976), Moody chart, Colebrook-White equation.</em></p>

        <h3>4.3 Pertes de charge singulières</h3>
        <div className="formula">
          ΔP<sub>singulière</sub> = Σ K<sub>i</sub> · (ρ · v² / 2)
        </div>
        <table>
          <thead>
            <tr><th>Élément</th><th>Coefficient K</th><th>Source</th></tr>
          </thead>
          <tbody>
            <tr><td>Entrée à arêtes vives</td><td>0.5</td><td>Idel'cik</td></tr>
            <tr><td>Coude 45°</td><td>0.3</td><td>Idel'cik</td></tr>
            <tr><td>Coude 90°</td><td>0.75</td><td>Idel'cik</td></tr>
            <tr><td>Traversée toiture</td><td>0.5</td><td>Estimation</td></tr>
            <tr><td>Sortie libre</td><td>1.0</td><td>Standard</td></tr>
          </tbody>
        </table>
        <p>
          Pour des angles intermédiaires, K est interpolé linéairement : K(θ) = K(45°) · (θ/45°) pour θ ≤ 45°,
          puis K(θ) = K(45°) + [(θ-45°)/45°] · [K(90°) - K(45°)] pour 45° &lt; θ ≤ 90°.
        </p>
        <div className="info">
          <strong>Convention de signe :</strong> Les pertes de charge s'opposent <em>toujours</em> au sens du flux.
          Le code utilise |v|·v pour conserver le signe correctement, que le flux soit montant (v &gt; 0) ou descendant (v &lt; 0).
        </div>

        <h3>4.4 Tirage thermique — Intégration segment par segment</h3>
        <p>
          Le tirage thermique est calculé par intégration discrète le long du conduit, et <strong>non</strong> par la formule simplifiée
          à température moyenne unique. Cela permet de capturer les gradients axiaux de température :
        </p>
        <div className="formula">
          ΔP<sub>tirage</sub> = Σ<sub>i=1..N</sub> g · (ρ<sub>ext</sub> - ρ<sub>int</sub>(T<sub>air,i</sub>)) · Δz
        </div>
        <p>
          Où ρ<sub>ext</sub> = P/(R·T<sub>ext</sub>) et ρ<sub>int</sub>(T<sub>air,i</sub>) = P/(R·T<sub>air,i</sub>) sont calculés
          segment par segment. Si l'air intérieur est globalement plus chaud que l'extérieur (ρ<sub>int</sub> &lt; ρ<sub>ext</sub>),
          le tirage est <strong>positif</strong> → flux montant naturel.
        </p>
        <p>
          La formule simplifiée classique ΔP = g·H·(ρ<sub>ext</sub> - ρ<sub>int,moy</sub>) est conservée dans le code
          pour compatibilité, mais n'est <strong>pas utilisée</strong> par le solveur principal.
        </p>

        <h3>4.5 Dépression Venturi en toiture</h3>
        <p>Le vent passant au-dessus du conduit crée une dépression qui aide le tirage (aspiration en sortie) :</p>
        <div className="formula">
          ΔP<sub>venturi</sub> = −½ · C<sub>p</sub> · ρ<sub>ext</sub> · v<sub>vent</sub>²
        </div>
        <p>
          Avec C<sub>p</sub> ≈ −0.5 (coefficient de pression pour toiture plate, zone d'aspiration).
          Le résultat est <strong>positif</strong> → aide le flux montant.
        </p>
        <p>Ordres de grandeur : ΔP<sub>venturi</sub> ≈ 0.4 Pa pour un vent de 2 m/s, ≈ 4 Pa pour 6 m/s.</p>

        <h3>4.6 Modèle du ventilateur — Courbe P(Q)</h3>
        <p>
          Le ventilateur est modélisé par une courbe pression-débit <strong>réaliste</strong> (et non un ΔP constant) :
        </p>
        <div className="formula">
          P<sub>fan</sub> = P<sub>max</sub> · [1 − (Q / Q<sub>max</sub>)²]<sup>0.8</sup>
        </div>
        <p>
          Où P<sub>max</sub> est la pression maximale à débit nul et Q<sub>max</sub> est le débit maximum à pression nulle.
          L'exposant 0.8 donne une courbe légèrement plus plate qu'une parabole pure, typique des ventilateurs centrifuges.
        </p>
        <p>Le <strong>signe</strong> de P<sub>fan</sub> dépend de la configuration :</p>
        <table>
          <thead>
            <tr><th>Position</th><th>Mode</th><th>Action sur le flux</th><th>Signe</th></tr>
          </thead>
          <tbody>
            <tr><td>Haut</td><td>Aspiration</td><td>Tire l'air vers le haut</td><td>+1 (aide v &gt; 0)</td></tr>
            <tr><td>Bas</td><td>Poussée</td><td>Pousse l'air vers le haut</td><td>+1 (aide v &gt; 0)</td></tr>
            <tr><td>Bas</td><td>Aspiration</td><td>Tire l'air vers le bas</td><td>−1 (aide v &lt; 0)</td></tr>
            <tr><td>Haut</td><td>Poussée</td><td>Pousse l'air vers le bas</td><td>−1 (aide v &lt; 0)</td></tr>
          </tbody>
        </table>
        <p>
          En <strong>mode automatique</strong>, le ventilateur s'active lorsque T<sub>ext</sub> &lt; T<sub>appartement</sub>
          (conditions de chauffage) et se coupe lorsque la condition n'est plus remplie.
        </p>
        <p>Valeurs par défaut (PRO S6 150 mm) : P<sub>max</sub> = 503 Pa, Q<sub>max</sub> = 683 m³/h (0.190 m³/s), puissance = 38 W.</p>

        <h3>4.7 Résolution numérique du débit — Solveur sécante/bisection</h3>
        <p>
          L'équation d'équilibre est <strong>non linéaire</strong> car le facteur de friction f dépend de Re,
          qui dépend de v — la vitesse inconnue. L'algorithme de résolution est :
        </p>
        <ol>
          <li><strong>Scan rapide</strong> (60 points entre −20 et +20 m/s) : évalue la fonction résidu
          R(v) = ΔP<sub>tirage</sub> + ΔP<sub>fan</sub> + ΔP<sub>venturi</sub> − ΔP<sub>pertes</sub>(v) et cherche
          un changement de signe (bracket).</li>
          <li><strong>Méthode sécante</strong> dans le bracket trouvé : convergence super-linéaire (ordre ≈ 1.618),
          avec vérification que chaque itération réduit le résidu.</li>
          <li><strong>Fallback bisection</strong> si la sécante ne progresse pas : convergence garantie mais plus lente (linéaire).</li>
          <li>Si aucun bracket n'est trouvé → retourne la vitesse de plus faible résidu.</li>
        </ol>
        <p>Critères d'arrêt : |R(v)| &lt; 10⁻⁵ Pa ou |v<sub>B</sub> − v<sub>A</sub>| &lt; 10⁻⁶ m/s, maximum 40 itérations.</p>

        {/* ================================================================= */}
        {/* SECTION 5: THERMIQUE AIR */}
        {/* ================================================================= */}

        <h2>5. Modèle Thermique de l'Air (1D Axial Transitoire)</h2>

        <h3>5.1 Équation de conservation d'énergie</h3>
        <p>Pour chaque segment axial <em>i</em> du conduit, l'équation d'énergie s'écrit :</p>
        <div className="formula">
          ρ · A · c<sub>p</sub> · ∂T<sub>f</sub>/∂t &nbsp;+&nbsp; ṁ · c<sub>p</sub> · ∂T<sub>f</sub>/∂z &nbsp;=&nbsp; h<sub>i</sub> · 𝒫 · (T<sub>s,i</sub> − T<sub>f,i</sub>)
        </div>
        <table>
          <thead>
            <tr><th>Symbole</th><th>Signification</th><th>Unité</th></tr>
          </thead>
          <tbody>
            <tr><td>T<sub>f,i</sub></td><td>Température de l'air dans le segment i</td><td>°C</td></tr>
            <tr><td>T<sub>s,i</sub></td><td>Température de la face interne du boisseau au segment i</td><td>°C</td></tr>
            <tr><td>𝒫 = π · D<sub>int</sub></td><td>Périmètre intérieur du conduit</td><td>m</td></tr>
            <tr><td>A = π · D<sub>int</sub>² / 4</td><td>Section du conduit</td><td>m²</td></tr>
            <tr><td>h<sub>i</sub></td><td>Coefficient de convection interne</td><td>W/m²·K</td></tr>
            <tr><td>ṁ = ρ · A · v</td><td>Débit massique</td><td>kg/s</td></tr>
          </tbody>
        </table>

        <h3>5.2 Schéma numérique semi-implicite</h3>
        <p>Le schéma combine deux traitements distincts :</p>

        <h4>a) Advection : schéma upwind explicite</h4>
        <p>Le gradient spatial est discrétisé en amont (upwind) selon le sens de l'écoulement :</p>
        <div className="formula-secondary">
          Si v &gt; 0 (flux montant) : &nbsp; ∂T/∂z ≈ (T<sub>i</sub> − T<sub>i−1</sub>) / Δz<br/>
          Si v &lt; 0 (flux descendant) : &nbsp; ∂T/∂z ≈ (T<sub>i+1</sub> − T<sub>i</sub>) / Δz
        </div>
        <p>Conditions aux limites :</p>
        <ul>
          <li>v &gt; 0 : T<sub>entrée</sub> = T<sub>appartement</sub> (air aspiré depuis l'appartement)</li>
          <li>v &lt; 0 : T<sub>entrée</sub> = T<sub>ext</sub> (air extérieur aspiré par le haut)</li>
        </ul>

        <h4>b) Échange air-paroi : traitement implicite</h4>
        <p>L'échange thermique avec la paroi est traité implicitement pour une stabilité inconditionnelle :</p>
        <div className="formula">
          T<sub>i</sub><sup>n+1</sup> = (T<sub>i</sub><sup>n</sup> + Δt · Adv<sub>i</sub> + α · T<sub>s,i</sub>) / (1 + α)
        </div>
        <p>Avec le coefficient de couplage adimensionnel :</p>
        <div className="formula-secondary">
          α = Δt · h<sub>i</sub> · 𝒫 / (ρ · c<sub>p</sub> · A)
        </div>
        <p>Et le terme d'advection explicite :</p>
        <div className="formula-secondary">
          Adv<sub>i</sub> = −v · (∂T/∂z)<sub>upwind</sub>
        </div>
        <div className="success">
          <strong>Avantage du semi-implicite :</strong> Le traitement implicite de l'échange air-paroi rend le schéma
          <strong> inconditionnellement stable</strong> vis-à-vis du couplage thermique (pas de restriction de Δt liée à h<sub>i</sub>).
          Seule la condition CFL de l'advection impose une contrainte sur le pas de temps.
        </div>

        <h4>c) Clamp physique</h4>
        <p>
          Après chaque pas, les températures d'air sont bornées à [T<sub>min</sub> − 0.5, T<sub>max</sub> + 0.5] °C,
          où T<sub>min</sub> et T<sub>max</sub> englobent toutes les sources/puits thermiques (T<sub>ext</sub>, T<sub>app</sub>,
          T<sub>s,int</sub>, T<sub>s,ext</sub>). Cette sécurité prévient les oscillations non physiques en cas de CFL proche de 1.
        </p>

        {/* ================================================================= */}
        {/* SECTION 6: THERMIQUE MAÇONNERIE */}
        {/* ================================================================= */}

        <h2>6. Modèle Thermique de la Maçonnerie (Réseau RC Radial)</h2>

        <h3>6.1 Équation de diffusion radiale</h3>
        <p>La conduction dans la paroi cylindrique est modélisée par l'équation de Fourier en coordonnées cylindriques :</p>
        <div className="formula">
          ρ<sub>s</sub> · c<sub>s</sub> · ∂T<sub>s</sub>/∂t = (1/r) · ∂/∂r (r · k<sub>s</sub> · ∂T<sub>s</sub>/∂r)
        </div>
        <p>
          Le boisseau est discrétisé en <strong>N<sub>r</sub> = 4 nœuds</strong> répartis uniformément
          sur l'épaisseur (Δr = e / N<sub>r</sub> ≈ 55 mm pour e = 0.22 m).
        </p>

        <h3>6.2 Analogie réseau RC</h3>
        <p>Chaque nœud radial <em>j</em> est caractérisé par :</p>

        <h4>Capacité thermique (J/K)</h4>
        <div className="formula-secondary">
          C<sub>j</sub> = ρ<sub>s</sub> · c<sub>s</sub> · π · (r<sub>j+1</sub>² − r<sub>j</sub>²) · Δz
        </div>
        <p>Où r<sub>j</sub> = r<sub>int</sub> + j·Δr et r<sub>j+1</sub> = r<sub>j</sub> + Δr.</p>

        <h4>Résistance de conduction entre nœuds j et j+1 (K/W)</h4>
        <div className="formula-secondary">
          R<sub>cond,j</sub> = ln(r<sub>c,j+1</sub> / r<sub>c,j</sub>) / (2π · k<sub>s</sub> · Δz)
        </div>
        <p>Où r<sub>c,j</sub> = r<sub>int</sub> + (j + 0.5)·Δr est le rayon au centre du nœud j (résistance logarithmique cylindrique).</p>

        <h3>6.3 Bilan nodal et intégration temporelle</h3>
        <p>Pour chaque nœud j, la mise à jour est <strong>Euler explicite</strong> :</p>
        <div className="formula">
          T<sub>s,j</sub><sup>n+1</sup> = T<sub>s,j</sub><sup>n</sup> + (Σ Φ<sub>j</sub> / C<sub>j</sub>) · Δt
        </div>
        <p>Les flux Φ<sub>j</sub> entrant dans chaque nœud sont :</p>
        <ul>
          <li><strong>Nœud 0 (face interne) :</strong> Φ = h<sub>i</sub> · A<sub>int</sub> · (T<sub>air</sub> − T<sub>s,0</sub>) + (T<sub>s,1</sub> − T<sub>s,0</sub>) / R<sub>cond,0</sub></li>
          <li><strong>Nœuds internes (1 ≤ j ≤ N<sub>r</sub>−2) :</strong> Φ = (T<sub>s,j-1</sub> − T<sub>s,j</sub>) / R<sub>cond,j-1</sub> + (T<sub>s,j+1</sub> − T<sub>s,j</sub>) / R<sub>cond,j</sub></li>
          <li><strong>Nœud N<sub>r</sub>−1 (face externe) :</strong> Φ = (T<sub>s,j-1</sub> − T<sub>s,j</sub>) / R<sub>cond,j-1</sub> + h<sub>e</sub> · A<sub>ext</sub> · (T<sub>ext</sub> − T<sub>s,j</sub>)</li>
        </ul>
        <p>Avec A<sub>int</sub> = 2π · r<sub>int</sub> · Δz et A<sub>ext</sub> = 2π · r<sub>ext</sub> · Δz.</p>

        <div className="info">
          <strong>Stabilité de la diffusion radiale :</strong> Le pas de temps critique de Fourier est
          Δt<sub>max</sub> = Δr² / (2α) ≈ {(0.055*0.055 / (2 * 4.76e-7)).toFixed(0)} s pour la terre cuite (Δr ≈ 55 mm).
          C'est largement supérieur au Δt typique de simulation (0.05 à 30 s), donc la diffusion radiale n'est
          <strong> jamais le facteur limitant</strong> pour la stabilité.
        </div>

        <h3>6.4 Conditions aux limites</h3>
        <table>
          <thead>
            <tr><th>Frontière</th><th>Type</th><th>Formulation</th></tr>
          </thead>
          <tbody>
            <tr><td>Paroi interne (r = r<sub>int</sub>)</td><td>Convection interne</td><td>q = h<sub>i</sub> · (T<sub>air</sub> − T<sub>s,0</sub>)</td></tr>
            <tr><td>Paroi externe (r = r<sub>ext</sub>)</td><td>Convection externe combinée</td><td>q = h<sub>e</sub> · (T<sub>ext</sub> − T<sub>s,N-1</sub>)</td></tr>
          </tbody>
        </table>

        <h3>6.5 Résistances thermiques par unité de longueur</h3>
        <p>Pour les calculs analytiques de validation, les résistances unitaires (m·K/W) sont :</p>
        <div className="formula-secondary">
          R'<sub>conv,i</sub> = 1 / (h<sub>i</sub> · π · D<sub>int</sub>) &nbsp;&nbsp;&nbsp;
          R'<sub>cond</sub> = ln(D<sub>ext</sub> / D<sub>int</sub>) / (2π · k<sub>s</sub>) &nbsp;&nbsp;&nbsp;
          R'<sub>conv,e</sub> = 1 / (h<sub>e</sub> · π · D<sub>ext</sub>)
        </div>

        {/* ================================================================= */}
        {/* SECTION 7: CORRÉLATIONS DE CONVECTION */}
        {/* ================================================================= */}

        <h2>7. Corrélations de Convection</h2>

        <h3>7.1 Convection interne (h<sub>i</sub>)</h3>
        <p>Le nombre de Nusselt interne est calculé selon le régime d'écoulement :</p>

        <h4>Laminaire établi (Re &lt; 2300, Gz &lt; 10)</h4>
        <div className="formula-secondary">
          Nu = 3.66
        </div>
        <p>Valable pour un conduit circulaire avec température de paroi uniforme. Référence : Shah & London (1978).</p>

        <h4>Laminaire en développement thermique (Re &lt; 2300, Gz ≥ 10)</h4>
        <div className="formula-secondary">
          Nu = 1.953 · Gz<sup>1/3</sup> &nbsp;&nbsp; avec &nbsp; Gz = Re · Pr / (L/D)
        </div>
        <p>Corrélation de Graetz (1883) pour la zone d'entrée thermique, où le profil de température n'est pas encore établi.</p>

        <h4>Transition (2300 ≤ Re &lt; 4000)</h4>
        <div className="formula-secondary">
          Nu = Nu<sub>lam</sub>(2300) + [(Re − 2300) / 1700] · [Nu<sub>turb</sub>(4000) − Nu<sub>lam</sub>(2300)]
        </div>
        <p>Interpolation linéaire pour assurer une transition douce.</p>

        <h4>Turbulent (Re ≥ 4000) — Corrélation de Gnielinski</h4>
        <p>
          Cette corrélation est utilisée à la place de Dittus-Boelter car elle est <strong>plus précise</strong> dans
          la zone de transition (erreur &lt; 10% vs &lt; 25% pour Dittus-Boelter), et valide pour 0.5 &lt; Pr &lt; 2000
          et 3000 &lt; Re &lt; 5×10⁶ :
        </p>
        <div className="formula">
          Nu = (f / 8) · (Re − 1000) · Pr &nbsp;/&nbsp; [1 + 12.7 · √(f / 8) · (Pr<sup>2/3</sup> − 1)]
        </div>
        <p>Où f est le facteur de friction de Petukhov :</p>
        <div className="formula-secondary">
          f<sub>Petukhov</sub> = (0.7905 · ln(Re) − 1.64)<sup>−2</sup>
        </div>
        <p>Le résultat est borné inférieurement par Nu ≥ 3.66.</p>
        <p><em>Référence : Gnielinski, V. (1976). Int. Chem. Eng., 16(2), 359-368.</em></p>

        <p>Le coefficient de convection interne est ensuite :</p>
        <div className="formula-secondary">
          h<sub>i</sub> = Nu · k<sub>air</sub> / D<sub>int</sub>
        </div>
        <p>
          Ordres de grandeur : h<sub>i</sub> ≈ 0.6 W/m²·K (laminaire, Re ≈ 500) → 5-15 W/m²·K (turbulent, Re ≈ 10 000-50 000).
        </p>

        <h3>7.2 Convection externe (h<sub>e</sub>)</h3>
        <p>Le coefficient d'échange externe combine deux contributions :</p>

        <h4>Convection naturelle (plaque verticale)</h4>
        <div className="formula-secondary">
          h<sub>nat</sub> = 1.42 · (|ΔT| / D<sub>ext</sub>)<sup>0.25</sup>
        </div>
        <p>Où ΔT = T<sub>surface</sub> − T<sub>ext</sub>. Si ΔT = 0, h<sub>nat</sub> = 0.</p>

        <h4>Convection forcée par le vent (corrélation ASHRAE)</h4>
        <div className="formula-secondary">
          h<sub>forcé</sub> = 5 + 3.8 · v<sub>vent</sub> &nbsp; [W/m²·K]
        </div>

        <h4>Combinaison — Superposition par résistances</h4>
        <div className="formula">
          h<sub>e</sub> = √(h<sub>nat</sub>² + h<sub>forcé</sub>²)
        </div>
        <p>
          Cette méthode de superposition (norme de type L²) est plus physique qu'une simple addition ou qu'un choix du max.
          Elle assure que chaque mécanisme contribue sans dominer artificiellement l'autre.
        </p>
        <p>Ordres de grandeur : h<sub>e</sub> ≈ 5-8 W/m²·K (air calme) → 20-30 W/m²·K (vent fort).</p>
        <p><em>Référence : ASHRAE Handbook — Fundamentals (2021).</em></p>

        {/* ================================================================= */}
        {/* SECTION 8: MODÈLE APPARTEMENT */}
        {/* ================================================================= */}

        <h2>8. Modèle Thermique de l'Appartement</h2>
        <p>L'appartement est modélisé comme un volume d'air unique avec inertie thermique :</p>
        <div className="formula">
          C<sub>app</sub> · dT<sub>app</sub>/dt = Q̇<sub>cheminée</sub> + Q̇<sub>infiltrations</sub> + Q̇<sub>enveloppe</sub>
        </div>

        <h3>8.1 Capacité thermique de l'appartement</h3>
        <div className="formula-secondary">
          C<sub>app</sub> = V · ρ · c<sub>p</sub> + C<sub>inertie</sub> · 3600 &nbsp; [J/K]
        </div>
        <p>
          Où C<sub>inertie</sub> (en Wh/K) représente l'inertie thermique des meubles, cloisons et structure.
          Valeur par défaut : V = 300 m³ (100 m² × 3 m), C<sub>inertie</sub> = 4 kWh/K (bâtiment lourd, norme EN 13790 : ~130 kJ/K/m²).
        </p>

        <h3>8.2 Termes source</h3>
        <table>
          <thead>
            <tr><th>Terme</th><th>Formule</th><th>Description</th></tr>
          </thead>
          <tbody>
            <tr>
              <td>Q̇<sub>cheminée</sub></td>
              <td>ṁ<sub>conduit</sub> · c<sub>p</sub> · (T<sub>source</sub> − T<sub>app</sub>)</td>
              <td>Apport/perte via le conduit. T<sub>source</sub> = T<sub>air,sortie</sub> si flux descendant, T<sub>ext</sub> si flux montant.</td>
            </tr>
            <tr>
              <td>Q̇<sub>infiltrations</sub></td>
              <td>ṁ<sub>nat</sub> · c<sub>p</sub> · (T<sub>ext</sub> − T<sub>app</sub>)</td>
              <td>Renouvellement d'air naturel (infiltrations). ṁ<sub>nat</sub> = τ<sub>ren</sub> · V / 3600 (avec τ<sub>ren</sub> en vol/h).</td>
            </tr>
            <tr>
              <td>Q̇<sub>enveloppe</sub></td>
              <td>UA · (T<sub>ext</sub> − T<sub>app</sub>)</td>
              <td>Déperditions par l'enveloppe du bâtiment. UA en W/K.</td>
            </tr>
          </tbody>
        </table>
        <p>Valeurs par défaut : τ<sub>ren</sub> = 0.8 vol/h (menuiseries anciennes), UA = 500 W/K (isolation faible).</p>

        {/* ================================================================= */}
        {/* SECTION 9: PROFIL DE PRESSION */}
        {/* ================================================================= */}

        <h2>9. Profil de Pression Vertical</h2>
        <p>
          Le profil de pression statique relative (P<sub>int</sub> − P<sub>ext</sub>) est reconstruit segment par
          segment le long du conduit :
        </p>
        <div className="formula">
          P<sub>stat</sub>(z) = P<sub>fan</sub>(z) + P<sub>tirage,cum</sub>(z) − Pertes<sub>cum</sub>(z) + P<sub>venturi</sub>(z)
        </div>
        <p>
          Chaque composante est accumulée progressivement, avec les singularités placées à leur position physique :
        </p>
        <ul>
          <li><strong>z = 0</strong> : perte d'entrée (K<sub>entrée</sub>) + pression du ventilateur si position = bas</li>
          <li><strong>z = z<sub>coude</sub></strong> : perte singulière du coude</li>
          <li><strong>z = H</strong> : perte de sortie (K<sub>toit</sub> + K<sub>sortie</sub>) + pression du ventilateur si position = haut + effet Venturi</li>
        </ul>
        <p>
          Ce profil est visualisable dans l'onglet « Vue d'ensemble » et permet de vérifier que le conduit fonctionne
          en dépression sur toute sa hauteur (critère de sécurité).
        </p>

        {/* ================================================================= */}
        {/* SECTION 10: ALGORITHME ET STABILITÉ */}
        {/* ================================================================= */}

        <h2>10. Algorithme de Simulation et Stabilité Numérique</h2>

        <h3>10.1 Boucle principale</h3>
        <ol>
          <li><strong>Initialisation</strong> : températures air (uniforme T<sub>init</sub>), boisseau (gradient linéaire radial
          entre T<sub>int,face</sub> et T<sub>ext</sub>), hydraulique initiale.</li>
          <li><strong>Météo</strong> : lecture par paliers horaires (step function) selon le mode choisi (fixe / mensuelle / personnalisée).</li>
          <li><strong>Hydraulique</strong> : résolution du bilan de pression → v, ṁ, Re. <em>Recalculé toutes les 5 s simulées</em> (cache).</li>
          <li><strong>Coefficients thermiques</strong> : calcul de Nu, h<sub>i</sub>, h<sub>e</sub> à partir de Re et des températures.</li>
          <li><strong>Phase 1 — Thermique air</strong> : advection upwind explicite + échange air-paroi implicite.</li>
          <li><strong>Phase 2 — Thermique boisseau</strong> : diffusion radiale Euler explicite avec conditions aux limites convectives.</li>
          <li><strong>Phase 3 — Thermique appartement</strong> : bilan nodal (cheminée + infiltrations + enveloppe).</li>
          <li><strong>Bilan énergétique</strong> : calcul de la puissance instantanée, énergie cumulée, erreur de conservation.</li>
          <li><strong>Passage au pas de temps suivant</strong> (avec Δt adaptatif).</li>
        </ol>

        <h3>10.2 Découplage hydraulique (optimisation ×100-1000)</h3>
        <p>
          Le calcul hydraulique (solveur sécante/bisection) est <strong>découplé temporellement</strong> de la thermique :
          il n'est recalculé que toutes les 5 secondes simulées, et la vitesse est supposée constante entre deux recalculs.
          Cette approximation est justifiée car la constante de temps hydraulique (quelques secondes, inertie de la colonne d'air)
          est très inférieure à la constante de temps thermique de la brique (plusieurs heures).
        </p>
        <div className="success">
          <strong>Gain de performance :</strong> Ce découplage réduit le coût total d'un facteur ×100 à ×1000,
          permettant de simuler 6h en &lt; 500 ms sur un navigateur moderne.
        </div>

        <h3>10.3 Pas de temps adaptatif</h3>
        <p>Le pas de temps est calculé dynamiquement pour respecter la condition CFL :</p>
        <div className="formula">
          Δt = CFL<sub>cible</sub> · Δz / |v|
        </div>
        <p>Borné entre Δt<sub>min</sub> = 0.05 s et Δt<sub>max</sub> = 30 s.</p>
        <table>
          <thead>
            <tr><th>Mode</th><th>CFL cible</th><th>Compromis</th></tr>
          </thead>
          <tbody>
            <tr><td>Stable</td><td>0.8</td><td>Bonne précision, vitesse raisonnable</td></tr>
            <tr><td>Rapide</td><td>0.95</td><td>Vitesse maximale, stabilité limite</td></tr>
            <tr><td>Précis</td><td>0.5</td><td>Haute précision, plus lent</td></tr>
          </tbody>
        </table>

        <h3>10.4 Critères de stabilité et de qualité</h3>
        <table>
          <thead>
            <tr><th>Critère</th><th>Formule</th><th>Seuil</th></tr>
          </thead>
          <tbody>
            <tr><td>CFL (advection air)</td><td>v · Δt / Δz</td><td>&lt; 1.0 (warning si dépassé)</td></tr>
            <tr><td>Fourier (diffusion solide)</td><td>α · Δt / Δr²</td><td>&lt; 0.5 (automatique, non limitant)</td></tr>
            <tr><td>Conservation d'énergie</td><td>|ΔE<sub>air</sub> − (E<sub>adv</sub> + E<sub>paroi</sub>)| / E<sub>ref</sub></td><td>&lt; 5% (warning), &lt; 10% (erreur)</td></tr>
          </tbody>
        </table>

        <h3>10.5 Bilan énergétique</h3>
        <p>À chaque pas de temps, le simulateur calcule :</p>
        <ul>
          <li><strong>Énergie d'advection</strong> : E<sub>adv</sub> = |ṁ| · c<sub>p</sub> · (T<sub>entrée</sub> − T<sub>sortie</sub>) · Δt</li>
          <li><strong>Énergie air-paroi</strong> : E<sub>paroi</sub> = Σ<sub>i</sub> h<sub>i</sub> · 𝒫 · Δz · (T<sub>s,i</sub> − T<sub>f,i</sub>) · Δt</li>
          <li><strong>Variation d'énergie interne</strong> : ΔE<sub>air</sub> = Σ<sub>i</sub> ρ · A · Δz · c<sub>p</sub> · (T<sub>f,i</sub><sup>n+1</sup> − T<sub>f,i</sub><sup>n</sup>)</li>
          <li><strong>Erreur de conservation</strong> : comparaison entre ΔE<sub>air</sub> et E<sub>adv</sub> + E<sub>paroi</sub></li>
        </ul>
        <p>
          La puissance thermique instantanée affichée est |ṁ| · c<sub>p</sub> · ΔT, et l'énergie cumulée est l'intégrale temporelle de cette puissance.
        </p>

        {/* ================================================================= */}
        {/* SECTION 11: HYPOTHÈSES ET LIMITES */}
        {/* ================================================================= */}

        <h2>11. Hypothèses et Limites</h2>
        <table>
          <thead>
            <tr><th>Hypothèse</th><th>Justification / Conséquence</th></tr>
          </thead>
          <tbody>
            <tr>
              <td>Modèle 1D axial pour l'air</td>
              <td>Acceptable pour L/D &gt; 100 (ici L/D ≈ 133). Écoulement développé sur la quasi-totalité du conduit. La variation radiale de température dans l'air est négligée.</td>
            </tr>
            <tr>
              <td>Conduction axiale négligée dans la maçonnerie</td>
              <td>Justifié car le nombre de Peclet axial est très élevé. La conduction axiale dans la brique est négligeable devant le transport convectif de l'air.</td>
            </tr>
            <tr>
              <td>Propriétés de l'air variables</td>
              <td>ρ (gaz parfait), μ (Sutherland), k (corrélation puissance) varient avec T. c<sub>p</sub> varie avec l'humidité relative.</td>
            </tr>
            <tr>
              <td>Ventilateur : courbe P(Q) quadratique</td>
              <td>Plus réaliste qu'un ΔP constant. Modèle P = P<sub>max</sub>·(1−(Q/Q<sub>max</sub>)²)<sup>0.8</sup>.</td>
            </tr>
            <tr>
              <td>Pas de rayonnement explicite</td>
              <td>Le rayonnement externe est intégré implicitement dans h<sub>e</sub>. Le rayonnement interne (paroi-air) est négligé car les surfaces sont à T &lt; 100°C (contribution &lt; 5% du flux total convectif).</td>
            </tr>
            <tr>
              <td>Pas de condensation</td>
              <td>L'humidité influence c<sub>p</sub> de l'air, mais il n'y a pas de modèle de condensation/évaporation dans le conduit. Peut être significatif en hiver dans les conduits froids.</td>
            </tr>
            <tr>
              <td>Géométrie cylindrique uniforme</td>
              <td>Pas de variation de section le long du conduit. Le coude est modélisé uniquement par une perte singulière K, sans effet sur la géométrie.</td>
            </tr>
            <tr>
              <td>Météo par paliers horaires</td>
              <td>Les conditions extérieures changent par palier à chaque heure (step function). Pas d'interpolation continue entre les heures.</td>
            </tr>
            <tr>
              <td>Découplage hydraulique / thermique</td>
              <td>L'hydraulique est recalculée toutes les 5s. Hypothèse valide car τ<sub>hydraulique</sub> ≪ τ<sub>thermique,brique</sub>.</td>
            </tr>
          </tbody>
        </table>

        {/* ================================================================= */}
        {/* SECTION 12: VALIDATION */}
        {/* ================================================================= */}

        <h2>12. Validation</h2>

        <h3>12.1 Cas de test physiques</h3>
        <ol>
          <li><strong>Ventilateur éteint (tirage naturel) :</strong> Vérifier que le tirage est positif avec T<sub>app</sub> &gt; T<sub>ext</sub>,
          que la vitesse est raisonnable (&lt; 5 m/s sans ventilateur), et que l'air se réchauffe/refroidit selon le sens du flux.</li>
          <li><strong>Parois adiabatiques (k<sub>s</sub> → 0) :</strong> Si la conduction est quasi-nulle, la température d'air ne doit
          quasiment pas varier (ΔT &lt; 2°C en 10 min).</li>
          <li><strong>Conduit froid (T<sub>air</sub> &gt; T<sub>ext</sub>) :</strong> Vérifier le refroidissement progressif de l'air
          et que T<sub>air</sub> ne descend jamais sous T<sub>ext</sub> (borne physique).</li>
          <li><strong>Ventilation forte (stabilité) :</strong> Sous forçage variable (T<sub>ext</sub> oscillant), vérifier l'absence
          d'oscillations numériques parasites.</li>
        </ol>

        <h3>12.2 Validation analytique en régime permanent</h3>
        <p>En régime stationnaire, la température de sortie doit suivre la loi exponentielle :</p>
        <div className="formula">
          T(L) = T<sub>ext</sub> + (T<sub>in</sub> − T<sub>ext</sub>) · exp(−U · 𝒫 · L / (ṁ · c<sub>p</sub>))
        </div>
        <p>Où U est le coefficient d'échange global ramené à la surface interne :</p>
        <div className="formula-secondary">
          1/U = 1/h<sub>i</sub> + (D<sub>int</sub>/(2k<sub>s</sub>)) · ln(D<sub>ext</sub>/D<sub>int</sub>) + (D<sub>int</sub>/D<sub>ext</sub>) · (1/h<sub>e</sub>)
        </div>
        <p>
          Le script <code>thermal_validation.ts</code> compare la température de sortie du modèle RC numérique
          à cette solution analytique après 24h de simulation (état stationnaire atteint).
        </p>

        <h3>12.3 Matrice de validation automatisée</h3>
        <p>
          Le simulateur intègre une <strong>suite de 36+ tests automatiques</strong> (onglet « Validation ») couvrant :
        </p>
        <ul>
          <li><strong>Numérique</strong> (36 scénarios) : combinaisons de 6 heures de début × 6 durées (15 min à 24h). Vérifie CFL, conservation d'énergie, valeurs finies, continuité temporelle.</li>
          <li><strong>Physique</strong> (8+ scénarios) : 4 configurations ventilateur (haut/bas × aspiration/poussée), tirage naturel, météo froide/tempérée/chaude, mode automatique, CFL extrême.</li>
          <li><strong>UI</strong> (2 scénarios) : overflow horizontal, présence des contrôles, éléments visuels valides.</li>
          <li><strong>Performance</strong> (1 scénario) : simulation 48h en temps CPU &lt; 60 s.</li>
        </ul>
        <p>
          Chaque test produit des métriques détaillées et un <strong>score de fiabilité global</strong> (0-100%).
        </p>

        {/* ================================================================= */}
        {/* SECTION 13: RÉFÉRENCES */}
        {/* ================================================================= */}

        <h2>13. Références Bibliographiques</h2>
        <ol>
          <li>Incropera, F. P., & DeWitt, D. P. (2007). <em>Fundamentals of Heat and Mass Transfer</em> (6th ed.). Wiley.
            — Corrélations de convection (Nusselt, Gnielinski), conduction cylindrique.</li>
          <li>ASHRAE. (2021). <em>ASHRAE Handbook — Fundamentals</em>. American Society of Heating, Refrigerating and Air-Conditioning Engineers.
            — Corrélation h<sub>e</sub> = 5 + 3.8·v<sub>vent</sub>, tirage de cheminée.</li>
          <li>Idel'cik, I. E. (2005). <em>Handbook of Hydraulic Resistance</em> (4th ed.). IPC.
            — Coefficients de pertes singulières K (entrée, coudes, sortie).</li>
          <li>Munson, B. R., Young, D. F., & Okiishi, T. H. (2006). <em>Fundamentals of Fluid Mechanics</em> (5th ed.). Wiley.
            — Facteur de friction Darcy-Weisbach, diagramme de Moody.</li>
          <li>Gnielinski, V. (1976). <em>New equations for heat and mass transfer in turbulent pipe and channel flow</em>. Int. Chem. Eng., 16(2), 359-368.
            — Corrélation de Nusselt turbulent utilisée dans le code.</li>
          <li>Swamee, P. K., & Jain, A. K. (1976). <em>Explicit equations for pipe-flow problems</em>. J. Hydraul. Div., 102(5), 657-664.
            — Approximation explicite de Colebrook-White pour le facteur de friction.</li>
          <li>Kreith, F., Manglik, R. M., & Bohn, M. S. (2010). <em>Principles of Heat Transfer</em> (7th ed.). Cengage Learning.
            — Diffusion radiale cylindrique, réseaux RC thermiques.</li>
          <li>Sutherland, W. (1893). <em>The viscosity of gases and molecular force</em>. Phil. Mag., 36(223), 507-531.
            — Loi de viscosité dynamique de l'air.</li>
          <li>Shah, R. K., & London, A. L. (1978). <em>Laminar Flow Forced Convection in Ducts</em>. Academic Press.
            — Nu = 3.66 en régime laminaire établi, corrélation de Graetz.</li>
          <li>NF EN 13790 (2008). <em>Performance énergétique des bâtiments — Calcul des besoins d'énergie pour le chauffage et le refroidissement des locaux</em>.
            — Inertie thermique des bâtiments (~130 kJ/K/m²).</li>
        </ol>
      </div>
    </div>
  );
}
