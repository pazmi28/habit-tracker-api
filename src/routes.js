const express = require('express')
const router = express.Router()
const { db } = require('./firebase')

const HABITS = 'habits'
const COMPLETIONS = 'completions'
const VALID_FREQUENCIES = ['daily', 'weekly']

// GET /api/habits — obtener todos los hábitos
router.get('/habits', async (req, res) => {
  try {
    const snapshot = await db.collection(HABITS).orderBy('createdAt', 'desc').get()
    const habits = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
    res.status(200).json({ habits })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// GET /api/habits/:id — obtener un hábito
router.get('/habits/:id', async (req, res) => {
  try {
    const doc = await db.collection(HABITS).doc(req.params.id).get()
    if (!doc.exists) return res.status(404).json({ error: 'Hábito no encontrado' })
    res.status(200).json({ habit: { id: doc.id, ...doc.data() } })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// POST /api/habits — crear hábito
router.post('/habits', async (req, res) => {
  try {
    const { name, frequency } = req.body

    if (!name) {
      return res.status(400).json({ error: 'El campo name es obligatorio' })
    }
    if (typeof name !== 'string' || name.trim() === '') {
      return res.status(400).json({ error: 'El campo name debe ser un texto no vacío' })
    }
    if (name.length > 100) {
      return res.status(400).json({ error: 'El campo name no puede superar los 100 caracteres' })
    }
    if (frequency !== undefined && !VALID_FREQUENCIES.includes(frequency)) {
      return res.status(400).json({ error: "El campo frequency debe ser 'daily' o 'weekly'" })
    }

    const habit = {
      name: name.trim(),
      frequency: frequency || 'daily',
      createdAt: new Date().toISOString()
    }

    const docRef = await db.collection(HABITS).add(habit)
    res.status(201).json({ habit: { id: docRef.id, ...habit } })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// PATCH /api/habits/:id — actualizar hábito
router.patch('/habits/:id', async (req, res) => {
  try {
    const ref = db.collection(HABITS).doc(req.params.id)
    const doc = await ref.get()
    if (!doc.exists) return res.status(404).json({ error: 'Hábito no encontrado' })

    const { name, frequency } = req.body
    const updates = {}

    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim() === '') {
        return res.status(400).json({ error: 'El campo name debe ser un texto no vacío' })
      }
      if (name.length > 100) {
        return res.status(400).json({ error: 'El campo name no puede superar los 100 caracteres' })
      }
      updates.name = name.trim()
    }

    if (frequency !== undefined) {
      if (!VALID_FREQUENCIES.includes(frequency)) {
        return res.status(400).json({ error: "El campo frequency debe ser 'daily' o 'weekly'" })
      }
      updates.frequency = frequency
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No se proporcionaron campos válidos para actualizar' })
    }

    await ref.update(updates)
    const updated = await ref.get()
    res.status(200).json({ habit: { id: updated.id, ...updated.data() } })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// DELETE /api/habits/:id — eliminar hábito
router.delete('/habits/:id', async (req, res) => {
  try {
    const ref = db.collection(HABITS).doc(req.params.id)
    const doc = await ref.get()
    if (!doc.exists) return res.status(404).json({ error: 'Hábito no encontrado' })

    await ref.delete()
    res.status(200).json({ message: 'Hábito eliminado correctamente' })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// POST /api/habits/:id/completions — registrar un completado
router.post('/habits/:id/completions', async (req, res) => {
  try {
    const habitRef = db.collection(HABITS).doc(req.params.id)
    const habitDoc = await habitRef.get()
    if (!habitDoc.exists) return res.status(404).json({ error: 'Hábito no encontrado' })

    const { notes } = req.body

    if (notes !== undefined && typeof notes !== 'string') {
      return res.status(400).json({ error: 'El campo notes debe ser un texto' })
    }

    const completion = {
      habitId: req.params.id,
      completedAt: new Date().toISOString(),
      ...(notes !== undefined && { notes: notes.trim() })
    }

    const docRef = await habitRef.collection(COMPLETIONS).add(completion)
    res.status(201).json({ completion: { id: docRef.id, ...completion } })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// GET /api/habits/:id/completions — obtener completados de un hábito
router.get('/habits/:id/completions', async (req, res) => {
  try {
    const habitRef = db.collection(HABITS).doc(req.params.id)
    const habitDoc = await habitRef.get()
    if (!habitDoc.exists) return res.status(404).json({ error: 'Hábito no encontrado' })

    const snapshot = await habitRef.collection(COMPLETIONS).orderBy('completedAt', 'desc').get()
    const completions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
    res.status(200).json({ completions })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// GET /api/docs — documentación básica
router.get('/docs', (req, res) => {
  res.json({
    name: 'Habit Tracker API',
    version: '1.0.0',
    endpoints: [
      { method: 'GET',    path: '/api/habits',                    description: 'Obtener todos los hábitos' },
      { method: 'GET',    path: '/api/habits/:id',                description: 'Obtener un hábito por ID' },
      { method: 'POST',   path: '/api/habits',                    description: 'Crear hábito (name obligatorio, frequency: daily|weekly)' },
      { method: 'PATCH',  path: '/api/habits/:id',                description: 'Actualizar campos parcialmente' },
      { method: 'DELETE', path: '/api/habits/:id',                description: 'Eliminar hábito' },
      { method: 'POST',   path: '/api/habits/:id/completions',    description: 'Registrar completado (notes opcional)' },
      { method: 'GET',    path: '/api/habits/:id/completions',    description: 'Obtener completados de un hábito' },
      { method: 'GET',    path: '/api/docs',                      description: 'Esta documentación' }
    ]
  })
})

module.exports = router
