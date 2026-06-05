'use client'

import { useEffect, useState } from 'react'
import { agruparPorPais, getRed, type DistribuidorPublico } from '@/lib/red'

type Estado =
  | { fase: 'cargando' }
  | { fase: 'listo'; distribuidores: DistribuidorPublico[] }
  | { fase: 'error' }

/**
 * Sección «Nuestra red»: logos de distribuidores visibles + sus ciudades por país.
 * Logos en cajas uniformes (mismo alto, fondo neutro, object-contain) para emparejar
 * orígenes dispares. Estados de carga / vacío / error tratados con dignidad.
 */
export function NuestraRed() {
  const [estado, setEstado] = useState<Estado>({ fase: 'cargando' })

  useEffect(() => {
    const ac = new AbortController()
    getRed(ac.signal)
      .then((distribuidores) => setEstado({ fase: 'listo', distribuidores }))
      .catch((e: unknown) => {
        if (e instanceof DOMException && e.name === 'AbortError') return
        setEstado({ fase: 'error' })
      })
    return () => ac.abort()
  }, [])

  const vacio =
    estado.fase === 'error' ||
    (estado.fase === 'listo' && estado.distribuidores.length === 0)

  return (
    <section id="red" className="scroll-mt-20 border-t border-stone-200 bg-stone-50">
      <div className="mx-auto max-w-editorial px-6 py-16 lg:px-10 lg:py-20">
        {/* Cabecera de sección — mismo lenguaje que el resto del home */}
        <div className="flex items-end justify-between gap-6 border-b border-stone-200 pb-6">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-caoba-700">Nuestra red</p>
            <h2 className="mt-3 text-xl font-medium tracking-tight text-stone-900 sm:text-2xl">
              Distribuidores y sedes, por país.
            </h2>
          </div>
          <span className="hidden font-display text-sm text-stone-400 sm:block">Colombia · Venezuela · EE. UU.</span>
        </div>

        {estado.fase === 'cargando' && <RedSkeleton />}

        {vacio && (
          <div className="mt-10 border border-dashed border-stone-300 bg-white/60 px-6 py-16 text-center">
            <p className="font-display text-2xl font-light text-stone-400">Próximamente</p>
            <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-stone-500">
              Estamos preparando el directorio de nuestra red de distribuidores y centros de diseño.
              Muy pronto encontrará aquí dónde estamos presentes.
            </p>
          </div>
        )}

        {estado.fase === 'listo' && estado.distribuidores.length > 0 && (
          <RedGrid distribuidores={estado.distribuidores} />
        )}
      </div>
    </section>
  )
}

// La grilla se adapta al número REAL de tarjetas: nunca declara más columnas que
// distribuidores, así no quedan columnas-pista vacías (el hueco gris del bug). Se
// centra y su ancho máximo crece con el número de columnas, para que 1 tarjeta no
// se estire a todo el ancho y 2-3 queden equilibradas. Hairlines vía bordes reales
// (borde izq/sup en el contenedor + der/inf en cada tarjeta): sin celdas fantasma,
// también con conteos que no llenan la última fila.
function RedGrid({ distribuidores }: { distribuidores: DistribuidorPublico[] }) {
  const cols = Math.min(distribuidores.length, 3)
  const colsClass =
    cols <= 1
      ? 'grid-cols-1'
      : cols === 2
        ? 'grid-cols-1 sm:grid-cols-2'
        : 'grid-cols-1 md:grid-cols-3'
  const maxWClass = cols <= 1 ? 'max-w-sm' : cols === 2 ? 'max-w-2xl' : 'max-w-5xl'

  return (
    <div className={`mx-auto mt-10 w-full ${maxWClass}`}>
      <div className={`grid ${colsClass} border-l border-t border-stone-200`}>
        {distribuidores.map((d, i) => (
          <TarjetaDistribuidor key={`${d.nombre}-${i}`} distribuidor={d} />
        ))}
      </div>
    </div>
  )
}

function TarjetaDistribuidor({ distribuidor }: { distribuidor: DistribuidorPublico }) {
  const grupos = agruparPorPais(distribuidor.sedes)
  return (
    <div className="flex flex-col border-b border-r border-stone-200 bg-stone-50">
      {/* Caja de logo UNIFORME: mismo alto, fondo neutro, contain */}
      <div className="flex h-28 items-center justify-center bg-white px-8">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={distribuidor.logo_url}
          alt={distribuidor.nombre}
          loading="lazy"
          className="max-h-12 w-auto max-w-[70%] object-contain"
        />
      </div>

      <div className="flex flex-1 flex-col gap-4 border-t border-stone-200 p-5 lg:p-6">
        <p className="text-sm font-semibold uppercase tracking-[0.04em] text-stone-900">
          {distribuidor.nombre}
        </p>

        {grupos.length === 0 ? (
          <p className="text-xs text-stone-400">Sedes por anunciar.</p>
        ) : (
          <ul className="space-y-3">
            {grupos.map((g) => (
              <li key={g.pais}>
                <p className="flex items-center gap-2 text-[0.7rem] uppercase tracking-[0.18em] text-caoba-700">
                  <span className="h-px w-4 bg-caoba-500" />
                  {g.pais}
                </p>
                <p className="mt-1.5 text-sm leading-relaxed text-stone-600">
                  {g.ciudades.join(' · ')}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

function RedSkeleton() {
  return (
    <div className="mx-auto mt-10 grid w-full max-w-5xl grid-cols-1 gap-px border border-stone-200 bg-stone-200 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="bg-stone-50 p-6">
          <div className="h-28 animate-pulse bg-stone-100" />
          <div className="mt-5 h-4 w-2/3 animate-pulse bg-stone-100" />
          <div className="mt-3 h-3 w-1/2 animate-pulse bg-stone-100" />
        </div>
      ))}
    </div>
  )
}
