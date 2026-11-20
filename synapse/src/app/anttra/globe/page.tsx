'use client';

import { useState } from 'react';
import Globe from './components/globe';

export default function GlobePage() {
  const [mode, setMode] = useState<'earth' | 'saturn'>('earth');
  const [layers, setLayers] = useState({clouds: true, night: false, moon: false});
  return <main className="planet-view">
    <section className="planet-controls" aria-label="Globe controls">
      <h1>Vertex globes</h1>
      <div role="group" aria-label="Planet">{(['earth','saturn'] as const).map(planet =>
        <button key={planet} className="portfolio-control" aria-pressed={mode === planet} onClick={() => setMode(planet)}>{planet === 'earth' ? 'Earth' : 'Saturn'}</button>
      )}</div>
      {mode === 'earth' && <fieldset><legend>Earth layers</legend>{(['clouds','night','moon'] as const).map(layer =>
        <label key={layer}><input type="checkbox" checked={layers[layer]} onChange={() => setLayers(prev => ({...prev, [layer]: !prev[layer]}))}/>{layer === 'night' ? 'Night lights' : layer === 'moon' ? 'Moon' : 'Clouds'}</label>
      )}</fieldset>}
      <p>Drag to orbit. Scroll or pinch to zoom.</p>
    </section>
    <div className="planet-canvas"><Globe mode={mode} {...layers}/></div>
  </main>;
}
