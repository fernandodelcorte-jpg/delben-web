'use client'

import { useState } from 'react'
import { ImportarModulos } from '@/components/admin/importar-modulos'
import { ImportarHerrajes } from '@/components/admin/importar-herrajes'
import { SubirImagenes } from '@/components/admin/subir-imagenes'

type Pestaña = 'modulos' | 'herrajes' | 'imagenes'

export default function ImportarPage() {
  const [activa, setActiva] = useState<Pestaña>('modulos')

  return (
    <div className="max-w-3xl">
      <div className="mb-8">
        <p className="text-xs font-medium tracking-widest text-stone-400 uppercase mb-2">
          Administración
        </p>
        <h1 className="text-2xl font-semibold text-stone-900 tracking-tight">
          Importar catálogo
        </h1>
        <p className="mt-1.5 text-sm text-stone-500">
          Carga el catálogo de módulos y herrajes desde los archivos Excel. La importación
          es idempotente — puedes reimportar cuando actualices precios sin duplicar datos.
        </p>
      </div>

      {/* Pestañas */}
      <div className="flex gap-1 mb-8 rounded-xl bg-stone-100 p-1">
        {(
          [
            { id: 'modulos', label: 'Módulos' },
            { id: 'herrajes', label: 'Herrajes' },
            { id: 'imagenes', label: 'Imágenes' },
          ] as { id: Pestaña; label: string }[]
        ).map((p) => (
          <button
            key={p.id}
            onClick={() => setActiva(p.id)}
            className={[
              'flex-1 rounded-lg py-2 text-sm font-medium transition-all',
              activa === p.id
                ? 'bg-white text-stone-900 shadow-sm'
                : 'text-stone-500 hover:text-stone-700',
            ].join(' ')}
          >
            {p.label}
          </button>
        ))}
      </div>

      {activa === 'modulos' && <ImportarModulos />}
      {activa === 'herrajes' && <ImportarHerrajes />}
      {activa === 'imagenes' && <SubirImagenes />}
    </div>
  )
}
