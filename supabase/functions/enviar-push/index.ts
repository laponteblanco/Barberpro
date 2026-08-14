import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.8'
import { GoogleAuth } from 'https://deno.land/x/google_auth@v0.1.1/mod.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

Deno.serve(async (req) => {
  // Manejar preflight CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const payload = await req.json()
    console.log('Payload recibido:', JSON.stringify(payload))

    // 1. Inicializar Supabase Admin Client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      throw new Error('Las variables SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY no están configuradas.')
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        persistSession: false,
      }
    })

    // 2. Determinar destinatarios y contenidos de la notificación
    const targets: { user_id: string; title: string; body: string }[] = []

    // Detectar si el payload proviene de un Webhook de Supabase (tabla 'appointments')
    if (payload.record && payload.table === 'appointments') {
      const { record, type, old_record } = payload
      const client_id = record.client_id
      const staff_id = record.staff_id
      const service_id = record.service_id

      console.log(`Procesando webhook de cita [${type}]: Cliente ${client_id}, Staff ${staff_id}, Servicio ${service_id}`)

      // Consultar datos en paralelo para agilizar la ejecución
      const [clientRes, staffRes, serviceRes] = await Promise.all([
        supabaseAdmin.from('clients').select('user_id, full_name').eq('id', client_id).maybeSingle(),
        supabaseAdmin.from('tenant_staff').select('user_id, display_name').eq('id', staff_id).maybeSingle(),
        supabaseAdmin.from('services').select('name').eq('id', service_id).maybeSingle()
      ])

      const clientUserId = clientRes.data?.user_id
      const clientName = clientRes.data?.full_name || 'Cliente'
      const barberUserId = staffRes.data?.user_id
      const barberName = staffRes.data?.display_name || 'Barbero'
      const serviceName = serviceRes.data?.name || 'Servicio'

      const start = new Date(record.start_time)
      const dateStr = start.toLocaleDateString('es-ES', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
        timeZone: 'America/Bogota' // Zona horaria por defecto
      })

      if (type === 'INSERT') {
        // Notificación para el cliente (si tiene cuenta de usuario vinculada)
        if (clientUserId) {
          targets.push({
            user_id: clientUserId,
            title: '¡Cita confirmada! 📅',
            body: `Reservaste ${serviceName} con ${barberName} para el ${dateStr}.`
          })
        }

        // Notificación para el barbero (si tiene usuario vinculado)
        if (barberUserId) {
          targets.push({
            user_id: barberUserId,
            title: 'Nueva cita asignada 💈',
            body: `${clientName} reservó ${serviceName} para el ${dateStr}.`
          })
        }
      } else if (type === 'UPDATE' && old_record && record.status !== old_record.status) {
        if (record.status === 'cancelled') {
          // Notificación al cliente de cancelación
          if (clientUserId) {
            targets.push({
              user_id: clientUserId,
              title: 'Cita cancelada ❌',
              body: `Tu cita de ${serviceName} para el ${dateStr} ha sido cancelada.`
            })
          }

          // Notificación al barbero
          if (barberUserId) {
            targets.push({
              user_id: barberUserId,
              title: 'Cita cancelada por cliente ❌',
              body: `La cita de ${clientName} para el ${dateStr} fue cancelada.`
            })
          }
        }
      }
    } else {
      // Invocación manual / genérica
      const { usuario_id, titulo, cuerpo } = payload
      if (usuario_id && titulo && cuerpo) {
        targets.push({
          user_id: usuario_id,
          title: titulo,
          body: cuerpo
        })
      } else {
        throw new Error('Payload inválido. Debe contener usuario_id, titulo y cuerpo; o ser un webhook de appointments.')
      }
    }

    if (targets.length === 0) {
      return new Response(JSON.stringify({ ok: true, message: 'No hay destinatarios o acciones a realizar' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      })
    }

    // 3. Autenticación con Google/Firebase
    const firebaseServiceAccountEnv = Deno.env.get('FIREBASE_SERVICE_ACCOUNT')
    if (!firebaseServiceAccountEnv) {
      throw new Error('La variable de entorno FIREBASE_SERVICE_ACCOUNT no está configurada.')
    }

    const serviceAccount = JSON.parse(firebaseServiceAccountEnv)
    const projectId = serviceAccount.project_id
    if (!projectId) {
      throw new Error('El JSON de la cuenta de servicio de Firebase no contiene un project_id válido.')
    }

    const auth = new GoogleAuth({
      scope: ['https://www.googleapis.com/auth/firebase.messaging'],
      clientOptions: {
        credentials: serviceAccount
      }
    })

    const tokenContainer = await auth.getAccessToken()
    const accessToken = tokenContainer.token

    // 4. Enviar notificaciones a los dispositivos registrados
    let sentCount = 0
    const details = []

    for (const target of targets) {
      // Obtener tokens FCM para este usuario
      const { data: dispositivos, error: dbError } = await supabaseAdmin
        .from('dispositivos_usuarios')
        .select('fcm_token')
        .eq('usuario_id', target.user_id)

      if (dbError) {
        console.error(`Error al buscar tokens de dispositivo para el usuario ${target.user_id}:`, dbError)
        continue
      }

      if (!dispositivos || dispositivos.length === 0) {
        console.log(`No hay dispositivos registrados para el usuario: ${target.user_id}`)
        details.push({ user_id: target.user_id, status: 'no_devices' })
        continue
      }

      const userTokensSent = []

      for (const dis of dispositivos) {
        try {
          const fcmResponse = await fetch(`https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${accessToken}`
            },
            body: JSON.stringify({
              message: {
                token: dis.fcm_token,
                notification: {
                  title: target.title,
                  body: target.body
                }
              }
            })
          })

          const resData = await fcmResponse.json()
          if (!fcmResponse.ok) {
            console.error(`Error al enviar mensaje a token ${dis.fcm_token}:`, resData)
            userTokensSent.push({ token: dis.fcm_token, success: false, error: resData })
          } else {
            console.log(`Mensaje enviado exitosamente a token ${dis.fcm_token}`)
            userTokensSent.push({ token: dis.fcm_token, success: true })
            sentCount++
          }
        } catch (fetchErr) {
          console.error(`Excepción al enviar fetch a FCM para token ${dis.fcm_token}:`, fetchErr)
          userTokensSent.push({ token: dis.fcm_token, success: false, error: fetchErr.message })
        }
      }

      details.push({ user_id: target.user_id, devices: userTokensSent })
    }

    return new Response(JSON.stringify({ ok: true, sent_count: sentCount, details }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    })

  } catch (err) {
    console.error('Error crítico en enviar-push:', err.message)
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    })
  }
})
