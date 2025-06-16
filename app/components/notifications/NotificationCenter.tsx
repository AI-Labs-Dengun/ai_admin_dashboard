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

export function NotificationCenter() {
  const [isOpen, setIsOpen] = useState(false);
  const { supabase } = useSupabase();
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const router = useRouter();

  useEffect(() => {
    checkSuperAdmin();
  }, []);

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
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-0" align="end">
          <div className="p-2 border-b">
            <h4 className="font-medium">Notificações</h4>
          </div>
          <div className="max-h-[400px] overflow-y-auto">
            <p className="p-4 text-center text-muted-foreground">
              Nenhuma notificação pendente
            </p>
          </div>
        </PopoverContent>
      </Popover>
    </>
  );
} 