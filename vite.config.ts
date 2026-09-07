import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// Para GitHub Pages de projeto (usuario.github.io/pesobic/) rode:
//   PowerShell:  $env:DEPLOY_BASE='/pesobic/'; npm run build
// Em dominio proprio, Netlify ou Vercel deixe DEPLOY_BASE em branco.
const base = process.env.DEPLOY_BASE ?? '/'

// https://vite.dev/config/
export default defineConfig({
  base,
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      pwaAssets: {
        image: 'public/logo.svg',
      },
      manifest: {
        name: 'Pesobic',
        short_name: 'Pesobic',
        description:
          'Controle do processo de emagrecimento com canetas GLP-1: aplicacoes, dose, peso, sintomas e proteina.',
        lang: 'pt-BR',
        dir: 'ltr',
        theme_color: '#0f766e',
        background_color: '#0b0d0e',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '.',
        scope: '.',
        categories: ['health', 'lifestyle', 'medical'],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true,
      },
    }),
  ],
})
