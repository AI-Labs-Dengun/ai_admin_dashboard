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

export function NotificationCenter() {
  const [notifications, setNotifications] = useState<BotNotificationType[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const { supabase } = useSupabase();
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const router = useRouter();

  useEffect(() => {
    checkSuperAdmin();
    if (isSuperAdmin) {
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
            showNotificationToast(payload.new as BotNotificationType);
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [isSuperAdmin]);

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
    if (profile?.is_super_admin) {
      loadNotifications();
    }
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
    if (!isSuperAdmin) {
      toast.error("Acesso restrito a super administradores");
      return;
    }

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