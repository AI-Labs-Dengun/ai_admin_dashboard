"use client";

import { useState, useEffect } from "react";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useSupabase } from "@/app/providers/supabase-provider";
import toast, { Toaster } from "react-hot-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface BotNotification {
  id: string;
  bot_id: string;
  bot_name: string;
  bot_description: string | null;
  status: "pending" | "accepted" | "rejected";
  notification_data: any;
  created_at: string;
}

export function BotNotifications() {
  const [notifications, setNotifications] = useState<BotNotification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const { supabase } = useSupabase();
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  useEffect(() => {
    checkSuperAdmin();
    const channel = supabase
      .channel("bot_notifications")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "bot_notifications",
        },
        (payload) => {
          loadNotifications();
          showNotificationToast(payload.new as BotNotification);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const showNotificationToast = (notification: BotNotification) => {
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
                {notification.bot_description && (
                  <p className="mt-1 text-sm text-gray-500">
                    {notification.bot_description}
                  </p>
                )}
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
        duration: 5000,
        position: 'top-right',
      }
    );
  };

  const checkSuperAdmin = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { data: profile } = await supabase
      .from("profiles")
      .select("is_super_admin")
      .eq("id", session.user.id)
      .single();

    setIsSuperAdmin(profile?.is_super_admin || false);
    if (profile?.is_super_admin) {
      loadNotifications();
    }
  };

  const loadNotifications = async () => {
    if (!isSuperAdmin) return;

    const { data, error } = await supabase
      .from("bot_notifications")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Erro ao carregar notificações:", error);
      return;
    }

    setNotifications(data || []);
    setPendingCount(data?.filter(n => n.status === "pending").length || 0);
  };

  const handleNotificationAction = async (
    notificationId: string,
    action: "accept" | "reject"
  ) => {
    try {
      const { error } = await supabase
        .from("bot_notifications")
        .update({ status: action === "accept" ? "accepted" : "rejected" })
        .eq("id", notificationId);

      if (error) throw error;

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

  if (!isSuperAdmin) return null;

  return (
    <>
      <Toaster />
      <Button
        variant="ghost"
        size="icon"
        className="relative"
        onClick={() => setIsOpen(true)}
      >
        <Bell className="h-5 w-5" />
        {pendingCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
            {pendingCount}
          </span>
        )}
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Notificações de Bots</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 max-h-[60vh] overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="text-center text-muted-foreground">
                Nenhuma notificação pendente
              </p>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  className="p-4 border rounded-lg space-y-2"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold">{notification.bot_name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(notification.created_at), "PPpp", {
                          locale: ptBR,
                        })}
                      </p>
                    </div>
                    {notification.status === "pending" && (
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            handleNotificationAction(notification.id, "reject")
                          }
                        >
                          Recusar
                        </Button>
                        <Button
                          size="sm"
                          onClick={() =>
                            handleNotificationAction(notification.id, "accept")
                          }
                        >
                          Aceitar
                        </Button>
                      </div>
                    )}
                  </div>
                  {notification.bot_description && (
                    <p className="text-sm">{notification.bot_description}</p>
                  )}
                  <div className="text-sm">
                    <pre className="bg-muted p-2 rounded">
                      {JSON.stringify(notification.notification_data, null, 2)}
                    </pre>
                  </div>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
} 