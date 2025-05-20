import { useState, useEffect } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "react-hot-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

interface SearchUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectUser: (user: any) => void;
  shouldRefresh?: boolean;
}

export function SearchUserModal({ isOpen, onClose, onSelectUser, shouldRefresh = false }: SearchUserModalProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [users, setUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const supabase = createClientComponentClient();

  const loadInitialUsers = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('is_super_admin', false)
        .order('full_name', { ascending: true })
        .limit(50);

      if (error) throw error;

      setUsers(data || []);
    } catch (error) {
      console.error('Erro ao carregar usuários:', error);
      toast.error('Erro ao carregar usuários');
    } finally {
      setIsLoading(false);
    }
  };

  const searchUsers = async () => {
    if (!searchTerm.trim()) {
      loadInitialUsers();
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .or(`full_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,company.ilike.%${searchTerm.toLowerCase()}%`)
        .eq('is_super_admin', false)
        .order('full_name', { ascending: true })
        .limit(10);

      if (error) throw error;

      setUsers(data || []);
    } catch (error) {
      console.error('Erro ao buscar usuários:', error);
      toast.error('Erro ao buscar usuários');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadInitialUsers();
    }
  }, [isOpen]);

  useEffect(() => {
    if (shouldRefresh) {
      loadInitialUsers();
    }
  }, [shouldRefresh]);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      searchUsers();
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm]);

  useEffect(() => {
    if (!isOpen) {
      setSearchTerm("");
    }
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Pesquisar Usuário Existente</DialogTitle>
          <DialogDescription>
            Pesquise por nome, email ou empresa para encontrar um usuário existente
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Digite para pesquisar..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1"
            />
          </div>

          <ScrollArea className="h-[400px] rounded-md border p-4">
            {isLoading ? (
              <div className="text-center py-4">Carregando...</div>
            ) : users.length > 0 ? (
              <div className="space-y-2">
                {users.map((user) => (
                  <Card 
                    key={user.id} 
                    className="cursor-pointer hover:bg-accent transition-colors"
                    onClick={() => {
                      onSelectUser(user);
                      onClose();
                    }}
                  >
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-medium">{user.full_name}</h3>
                          <p className="text-sm text-muted-foreground">{user.email}</p>
                          {user.company && (
                            <Badge variant="secondary" className="mt-1">
                              {user.company}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : searchTerm ? (
              <div className="text-center py-4 text-muted-foreground">
                Nenhum usuário encontrado
              </div>
            ) : (
              <div className="text-center py-4 text-muted-foreground">
                Nenhum usuário disponível
              </div>
            )}
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
} 