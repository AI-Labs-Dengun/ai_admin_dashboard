"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { toast } from "react-hot-toast";

interface BotDetails {
  id: string;
  name: string;
  description: string | null;
  bot_capabilities: string[];
  contact_email: string | null;
  website: string | null;
  max_tokens_per_request: number;
}

export default function BotPage({ params }: { params: { botId: string } }) {
  const [loading, setLoading] = useState(true);
  const [botDetails, setBotDetails] = useState<BotDetails | null>(null);
  const router = useRouter();

  useEffect(() => {
    const validateAccess = async () => {
      try {
        console.log('🔍 Iniciando validação de acesso ao bot:', params.botId);
        
        const token = localStorage.getItem('botToken');
        const storedBotId = localStorage.getItem('currentBotId');
        const storedTenantId = localStorage.getItem('currentTenantId');

        if (!token || !storedBotId || !storedTenantId) {
          console.error('❌ Tokens não encontrados no localStorage');
          toast.error('Sessão inválida');
          router.push('/dashboard/my-bots');
          return;
        }

        console.log('🔑 Tokens encontrados, validando...');

        // Validar token
        const response = await fetch('/api/bots/validate-token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ token }),
        });

        const data = await response.json();

        if (!response.ok) {
          console.error('❌ Token inválido:', data.error);
          toast.error('Sessão expirada ou inválida');
          router.push('/dashboard/my-bots');
          return;
        }

        console.log('✅ Token validado com sucesso');

        // Buscar detalhes do bot
        const botResponse = await fetch(`/api/bots/${params.botId}`);
        const botData = await botResponse.json();

        if (!botResponse.ok) {
          console.error('❌ Erro ao buscar detalhes do bot:', botData.error);
          toast.error('Erro ao carregar detalhes do bot');
          return;
        }

        console.log('✅ Detalhes do bot carregados com sucesso');
        setBotDetails(botData);
      } catch (error) {
        console.error('❌ Erro ao validar acesso:', error);
        toast.error('Erro ao validar acesso');
        router.push('/dashboard/my-bots');
      } finally {
        setLoading(false);
      }
    };

    validateAccess();
  }, [params.botId, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!botDetails) {
    return (
      <div className="container mx-auto p-4">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-8">
            <h3 className="text-lg font-semibold mb-2">Bot não encontrado</h3>
            <Button onClick={() => router.push('/dashboard/my-bots')}>
              Voltar para Meus Bots
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">{botDetails.name}</h1>
        <Button variant="outline" onClick={() => router.push('/dashboard/my-bots')}>
          Voltar
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Informações do Bot</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="text-sm font-medium text-muted-foreground">Descrição</h3>
              <p className="mt-1">{botDetails.description || "Sem descrição"}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-muted-foreground">Capacidades</h3>
              <div className="mt-1 flex flex-wrap gap-2">
                {botDetails.bot_capabilities.map((capability, index) => (
                  <span
                    key={index}
                    className="px-2 py-1 bg-secondary text-secondary-foreground rounded-md text-sm"
                  >
                    {capability}
                  </span>
                ))}
              </div>
            </div>
            <div>
              <h3 className="text-sm font-medium text-muted-foreground">Limite de Tokens</h3>
              <p className="mt-1">{botDetails.max_tokens_per_request.toLocaleString()} tokens</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Contato</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {botDetails.contact_email && (
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">Email</h3>
                <a
                  href={`mailto:${botDetails.contact_email}`}
                  className="mt-1 text-primary hover:underline"
                >
                  {botDetails.contact_email}
                </a>
              </div>
            )}
            {botDetails.website && (
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">Website</h3>
                <a
                  href={botDetails.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 text-primary hover:underline"
                >
                  {botDetails.website}
                </a>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 