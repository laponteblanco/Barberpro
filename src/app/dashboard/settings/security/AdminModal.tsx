"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Shield, Save, Key, Mail, User, CheckCircle2, XCircle } from "lucide-react";
import { createAdminUserAction, updateAdminPermissionsAction } from "./actions";

interface AdminModalProps {
  existingAdmin?: {
    id: string;
    display_name: string;
    permissions: any;
  };
  trigger?: React.ReactNode;
}

export function AdminModal({ existingAdmin, trigger }: AdminModalProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isEditing = !!existingAdmin;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    
    if (isEditing && existingAdmin) {
      formData.append("staff_id", existingAdmin.id);
      const res = await updateAdminPermissionsAction(formData);
      if (res.error) setError(res.error);
      else setOpen(false);
    } else {
      const res = await createAdminUserAction(formData);
      if (res.error) setError(res.error);
      else setOpen(false);
    }
    
    setLoading(false);
  }

  return (
    <>
      <div onClick={() => setOpen(true)}>
        {trigger || (
          <button className="flex items-center bg-indigo-600 hover:bg-indigo-700 text-white rounded-full px-6 py-2 transition-colors font-medium">
            <Shield className="w-4 h-4 mr-2" />
            Nuevo Administrador
          </button>
        )}
      </div>

      {mounted && open && createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-200 w-full max-w-[500px] rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-slate-200 dark:border-slate-800">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Shield className="w-5 h-5 text-indigo-400" />
                {isEditing ? "Editar Permisos de Admin" : "Crear Nuevo Administrador"}
              </h2>
            </div>

            <div className="p-6 overflow-y-auto">
              <form onSubmit={handleSubmit} className="space-y-6">
                {error && (
                  <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-xl text-sm flex items-start gap-3">
                    <XCircle className="w-5 h-5 mt-0.5 shrink-0" />
                    <p>{error}</p>
                  </div>
                )}

                {!isEditing && (
                  <div className="space-y-4 bg-slate-50 dark:bg-slate-900/50 p-5 rounded-2xl border border-slate-200 dark:border-slate-800">
                    <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-wider">Credenciales de Acceso</h3>
                    <div className="space-y-4">
                      <div className="space-y-1.5">
                        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Nombre Completo</label>
                        <div className="relative">
                          <User className="absolute left-3 top-2.5 h-5 w-5 text-slate-400 dark:text-slate-500" />
                          <input 
                            type="text" 
                            name="display_name" 
                            required 
                            className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl pl-10 pr-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all text-slate-900 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500"
                            placeholder="Ej. Carlos Admin"
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Correo Electrónico (Usuario)</label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-2.5 h-5 w-5 text-slate-400 dark:text-slate-500" />
                          <input 
                            type="email" 
                            name="email" 
                            required 
                            className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl pl-10 pr-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all text-slate-900 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500"
                            placeholder="admin@mibarberia.com"
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Contraseña Temporal</label>
                        <div className="relative">
                          <Key className="absolute left-3 top-2.5 h-5 w-5 text-slate-400 dark:text-slate-500" />
                          <input 
                            type="text" 
                            name="password" 
                            required 
                            className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl pl-10 pr-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all text-slate-900 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500"
                            placeholder="Mínimo 6 caracteres"
                            minLength={6}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="space-y-4 bg-slate-50 dark:bg-slate-900/50 p-5 rounded-2xl border border-slate-200 dark:border-slate-800">
                  <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-wider">Permisos Habilitados</h3>
                  
                  <div className="space-y-3">
                    {[
                      { name: "perm_manage_staff", label: "Gestión de Personal", desc: "Puede añadir, editar o eliminar barberos." },
                      { name: "perm_manage_services", label: "Gestión de Servicios", desc: "Puede añadir, editar o eliminar servicios." },
                      { name: "perm_manage_finances", label: "Gestión Financiera", desc: "Puede registrar movimientos, adelantos y ver caja." },
                      { name: "perm_manage_settings", label: "Configuración", desc: "Puede editar el perfil de la barbería." }
                    ].map(perm => (
                      <label key={perm.name} className="flex items-start gap-3 p-3 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-colors cursor-pointer border border-transparent hover:border-slate-200 dark:hover:border-slate-800">
                        <div className="flex items-center h-5 mt-0.5">
                          <input 
                            type="checkbox" 
                            name={perm.name}
                            value="true"
                            defaultChecked={existingAdmin ? existingAdmin.permissions?.[perm.name.replace("perm_", "")] : false}
                            className="w-4 h-4 rounded border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-indigo-600 focus:ring-indigo-600 focus:ring-offset-slate-50 dark:focus:ring-offset-slate-900" 
                          />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-slate-900 dark:text-slate-200">{perm.label}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">{perm.desc}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="pt-2 flex justify-end gap-3">
                  <button 
                    type="button" 
                    onClick={() => setOpen(false)}
                    className="px-6 py-2 rounded-full font-medium transition-colors hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white text-slate-600 dark:text-slate-300"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit" 
                    disabled={loading}
                    className="flex items-center bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-full px-6 py-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? "Guardando..." : "Guardar Administrador"}
                    {!loading && <Save className="w-4 h-4 ml-2" />}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
