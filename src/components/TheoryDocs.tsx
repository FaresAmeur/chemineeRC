// Documentation théorique du modèle

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
  <title>Documentation - Simulateur de Cheminée</title>
  <style>
    body { font-family: 'Times New Roman', serif; max-width: 900px; margin: 40px auto; padding: 20px; line-height: 1.6; }
    h1 { color: #1e293b; border-bottom: 2px solid #3b82f6; padding-bottom: 10px; }
    h2 { color: #334155; margin-top: 30px; }
    h3 { color: #475569; }
    code { background: #f1f5f9; padding: 2px 6px; border-radius: 3px; font-family: monospace; }
    pre { background: #f8fafc; padding: 15px; border-radius: 6px; overflow-x: auto; border: 1px solid #e2e8f0; }
    .formula { background: #eff6ff; padding: 15px; border-left: 4px solid #3b82f6; margin: 15px 0; font-family: 'Times New Roman', serif; }
    table { border-collapse: collapse; width: 100%; margin: 20px 0; }
    th, td { border: 1px solid #cbd5e1; padding: 10px; text-align: left; }
    th { background: #f1f5f9; }
    .warning { background: #fef3c7; padding: 10px; border-radius: 6px; border-left: 4px solid #f59e0b; }
    @media print { body { font-size: 12pt; } }
  </style>
</head>
<body>${content}</body>
</html>`
    ], { type: 'text/html' });

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'documentation-simulateur-cheminee.html';
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
        <p><em>Modèle RC Transitoire 1D Couplé Solide-Fluide</em></p>

        <div className="bg-blue-900/30 p-5 rounded-lg border border-blue-800/50 my-6">
          <h2 className="text-blue-300 !mt-0 !border-none">0. Comprendre la Physique (Vulgarisation)</h2>
          <p>
            Avant d'entrer dans les équations, voici comment comprendre ce qui se passe dans ce simulateur :
          </p>
          <ul>
            <li><strong>Le Tirage Naturel :</strong> L'air chaud est plus léger que l'air froid. En montant dans le conduit, il crée une "aspiration" naturelle (dépression) en bas. Plus il fait froid dehors, plus ce tirage est fort.</li>
            <li><strong>Dépression vs Surpression :</strong> Un conduit fonctionne idéalement en "dépression" (pression négative par rapport à l'extérieur) : il aspire l'air. S'il est en "surpression" (à cause d'un ventilateur qui pousse trop fort à l'entrée ou d'un bouchon), l'air risque de fuir par les fissures de la maçonnerie vers l'intérieur du bâtiment, ce qui est dangereux (risque d'intoxication, moisissures).</li>
            <li><strong>L'Inertie Thermique :</strong> La brique d'une cheminée pèse lourd et stocke la chaleur. Quand l'air chaud de l'appartement monte, il réchauffe la brique. Si l'air s'arrête de circuler, la brique restera chaude pendant plusieurs heures, continuant de chauffer doucement le conduit et maintenant un "tirage résiduel". C'est le phénomène modélisé par nos "capacités thermiques".</li>
            <li><strong>Puissance et Énergie :</strong> La <em>Puissance</em> (en Watts) est la "vitesse" à laquelle la cheminée vole de la chaleur au bâtiment à un instant T. L'<em>Énergie cumulée</em> (en kWh) est le total de la chaleur volée sur toute la journée, comparable à ce que vous lisez sur votre facture de chauffage.</li>
          </ul>
        </div>

        <h2>1. Introduction et Objectifs</h2>
        <p>
          Ce simulateur modélise le comportement thermique transitoire d'une cheminée maçonnée de 20 mètres de hauteur,
          équipée d'un ventilateur en tirage. L'objectif est de prédire la température de l'air ventilé dans un appartement
          sur une durée de plusieurs heures, en utilisant des données météorologiques horaires.
        </p>
        <div className="warning">
          <strong>Note importante :</strong> Ce modèle est une approximation analytique 1D, et non une simulation CFD.
          Il remplace les calculs CFD lourds par un modèle RC (résistance-capacité) adapté aux études préliminaires rapides.
          <strong> Aucun time-scaling n'est appliqué</strong> : le pas de temps de simulation correspond à la physique réelle.
        </div>

        <h2>2. Description du Système</h2>
        <p>Le système étudié comprend :</p>
        <ul>
          <li>Un conduit maçonné de 20 m de hauteur totale (dont 1 m au-dessus du toit)</li>
          <li>Un coude à 45° situé à 1 m sous l'appartement (point de prélèvement)</li>
          <li>Un ventilateur en aspiration (tirage) en bas du conduit</li>
          <li>Une paroi de brique de 22 cm d'épaisseur</li>
        </ul>

        <h3>2.1 Géométrie par défaut</h3>
        <table>
          <thead>
            <tr><th>Paramètre</th><th>Valeur</th><th>Unité</th></tr>
          </thead>
          <tbody>
            <tr><td>Hauteur descente</td><td>9.0</td><td>m</td></tr>
            <tr><td>Hauteur montée</td><td>10.0 (+ 1 m col-de-cygne)</td><td>m</td></tr>
            <tr><td>Diamètre intérieur</td><td>0.15</td><td>m</td></tr>
            <tr><td>Épaisseur brique</td><td>0.22</td><td>m</td></tr>
            <tr><td>Rugosité relative (ε/D)</td><td>0.0001</td><td>—</td></tr>
          </tbody>
        </table>

        <h3>2.2 Propriétés des matériaux</h3>
        <table>
          <thead>
            <tr><th>Propriété</th><th>Brique</th><th>Unité</th></tr>
          </thead>
          <tbody>
            <tr><td>Densité (ρ)</td><td>1800</td><td>kg/m³</td></tr>
            <tr><td>Capacité thermique (c<sub>p</sub>)</td><td>840</td><td>J/kg·K</td></tr>
            <tr><td>Conductivité (λ)</td><td>0.72</td><td>W/m·K</td></tr>
          </tbody>
        </table>

        <h2>3. Modèle Hydraulique</h2>
        <h3>3.1 Bilan de pression</h3>
        <p>Le débit d'air est déterminé par l'équilibre des forces de pression :</p>
        <div className="formula">
          ΔP<sub>ventilateur</sub> + ΔP<sub>tirage</sub> = ΔP<sub>friction</sub> + Σ K · (ρv²/2)
        </div>
        <p>Où :</p>
        <ul>
          <li><code>ΔP<sub>ventilateur</sub></code> : différence de pression imposée par le ventilateur (Pa)</li>
          <li><code>ΔP<sub>tirage</sub></code> : effet de tirage thermique naturel (Pa)</li>
          <li><code>ΔP<sub>friction</sub></code> : pertes de charge réparties (Pa)</li>
          <li><code>Σ K</code> : somme des coefficients de perte singulière</li>
        </ul>

        <h3>3.2 Facteur de friction (Darcy-Weisbach)</h3>
        <p>Les pertes de charge réparties sont calculées avec l'équation de Darcy-Weisbach :</p>
        <div className="formula">
          ΔP<sub>friction</sub> = f · (L/D) · (ρv²/2)
        </div>
        <p>Le facteur de friction <code>f</code> est déterminé selon le régime :</p>
        <ul>
          <li><strong>Laminaire (Re &lt; 2300) :</strong> f = 64/Re</li>
          <li><strong>Turbulent (Re ≥ 4000) :</strong> Approximation de Swamee-Jain :</li>
        </ul>
        <div className="formula">
          f = 0.25 / [log₁₀(ε/(3.7D) + 5.74/Re<sup>0.9</sup>)]²
        </div>
        <p><em>Référence : Moody chart, Colebrook-White equation</em></p>

        <h3>3.3 Pertes singulières</h3>
        <table>
          <thead>
            <tr><th>Élément</th><th>Coefficient K</th></tr>
          </thead>
          <tbody>
            <tr><td>Entrée (sharp-edged)</td><td>0.5</td></tr>
            <tr><td>Coude 45°</td><td>0.3</td></tr>
            <tr><td>Coude 90°</td><td>0.75</td></tr>
            <tr><td>Sortie (exit loss)</td><td>1.0</td></tr>
          </tbody>
        </table>

        <h3>3.4 Effet de tirage thermique</h3>
        <p>L'effet cheminée naturel est causé par la différence de masse volumique entre l'air froid extérieur et l'air
        chaud dans le conduit :</p>
        <div className="formula">
          ΔP<sub>stack</sub> = g · H · (ρ<sub>ext</sub> - ρ<sub>int</sub>)
        </div>
        <p>Avec la loi des gaz parfaits : <code>ρ = P/(R·T)</code>, où R = 287 J/kg·K.</p>

        <h2>4. Modèle Thermique de l'Air (1D Transitoire)</h2>
        <h3>4.1 Équation d'énergie</h3>
        <p>Pour chaque segment axial du conduit, l'équation d'énergie s'écrit :</p>
        <div className="formula">
          ρ·A·c<sub>p</sub> · ∂T<sub>f</sub>/∂t + ṁ·c<sub>p</sub> · ∂T<sub>f</sub>/∂z = h<sub>i</sub>·P·(T<sub>s</sub> - T<sub>f</sub>)
        </div>
        <p>Où :</p>
        <ul>
          <li><code>T<sub>f</sub></code> : température de l'air</li>
          <li><code>T<sub>s</sub></code> : température de la paroi interne</li>
          <li><code>P = πD</code> : périmètre intérieur</li>
          <li><code>h<sub>i</sub></code> : coefficient de convection interne</li>
        </ul>

        <h3>4.2 Schéma numérique</h3>
        <p>Un schéma upwind (amont) explicite est utilisé pour la convection :</p>
        <div className="formula">
          T<sub>i</sub><sup>n+1</sup> = T<sub>i</sub><sup>n</sup> + Δt/τ<sub>conv</sub> · (T<sub>paroi</sub> - T<sub>i</sub><sup>n</sup>) - v·Δt/Δz·(T<sub>i</sub><sup>n</sup> - T<sub>i-1</sub><sup>n</sup>)
        </div>
        <p><strong>Condition CFL :</strong> CFL = v·Δt/Δz &lt; 1 (obligatoire pour la stabilité)</p>

        <h2>5. Modèle Thermique de la Maçonnerie</h2>
        <h3>5.1 Équation de diffusion radiale</h3>
        <p>La conduction thermique dans la paroi est modélisée par l'équation de diffusion 1D radiale :</p>
        <div className="formula">
          ρ<sub>s</sub>·c<sub>s</sub> · ∂T<sub>s</sub>/∂t = k<sub>s</sub> · ∂²T<sub>s</sub>/∂r²
        </div>
        <p>Discrétisée par différences finies, ce modèle équivaut à un réseau RC (résistance-capacité).</p>

        <h3>5.2 Conditions aux limites</h3>
        <ul>
          <li><strong>Paroi interne (r = D/2) :</strong> Bilan convectif interne</li>
          <li><strong>Paroi externe (r = D/2 + e) :</strong> Convection extérieure + rayonnement</li>
        </ul>

        <h2>6. Corrélations de Convection</h2>
        <h3>6.1 Convection interne (h<sub>i</sub>)</h3>
        <p>Le nombre de Nusselt est calculé selon le régime avec la corrélation de Gnielinski (plus précise que Dittus-Boelter) :</p>
        <ul>
          <li><strong>Laminaire (Re &lt; 2300) :</strong> Nu = 3.66 (régime établi)</li>
          <li><strong>Turbulent (Re ≥ 4000) :</strong> Corrélation de Gnielinski :</li>
        </ul>
        <div className="formula">
          Nu = (f/8)(Re-1000)Pr / [1 + 12.7√(f/8)(Pr^(2/3) - 1)]
        </div>
        <p>Où f est le facteur de friction. Le coefficient d'échange convectif est alors : <code>h<sub>i</sub> = Nu·k/D</code></p>
        <p><em>Référence : Gnielinski, V. (1976). New equations for heat and mass transfer in turbulent pipe and channel flow.</em></p>

        <h3>6.2 Convection externe (h<sub>e</sub>)</h3>
        <p>Le coefficient d'échange externe dépend de la vitesse du vent :</p>
        <div className="formula">
          h<sub>e</sub> ≈ 5 + 3.8·v<sub>vent</sub>  [W/m²K]
        </div>
        <p>Valeurs typiques : 5 W/m²K (air calme), 20-30 W/m²K (vent fort)</p>
        <p><em>Référence : ASHRAE Handbook - Fundamentals</em></p>

        <h2>7. Algorithme de Simulation</h2>
        <ol>
          <li>Initialisation des températures (air et paroi)</li>
          <li>Résolution du bilan hydraulique pour v et ṁ</li>
          <li>Mise à jour des coefficients (Re, Nu, hi, he)</li>
          <li>Mise à jour des températures d'air (schéma upwind)</li>
          <li>Mise à jour des températures de paroi (différences finies)</li>
          <li>Calcul des indicateurs (puissance, énergie cumulée)</li>
          <li>Passage au pas de temps suivant</li>
        </ol>

        <h3>7.1 Stabilité numérique et Sous-itérations CFL</h3>
        <p>Le pas de temps (dt) de simulation est adapté dynamiquement grâce à un système de sous-itérations pour ne jamais dépasser la cible de CFL (Courant-Friedrichs-Lewy) définie par le mode de simulation :</p>
        <ul>
          <li><strong>CFL (fluide) :</strong> Δt ≤ TargetCFL · Δz/v</li>
          <li><strong>Diffusion (solide) :</strong> Δt &lt; ρ·c<sub>p</sub>·(Δr)²/(2k)</li>
        </ul>
        <p>Modes disponibles :</p>
        <ul>
          <li><strong>Stable :</strong> TargetCFL = 0.3</li>
          <li><strong>Rapide :</strong> TargetCFL = 0.8</li>
          <li><strong>Précis :</strong> TargetCFL = 0.4</li>
        </ul>
        <div className="warning">
          Le simulateur calculera en permanence le dt le plus restrictif et effectuera des sous-itérations invisibles pour l'interface afin de garantir une stabilité inconditionnelle et de conserver l'énergie.
        </div>

        <h2>8. Hypothèses et Limites</h2>
        <ul>
          <li>Modèle 1D axiaux (variation radiale dans le solide)</li>
          <li>Conduction axiale négligée dans la paroi</li>
          <li>Propriétés de l'air variables avec la température</li>
          <li>Ventilateur modélisé par ΔP constant (pas de courbe de ventilateur)</li>
          <li>Rayonnement extérieur non modélisé explicitement</li>
          <li>Pas de prise en compte de l'humidité de l'air</li>
        </ul>

        <h2>9. Références Bibliographiques</h2>
        <ol>
          <li>Incropera, F. P., & DeWitt, D. P. (2007). <em>Fundamentals of Heat and Mass Transfer</em> (6th ed.). Wiley.</li>
          <li>ASHRAE. (2021). <em>ASHRAE Handbook - Fundamentals</em>. American Society of Heating, Refrigerating and Air-Conditioning Engineers.</li>
          <li>Idel'cik, I. E. (2005). <em>Handbook of Hydraulic Resistance</em> (4th ed.). IPC.</li>
          <li>Munson, B. R., Young, D. F., & Okiishi, T. H. (2006). <em>Fundamentals of Fluid Mechanics</em> (5th ed.). Wiley.</li>
          <li>Kreith, F., Manglik, R. M., & Bohn, M. S. (2010). <em>Principles of Heat Transfer</em> (7th ed.). Cengage Learning.</li>
        </ol>

        <h2>10. Validation</h2>
        <p>Cas de test recommandés :</p>
        <ol>
          <li><strong>Ventilateur éteint :</strong> Vérifier le tirage naturel minimal et l'augmentation de T<sub>s</sub></li>
          <li><strong>ΔP élevé :</strong> Débit maximal, T<sub>out</sub> proche de T<sub>in</sub></li>
          <li><strong>Laminaire :</strong> Vérifier Nu = 3.66</li>
          <li><strong>Permanent :</strong> Comparer au profil linéaire convectif</li>
        </ol>
      </div>
    </div>
  );
}
