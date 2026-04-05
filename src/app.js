const express = require('express')
const cors = require('cors')
if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config()
}

const routes = require('./routes')
const rateLimit = require('express-rate-limit')

const app = express()

// Confiar en el proxy de Vercel — necesario para que express-rate-limit
// lea correctamente la IP real desde X-Forwarded-For
app.set('trust proxy', 1)

// Middleware
const allowedOrigins = process.env.NODE_ENV === 'production'
  ? ['https://habit-tracker-api.vercel.app']
  : ['http://localhost:3000']

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true)
    } else {
      callback(new Error(`CORS: origen no permitido — ${origin}`))
    }
  }
}))
app.use(express.json())

// Rate limiting — máximo 100 peticiones por IP cada 15 minutos
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Demasiadas peticiones, intenta de nuevo en 15 minutos' }
})
app.use(limiter)

// Middleware de logging
app.use((req, res, next) => {
  const start = Date.now()
  res.on('finish', () => {
    const duration = Date.now() - start
    console.log(`${req.method} ${req.path} → ${res.statusCode} (${duration}ms)`)
  })
  next()
})

// Rutas
app.use('/api', routes)

// Ruta de salud — para verificar que la API está viva
app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'Habit Tracker API funcionando' })
})

// Middleware de error centralizado — siempre al final, antes de listen
app.use((err, req, res, next) => {
  console.error(`[ERROR] ${req.method} ${req.path} →`, err.message)

  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'El body no es JSON válido' })
  }

  res.status(err.status || 500).json({
    error: err.message || 'Error interno del servidor'
  })
})

// Arrancar servidor
const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`)
})

module.exports = app
