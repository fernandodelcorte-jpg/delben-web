import type { NextConfig } from 'next'

const config: NextConfig = {
  reactStrictMode: true,
  // Rutas eliminadas en la reestructuración a 5 páginas. Manufactura se fusionó en
  // Nosotros; Proyectos desapareció (su tema es de los aliados comerciales).
  async redirects() {
    return [
      { source: '/manufactura', destination: '/nosotros', permanent: true },
      { source: '/proyectos', destination: '/distribuidores', permanent: true },
    ]
  },
}

export default config
