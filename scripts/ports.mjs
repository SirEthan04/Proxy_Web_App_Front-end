import net from 'node:net'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
const execute = promisify(execFile)

async function owner(port) {
  try {
    if (process.platform === 'win32') {
      const command = `$connections = Get-NetTCPConnection -LocalPort ${port} -State Listen -ErrorAction SilentlyContinue; foreach ($connection in $connections) { $service = Get-Process -Id $connection.OwningProcess -ErrorAction SilentlyContinue; Write-Output ($service.ProcessName + ' (PID ' + $connection.OwningProcess + ')') }`
      return (await execute('powershell.exe', ['-NoProfile', '-Command', command], { timeout: 5000, windowsHide: true })).stdout.trim()
    }
    if (process.platform === 'linux') {
      try { return (await execute('ss', ['-ltnp', `sport = :${port}`], { timeout: 5000 })).stdout.trim() } catch { /* Try lsof. */ }
    }
    return (await execute('lsof', ['-nP', `-iTCP:${port}`, '-sTCP:LISTEN'], { timeout: 5000 })).stdout.trim()
  } catch { return '' }
}

export async function checkPort(port, label) {
  for (const host of ['127.0.0.1', '::1']) {
    try {
      await new Promise((resolve, reject) => {
        const probe = net.createServer()
        probe.once('error', reject)
        probe.listen({ port, host, exclusive: true }, () => probe.close(resolve))
      })
    } catch (error) {
      if (['EAFNOSUPPORT', 'EADDRNOTAVAIL'].includes(error.code)) continue
      if (error.code !== 'EADDRINUSE') throw error
      const service = await owner(port)
      throw Error(`${label}: puerto ${port} ocupado. ${service || 'El sistema no permite identificar el proceso propietario.'}\nDeten ese servicio desde su terminal o administrador de procesos y vuelve a ejecutar su comando de inicio. No se cambiara de puerto.`)
    }
  }
}
