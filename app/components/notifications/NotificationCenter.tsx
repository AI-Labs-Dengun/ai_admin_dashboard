"use client";

import { useState, useEffect } from "react";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useSupabase } from "@/app/providers/supabase-provider";
import toast, { Toaster } from "react-hot-toast";
import { useRouter } from "next/navigation";
import { BotNotification } from "./templates/BotNotification";
import { BotNotification as BotNotificationType } from "./types";
import { BotRegisterNotification } from "./services/BotRegisterNotification";

export function NotificationCenter() {
  const [notifications, setNotifications] = useState<BotNotificationType[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const { supabase } = useSupabase();
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const router = useRouter();
  const botRegisterNotification = new BotRegisterNotification(supabase);

  useEffect(() => {
    checkSuperAdmin();
  }, []);

  useEffect(() => {
    if (isSuperAdmin) {
      console.log('[NotificationCenter] Iniciando processamento de notificações para super_admin');
      
      // Carregar notificações iniciais
      loadNotifications();

      // Configurar listener de realtime para bot_requests
      const requestsChannel = supabase
        .channel('bot_requests_changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'bot_requests'
          },
          async (payload) => {
            console.log('[NotificationCenter] Mudança detectada em bot_requests:', payload);
            
            if (payload.eventType === 'INSERT' && payload.new?.status === 'pending') {
              console.log('[NotificationCenter] Nova solicitação pendente detectada:', payload.new);
              
              // Converter a solicitação para o formato de notificação
              const notification: BotNotificationType = {
                id: payload.new.id,
                type: 'bot',
                status: 'pending',
                created_at: payload.new.created_at,
                bot_id: payload.new.id,
                request_id: payload.new.id,
                bot_name: payload.new.bot_name,
                bot_description: payload.new.bot_description,
                notification_data: {
                  requestId: payload.new.id,
                  type: 'bot_request',
                  status: 'pending',
                  capabilities: payload.new.bot_capabilities || [],
                  contactEmail: payload.new.contact_email,
                  website: payload.new.website,
                  max_tokens_per_request: payload.new.max_tokens_per_request || 1000
                }
              };

              console.log('[NotificationCenter] Notificação convertida:', notification);
              showNotificationToast(notification);
              loadNotifications();
            } else if (payload.eventType === 'UPDATE') {
              console.log('[NotificationCenter] Atualização detectada, recarregando notificações');
              loadNotifications();
            }
          }
        )
        .subscribe();

      return () => {
        console.log('[NotificationCenter] Removendo listener de realtime');
        supabase.removeChannel(requestsChannel);
      };
    }
  }, [isSuperAdmin, supabase]);

  const checkSuperAdmin = async () => {
    try {
      console.log('[NotificationCenter] Verificando permissões de super_admin');
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        console.log('[NotificationCenter] Usuário não autenticado, redirecionando para login');
        router.push('/auth/signin');
        return;
      }

      const { data: profile, error } = await supabase
        .from("profiles")
        .select("is_super_admin")
        .eq("id", session.user.id)
        .single();

      if (error) {
        console.error('[NotificationCenter] Erro ao verificar permissões:', error);
        return;
      }

      console.log('[NotificationCenter] Status de super_admin:', profile?.is_super_admin);
      setIsSuperAdmin(profile?.is_super_admin || false);
    } catch (error) {
      console.error('[NotificationCenter] Erro ao verificar permissões:', error);
    }
  };

  const showNotificationToast = (notification: BotNotificationType) => {
    if (!isSuperAdmin) {
      console.log('[NotificationCenter] Usuário não é super_admin, ignorando notificação');
      return;
    }

    console.log('[NotificationCenter] Exibindo toast de notificação:', notification);

    toast.custom(
      (t) => (
        <div
          className={`${
            t.visible ? 'animate-enter' : 'animate-leave'
          } max-w-md w-full bg-white shadow-lg rounded-lg pointer-events-auto flex ring-1 ring-black ring-opacity-5`}
        >
          <div className="flex-1 w-0 p-4">
            <div className="flex items-start">
              <div className="flex-shrink-0 pt-0.5">
                <Bell className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-3 flex-1">
                <p className="text-sm font-medium text-gray-900">
                  Nova solicitação de bot
                </p>
                <p className="mt-1 text-sm text-gray-500">
                  {notification.bot_name}
                </p>
                <p className="mt-1 text-sm text-gray-500">
                  {notification.bot_description}
                </p>
              </div>
            </div>
          </div>
          <div className="flex border-l border-gray-200">
            <button
              onClick={() => {
                console.log('[NotificationCenter] Botão "Ver" clicado, abrindo modal');
                toast.dismiss(t.id);
                setIsOpen(true);
              }}
              className="w-full border border-transparent rounded-none rounded-r-lg p-4 flex items-center justify-center text-sm font-medium text-blue-600 hover:text-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Ver
            </button>
          </div>
        </div>
      ),
      {
        duration: 10000,
        position: 'top-right',
      }
    );
  };

  const loadNotifications = async () => {
    if (!isSuperAdmin) {
      console.log('[NotificationCenter] Usuário não é super_admin, ignorando carregamento');
      return;
    }

    try {
      console.log('[NotificationCenter] Carregando notificações...');
      const pendingNotifications = await botRegisterNotification.loadPendingNotifications();
      console.log('[NotificationCenter] Notificações carregadas:', pendingNotifications);
      
      setNotifications(pendingNotifications);
      setPendingCount(pendingNotifications.length);
    } catch (error) {
      console.error('[NotificationCenter] Erro ao carregar notificações:', error);
    }
  };

  const handleNotificationAction = async (
    requestId: string,
    action: "accept" | "reject"
  ) => {
    if (!isSuperAdmin) {
      console.log('[NotificationCenter] Usuário não é super_admin, ignorando ação');
      toast.error("Acesso restrito a super administradores");
      return;
    }

    try {
      console.log('[NotificationCenter] Processando ação:', { requestId, action });
      const success = await botRegisterNotification.updateNotificationStatus(
        requestId,
        action
      );

      if (success) {
        console.log('[NotificationCenter] Ação processada com sucesso');
        toast.success(
          `Solicitação ${action === "accept" ? "aceita" : "rejeitada"} com sucesso!`,
          {
            duration: 3000,
            position: 'top-right',
            style: {
              background: '#10B981',
              color: '#fff',
            },
          }
        );
        loadNotifications();
      } else {
        throw new Error('Falha ao atualizar status');
      }
    } catch (error) {
      console.error('[NotificationCenter] Erro ao processar notificação:', error);
      toast.error("Erro ao processar notificação", {
        duration: 3000,
        position: 'top-right',
        style: {
          background: '#EF4444',
          color: '#fff',
        },
      });
    }
  };

  // Se não for super_admin, não renderiza nada
  if (!isSuperAdmin) return null;

  return (
    <>
      <Toaster />
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="relative"
          >
            <Bell className="h-5 w-5" />
            {pendingCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                {pendingCount}
              </span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-0" align="end">
          <div className="p-2 border-b">
            <h4 className="font-medium">Notificações</h4>
          </div>
          <div className="max-h-[400px] overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="p-4 text-center text-muted-foreground">
                Nenhuma notificação pendente
              </p>
            ) : (
              <div className="p-2 space-y-2">
                {notifications.map((notification) => (
                  <div key={notification.id}>
                    <BotNotification
                      {...notification}
                      request_id={notification.id}
                      onAction={(action) =>
                        handleNotificationAction(notification.id, action)
                      }
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </>
  );
} 