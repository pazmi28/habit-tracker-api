const admin = require('firebase-admin')

if (!process.env.FIREBASE_SERVICE_ACCOUNT) {
  console.error('ERROR: FIREBASE_SERVICE_ACCOUNT no está definida')
  process.exit(1)
}

let serviceAccount
try {
  serviceAccount = JSON.parse(
    Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT, 'base64').toString('utf8')
  )
} catch (e) {
  console.error('ERROR: No se pudo parsear FIREBASE_SERVICE_ACCOUNT:', e.message)
  process.exit(1)
}

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
})

const db = admin.firestore()

module.exports = { db }
