import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import fs from 'fs'

export default defineConfig({
  server: {
    proxy: {
      '/api/agent': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/api/test-telemetry': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
  plugins: [
    react(),
    tailwindcss(),
    {
      name: 'update-contract-plugin',
      configureServer(server) {
        server.middlewares.use('/api/update-contract', (req, res) => {
          if (req.method === 'POST') {
            let body = ''
            req.on('data', (chunk) => {
              body += chunk
            })
            req.on('end', () => {
              try {
                const { address } = JSON.parse(body)
                if (address && /^0x[a-fA-F0-9]{40}$/.test(address)) {
                  let envContent = fs.existsSync('.env') ? fs.readFileSync('.env', 'utf8') : ''
                  if (envContent.includes('VITE_PACT_ESCROW_ADDRESS=')) {
                    envContent = envContent.replace(
                      /VITE_PACT_ESCROW_ADDRESS=.*/,
                      `VITE_PACT_ESCROW_ADDRESS=${address}`
                    )
                  } else {
                    envContent += `\nVITE_PACT_ESCROW_ADDRESS=${address}\n`
                  }
                  fs.writeFileSync('.env', envContent)
                  console.log(`[Vite] Updated .env with VITE_PACT_ESCROW_ADDRESS=${address}`)
                  res.setHeader('Content-Type', 'application/json')
                  res.statusCode = 200
                  res.end(JSON.stringify({ success: true, address }))
                  return
                }
              } catch (e) {
                console.error('[Vite] Error updating .env:', e)
              }
              res.statusCode = 400
              res.end('Invalid request')
            })
          }
        })
      },
    },
  ],
})