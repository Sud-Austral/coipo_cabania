/** Interruptor sol/luna con pulgar deslizante (role=switch). */
export default function InterruptorTema({ tema, alCambiar }) {
  const noche = tema === 'noche'
  return (
    <button type="button" className="b-tema" role="switch" aria-checked={noche}
      aria-label={noche ? 'Modo noche activo. Cambiar a modo día' : 'Modo día activo. Cambiar a modo noche'}
      onClick={alCambiar} data-tema={tema}>
      <span className="b-tema-pulgar" aria-hidden="true" />
      <svg viewBox="0 0 24 24" aria-hidden="true" className="b-tema-sol"><circle cx="12" cy="12" r="4" /><path d="M12 2.5v2M12 19.5v2M4.6 4.6l1.4 1.4M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4L6 18M18 6l1.4-1.4" /></svg>
      <svg viewBox="0 0 24 24" aria-hidden="true" className="b-tema-luna"><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" /></svg>
    </button>
  )
}
