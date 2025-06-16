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
import { CheckCircle2, Filter } from "lucide-react";
import { cn } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface SearchUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectUser: (user: any) => void;
  shouldRefresh?: boolean;
}

type FilterType = 'all' | 'admin' | 'non-admin';
type CompanyFilter = 'all' | string;

export function SearchUserModal({ isOpen, onClose, onSelectUser, shouldRefresh = false }: SearchUserModalProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [users, setUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [existingAdmins, setExistingAdmins] = useState<Set<string>>(new Set());
  const [adminFilter, setAdminFilter] = useState<FilterType>('all');
  const [companyFilter, setCompanyFilter] = useState<CompanyFilter>('all');
  const [availableCompanies, setAvailableCompanies] = useState<string[]>([]);
  const supabase = createClientComponentClient();

  const loadInitialUsers = async () => {
    setIsLoading(true);
    try {
      // Buscar usuários
      const { data: usersData, error: usersError } = await supabase
        .from('profiles')
        .select(`
          id,
          email,
          full_name,
          company,
          is_super_admin,
          super_tenant_users (
            tenant_id,
            role,
            allow_bot_access,
            token_limit
          )
        `)
        .order('full_name');

      if (usersError) throw usersError;

      // Buscar usuários que já são admins
      const { data: existingAdminsData, error: adminsError } = await supabase
        .from('super_tenant_users')
        .select('user_id');

      if (adminsError) throw adminsError;

      // Criar um Set com os IDs dos usuários que já são admins
      const existingAdminsSet = new Set(existingAdminsData?.map(admin => admin.user_id) || []);
      setExistingAdmins(existingAdminsSet);

      // Extrair empresas únicas e ordenar
      const companies = Array.from(new Set(usersData?.map(user => user.company).filter(Boolean) || []));
      companies.sort();
      setAvailableCompanies(companies);

      setUsers(usersData || []);
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
      // Buscar usuários com filtros
      const { data: usersData, error } = await supabase
        .from('profiles')
        .select(`
          id,
          email,
          full_name,
          company,
          is_super_admin,
          super_tenant_users (
            tenant_id,
            role,
            allow_bot_access,
            token_limit
          )
        `)
        .ilike('full_name', `%${searchTerm}%`)
        .order('full_name');

      if (error) throw error;

      setUsers(usersData || []);
    } catch (error) {
      console.error('Erro ao buscar usuários:', error);
      toast.error('Erro ao buscar usuários');
    } finally {
      setIsLoading(false);
    }
  };

  const getFilteredAndSortedUsers = () => {
    return users
      .filter(user => {
        const isAdmin = existingAdmins.has(user.id);
        
        // Aplicar filtro de admin
        if (adminFilter === 'admin' && !isAdmin) return false;
        if (adminFilter === 'non-admin' && isAdmin) return false;
        
        // Aplicar filtro de empresa
        if (companyFilter !== 'all' && user.company !== companyFilter) return false;
        
        return true;
      })
      .sort((a, b) => {
        const aIsAdmin = existingAdmins.has(a.id);
        const bIsAdmin = existingAdmins.has(b.id);
        
        // Primeiro ordenar por status de admin (não-admins primeiro)
        if (aIsAdmin !== bIsAdmin) {
          return aIsAdmin ? 1 : -1;
        }
        
        // Depois ordenar por nome
        return a.full_name.localeCompare(b.full_name);
      });
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
      setAdminFilter('all');
      setCompanyFilter('all');
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

          <div className="flex gap-2">
            <Select value={adminFilter} onValueChange={(value: FilterType) => setAdminFilter(value)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filtrar por status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="admin">Apenas admins</SelectItem>
                <SelectItem value="non-admin">Apenas não-admins</SelectItem>
              </SelectContent>
            </Select>

            <Select value={companyFilter} onValueChange={(value: CompanyFilter) => setCompanyFilter(value)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filtrar por empresa" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as empresas</SelectItem>
                {availableCompanies.map(company => (
                  <SelectItem key={company} value={company}>
                    {company}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <ScrollArea className="h-[400px] rounded-md border p-4">
            {isLoading ? (
              <div className="text-center py-4">Carregando...</div>
            ) : getFilteredAndSortedUsers().length > 0 ? (
              <div className="space-y-2">
                {getFilteredAndSortedUsers().map((user) => {
                  const isExistingAdmin = existingAdmins.has(user.id);
                  return (
                    <Card 
                      key={user.id} 
                      className={cn(
                        "transition-colors",
                        (isExistingAdmin || user.is_super_admin)
                          ? "bg-muted/50 cursor-not-allowed" 
                          : "cursor-pointer hover:bg-accent"
                      )}
                      onClick={() => {
                        if (!isExistingAdmin && !user.is_super_admin) {
                          onSelectUser(user);
                          onClose();
                        }
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
                          {(isExistingAdmin || user.is_super_admin) && (
                            <div className="flex items-center gap-2 text-green-600">
                              <CheckCircle2 className="h-5 w-5" />
                              <span className="text-sm">
                                {user.is_super_admin ? 'super admin' : 'admin'}
                              </span>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
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