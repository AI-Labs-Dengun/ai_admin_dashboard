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
      // Processar todas as solicitações pendentes ao inicializar
      botRegisterNotification.processAllPendingRequests().then(() => {
        loadNotifications();
      });

      // Configurar listeners de realtime para bot_requests
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
            console.log('Mudança detectada em bot_requests:', payload);
            if (payload.eventType === 'INSERT' && payload.new?.status === 'pending') {
              const notification = await botRegisterNotification.createNotificationFromRequest(payload.new);
              if (notification) {
                showNotificationToast(notification);
                loadNotifications();
              }
            } else if (payload.eventType === 'UPDATE') {
              loadNotifications();
            }
          }
        )
        .subscribe();

      // Configurar listeners de realtime para bot_notifications
      const notificationsChannel = supabase
        .channel('bot_notifications_changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'bot_notifications'
          },
          () => {
            console.log('Mudança detectada em bot_notifications');
            loadNotifications();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(requestsChannel);
        supabase.removeChannel(notificationsChannel);
      };
    }
  }, [isSuperAdmin, supabase]);

  const checkSuperAdmin = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      router.push('/auth/signin');
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("is_super_admin")
      .eq("id", session.user.id)
      .single();

    setIsSuperAdmin(profile?.is_super_admin || false);
  };

  const showNotificationToast = (notification: BotNotificationType) => {
    if (!isSuperAdmin) return;

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
    if (!isSuperAdmin) return;

    const pendingNotifications = await botRegisterNotification.loadPendingNotifications();
    setNotifications(pendingNotifications);
    setPendingCount(pendingNotifications.length);
  };

  const handleNotificationAction = async (
    notificationId: string,
    action: "accept" | "reject",
    requestId?: string
  ) => {
    if (!isSuperAdmin) {
      toast.error("Acesso restrito a super administradores");
      return;
    }

    try {
      const notification = notifications.find(n => n.id === notificationId);
      const reqId = requestId || notification?.request_id || notification?.notification_data?.requestId;
      if (!reqId) {
        throw new Error('Dados da notificação inválidos');
      }

      const success = await botRegisterNotification.updateNotificationStatus(
        notificationId,
        reqId,
        action
      );

      if (success) {
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
      console.error("Erro ao processar notificação:", error);
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
                      request_id={notification.request_id || notification.notification_data?.requestId}
                      onAction={(action) =>
                        handleNotificationAction(notification.id, action, notification.request_id || notification.notification_data?.requestId)
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