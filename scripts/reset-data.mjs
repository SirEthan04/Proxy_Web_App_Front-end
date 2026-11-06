import { checkPort } from './ports.mjs'
import { resetLocalData } from './local-data.mjs'
if (!process.argv.includes('--backup-and-reset')) {
  console.error('No se cambiaron datos. Deten npm run dev y ejecuta npm run data:reset -- --backup-and-reset para crear respaldo y reiniciar solo server/work-db.json.')
  process.exitCode = 1
} else {
  try {
    await checkPort(3001, 'Deten JSON Server antes de reiniciar los datos')
    console.log('Base reiniciada. Respaldo conservado:', await resetLocalData())
    console.log('No se modificaron los seguimientos del navegador. Si contienen operaciones inciertas, conserva ese perfil y usa otro para una demostracion nueva.')
  } catch (error) { console.error(error.message); process.exitCode = 1 }
}
